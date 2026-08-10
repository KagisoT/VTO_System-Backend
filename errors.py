class AppError(Exception):
    """Base application error."""

    def __init__(self, message, title="Error"):
        super().__init__(message)
        self.message = message
        self.title = title


class SessionExpiredError(AppError):
    def __init__(self):
        super().__init__(
            "Your session has expired. Please log in again.",
            "Session Expired"
        )


class AuthenticationError(AppError):
    def __init__(self, message="Unable to authenticate."):
        super().__init__(message, "Authentication Error")


class PermissionError(AppError):
    def __init__(self, message="You do not have permission to perform this action."):
        super().__init__(message, "Permission Denied")


class NotFoundError(AppError):
    def __init__(self, message="The requested record was not found."):
        super().__init__(message, "Not Found")


class ServerError(AppError):
    def __init__(self, message="The server encountered an error."):
        super().__init__(message, "Server Error")


class NetworkError(AppError):
    def __init__(self, message="Unable to connect to the server."):
        super().__init__(message, "Connection Error")


class RequestTimeoutError(AppError):
    def __init__(self):
        super().__init__(
            "The request took too long. Please try again.",
            "Request Timeout"
        )