"""Durable local capture of payments awaiting a server payment API."""

import os
import sqlite3
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from uuid import uuid4


MAX_PROOF_BYTES = 10 * 1024 * 1024


class PaymentCaptureError(ValueError):
    pass


def default_database_path():
    base = os.environ.get("LOCALAPPDATA") or Path.home() / ".local" / "state"
    return Path(base) / "VTO Collector" / "pending_payments.sqlite3"


def validate_payment(amount, payment_date, proof_path, today=None):
    try:
        money = Decimal(str(amount).strip())
    except (InvalidOperation, AttributeError):
        raise PaymentCaptureError("Enter a valid payment amount.") from None
    try:
        valid_amount = (money.is_finite() and Decimal("0") < money <= Decimal("999999999.99")
                        and money == money.quantize(Decimal("0.01")))
    except InvalidOperation:
        valid_amount = False
    if not valid_amount:
        raise PaymentCaptureError("Payment amount must be positive with at most two decimal places.")
    try:
        paid_on = date.fromisoformat(str(payment_date).strip())
    except ValueError:
        raise PaymentCaptureError("Enter the payment date as YYYY-MM-DD.") from None
    if paid_on > (today or date.today()):
        raise PaymentCaptureError("Payment date cannot be in the future.")
    if not proof_path:
        raise PaymentCaptureError("Attach proof of payment before saving.")
    path = Path(proof_path)
    try:
        if not path.is_file() or path.stat().st_size == 0:
            raise PaymentCaptureError("Select a non-empty proof of payment file.")
        if path.stat().st_size > MAX_PROOF_BYTES:
            raise PaymentCaptureError("Proof of payment must be 10 MB or smaller.")
        data = path.read_bytes()
    except OSError:
        raise PaymentCaptureError("Proof of payment could not be read.") from None
    if data.startswith(b"%PDF-"):
        media_type = "application/pdf"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        media_type = "image/png"
    elif data.startswith(b"\xff\xd8\xff"):
        media_type = "image/jpeg"
    else:
        raise PaymentCaptureError("Attach a PDF, PNG, or JPEG proof of payment.")
    return int(money * 100), paid_on.isoformat(), path.name, media_type, data


class PendingPaymentStore:
    def __init__(self, path=None, connection=None):
        self.path = Path(path) if path is not None else default_database_path()
        self.connection = connection

    def capture(self, debt_id, amount, payment_date, method, reference, proof_path):
        if not debt_id:
            raise PaymentCaptureError("Select a debt before capturing a payment.")
        cents, paid_on, proof_name, media_type, proof = validate_payment(
            amount, payment_date, proof_path
        )
        if self.connection is None:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            connection = sqlite3.connect(self.path)
        else:
            connection = self.connection
        payment_id = str(uuid4())
        try:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS pending_payments (
                    payment_id TEXT PRIMARY KEY,
                    debt_id TEXT NOT NULL,
                    amount_cents INTEGER NOT NULL,
                    payment_date TEXT NOT NULL,
                    method TEXT NOT NULL,
                    reference TEXT NOT NULL,
                    proof_name TEXT NOT NULL,
                    proof_type TEXT NOT NULL,
                    proof_data BLOB NOT NULL,
                    captured_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'PENDING'
                )
            """)
            connection.execute("""
                INSERT INTO pending_payments (
                    payment_id, debt_id, amount_cents, payment_date, method, reference,
                    proof_name, proof_type, proof_data, captured_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payment_id, str(debt_id), cents, paid_on, method, reference.strip(),
                proof_name, media_type, proof,
                datetime.now(timezone.utc).isoformat(),
            ))
            connection.commit()
        finally:
            if self.connection is None:
                connection.close()
        return payment_id
