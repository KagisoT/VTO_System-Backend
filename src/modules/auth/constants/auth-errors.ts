export const AUTH_ERRORS = {

    AUTHORIZATION_HEADER_MISSING:
        "Authorization header missing.",

    INVALID_AUTHORIZATION_HEADER:
        "Invalid authorization header.",

    INVALID_ACCESS_TOKEN:
        "Invalid access token.",

    INVALID_REFRESH_TOKEN:
        "Invalid refresh token.",

    UNAUTHORIZED:
        "Unauthorized.",

    FORBIDDEN:
        "You do not have permission to perform this action.",

    USER_NOT_FOUND:
        "User not found.",

    EMPLOYEE_NOT_FOUND:
        "Employee profile not found.",

    ROLE_NOT_FOUND:
        "Role not found.",

    ACCOUNT_DISABLED:
        "Account has been disabled.",

    ACCOUNT_LOCKED:
        "Account has been locked.",

    INVALID_EMAIL_OR_PASSWORD:
        "Invalid email or password.",

    PASSWORD_RESET_FAILED:
        "Unable to reset password."

} as const;