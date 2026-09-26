import unittest
from unittest.mock import patch

from api import ApiService
from arrangements import ArrangementError, build_arrangement


class ArrangementTests(unittest.TestCase):
    def test_monthly_schedule_and_backend_payload(self):
        payload, schedule = build_arrangement(
            "debt-1", "2026-01-31", "2026-03-31", "250.00",
            "100.00", "MONTHLY", "3", "Agreed by phone", "300.00",
        )
        self.assertEqual(schedule, [
            ("2026-01-31", "100.00"),
            ("2026-02-28", "100.00"),
            ("2026-03-31", "50.00"),
        ])
        self.assertEqual(payload, {
            "debt_id": "debt-1", "start_date": "2026-01-31", "end_date": "2026-03-31",
            "total_amount": 250.0, "installment_amount": 100.0,
            "frequency": "MONTHLY", "number_of_installments": 3,
            "notes": "Agreed by phone",
        })

    def test_invalid_schedule_is_rejected(self):
        cases = [
            ("2026-01-01", "", "100", "50", "MONTHLY", "3", "fit"),
            ("2026-01-01", "", "150", "50", "MONTHLY", "2", "fit"),
            ("2026-01-01", "2026-01-15", "200", "100", "MONTHLY", "2", "End date"),
            ("2026-01-01", "", "200", "100", "WEEKLY", "0", "installments"),
            ("2026-01-01", "", "200", "100", "DAILY", "2", "frequency"),
        ]
        for start, end, total, installment, frequency, count, expected in cases:
            with self.subTest(expected=expected), self.assertRaisesRegex(ArrangementError, expected):
                build_arrangement("debt-1", start, end, total, installment,
                                  frequency, count)

    def test_outstanding_balance_guard(self):
        with self.assertRaisesRegex(ArrangementError, "outstanding balance"):
            build_arrangement("debt-1", "2026-01-01", "", "200", "100",
                              "WEEKLY", "2", outstanding_balance="150")

    def test_api_routes(self):
        service = ApiService()
        payload = {"debt_id": "debt-1", "total_amount": 200}
        with patch.object(service, "_request") as request:
            service.get_arrangements_for_debt("debt-1")
            service.create_payment_arrangement(payload)
            service.get_payment_history("debt-1")
        self.assertEqual([call.args for call in request.call_args_list], [
            ("GET", "/payments/arrangements/debt/debt-1"),
            ("POST", "/payments/arrangements", payload),
            ("GET", "/payments/debt/debt-1"),
        ])


if __name__ == "__main__":
    unittest.main()
