import sqlite3
import unittest
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from payment_store import PendingPaymentStore, PaymentCaptureError, validate_payment


class PaymentCaptureTests(unittest.TestCase):
    def test_proof_is_required_and_amount_and_date_are_validated(self):
        with self.assertRaisesRegex(PaymentCaptureError, "Attach proof"):
            validate_payment("125.00", "2026-09-18", None, today=date(2026, 9, 18))
        with self.assertRaisesRegex(PaymentCaptureError, "at most two"):
            validate_payment("125.001", "2026-09-18", "receipt.pdf", today=date(2026, 9, 18))
        with self.assertRaisesRegex(PaymentCaptureError, "future"):
            validate_payment("125.00", "2026-09-19", "receipt.pdf", today=date(2026, 9, 18))

    def test_capture_stores_proof_with_pending_payment(self):
        connection = sqlite3.connect(":memory:")
        store = PendingPaymentStore(connection=connection)
        with patch.object(Path, "is_file", return_value=True), \
                patch.object(Path, "stat", return_value=SimpleNamespace(st_size=12)), \
                patch.object(Path, "read_bytes", return_value=b"%PDF-proof-data"):
            payment_id = store.capture(
                "debt-123", "125.50", date.today().isoformat(),
                "EFT", "REF-1", "receipt.pdf"
            )
        row = connection.execute(
            "SELECT payment_id, debt_id, amount_cents, proof_name, proof_type, proof_data, sync_status "
            "FROM pending_payments"
        ).fetchone()
        self.assertEqual(row, (
            payment_id, "debt-123", 12550, "receipt.pdf", "application/pdf",
            b"%PDF-proof-data", "PENDING"
        ))
        connection.close()

    def test_invalid_proof_content_is_rejected(self):
        with patch.object(Path, "is_file", return_value=True), \
                patch.object(Path, "stat", return_value=SimpleNamespace(st_size=4)), \
                patch.object(Path, "read_bytes", return_value=b"text"):
            with self.assertRaisesRegex(PaymentCaptureError, "PDF, PNG, or JPEG"):
                validate_payment("1.00", date.today().isoformat(), "fake.pdf")


if __name__ == "__main__":
    unittest.main()
