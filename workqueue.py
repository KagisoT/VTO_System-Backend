"""Collector work queue with a compact table and in-app contact panels."""

import json
import re
import sqlite3
from datetime import date, datetime
from pathlib import Path
from tkinter import filedialog, messagebox, simpledialog, ttk

import customtkinter as ctk

from api import api
from payment_store import PendingPaymentStore, PaymentCaptureError


PHONE_KEYS = (
    "cell_phone_1", "cell_phone_2", "cell", "cell_number", "cellphone", "debtor_cell", "mobile", "mobile_number",
    "mobile_no", "phone", "phone_number", "phone_no", "primary_phone",
    "telephone", "telephone_number", "contact_number", "home_phone", "work_phone",
)
EMAIL_KEYS = ("email_1", "email_2", "email", "email_address", "debtor_email")
UUID_PATTERN = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)


def is_identifier_field(name, values):
    """Keep database IDs and UUID-bearing fields out of the main table."""
    leaf = name.rsplit(".", 1)[-1]
    snake = re.sub(r"(?<!^)(?=[A-Z])", "_", leaf).lower()
    compact = re.sub(r"[^a-z0-9]", "", leaf.lower())
    return (
        snake in {"id", "uuid"}
        or snake.endswith(("_id", "_uuid"))
        or compact in {"clientid", "debtid", "assignedagentid", "userid"}
        or "uuid" in compact
        or any(UUID_PATTERN.search(str(value)) for value in values if value)
    )


def partition_table_fields(rows):
    """Return populated visible columns and identifiers for See more."""
    keys = list(dict.fromkeys(
        key for row in rows for key, value in row.items() if value.strip()
    ))
    visible, hidden = [], []
    for key in keys:
        values = [row.get(key, "") for row in rows]
        (hidden if is_identifier_field(key, values) else visible).append(key)
    return visible, hidden


def client_details(account):
    """Return the client record without mixing in account or agency contact data."""
    if not isinstance(account, dict):
        return {}
    for name in ("client", "debtor", "customer"):
        if name in account:
            return account[name] if isinstance(account[name], dict) else {}
    return account


def find_contact(account, keys):
    """Find a contact value in the client record."""
    if not isinstance(account, dict):
        return None
    details = client_details(account)
    if details is not account:
        return find_contact(details, keys)
    lower = {re.sub(r"[^a-z0-9]", "", str(key).lower()): value
             for key, value in account.items()}
    for key in keys:
        value = lower.get(re.sub(r"[^a-z0-9]", "", key.lower()))
        if isinstance(value, (str, int)) and str(value).strip():
            return str(value).strip()
    for value in account.values():
        if isinstance(value, dict):
            found = find_contact(value, keys)
            if found:
                return found
    return None


def display_value(account, *keys):
    for key in keys:
        value = account.get(key)
        if value is not None and str(value).strip() and not isinstance(value, (dict, list)):
            return str(value)
    return ""


def flatten_record(record, prefix=""):
    """Expose every API field as a table column, including nested debtor fields."""
    result = {}
    for key, value in record.items():
        name = f"{prefix}.{key}" if prefix else str(key)
        if isinstance(value, dict):
            result.update(flatten_record(value, name))
        elif isinstance(value, list):
            result[name] = json.dumps(value, ensure_ascii=False, default=str) if value else ""
        else:
            result[name] = "" if value is None else str(value)
    return result


def debtor_columns(account):
    debtor = client_details(account)
    title = display_value(debtor, "title")
    first = display_value(debtor, "firstname", "first_name", "firstName", "given_name")
    surname = display_value(debtor, "surname", "last_name", "lastName", "lastname", "family_name")
    if not first or not surname:
        full = display_value(debtor, "full_name", "fullName", "name")
        parts = full.strip().split(None, 1)
        first = first or (parts[0] if parts else "")
        surname = surname or (parts[1] if len(parts) > 1 else "")
    return (
        title, first, surname,
        find_contact(account, EMAIL_KEYS) or "",
        find_contact(account, PHONE_KEYS) or "",
        display_value(account, "calculated_debt", "debt_amount", "amount_due",
                      "outstanding_balance", "balance", "principal"),
    )


def normalize_phone(value):
    digits = re.sub(r"\D", "", value or "")
    if not 7 <= len(digits) <= 15:
        return None
    return ("+" if value.strip().startswith("+") else "") + digits


def recalculate_days_overdue(account, today=None):
    """Use the default date, rather than the possibly stale imported count."""
    default_date = account.get("date_of_default")
    if isinstance(default_date, datetime):
        default_date = default_date.date()
    elif isinstance(default_date, str):
        try:
            default_date = date.fromisoformat(default_date[:10])
        except ValueError:
            default_date = None
    if isinstance(default_date, date):
        account["days_overdue"] = max(((today or date.today()) - default_date).days, 0)
    else:
        account["days_overdue"] = None
    return account


class PhonePanel(ctk.CTkToplevel):
    """In-app call/SMS shell ready for a future Twilio connection."""
    def __init__(self, master, kind, phone):
        super().__init__(master)
        title = "Call debtor" if kind == "call" else "Send SMS"
        self.title(title)
        self.geometry("430x340" if kind == "sms" else "430x230")
        self.resizable(False, False)
        self.transient(master.winfo_toplevel())
        ctk.CTkLabel(self, text=title, font=ctk.CTkFont(size=22, weight="bold")).pack(
            anchor="w", padx=20, pady=(20, 12)
        )
        ctk.CTkLabel(self, text=f"Confirmed number: {phone}", anchor="w").pack(
            fill="x", padx=20, pady=(0, 12)
        )
        if kind == "sms":
            ctk.CTkTextbox(self, height=110).pack(fill="both", expand=True, padx=20, pady=(0, 12))
        ctk.CTkLabel(
            self, text="Twilio connection pending", text_color="#9CA3AF", anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 12))
        ctk.CTkButton(
            self, text="Start call" if kind == "call" else "Send SMS", state="disabled"
        ).pack(side="left", padx=(20, 8), pady=(0, 20))
        ctk.CTkButton(self, text="Close", command=self.destroy).pack(
            side="right", padx=(8, 20), pady=(0, 20)
        )


class EmailPanel(ctk.CTkToplevel):
    """Local email composer ready for a future email API service."""
    def __init__(self, master, address):
        super().__init__(master)
        self.title("Email client")
        self.geometry("550x460")
        self.minsize(450, 380)
        self.transient(master.winfo_toplevel())
        ctk.CTkLabel(
            self, text="Email client", font=ctk.CTkFont(size=22, weight="bold")
        ).pack(anchor="w", padx=20, pady=(20, 12))
        ctk.CTkLabel(self, text="To", anchor="w").pack(fill="x", padx=20)
        self.to_entry = ctk.CTkEntry(self)
        self.to_entry.pack(fill="x", padx=20, pady=(4, 12))
        self.to_entry.insert(0, address)
        ctk.CTkLabel(self, text="Subject", anchor="w").pack(fill="x", padx=20)
        self.subject_entry = ctk.CTkEntry(self)
        self.subject_entry.pack(fill="x", padx=20, pady=(4, 12))
        ctk.CTkLabel(self, text="Message", anchor="w").pack(fill="x", padx=20)
        self.message_box = ctk.CTkTextbox(self, height=150)
        self.message_box.pack(fill="both", expand=True, padx=20, pady=(4, 12))
        ctk.CTkLabel(
            self, text="Email API connection pending", text_color="#9CA3AF", anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 12))
        buttons = ctk.CTkFrame(self, fg_color="transparent")
        buttons.pack(fill="x", padx=20, pady=(0, 20))
        self.send_button = ctk.CTkButton(buttons, text="Send email", state="disabled")
        self.send_button.pack(side="left")
        ctk.CTkButton(buttons, text="Close", command=self.destroy).pack(side="right")


class SeeMorePanel(ctk.CTkToplevel):
    """Display identifiers for the currently selected account on demand."""
    def __init__(self, master, fields):
        super().__init__(master)
        self.title("Account identifiers")
        self.geometry("560x360")
        self.minsize(420, 260)
        self.transient(master.winfo_toplevel())
        ctk.CTkLabel(
            self, text="Account identifiers", font=ctk.CTkFont(size=22, weight="bold")
        ).pack(anchor="w", padx=20, pady=(20, 12))
        details = ctk.CTkTextbox(self, wrap="word")
        details.pack(fill="both", expand=True, padx=20, pady=(0, 12))
        details.insert("1.0", "\n".join(f"{key}: {value}" for key, value in fields)
                       if fields else "No identifiers are available for this account.")
        details.configure(state="disabled")
        ctk.CTkButton(self, text="Close", command=self.destroy).pack(
            anchor="e", padx=20, pady=(0, 20)
        )


class PaymentPanel(ctk.CTkToplevel):
    """Capture a payment and its mandatory proof as a pending local record."""
    def __init__(self, master, debt_id, store=None):
        super().__init__(master)
        self.debt_id = debt_id
        self.store = store or PendingPaymentStore()
        self.proof_path = None
        self.title("Capture pending payment")
        self.geometry("520x500")
        self.minsize(460, 440)
        self.transient(master.winfo_toplevel())
        ctk.CTkLabel(
            self, text="Capture payment", font=ctk.CTkFont(size=22, weight="bold")
        ).pack(anchor="w", padx=20, pady=(20, 4))
        ctk.CTkLabel(
            self, text="Saved locally as pending until a payment API is available.",
            text_color="#9CA3AF", anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 14))
        ctk.CTkLabel(self, text="Amount", anchor="w").pack(fill="x", padx=20)
        self.amount_entry = ctk.CTkEntry(self, placeholder_text="0.00")
        self.amount_entry.pack(fill="x", padx=20, pady=(4, 10))
        ctk.CTkLabel(self, text="Payment date (YYYY-MM-DD)", anchor="w").pack(fill="x", padx=20)
        self.date_entry = ctk.CTkEntry(self)
        self.date_entry.pack(fill="x", padx=20, pady=(4, 10))
        self.date_entry.insert(0, date.today().isoformat())
        ctk.CTkLabel(self, text="Method", anchor="w").pack(fill="x", padx=20)
        self.method = ctk.CTkOptionMenu(self, values=["EFT", "Cash", "Card", "Other"])
        self.method.pack(fill="x", padx=20, pady=(4, 10))
        ctk.CTkLabel(self, text="Reference", anchor="w").pack(fill="x", padx=20)
        self.reference_entry = ctk.CTkEntry(self)
        self.reference_entry.pack(fill="x", padx=20, pady=(4, 10))
        self.proof_label = ctk.CTkLabel(
            self, text="Proof of payment required (PDF, PNG, or JPEG)", anchor="w"
        )
        self.proof_label.pack(fill="x", padx=20, pady=(4, 8))
        ctk.CTkButton(self, text="Attach proof", command=self.choose_proof).pack(
            anchor="w", padx=20, pady=(0, 14)
        )
        buttons = ctk.CTkFrame(self, fg_color="transparent")
        buttons.pack(fill="x", padx=20, pady=(0, 20))
        ctk.CTkButton(
            buttons, text="Save pending payment", command=self.capture
        ).pack(side="left")
        ctk.CTkButton(buttons, text="Cancel", command=self.destroy).pack(side="right")

    def choose_proof(self):
        path = filedialog.askopenfilename(
            parent=self, title="Attach proof of payment",
            filetypes=[("Proof of payment", "*.pdf *.png *.jpg *.jpeg")],
        )
        if path:
            self.proof_path = path
            self.proof_label.configure(text=f"Proof: {Path(path).name}")

    def capture(self):
        try:
            self.store.capture(
                self.debt_id, self.amount_entry.get(), self.date_entry.get(),
                self.method.get(), self.reference_entry.get(), self.proof_path,
            )
        except PaymentCaptureError as ex:
            messagebox.showwarning("Payment not saved", str(ex), parent=self)
            return
        except (OSError, sqlite3.Error) as ex:
            messagebox.showerror("Payment not saved", str(ex), parent=self)
            return
        messagebox.showinfo(
            "Pending payment saved",
            "Payment and proof were saved locally. The payment has not been sent to the server.",
            parent=self,
        )
        self.destroy()


class WorkQueue(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="#0F172A")
        self.pack(fill="both", expand=True)
        self.accounts = self.fetch_accounts()
        self.index = 0
        self.account = {}
        self.build()

    def fetch_accounts(self):
        try:
            data = api.get_accounts()
            if isinstance(data, dict):
                data = data.get("accounts") or data.get("data") or []
                if isinstance(data, dict):
                    data = data.get("accounts") or data.get("items") or []
            return [recalculate_days_overdue(row) for row in data if isinstance(row, dict)] if isinstance(data, list) else []
        except Exception as ex:
            messagebox.showerror("Data Error", f"Unable to load accounts: {ex}")
            return []

    def build(self):
        content = ctk.CTkScrollableFrame(self, fg_color="#0F172A")
        content.pack(fill="both", expand=True, padx=16, pady=12)

        ctk.CTkLabel(
            content, text="Work Queue", anchor="w",
            font=ctk.CTkFont(size=24, weight="bold")
        ).pack(fill="x", pady=(0, 12))

        actions = ctk.CTkFrame(content, fg_color="transparent")
        actions.pack(fill="x", pady=(0, 12))
        for label, kind in (("Call debtor", "call"), ("Send SMS", "sms"), ("Send email", "email")):
            ctk.CTkButton(
                actions, text=label, width=130, height=38,
                command=lambda selected_kind=kind: self.open_contact(selected_kind),
            ).pack(side="left", padx=(0, 10))
        ctk.CTkButton(
            actions, text="See more", width=130, height=38,
            state="normal" if self.accounts else "disabled", command=self.see_more,
        ).pack(side="left", padx=(0, 10))
        ctk.CTkButton(
            actions, text="Capture payment", width=150, height=38,
            state="normal" if self.accounts else "disabled", command=self.open_payment_panel,
        ).pack(side="left")

        table_card = ctk.CTkFrame(content, fg_color="#172033")
        table_card.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(
            table_card, text=f"Assigned accounts ({len(self.accounts)})",
            anchor="w", font=ctk.CTkFont(size=18, weight="bold")
        ).pack(fill="x", padx=14, pady=(12, 8))

        table_area = ctk.CTkFrame(table_card, fg_color="transparent")
        table_area.pack(fill="both", expand=True, padx=12, pady=(0, 12))
        table_area.grid_rowconfigure(0, weight=1)
        table_area.grid_columnconfigure(0, weight=1)
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure(
            "WorkQueue.Treeview", background="#172033", fieldbackground="#172033",
            foreground="#F9FAFB", rowheight=28, borderwidth=0
        )
        style.configure(
            "WorkQueue.Treeview.Heading", background="#1F2937",
            foreground="#F9FAFB", font=("Segoe UI", 10, "bold")
        )
        style.map("WorkQueue.Treeview", background=[("selected", "#2563EB")])
        primary_columns = ("Title", "Client name", "Surname", "Email", "Phone number", "Debt amount")
        primary_rows = [debtor_columns(account) for account in self.accounts]
        visible_primary = [index for index in range(len(primary_columns))
                           if any(row[index].strip() for row in primary_rows)]
        self.flat_rows = [flatten_record(account) for account in self.accounts]
        visible_fields, self.hidden_fields = partition_table_fields(self.flat_rows)
        consumed_fields = {
            "client.title", "client.firstname", "client.surname", "client.email_1", "client.cell_phone_1",
            "debtor.firstname", "debtor.first_name", "debtor.surname",
            "debtor.title", "debtor.email", "debtor.email_address", "debtor.cell_number",
            "calculated_debt",
        }
        extra_columns = [key for key in visible_fields if key not in consumed_fields]
        self.visible_primary = visible_primary
        self.extra_columns = extra_columns
        column_labels = tuple(primary_columns[index] for index in visible_primary) + tuple(extra_columns)
        columns = tuple(f"column_{index}" for index in range(len(column_labels)))
        self.table = ttk.Treeview(
            table_area, columns=columns, show="headings", height=12,
            selectmode="browse", style="WorkQueue.Treeview"
        )
        for index, name in enumerate(column_labels):
            width = (90, 150, 150, 220, 170, 150)[visible_primary[index]] if index < len(visible_primary) else 150
            self.table.heading(columns[index], text=name)
            self.table.column(columns[index], width=width, minwidth=100, stretch=False, anchor="w")
        self.table.grid(row=0, column=0, sticky="nsew")
        yscroll = ttk.Scrollbar(table_area, orient="vertical", command=self.table.yview)
        yscroll.grid(row=0, column=1, sticky="ns")
        xscroll = ttk.Scrollbar(table_area, orient="horizontal", command=self.table.xview)
        xscroll.grid(row=1, column=0, sticky="ew")
        self.table.configure(yscrollcommand=yscroll.set, xscrollcommand=xscroll.set)
        self.table.bind("<<TreeviewSelect>>", self.on_select)

        for index, account in enumerate(self.accounts):
            row = self.flat_rows[index]
            self.table.insert("", "end", iid=str(index), values=(
                *(primary_rows[index][column] for column in visible_primary),
                *(row.get(key, "") for key in extra_columns)
            ))

        outcome_card = ctk.CTkFrame(content, width=360, fg_color="#172033")
        outcome_card.pack(anchor="w")
        ctk.CTkLabel(
            outcome_card, text="Edit account", anchor="w",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(fill="x", padx=14, pady=(12, 8))
        ctk.CTkLabel(outcome_card, text="Account status", anchor="w").pack(
            fill="x", padx=14, pady=(2, 4)
        )
        self.status = ctk.CTkOptionMenu(
            outcome_card, values=["ACTIVE", "CLOSED", "WRITTEN_OFF"]
        )
        self.status.pack(fill="x", padx=14, pady=(0, 8))
        ctk.CTkLabel(outcome_card, text="Notes", anchor="w").pack(
            fill="x", padx=14, pady=(2, 4)
        )
        self.notes = ctk.CTkTextbox(outcome_card, height=120)
        self.notes.pack(fill="both", expand=True, padx=14, pady=6)
        buttons = ctk.CTkFrame(outcome_card, fg_color="transparent")
        buttons.pack(fill="x", padx=14, pady=(6, 14))
        ctk.CTkButton(buttons, text="Save changes", width=110, command=self.save).pack(
            side="left", fill="x", expand=True, padx=(0, 5)
        )
        ctk.CTkButton(buttons, text="Save & Next", width=110,
                      command=self.next_account).pack(side="left", fill="x", expand=True)

        if self.accounts:
            self.table.selection_set("0")
            self.on_select()

    def on_select(self, _event=None):
        selection = self.table.selection()
        if not selection:
            return
        self.index = int(selection[0])
        self.account = self.accounts[self.index]
        self.status.set(str(self.account.get("status") or "ACTIVE"))
        self.notes.delete("1.0", "end")
        self.notes.insert("1.0", str(self.account.get("notes") or ""))

    def refresh_table_row(self):
        row = flatten_record(self.account)
        self.flat_rows[self.index] = row
        self.table.item(str(self.index), values=(
            *(debtor_columns(self.account)[column] for column in self.visible_primary),
            *(row.get(key, "") for key in self.extra_columns),
        ))

    def open_contact(self, kind):
        if not self.account:
            messagebox.showwarning("No account", "Select an account first.")
            return
        if kind == "email":
            address = find_contact(self.account, EMAIL_KEYS)
            if not address:
                messagebox.showwarning("No email", "This debtor has no email address.")
                return
            self.open_email_panel(address)
            return

        raw_phone = find_contact(self.account, PHONE_KEYS)
        if not raw_phone:
            messagebox.showwarning("No phone number", "This debtor has no phone number.")
            return
        confirmed = simpledialog.askstring(
            "Confirm phone number",
            "Confirm or edit the debtor phone number before continuing:",
            initialvalue=raw_phone, parent=self,
        )
        if confirmed is None:
            return
        phone = normalize_phone(confirmed)
        if not phone:
            messagebox.showwarning("Invalid phone number", "Enter a phone number with 7 to 15 digits.")
            return
        self.open_phone_panel(kind, phone)

    def open_phone_panel(self, kind, phone):
        PhonePanel(self, kind, phone)

    def open_email_panel(self, address):
        EmailPanel(self, address)

    def see_more(self):
        if not self.account:
            messagebox.showwarning("No account", "Select an account first.")
            return
        row = self.flat_rows[self.index]
        fields = [(key, row.get(key, "")) for key in self.hidden_fields if row.get(key, "").strip()]
        SeeMorePanel(self, fields)

    def open_payment_panel(self):
        if not self.account:
            messagebox.showwarning("No account", "Select an account first.")
            return
        debt_id = self.account.get("debt_id")
        if not debt_id:
            messagebox.showwarning("No debt ID", "This account cannot accept a payment capture.")
            return
        PaymentPanel(self, debt_id)

    def save(self):
        if not self.account:
            messagebox.showwarning("No account", "Select an account first.")
            return False
        debt_id = self.account.get("debt_id")
        if not debt_id:
            messagebox.showwarning("No debt ID", "This account cannot be updated.")
            return False
        status = self.status.get().strip()
        notes = self.notes.get("1.0", "end-1c")
        if len(notes) > 1000:
            messagebox.showwarning("Notes too long", "Notes cannot exceed 1000 characters.")
            return False
        if status not in ("ACTIVE", "CLOSED", "WRITTEN_OFF", "PAID"):
            messagebox.showwarning("Invalid status", "Select a valid account status.")
            return False
        changed_status = status != str(self.account.get("status") or "ACTIVE")
        changed_notes = notes != str(self.account.get("notes") or "")
        if not changed_status and not changed_notes:
            return True
        try:
            if changed_status:
                if status == "PAID":
                    messagebox.showwarning("Invalid status", "PAID cannot be selected here.")
                    return False
                api.update_account_status(debt_id, status)
                self.account["status"] = status
                self.refresh_table_row()
            if changed_notes:
                api.update_account_notes(debt_id, notes)
                self.account["notes"] = notes
                self.refresh_table_row()
        except Exception as ex:
            messagebox.showerror("Update failed", str(ex))
            return False
        messagebox.showinfo("Account updated", "Account changes were saved.")
        return True

    def next_account(self):
        if not self.save():
            return
        if not self.accounts:
            messagebox.showwarning("Next", "No accounts are available.")
            return
        if self.index + 1 >= len(self.accounts):
            messagebox.showinfo("Next", "You have reached the end of the work queue.")
            return
        self.table.selection_set(str(self.index + 1))
        self.table.see(str(self.index + 1))
        self.on_select()
