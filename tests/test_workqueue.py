import unittest
from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from workqueue import (
    WorkQueue, find_contact, flatten_record, debtor_columns,
    normalize_phone, partition_table_fields, is_identifier_field,
    recalculate_days_overdue, PHONE_KEYS, EMAIL_KEYS,
)


class WorkQueueTests(unittest.TestCase):
    def setUp(self):
        self.account = {
            "contract_number": "ACC-1",
            "calculated_debt": "1250.00",
            "email": "agency@example.com",
            "client": {
                "title": "Ms",
                "firstname": "Jane",
                "surname": "Doe",
                "cell_phone_1": "+27 82 123 4567",
                "email_1": "jane@example.com",
                "email_2": None,
                "extra_field": "visible in full record",
            },
        }

    def test_nested_debtor_contact_takes_priority(self):
        self.assertEqual(find_contact(self.account, PHONE_KEYS), "+27 82 123 4567")
        self.assertEqual(find_contact(self.account, EMAIL_KEYS), "jane@example.com")

    def test_all_fields_and_priority_columns(self):
        flattened = flatten_record(self.account)
        self.assertEqual(flattened["client.extra_field"], "visible in full record")
        self.assertEqual(debtor_columns(self.account), (
            "Ms", "Jane", "Doe", "jane@example.com", "+27 82 123 4567", "1250.00"
        ))

    def test_client_missing_contact_does_not_use_account_email(self):
        account = {"email": "agency@example.com", "client": {"email_1": None}}
        self.assertIsNone(find_contact(account, EMAIL_KEYS))
        self.assertIsNone(find_contact({"email": "agency@example.com", "client": None}, EMAIL_KEYS))

    def test_days_overdue_uses_default_date_on_load(self):
        today = date(2026, 9, 18)
        row = {"date_of_default": "2026-09-08T00:00:00.000Z", "days_overdue": 1}
        self.assertEqual(recalculate_days_overdue(row, today)["days_overdue"], 10)
        self.assertEqual(recalculate_days_overdue({"date_of_default": "2026-09-25"}, today)["days_overdue"], 0)
        self.assertIsNone(recalculate_days_overdue({"date_of_default": None}, today)["days_overdue"])

    @patch("workqueue.api.get_accounts")
    def test_every_loaded_debt_is_recalculated(self, get_accounts):
        today = date.today()
        get_accounts.return_value = [
            {"date_of_default": (today - timedelta(days=17)).isoformat(), "days_overdue": 0},
            {"date_of_default": (today - timedelta(days=8)).isoformat(), "days_overdue": 0},
        ]
        rows = WorkQueue.fetch_accounts(SimpleNamespace())
        self.assertEqual([row["days_overdue"] for row in rows], [17, 8])

    def test_ids_and_uuid_values_are_reserved_for_see_more(self):
        uuid = "123e4567-e89b-12d3-a456-426614174000"
        rows = [flatten_record({
            "debt_id": uuid, "client_id": uuid, "assigned_agent_id": uuid,
            "client": {"id": uuid, "firstname": "Jane", "id_number": "9001015009088"},
            "external_ref": uuid, "status": "PAID",
        })]
        visible, hidden = partition_table_fields(rows)
        self.assertEqual(set(hidden), {
            "debt_id", "client_id", "assigned_agent_id", "client.id", "external_ref"
        })
        self.assertIn("client.firstname", visible)
        self.assertIn("client.id_number", visible)
        self.assertIn("status", visible)
        self.assertFalse(is_identifier_field("paid", ["PAID"]))

    @patch("workqueue.SeeMorePanel")
    def test_see_more_uses_selected_account_only(self, panel):
        page = SimpleNamespace(
            account={"debt_id": "second"}, index=1,
            flat_rows=[{"debt_id": "first"}, {"debt_id": "second"}],
            hidden_fields=["debt_id"],
        )
        WorkQueue.see_more(page)
        panel.assert_called_once_with(page, [("debt_id", "second")])

    def test_phone_confirmation_opens_in_app_panels(self):
        page = SimpleNamespace(account=self.account, open_phone_panel=lambda *_: None)
        with patch("workqueue.simpledialog.askstring", return_value="+27 82 123 4567") as prompt, \
                patch.object(page, "open_phone_panel") as open_panel:
            WorkQueue.open_contact(page, "call")
            WorkQueue.open_contact(page, "sms")
        self.assertEqual(prompt.call_count, 2)
        self.assertEqual([call.args for call in open_panel.call_args_list], [
            ("call", "+27821234567"), ("sms", "+27821234567")
        ])

    def test_cancelled_or_invalid_number_does_not_open_panel(self):
        page = SimpleNamespace(account=self.account, open_phone_panel=lambda *_: None)
        with patch.object(page, "open_phone_panel") as open_panel, \
                patch("workqueue.messagebox.showwarning") as warning:
            with patch("workqueue.simpledialog.askstring", return_value=None):
                WorkQueue.open_contact(page, "call")
            with patch("workqueue.simpledialog.askstring", return_value="123"):
                WorkQueue.open_contact(page, "sms")
        open_panel.assert_not_called()
        warning.assert_called_once()
        self.assertIsNone(normalize_phone("123"))

    def test_email_opens_local_composer(self):
        page = SimpleNamespace(account=self.account, open_email_panel=lambda *_: None)
        with patch.object(page, "open_email_panel") as open_panel:
            WorkQueue.open_contact(page, "email")
        open_panel.assert_called_once_with("jane@example.com")

    @patch("workqueue.messagebox.showwarning")
    def test_missing_contact_does_not_open_app(self, warning):
        page = SimpleNamespace(account={"id": 1})
        WorkQueue.open_contact(page, "call")
        warning.assert_called_once()


if __name__ == "__main__":
    unittest.main()
