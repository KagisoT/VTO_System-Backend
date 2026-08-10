import logging

logger = logging.getLogger(__name__)


class Session:


    token = None

    user = None

    @classmethod
    def _normalize_user(cls, user):
        if user is None:
            return None

        if isinstance(user, dict):
            if isinstance(user.get("user"), dict):
                return user["user"]
            if isinstance(user.get("profile"), dict):
                return user["profile"]
            if isinstance(user.get("userData"), dict):
                return user["userData"]
            return user

        if isinstance(user, (list, tuple, set)):
            for item in user:
                normalized = cls._normalize_user(item)
                if normalized:
                    return normalized

        return None

    @classmethod
    def _normalize_token(cls, token):
        if token is None:
            return None

        if isinstance(token, (list, tuple, set)):
            for item in token:
                normalized = cls._normalize_token(item)
                if normalized:
                    return normalized
            return None

        if isinstance(token, dict):
            for key, value in token.items():
                key_lower = key.lower()
                if key_lower in {
                    "token",
                    "access_token",
                    "accesstoken",
                    "auth_token",
                    "authtoken",
                    "id_token",
                    "jwt",
                }:
                    normalized = cls._normalize_token(value)
                    if normalized:
                        return normalized
            for value in token.values():
                normalized = cls._normalize_token(value)
                if normalized:
                    return normalized
            return None

        if isinstance(token, (bytes, bytearray)):
            try:
                token = token.decode()
            except Exception:
                return None

        if isinstance(token, str):
            token = token.strip()
            if token.lower().startswith("bearer "):
                return token.split(None, 1)[1]
            return token or None

        return None

    @classmethod
    def login(cls, token, user):

        cls.token = cls._normalize_token(token)
        cls.user = cls._normalize_user(user)
        logger.debug("Session token set: %s", cls.token)
        logger.debug("Session user set: %s", cls.user)

    @classmethod
    def logout(cls):

        cls.token = None

        cls.user = None

    @classmethod
    def is_logged_in(cls):

        return cls.token is not None