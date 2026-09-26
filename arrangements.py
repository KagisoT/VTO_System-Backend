"""Payment arrangements for debts assigned to the collector."""

import calendar
import re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from tkinter import messagebox, ttk

import customtkinter as ctk

from api import api
from workqueue import client_details, display_value


FREQUENCIES = ("WEEKLY", "FORTNIGHTLY", "MONTHLY")
MAX_AMOUNT = Decimal("999999999999.99")


class ArrangementError(ValueError):
    pass


def parse_amount(value, label):
    try:
        amount = Decimal(str(value).strip().replace(",", ""))
        valid = (amount.is_finite() and Decimal("0") < amount <= MAX_AMOUNT
                 and amount == amount.quantize(Decimal("0.01")))
    except (InvalidOperation, ValueError):
        valid = False
    if not valid:
        raise ArrangementError(f"{label} must be positive with at most two decimal places.")
    return amount


def parse_date(value, label):
    value = str(value).strip()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ArrangementError(f"{label} must use YYYY-MM-DD.")
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ArrangementError(f"{label} is not a valid date.") from None


def add_months(start, months):
    month_index = start.month - 1 + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def build_arrangement(debt_id, start_date, end_date, total_amount,
                      installment_amount, frequency, count, notes="",
                      outstanding_balance=None):
    """Validate the backend contract and preview each due date and amount."""
    if not debt_id:
        raise ArrangementError("Select a debt first.")
    start = parse_date(start_date, "Start date")
    end = parse_date(end_date, "End date") if str(end_date).strip() else None
    total = parse_amount(total_amount, "Total amount")
    installment = parse_amount(installment_amount, "Installment amount")
    if frequency not in FREQUENCIES:
        raise ArrangementError("Select a payment frequency.")
    try:
        installments = int(str(count).strip())
    except ValueError:
        raise ArrangementError("Enter a whole number of installments.") from None
    if not 1 <= installments <= 120 or str(count).strip() != str(installments):
        raise ArrangementError("Number of installments must be between 1 and 120.")
    if total <= installment * (installments - 1) or total > installment * installments:
        raise ArrangementError("Total amount must fit within the installment schedule.")
    if len(notes) > 1000:
        raise ArrangementError("Notes cannot exceed 1000 characters.")
    if outstanding_balance is not None:
        try:
            if total > Decimal(str(outstanding_balance)):
                raise ArrangementError("Total amount exceeds the outstanding balance.")
        except InvalidOperation:
            pass

    schedule = []
    for index in range(installments):
        if frequency == "MONTHLY":
            due = add_months(start, index)
        else:
            due = start + timedelta(days=index * (7 if frequency == "WEEKLY" else 14))
        due_amount = installment if index < installments - 1 else total - installment * (installments - 1)
        schedule.append((due.isoformat(), f"{due_amount:.2f}"))
    if end and end < date.fromisoformat(schedule[-1][0]):
        raise ArrangementError("End date is before the final installment.")

    payload = {
        "debt_id": str(debt_id),
        "start_date": start.isoformat(),
        "total_amount": float(total),
        "installment_amount": float(installment),
        "frequency": frequency,
        "number_of_installments": installments,
    }
    if end:
        payload["end_date"] = end.isoformat()
    if notes.strip():
        payload["notes"] = notes.strip()
    return payload, schedule


class PaymentArrangements(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="#0F172A")
        self.pack(fill="both", expand=True)
        self.accounts = self.fetch_accounts()
        self.account = None
        self.outstanding_balance = None
        self.has_active_arrangement = False
        self.build()

    def fetch_accounts(self):
        try:
            data = api.get_accounts()
            if isinstance(data, dict):
                data = data.get("accounts") or data.get("data") or []
                if isinstance(data, dict):
                    data = data.get("accounts") or data.get("items") or []
            return [row for row in data if isinstance(row, dict)] if isinstance(data, list) else []
        except Exception as ex:
            messagebox.showerror("Data Error", f"Unable to load assigned debts: {ex}")
            return []

    def build(self):
        content = ctk.CTkScrollableFrame(self, fg_color="#0F172A")
        content.pack(fill="both", expand=True, padx=16, pady=12)
        ctk.CTkLabel(
            content, text="Payment arrangements", anchor="w",
            font=ctk.CTkFont(size=24, weight="bold")
        ).pack(fill="x", pady=(0, 12))

        debt_card = ctk.CTkFrame(content, fg_color="#172033")
        debt_card.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(
            debt_card, text="Assigned debts", anchor="w",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(fill="x", padx=14, pady=(12, 8))
        self.debt_table = self.make_table(
            debt_card, ("Client", "Contract", "Debt amount", "Status"), height=6
        )
        self.debt_table.bind("<<TreeviewSelect>>", self.on_select)
        for index, account in enumerate(self.accounts):
            client = client_details(account)
            name = " ".join(filter(None, (
                display_value(client, "firstname", "first_name", "name"),
                display_value(client, "surname", "last_name"),
            )))
            self.debt_table.insert("", "end", iid=str(index), values=(
                name,
                display_value(account, "contract_number", "jabulani_account_no", "reference"),
                display_value(account, "calculated_debt", "balance"),
                display_value(account, "status"),
            ))

        self.selected_label = ctk.CTkLabel(
            content, text="Select a debt to view or create an arrangement.", anchor="w"
        )
        self.selected_label.pack(fill="x", pady=(0, 12))

        history_card = ctk.CTkFrame(content, fg_color="#172033")
        history_card.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(
            history_card, text="Existing arrangements", anchor="w",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(fill="x", padx=14, pady=(12, 8))
        self.history_table = self.make_table(
            history_card,
            ("Start", "End", "Total", "Installment", "Frequency", "Count", "Status"),
            height=5,
        )

        form = ctk.CTkFrame(content, fg_color="#172033")
        form.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(
            form, text="New arrangement", anchor="w",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(fill="x", padx=14, pady=(12, 8))
        fields = ctk.CTkFrame(form, fg_color="transparent")
        fields.pack(fill="x", padx=14)
        for column in range(3):
            fields.grid_columnconfigure(column, weight=1)
        self.start_entry = self.form_entry(fields, "Start date (YYYY-MM-DD)", 0, 0)
        self.end_entry = self.form_entry(fields, "End date (optional)", 0, 1)
        self.total_entry = self.form_entry(fields, "Total amount", 0, 2)
        self.installment_entry = self.form_entry(fields, "Installment amount", 1, 0)
        self.count_entry = self.form_entry(fields, "Number of installments", 1, 1)
        frequency_cell = ctk.CTkFrame(fields, fg_color="transparent")
        frequency_cell.grid(row=1, column=2, sticky="ew", padx=6, pady=6)
        ctk.CTkLabel(frequency_cell, text="Frequency", anchor="w").pack(fill="x")
        self.frequency_menu = ctk.CTkOptionMenu(frequency_cell, values=list(FREQUENCIES))
        self.frequency_menu.pack(fill="x", pady=(4, 0))
        ctk.CTkLabel(form, text="Notes (optional)", anchor="w").pack(
            fill="x", padx=20, pady=(8, 4)
        )
        self.notes_box = ctk.CTkTextbox(form, height=80)
        self.notes_box.pack(fill="x", padx=20, pady=(0, 10))
        buttons = ctk.CTkFrame(form, fg_color="transparent")
        buttons.pack(fill="x", padx=20, pady=(0, 12))
        ctk.CTkButton(buttons, text="Preview schedule", command=self.preview).pack(
            side="left", padx=(0, 8)
        )
        self.create_button = ctk.CTkButton(
            buttons, text="Create arrangement", command=self.create, state="disabled"
        )
        self.create_button.pack(side="left")
        self.preview_box = ctk.CTkTextbox(form, height=150, wrap="none")
        self.preview_box.pack(fill="x", padx=20, pady=(0, 14))
        self.set_preview("Enter arrangement terms and preview the schedule.")
        if self.accounts:
            self.debt_table.selection_set("0")
            self.on_select()

    def make_table(self, parent, headings, height):
        area = ctk.CTkFrame(parent, fg_color="transparent")
        area.pack(fill="x", padx=12, pady=(0, 12))
        area.grid_columnconfigure(0, weight=1)
        area.grid_rowconfigure(0, weight=1)
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Arrangement.Treeview", background="#172033",
                        fieldbackground="#172033", foreground="#F9FAFB", rowheight=28)
        style.configure("Arrangement.Treeview.Heading", background="#1F2937",
                        foreground="#F9FAFB", font=("Segoe UI", 10, "bold"))
        style.map("Arrangement.Treeview", background=[("selected", "#2563EB")])
        columns = tuple(f"col_{index}" for index in range(len(headings)))
        table = ttk.Treeview(area, columns=columns, show="headings", height=height,
                             selectmode="browse", style="Arrangement.Treeview")
        for index, heading in enumerate(headings):
            table.heading(columns[index], text=heading)
            table.column(columns[index], width=150, minwidth=100, stretch=True, anchor="w")
        table.grid(row=0, column=0, sticky="nsew")
        yscroll = ttk.Scrollbar(area, orient="vertical", command=table.yview)
        yscroll.grid(row=0, column=1, sticky="ns")
        xscroll = ttk.Scrollbar(area, orient="horizontal", command=table.xview)
        xscroll.grid(row=1, column=0, sticky="ew")
        table.configure(yscrollcommand=yscroll.set, xscrollcommand=xscroll.set)
        return table

    def form_entry(self, parent, label, row, column):
        cell = ctk.CTkFrame(parent, fg_color="transparent")
        cell.grid(row=row, column=column, sticky="ew", padx=6, pady=6)
        ctk.CTkLabel(cell, text=label, anchor="w").pack(fill="x")
        entry = ctk.CTkEntry(cell)
        entry.pack(fill="x", pady=(4, 0))
        return entry

    def on_select(self, _event=None):
        selection = self.debt_table.selection()
        if not selection:
            return
        self.account = self.accounts[int(selection[0])]
        client = client_details(self.account)
        name = " ".join(filter(None, (
            display_value(client, "firstname", "first_name", "name"),
            display_value(client, "surname", "last_name"),
        ))) or "Client"
        self.selected_label.configure(text=f"{name} — {display_value(self.account, 'contract_number', 'jabulani_account_no')}")
        self.clear_form()
        self.load_arrangements()

    def clear_form(self):
        for entry in (self.start_entry, self.end_entry, self.total_entry,
                      self.installment_entry, self.count_entry):
            entry.delete(0, "end")
        self.notes_box.delete("1.0", "end")
        self.frequency_menu.set("MONTHLY")
        self.set_preview("Enter arrangement terms and preview the schedule.")

    def load_arrangements(self):
        self.history_table.delete(*self.history_table.get_children())
        self.outstanding_balance = None
        self.has_active_arrangement = False
        arrangements_loaded = False
        debt_id = self.account.get("debt_id") if self.account else None
        if not debt_id:
            self.create_button.configure(state="disabled")
            return
        try:
            arrangements = api.get_arrangements_for_debt(debt_id)
            arrangements_loaded = True
            if isinstance(arrangements, dict):
                arrangements = arrangements.get("arrangements") or arrangements.get("data") or []
            for arrangement in arrangements if isinstance(arrangements, list) else []:
                if not isinstance(arrangement, dict):
                    continue
                if str(arrangement.get("status", "")).upper() == "ACTIVE":
                    self.has_active_arrangement = True
                self.history_table.insert("", "end", values=(
                    arrangement.get("start_date") or "",
                    arrangement.get("end_date") or "",
                    arrangement.get("total_amount") or "",
                    arrangement.get("installment_amount") or "",
                    arrangement.get("frequency") or "",
                    arrangement.get("number_of_installments") or "",
                    arrangement.get("status") or "",
                ))
        except Exception as ex:
            messagebox.showerror("Arrangement error", str(ex))
        try:
            history = api.get_payment_history(debt_id)
            if isinstance(history, dict):
                self.outstanding_balance = history.get("outstanding_balance")
        except Exception:
            self.outstanding_balance = None
        balance = (f" | Outstanding: {self.outstanding_balance}"
                   if self.outstanding_balance is not None else "")
        self.selected_label.configure(text=self.selected_label.cget("text").split(" | Outstanding:")[0] + balance)
        active = str(self.account.get("status", "")).upper() == "ACTIVE"
        self.create_button.configure(
            state="normal" if active and arrangements_loaded and not self.has_active_arrangement else "disabled"
        )

    def form_values(self):
        return build_arrangement(
            self.account.get("debt_id") if self.account else None,
            self.start_entry.get(), self.end_entry.get(), self.total_entry.get(),
            self.installment_entry.get(), self.frequency_menu.get(), self.count_entry.get(),
            self.notes_box.get("1.0", "end-1c"), self.outstanding_balance,
        )

    def set_preview(self, text):
        self.preview_box.configure(state="normal")
        self.preview_box.delete("1.0", "end")
        self.preview_box.insert("1.0", text)
        self.preview_box.configure(state="disabled")

    def preview(self):
        try:
            _, schedule = self.form_values()
        except ArrangementError as ex:
            messagebox.showwarning("Check arrangement", str(ex))
            return
        self.set_preview("\n".join(
            f"{index}.  {due_date}    {amount}"
            for index, (due_date, amount) in enumerate(schedule, 1)
        ))

    def create(self):
        if not self.account or str(self.account.get("status", "")).upper() != "ACTIVE":
            messagebox.showwarning("Cannot create", "Select an active debt first.")
            return
        if self.has_active_arrangement:
            messagebox.showwarning("Cannot create", "This debt already has an active arrangement.")
            return
        try:
            payload, schedule = self.form_values()
        except ArrangementError as ex:
            messagebox.showwarning("Check arrangement", str(ex))
            return
        self.set_preview("\n".join(
            f"{index}.  {due_date}    {amount}"
            for index, (due_date, amount) in enumerate(schedule, 1)
        ))
        try:
            api.create_payment_arrangement(payload)
        except Exception as ex:
            messagebox.showerror("Arrangement not created", str(ex))
            return
        self.load_arrangements()
        self.clear_form()
        messagebox.showinfo("Arrangement created", "The payment arrangement was saved.")
