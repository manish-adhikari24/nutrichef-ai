"""How many AI recipes a user can generate per hour.

Only recipes the AI actually wrote count. Requests refused before the AI is called
(bad input, an allergy conflict) or that fail (AI outage) don't use up the allowance.
The rate comes from settings (REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['generate'], e.g. "30/hour").
"""
import math
import time

from django.conf import settings
from django.core.cache import cache

_PERIODS = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}


def _rate():
    """(number allowed, period in seconds) from a rate like "30/hour"."""
    rate = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['generate']
    number, period = rate.split('/')
    return int(number), _PERIODS[period[0]]


def _key(user):
    return f'generate-count:{user.pk}'


def _recent(user, now, period):
    """Times of this user's AI recipes within the period, oldest first."""
    return [t for t in cache.get(_key(user), []) if t > now - period]


def wait_seconds(user):
    """0 if the user can generate now, otherwise the seconds until they can."""
    allowed, period = _rate()
    now = time.time()
    times = _recent(user, now, period)
    if len(times) < allowed:
        return 0
    return max(1, math.ceil(times[0] + period - now))


def record(user):
    """Counts one AI recipe for the user."""
    _allowed, period = _rate()
    now = time.time()
    cache.set(_key(user), [*_recent(user, now, period), now], period)
