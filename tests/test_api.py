import json
import unittest
from unittest.mock import patch

from api import ApiService
from session import Session


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.ok = status_code < 400
        self.text = ""

    def json(self):
        return self._payload


class ApiServiceTests(unittest.TestCase):
    def test_get_tries_multiple_endpoints_until_success(self):
        service = ApiService()

        responses = [
            FakeResponse({"message": "not found"}, 404),
            FakeResponse({"accounts": [{"id": 1}]}, 200),
        ]

        with patch.object(ApiService, "_prepare_and_send", side_effect=responses) as mock_send:
            data = service.get(["/dashboard", "/dashboard/summary"])

        self.assertEqual(data, {"accounts": [{"id": 1}]})
        self.assertEqual(mock_send.call_count, 2)

    def test_normalizes_nested_auth_payloads(self):
        service = ApiService()

        payload = {
            "data": {
                "token": "abc123",
                "user": {
                    "id": 7,
                    "fullName": "Jane Doe",
                    "email": "jane@example.com"
                }
            }
        }

        token, user = service.extract_auth_data(payload)

        self.assertEqual(token, "abc123")
        self.assertEqual(user["fullName"], "Jane Doe")
        self.assertEqual(user["email"], "jane@example.com")

    def test_headers_include_user_data_and_token(self):
        service = ApiService()
        Session.token = "abc123"
        Session.user = {
            "id": 7,
            "email": "jane@example.com",
            "fullName": "Jane Doe",
            "username": "jdoe"
        }

        headers = service.headers()

        self.assertEqual(headers["Authorization"], "Bearer abc123")
        self.assertEqual(headers["X-Auth-Token"], "abc123")
        self.assertEqual(headers["X-User-Id"], "7")
        self.assertEqual(headers["X-User-Email"], "jane@example.com")
        self.assertEqual(headers["X-User-Name"], "Jane Doe")
        self.assertIn("X-User-Data", headers)
        self.assertEqual(json.loads(headers["X-User-Data"])["username"], "jdoe")


if __name__ == "__main__":
    unittest.main()
