import customtkinter as ctk
from tkinter import messagebox

from api import api
from workqueue import WorkQueue
from profile import Profile
from session import Session


class Dashboard(ctk.CTkFrame):

    def __init__(self, master):
        super().__init__(master)
        self.pack(fill="both", expand=True)
        self.accounts = self.fetch_accounts()
        self.build()

    def fetch_accounts(self):
        try:
            data = api.get_accounts()
            if isinstance(data, dict):
                return data.get("accounts") or data.get("data") or []
            return data if isinstance(data, list) else []
        except Exception as ex:
            messagebox.showerror("Data Error", f"Unable to load accounts: {ex}")
            return []

    def build(self):
        # Top header inside content area
        header = ctk.CTkFrame(self, height=72)
        header.pack(fill="x", padx=20, pady=12)

        ctk.CTkLabel(header, text="Account management", font=("Segoe UI", 20, "bold")).pack(side="left")

        # username on the right
        username = "Collector"
        if Session.user:
            username = Session.user.get("fullName") or Session.user.get("username", "Collector")

        ctk.CTkLabel(header, text=username, font=("Segoe UI", 14)).pack(side="right")

        # Search and action
        search = ctk.CTkEntry(header, width=420, placeholder_text="Search accounts, clients, arrangements...")
        search.pack(side="left", padx=20)

        ctk.CTkButton(header, text="Quick action", fg_color="#ff7b1a", width=140).pack(side="right", padx=12)

        # Summary cards
        cards = ctk.CTkFrame(self)
        cards.pack(fill="x", padx=20)

        self.summary_card(cards, "Total accounts", str(len(self.accounts))).pack(side="left", padx=10, pady=10)
        self.summary_card(cards, "Outstanding balance", self.format_total_balance()).pack(side="left", padx=10, pady=10)

        # Accounts table header
        header_cols = ctk.CTkFrame(self)
        header_cols.pack(fill="x", padx=20, pady=(10, 0))

        cols = [
            "Contract", "Jabulani account", "Debt", "Days overdue",
             "Status", "Notes", "Target date", "Default date"
        ]
        for c in cols:
            ctk.CTkLabel(header_cols, text=c, width=120, anchor="w", font=("Segoe UI", 12, "bold")).pack(side="left", padx=6)

        # Scrollable rows
        rows_frame = ctk.CTkScrollableFrame(self, height=360)
        rows_frame.pack(fill="both", expand=False, padx=20, pady=10)

        for acc in self.accounts:
            row = ctk.CTkFrame(rows_frame)
            row.pack(fill="x", pady=6)

            ctk.CTkLabel(row, text=acc.get("contract_number", ""), width=120, anchor="w").pack(side="left", padx=6)
            ctk.CTkLabel(row, text=acc.get("jabulani_account_no", ""), width=120, anchor="w").pack(side="left", padx=6)
            ctk.CTkLabel(row, text=acc.get("calculated_debt", acc.get("principal", "")), width=120, anchor="w").pack(side="left", padx=6)
            ctk.CTkLabel(row, text=acc.get("days_overdue", ""), width=120, anchor="w").pack(side="left", padx=6)
            ctk.CTkLabel(row, text=acc.get("Notes", ""), width=120, anchor="w").pack(side="left", padx=6)
            ctk.CTkLabel(row, text=acc.get("status", ""), width=120, anchor="w").pack(side="left", padx=6)
            ctk.CTkLabel(row, text=acc.get("target_date", ""), width=120, anchor="w").pack(side="left", padx=6)
            ctk.CTkLabel(row, text=acc.get("date_of_default", ""), width=120, anchor="w").pack(side="left", padx=6)

        # Action button
        ctk.CTkButton(self, text="Bulk action", width=140).pack(side="right", padx=20, pady=12)

    def summary_card(self, parent, title, value):
        frame = ctk.CTkFrame(parent, width=220, height=80)
        frame.pack_propagate(False)

        ctk.CTkLabel(frame, text=title, font=("Segoe UI", 12)).pack(anchor="w", padx=10, pady=(8, 0))
        ctk.CTkLabel(frame, text=value, font=("Segoe UI", 18, "bold")).pack(anchor="w", padx=10)

        return frame

    def format_total_balance(self):
        total = 0.0
        for acc in self.accounts:
            balance = acc.get("calculated_debt") or acc.get("principal") or acc.get("calculatedDebt") or ""
            if isinstance(balance, (int, float)):
                total += float(balance)
                continue
            if isinstance(balance, str):
                cleaned = balance.replace("R", "").replace(",", "").strip()
                try:
                    total += float(cleaned)
                except ValueError:
                    continue
        return f"R {total:,.0f}" if total else "R 0"
