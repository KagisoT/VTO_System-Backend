import customtkinter as ctk
from tkinter import messagebox, ttk

from api import api
from workqueue import WorkQueue
from profile import Profile
from session import Session


class Dashboard(ctk.CTkFrame):

    def __init__(self, master):
        super().__init__(master, fg_color="#0F172A")
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
        content = ctk.CTkScrollableFrame(self, fg_color="#0F172A")
        content.pack(fill="both", expand=True, padx=16, pady=12)

        header = ctk.CTkFrame(content, fg_color="transparent")
        header.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(
            header, text="Account management", text_color="#F9FAFB",
            font=ctk.CTkFont(size=24, weight="bold")
        ).pack(side="left")
        username = "Collector"
        if Session.user:
            username = Session.user.get("fullName") or Session.user.get("username", "Collector")
        ctk.CTkLabel(header, text=username, text_color="#9CA3AF").pack(side="right")

        toolbar = ctk.CTkFrame(content, fg_color="transparent")
        toolbar.pack(fill="x", pady=(0, 12))
        search = ctk.CTkEntry(
            toolbar, placeholder_text="Search accounts, clients, arrangements..."
        )
        search.pack(side="left", fill="x", expand=True, padx=(0, 12))
        ctk.CTkButton(
            toolbar, text="Quick action", width=130, fg_color="#2563EB"
        ).pack(side="right")

        cards = ctk.CTkFrame(content, fg_color="transparent")
        cards.pack(fill="x", pady=(0, 12))
        self.summary_card(cards, "Total accounts", str(len(self.accounts))).pack(
            side="left", fill="x", expand=True, padx=(0, 6)
        )
        self.summary_card(cards, "Outstanding balance", self.format_total_balance()).pack(
            side="left", fill="x", expand=True, padx=(6, 0)
        )

        table_frame = ctk.CTkFrame(content, fg_color="#172033")
        table_frame.pack(fill="both", expand=True)
        ctk.CTkLabel(
            table_frame, text="Assigned accounts", anchor="w",
            font=ctk.CTkFont(size=18, weight="bold")
        ).pack(fill="x", padx=14, pady=(12, 8))

        columns = (
            "Contract", "Jabulani account", "Debt", "Days overdue",
            "Status", "Notes", "Target date", "Default date"
        )
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure(
            "Collector.Treeview", background="#172033", fieldbackground="#172033",
            foreground="#F9FAFB", rowheight=30, borderwidth=0
        )
        style.configure(
            "Collector.Treeview.Heading", background="#1F2937",
            foreground="#F9FAFB", relief="flat", font=("Segoe UI", 10, "bold")
        )
        style.map("Collector.Treeview", background=[("selected", "#2563EB")])

        table_area = ctk.CTkFrame(table_frame, fg_color="transparent")
        table_area.pack(fill="both", expand=True, padx=12, pady=(0, 12))
        table_area.grid_rowconfigure(0, weight=1)
        table_area.grid_columnconfigure(0, weight=1)
        table = ttk.Treeview(
            table_area, columns=columns, show="headings", height=12,
            style="Collector.Treeview"
        )
        for name in columns:
            table.heading(name, text=name)
            table.column(name, width=140, minwidth=110, stretch=False, anchor="w")
        for acc in self.accounts:
            table.insert("", "end", values=(
                acc.get("contract_number", ""),
                acc.get("jabulani_account_no", ""),
                acc.get("calculated_debt", acc.get("principal", "")),
                acc.get("days_overdue", ""),
                acc.get("status", ""),
                acc.get("notes", acc.get("Notes", "")),
                acc.get("target_date", ""),
                acc.get("date_of_default", ""),
            ))

        table.grid(row=0, column=0, sticky="nsew")
        yscroll = ttk.Scrollbar(table_area, orient="vertical", command=table.yview)
        yscroll.grid(row=0, column=1, sticky="ns")
        xscroll = ttk.Scrollbar(table_area, orient="horizontal", command=table.xview)
        xscroll.grid(row=1, column=0, sticky="ew")
        table.configure(yscrollcommand=yscroll.set, xscrollcommand=xscroll.set)

        ctk.CTkButton(content, text="Bulk action", width=140).pack(
            anchor="e", pady=(12, 0)
        )

    def summary_card(self, parent, title, value):
        frame = ctk.CTkFrame(parent, height=80, fg_color="#172033")

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
