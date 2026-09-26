import logging
from io import StringIO
import unittest
from unittest.mock import patch

from api import ApiService
from cache import TTLCache
from logging_config import configure_logging
from session import Session


class Response:
    def __init__(self, value, status=200):
        self.value = value
        self.status_code = status
        self.content = b"json"
        self.text = "secret response body"

    def json(self):
        return self.value


class CacheTests(unittest.TestCase):
    def tearDown(self):
        Session.logout()

    def test_ttl_and_copy_isolation(self):
        now = [0]
        cache = TTLCache(ttl_seconds=5, max_entries=2, clock=lambda: now[0])
        cache.set("a", {"items": [1]})
        found, value = cache.get("a")
        self.assertTrue(found)
        value["items"].append(2)
        self.assertEqual(cache.get("a"), (True, {"items": [1]}))
        now[0] = 5
        self.assertEqual(cache.get("a"), (False, None))

    def test_get_cache_is_cleared_by_write_and_session_change(self):
        service = ApiService()
        with patch("api.requests.request", side_effect=[
            Response({"accounts": [1]}), Response({"ok": True}),
            Response({"accounts": [2]}), Response({"accounts": [3]}),
        ]) as request:
            self.assertEqual(service.get_accounts(), {"accounts": [1]})
            self.assertEqual(service.get_accounts(), {"accounts": [1]})
            self.assertEqual(request.call_count, 1)
            service.post_call({"outcome": "paid"})
            self.assertEqual(service.get_accounts(), {"accounts": [2]})
            Session.login("new-token", {"id": 2})
            self.assertEqual(service._cache.get("/debt/assigned"), (False, None))
            self.assertEqual(service.get_accounts(), {"accounts": [3]})
            self.assertEqual(request.call_count, 4)

    def test_failed_get_is_not_cached(self):
        service = ApiService()
        with patch("api.requests.request", side_effect=[
            Response({"message": "missing"}, 404), Response({"id": 1}),
        ]) as request:
            with self.assertRaises(Exception):
                service.get_account(1)
            self.assertEqual(service.get_account(1), {"id": 1})
            self.assertEqual(request.call_count, 2)

    def test_debt_edit_endpoints(self):
        service = ApiService()
        with patch.object(service, "_request") as request:
            service.update_account_status("debt-1", "CLOSED")
            service.update_account_notes("debt-1", "Called debtor")
        self.assertEqual(request.call_args_list[0].args, (
            "PATCH", "/debt/debt-1/status", {"status": "CLOSED"}
        ))
        self.assertEqual(request.call_args_list[1].args, (
            "PATCH", "/debt/debt-1/notes", {"notes": "Called debtor"}
        ))


class LoggingTests(unittest.TestCase):
    def test_rotating_log_omits_response_body_and_token(self):
        logger = logging.getLogger("vto_collector")
        old_handlers, old_level, old_propagate = logger.handlers[:], logger.level, logger.propagate
        try:
            logger.handlers = []
            output = StringIO()
            with patch("logging_config.Path.mkdir"), patch(
                "logging_config.RotatingFileHandler",
                return_value=logging.StreamHandler(output),
            ) as file_handler:
                configure_logging("logs", logging.DEBUG)
                file_handler.assert_called_once()
                Session.login("private-token", {"name": "private-name"})
                with patch("api.requests.request", return_value=Response({"message": "failure"}, 500)):
                    with self.assertRaises(Exception):
                        ApiService().get_accounts()
                content = output.getvalue()
                self.assertIn("Server error 500", content)
                self.assertNotIn("private-token", content)
                self.assertNotIn("private-name", content)
                self.assertNotIn("secret response body", content)
        finally:
            logger.handlers = old_handlers
            logger.setLevel(old_level)
            logger.propagate = old_propagate
            Session.logout()
