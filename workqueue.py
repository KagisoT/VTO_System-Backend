import customtkinter as ctk
from tkinter import messagebox

from api import api


class WorkQueue(ctk.CTkFrame):

    def __init__(self, master):
        super().__init__(master)
        self.pack(fill="both", expand=True)
        self.index = 0
        self.accounts = self.fetch_accounts()
        self.account = self.accounts[self.index] if self.accounts else {}
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

        top = ctk.CTkFrame(self, height=60)

        top.pack(fill="x")

        ctk.CTkLabel(
            top,
            text="Work Queue",
            font=("Segoe UI", 24, "bold")
        ).pack(side="left", padx=20, pady=15)

        body = ctk.CTkFrame(self)

        body.pack(fill="both", expand=True, padx=15, pady=15)

        # LEFT

        left = ctk.CTkFrame(body)

        left.pack(side="left", fill="both", expand=True, padx=(0, 10))

        ctk.CTkLabel(
            left,
            text="Account Information",
            font=("Segoe UI", 20, "bold")
        ).pack(anchor="w", padx=20, pady=20)

        self.account_info_labels = {}
        self.account_info_labels["contract_number"] = self.info(left, "Contract number", self.account.get("contract_number", ""))
        self.account_info_labels["jabulani_account_no"] = self.info(left, "Jabulani account", self.account.get("jabulani_account_no", ""))
        self.account_info_labels["debtor_id"] = self.info(left, "Debtor ID", self.account.get("debtor_id", ""))
        self.account_info_labels["loan_id"] = self.info(left, "Loan ID", self.account.get("loan_id", ""))
        self.account_info_labels["principal"] = self.info(left, "Principal", self.account.get("principal", ""))
        self.account_info_labels["calculated_debt"] = self.info(left, "Calculated debt", self.account.get("calculated_debt", ""))
        self.account_info_labels["days_overdue"] = self.info(left, "Days overdue", self.account.get("days_overdue", ""))
        self.account_info_labels["notes"] = self.info(left, "Agency", self.account.get("notes", ""))
        self.account_info_labels["status"] = self.info(left, "Status", self.account.get("status", ""))
        self.account_info_labels["target_date"] = self.info(left, "Target date", self.account.get("target_date", ""))
        self.account_info_labels["date_of_default"] = self.info(left, "Default date", self.account.get("date_of_default", ""))

        # RIGHT

        right = ctk.CTkFrame(body, width=450)

        right.pack(side="right", fill="y")

        ctk.CTkLabel(
            right,
            text="Call Outcome",
            font=("Segoe UI", 20, "bold")
        ).pack(anchor="w", padx=20, pady=20)

        self.outcome = ctk.CTkOptionMenu(
            right,
            values=[
                "No Answer",
                "Busy",
                "Voicemail",
                "Promise To Pay",
                "Paid",
                "Dispute",
                "Wrong Number"
            ]
        )

        self.outcome.pack(fill="x", padx=20, pady=10)

        self.ptp_amount = ctk.CTkEntry(
            right,
            placeholder_text="PTP Amount"
        )

        self.ptp_amount.pack(fill="x", padx=20, pady=10)

        self.ptp_date = ctk.CTkEntry(
            right,
            placeholder_text="PTP Date (YYYY-MM-DD)"
        )

        self.ptp_date.pack(fill="x", padx=20, pady=10)

        self.notes = ctk.CTkTextbox(
            right,
            height=180
        )

        self.notes.pack(fill="both", padx=20, pady=10)

        button_frame = ctk.CTkFrame(right, fg_color="transparent")

        button_frame.pack(fill="x", padx=20, pady=20)

        ctk.CTkButton(
            button_frame,
            text="Save",
            command=self.save
        ).pack(side="left", expand=True, padx=5)

        ctk.CTkButton(
            button_frame,
            text="Save & Next",
            command=self.next_account
        ).pack(side="left", expand=True, padx=5)

    def info(self, parent, title, value):

        frame = ctk.CTkFrame(parent)

        frame.pack(fill="x", padx=20, pady=5)

        ctk.CTkLabel(
            frame,
            text=title,
            width=140,
            anchor="w",
            font=("Segoe UI", 14, "bold")
        ).pack(side="left", padx=10, pady=10)

        value_label = ctk.CTkLabel(
            frame,
            text=value,
            anchor="w"
        )
        value_label.pack(side="left", padx=10)
        return value_label

    def update_account_information(self):
        self.account = self.accounts[self.index] if self.accounts else {}
        self.account_info_labels["contract_number"].configure(text=self.account.get("contract_number", ""))
        self.account_info_labels["jabulani_account_no"].configure(text=self.account.get("jabulani_account_no", ""))
        self.account_info_labels["debtor_id"].configure(text=self.account.get("debtor_id", ""))
        self.account_info_labels["loan_id"].configure(text=self.account.get("loan_id", ""))
        self.account_info_labels["principal"].configure(text=self.account.get("principal", ""))
        self.account_info_labels["calculated_debt"].configure(text=self.account.get("calculated_debt", ""))
        self.account_info_labels["days_overdue"].configure(text=self.account.get("days_overdue", ""))
        self.account_info_labels["notes"].configure(text=self.account.get("notes", ""))
        self.account_info_labels["status"].configure(text=self.account.get("status", ""))
        self.account_info_labels["target_date"].configure(text=self.account.get("target_date", ""))
        self.account_info_labels["date_of_default"].configure(text=self.account.get("date_of_default", ""))

    def save(self):

        # TODO: POST /calls
        # TODO: POST /notes
        # TODO: POST /arrangements

        messagebox.showinfo(
            "Saved",
            "Call logged successfully."
        )

    def next_account(self):
        self.save()

        if not self.accounts:
            messagebox.showwarning("Next", "No accounts are available.")
            return

        self.index += 1
        if self.index >= len(self.accounts):
            messagebox.showinfo("Next", "You have reached the end of the work queue.")
            self.index = len(self.accounts) - 1
            return

        self.update_account_information()
        messagebox.showinfo("Next", "Loaded next account.")

def load_account(self):

    self.account = accounts[self.index]

    self.ref_value.configure(text=self.account["reference"])

    self.name_value.configure(text=self.account["name"])

    self.id_value.configure(text=self.account["id_number"])

    self.cell_value.configure(text=self.account["cell"])

    self.emp_value.configure(text=self.account["employer"])

    self.balance_value.configure(text=self.account["balance"])

    self.arrears_value.configure(text=self.account["arrears"])