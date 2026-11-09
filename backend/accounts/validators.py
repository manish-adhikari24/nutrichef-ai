"""Password rules applied at sign-up and password reset."""
import hashlib
import logging
import re
import urllib.request

from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

# Have I Been Pwned's "range" endpoint: send a hash prefix, get back every matching hash.
PWNED_RANGE_URL = 'https://api.pwnedpasswords.com/range/'


class ComplexityValidator:
    """Needs an uppercase letter, a lowercase letter, a number and a symbol."""

    # Each rule is a regular expression and how to describe it if it's missing.
    RULES = [
        (r'[A-Z]', 'an uppercase letter'),
        (r'[a-z]', 'a lowercase letter'),
        (r'\d', 'a number'),
        (r'[^A-Za-z0-9]', 'a symbol'),
    ]

    def validate(self, password, user=None):
        # List every rule the password fails, so the user sees them all at once.
        missing = [label for pattern, label in self.RULES if not re.search(pattern, password)]
        if missing:
            raise ValidationError(f"Add {', '.join(missing)} to your password.", code='password_complexity')

    # Django shows this text when it lists the password rules.
    def get_help_text(self):
        return 'Use an uppercase letter, a lowercase letter, a number and a symbol.'


class BreachedPasswordValidator:
    """Rejects passwords found in known data breaches, using Have I Been Pwned.

    Only the first five characters of the password's SHA-1 hash leave the server.
    If the service can't be reached, the password is allowed so sign-up keeps working.
    """

    def validate(self, password, user=None):
        # Switched off while tests run (see settings.py).
        if not getattr(settings, 'PASSWORD_BREACH_CHECK', True):
            return
        # Hash the password and split it: the 5-character prefix is sent, the rest stays here.
        digest = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
        prefix, suffix = digest[:5], digest[5:]
        # "Add-Padding" adds fake results so the response size reveals nothing.
        request = urllib.request.Request(
            PWNED_RANGE_URL + prefix,
            headers={'Add-Padding': 'true', 'User-Agent': 'NutriChef-AI-password-check'},
        )
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                body = response.read().decode('utf-8')
        except OSError:
            # Service down or slow: allow the password rather than block sign-up.
            logger.warning('Breached password check unavailable, password allowed')
            return
        # Each line is "SUFFIX:COUNT". A match with a count above 0 means it has been leaked.
        # (Padding lines have a count of 0.)
        for line in body.splitlines():
            candidate, _, count = line.partition(':')
            if candidate.strip() == suffix and int(count or 0) > 0:
                raise ValidationError(
                    'This password has appeared in a data breach. Choose a different one.',
                    code='password_breached',
                )

    def get_help_text(self):
        return 'Your password must not appear in a known data breach.'
