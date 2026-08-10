import logging
import requests

from config import API_URL, REQUEST_TIMEOUT
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


logger = logging.getLogger(__name__)


class ApiService:

    def __init__(self):
        self.base_url = API_URL.rstrip("/")

    def headers(self):
        headers = {
            "Content-Type": "application/json"
        }

        if Session.token:
            headers["Authorization"] = f"Bearer {Session.token}"

        return headers

    def _request(self, method, endpoint, data=None):

        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        logger.debug(
            "%s %s",
            method.upper(),
            url
        )

        try:

            response = requests.request(
                method=method,
                url=url,
                headers=self.headers(),
                json=data,
                timeout=REQUEST_TIMEOUT
            )

        except requests.exceptions.Timeout:

            raise RequestTimeoutError()

        except requests.exceptions.ConnectionError:

            raise NetworkError(
                "Unable to connect to the VTO server."
            )

        except requests.exceptions.RequestException:

            raise NetworkError(
                "A network error occurred."
            )

        logger.debug(
            "%s %s -> %s",
            method.upper(),
            url,
            response.status_code
        )

        return self._handle_response(
            response,
            endpoint
        )

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

            logger.error(
                "Server error %s: %s",
                status,
                response.text
            )

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
            "/debt"
        )

    def get_account(self, account_id):

        return self._request(
            "GET",
            f"/debt/{account_id}"
        )

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