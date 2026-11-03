"""Email codes, sign-in tickets and trusted devices for verification and two-step sign-in."""
import hashlib
import hmac
import json
import logging
import secrets
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import OneTimeCode, TrustedDevice

logger = logging.getLogger(__name__)

CODE_LIFETIME = timedelta(minutes=10)
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_CODES_PER_HOUR = 5
DEVICE_LIFETIME = timedelta(days=30)
TICKET_MAX_AGE = 600
TICKET_SALT = 'nutrichef.login-ticket'

SUBJECTS = {
    OneTimeCode.VERIFY: 'Verify your NutriChef AI email',
    OneTimeCode.LOGIN: 'Your NutriChef AI sign-in code',
    OneTimeCode.RESET: 'Reset your NutriChef AI password',
}
INTROS = {
    OneTimeCode.VERIFY: 'Use this code to verify your email and finish creating your account.',
    OneTimeCode.LOGIN: 'Use this code to finish signing in.',
    OneTimeCode.RESET: 'Use this code to reset your password.',
}


class EmailNotSent(Exception):
    pass


def _hash(value):
    return hmac.new(settings.SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def send_email(to, subject, text):
    """Sends through Brevo's HTTP API. Render's free plan blocks normal SMTP ports."""
    api_key = getattr(settings, 'BREVO_API_KEY', '')
    if not api_key:
        if settings.DEBUG:
            logger.warning('Email not configured. To %s: %s', to, text)
            return
        raise EmailNotSent('BREVO_API_KEY is not set')
    payload = {
        'sender': {'name': settings.EMAIL_FROM_NAME, 'email': settings.EMAIL_FROM},
        'to': [{'email': to}],
        'subject': subject,
        'textContent': text,
    }
    request = urllib.request.Request(
        'https://api.brevo.com/v3/smtp/email',
        data=json.dumps(payload).encode(),
        headers={'api-key': api_key, 'accept': 'application/json', 'content-type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status >= 300:
                raise EmailNotSent(f'Brevo returned {response.status}')
    except OSError as error:
        logger.error('Email sending failed: %s', type(error).__name__)
        raise EmailNotSent(str(error)) from error


def issue_code(user, purpose):
    """Creates and emails a 6-digit code. Returns False if one was sent too recently."""
    now = timezone.now()
    recent = OneTimeCode.objects.filter(user=user, purpose=purpose, created_at__gte=now - timedelta(hours=1))
    if recent.filter(created_at__gte=now - RESEND_COOLDOWN).exists() or recent.count() >= MAX_CODES_PER_HOUR:
        return False
    code = f'{secrets.randbelow(1_000_000):06d}'
    OneTimeCode.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(used_at=now)
    OneTimeCode.objects.create(user=user, purpose=purpose, code_hash=_hash(code), expires_at=now + CODE_LIFETIME)
    text = (
        f"Hi {user.first_name or 'there'},\n\n{INTROS[purpose]}\n\n{code}\n\n"
        "It expires in 10 minutes. If you didn't ask for this, you can ignore this email.\n\nNutriChef AI"
    )
    send_email(user.email, SUBJECTS[purpose], text)
    return True


def check_code(user, purpose, code):
    """True if the code is the latest unused one and hasn't expired. Each wrong try counts."""
    record = (
        OneTimeCode.objects.filter(user=user, purpose=purpose, used_at__isnull=True, expires_at__gt=timezone.now())
        .order_by('-created_at')
        .first()
    )
    if record is None or record.attempts >= MAX_ATTEMPTS:
        return False
    if hmac.compare_digest(record.code_hash, _hash(str(code).strip())):
        record.used_at = timezone.now()
        record.save(update_fields=['used_at'])
        return True
    record.attempts += 1
    record.save(update_fields=['attempts'])
    return False


def make_ticket(user):
    return signing.dumps({'user': user.pk}, salt=TICKET_SALT)


def read_ticket(ticket):
    try:
        return signing.loads(ticket, salt=TICKET_SALT, max_age=TICKET_MAX_AGE)['user']
    except (signing.BadSignature, KeyError, TypeError):
        return None


def trust_device(user):
    token = secrets.token_urlsafe(32)
    TrustedDevice.objects.create(user=user, token_hash=_hash(token), expires_at=timezone.now() + DEVICE_LIFETIME)
    return token


def is_trusted_device(user, token):
    if not token:
        return False
    return TrustedDevice.objects.filter(
        user=user, token_hash=_hash(token), expires_at__gt=timezone.now()
    ).exists()
