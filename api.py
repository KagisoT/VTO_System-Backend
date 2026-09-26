import logging
from time import monotonic
import requests

from cache import TTLCache
from config import API_URL, REQUEST_TIMEOUT, CACHE_TTL_SECONDS, CACHE_MAX_ENTRIES
from session import Session

from errors import (
    AppError,
    SessionExpiredError,
    AuthenticationError,
    PermissionError,
    NotFoundError,
    ServerError,
    NetworkError,
    RequestTimeoutError,
)


logger = logging.getLogger("vto_collector.api")


class ApiService:

    def __init__(self):
        self.base_url = API_URL.rstrip("/")
        self._cache = TTLCache(CACHE_TTL_SECONDS, CACHE_MAX_ENTRIES)
        Session.register_cache(self._cache)
        self._session_generation = Session.generation
        self._session_token = Session.token

    def clear_cache(self):
        self._cache.clear()

    def headers(self):
        headers = {
            "Content-Type": "application/json"
        }

        if Session.token:
            headers["Authorization"] = f"Bearer {Session.token}"

        return headers

    def _request(self, method, endpoint, data=None):

        method = method.upper()
        if (self._session_generation != Session.generation
                or self._session_token != Session.token):
            self.clear_cache()
            self._session_generation = Session.generation
            self._session_token = Session.token

        cache_key = endpoint if method == "GET" and data is None else None
        if cache_key is not None:
            found, cached = self._cache.get(cache_key)
            if found:
                logger.debug("Cache hit for GET request")
                return cached

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        started = monotonic()

        try:

            response = requests.request(
                method=method,
                url=url,
                headers=self.headers(),
                json=data,
                timeout=REQUEST_TIMEOUT
            )

        except requests.exceptions.Timeout:
            logger.warning("API %s timed out", method)

            raise RequestTimeoutError()

        except requests.exceptions.ConnectionError:
            logger.warning("API %s connection failed", method)

            raise NetworkError(
                "Unable to connect to the VTO server."
            )

        except requests.exceptions.RequestException:
            logger.warning("API %s request failed", method)

            raise NetworkError(
                "A network error occurred."
            )

        logger.info("API %s returned %s in %.0f ms", method,
                    response.status_code, (monotonic() - started) * 1000)

        result = self._handle_response(
            response,
            endpoint
        )
        if cache_key is not None:
            self._cache.set(cache_key, result)
        elif method not in ("GET", "HEAD"):
            self.clear_cache()
        return result

    def _handle_response(self, response, endpoint):

        status = response.status_code

        # --------------------------------------------------
        # SUCCESS
        # --------------------------------------------------

        if 200 <= status < 300:

            if not response.content:
                return None

            try:
                return response.json()

            except ValueError:

                return response.text

        # --------------------------------------------------
        # SESSION / AUTHENTICATION
        # --------------------------------------------------

        if status == 401:

            # Login credentials were rejected.
            if endpoint == "/auth/login":

                raise AuthenticationError(
                    self._get_server_message(
                        response,
                        "Invalid email or password."
                    )
                )

            # Existing session has expired.
            Session.clear()

            raise SessionExpiredError()

        # --------------------------------------------------
        # PERMISSION
        # --------------------------------------------------

        if status == 403:

            raise PermissionError(
                self._get_server_message(
                    response,
                    "You do not have permission to perform this action."
                )
            )

        # --------------------------------------------------
        # NOT FOUND
        # --------------------------------------------------

        if status == 404:

            raise NotFoundError(
                self._get_server_message(
                    response,
                    "The requested resource was not found."
                )
            )

        # --------------------------------------------------
        # SERVER ERROR
        # --------------------------------------------------

        if status >= 500:

            logger.error("Server error %s", status)

            raise ServerError(
                "The server encountered an error. "
                "Please try again later."
            )

        # --------------------------------------------------
        # OTHER HTTP ERRORS
        # --------------------------------------------------

        raise AppError(
            self._get_server_message(
                response,
                f"Request failed ({status})."
            )
        )

    def _get_server_message(self, response, fallback):

        try:

            data = response.json()

            if isinstance(data, dict):

                message = (
                    data.get("message")
                    or data.get("error")
                    or data.get("detail")
                )

                if message:
                    return str(message)

        except (ValueError, TypeError):

            pass

        return fallback

    # ------------------------------------------------------
    # AUTH
    # ------------------------------------------------------

    def login(self, email, password):

        return self._request(
            "POST",
            "/auth/login",
            {
                "email": email,
                "password": password
            }
        )

    # ------------------------------------------------------
    # DEBT
    # ------------------------------------------------------

    def get_accounts(self):

        return self._request(
            "GET",
            "/debt/assigned"
        )

    def get_account(self, account_id):

        return self._request(
            "GET",
            f"/debt/{account_id}"
        )

    def update_account_status(self, debt_id, status):
        return self._request("PATCH", f"/debt/{debt_id}/status", {"status": status})

    def update_account_notes(self, debt_id, notes):
        return self._request("PATCH", f"/debt/{debt_id}/notes", {"notes": notes})

    def get_arrangements_for_debt(self, debt_id):
        return self._request("GET", f"/payments/arrangements/debt/{debt_id}")

    def create_payment_arrangement(self, payload):
        return self._request("POST", "/payments/arrangements", payload)

    def get_payment_history(self, debt_id):
        return self._request("GET", f"/payments/debt/{debt_id}")

    # ------------------------------------------------------
    # CALLS
    # ------------------------------------------------------

    def post_call(self, data):

        return self._request(
            "POST",
            "/calls",
            data
        )

    # ------------------------------------------------------
    # USER
    # ------------------------------------------------------

    def get_user(self):

        return self._request(
            "GET",
            "/user"
        )


api = ApiService()
