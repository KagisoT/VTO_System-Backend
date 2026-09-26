import logging
from weakref import WeakSet

logger = logging.getLogger("vto_collector.session")


class Session:


    token = None

    user = None

    generation = 0

    _caches = WeakSet()

    @classmethod
    def register_cache(cls, cache):
        cls._caches.add(cache)

    @classmethod
    def _clear_caches(cls):
        for cache in cls._caches:
            cache.clear()

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

        cls.generation += 1
        cls._clear_caches()
        cls.token = cls._normalize_token(token)
        cls.user = cls._normalize_user(user)
        logger.info("Session started")

    @classmethod
    def logout(cls):

        cls.generation += 1
        cls._clear_caches()
        cls.token = None

        cls.user = None
        logger.info("Session ended")

    @classmethod
    def clear(cls):
        cls.logout()

    @classmethod
    def is_logged_in(cls):

        return cls.token is not None
