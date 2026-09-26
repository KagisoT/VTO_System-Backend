"""Small, bounded cache for successful API reads."""

from collections import OrderedDict
from copy import deepcopy
from time import monotonic


class TTLCache:
    def __init__(self, ttl_seconds=60, max_entries=128, clock=monotonic):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._clock = clock
        self._entries = OrderedDict()

    def get(self, key):
        entry = self._entries.get(key)
        if entry is None:
            return False, None
        expires_at, value = entry
        if self._clock() >= expires_at:
            del self._entries[key]
            return False, None
        self._entries.move_to_end(key)
        return True, deepcopy(value)

    def set(self, key, value):
        if self.ttl_seconds <= 0 or self.max_entries <= 0:
            return
        self._entries[key] = (self._clock() + self.ttl_seconds, deepcopy(value))
        self._entries.move_to_end(key)
        while len(self._entries) > self.max_entries:
            self._entries.popitem(last=False)

    def clear(self):
        self._entries.clear()
