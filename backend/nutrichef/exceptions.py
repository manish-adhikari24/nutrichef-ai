# One error format for the whole API, so the front end always knows where to find the message.
import logging
import re

from django.http import JsonResponse
from django.views.defaults import page_not_found
from django.views.defaults import server_error as default_server_error
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)

# Plain-English messages for common HTTP error codes.
MESSAGES = {
    401: 'Please sign in to continue.',
    403: 'You do not have permission to do that.',
    404: 'We could not find that.',
    405: 'That action is not allowed.',
    429: 'Too many requests. Try again later.',
}


# Django's default validation wording, rewritten in plain English.
_FRIENDLY = [
    (re.compile(r'^Ensure this field has no more than (\d+) characters\.$'), lambda m: f'Use {m[1]} characters or fewer.'),
    (re.compile(r'^Ensure this field has at least (\d+) characters\.$'), lambda m: f'Use at least {m[1]} characters.'),
    (re.compile(r'^Ensure this value is greater than or equal to ([\d.]+)\.$'), lambda m: f'Enter {m[1]} or more.'),
    (re.compile(r'^Ensure this value is less than or equal to ([\d.]+)\.$'), lambda m: f'Enter {m[1]} or less.'),
    (re.compile(r'^Ensure that there are no more than (\d+) decimal places?\.$'), lambda m: f"Use at most {m[1]} decimal place{'' if m[1] == '1' else 's'}."),
    (re.compile(r'^Ensure that there are no more than (\d+) digits in total\.$'), lambda m: 'That number is too long.'),
    (re.compile(r'^A valid integer is required\.$'), lambda m: 'Enter a whole number.'),
    (re.compile(r'^A valid number is required\.$'), lambda m: 'Enter a number.'),
    (re.compile(r'^This field may not be blank\.$'), lambda m: "This can't be empty."),
    (re.compile(r'^This field may not be null\.$'), lambda m: "This can't be empty."),
    (re.compile(r'^This field is required\.$'), lambda m: 'This is required.'),
    (re.compile(r'^".*" is not a valid choice\.$'), lambda m: 'Choose one of the options.'),
    (re.compile(r'^Expected a list of items but got type .*\.$'), lambda m: 'That value is in the wrong format.'),
]


def _friendly(text):
    for pattern, rewrite in _FRIENDLY:
        match = pattern.match(text)
        if match:
            return rewrite(match)
    return text


# Digs into DRF's nested lists and dicts of errors and returns the first message as text.
def _first_message(value):
    if isinstance(value, (list, tuple)):
        return _first_message(value[0]) if value else 'This value is invalid.'
    if isinstance(value, dict):
        return _first_message(next(iter(value.values()))) if value else 'This value is invalid.'
    return _friendly(str(value))


def api_exception_handler(exc, context):
    """Returns {"error": message, "fields": {...}} and never exposes a stack trace (FR-15)."""
    # Let DRF turn known errors into a response first.
    response = exception_handler(exc, context)
    # An unexpected crash: log the details on the server and show the user only a generic message.
    if response is None:
        logger.exception('Unhandled API error', exc_info=exc)
        return Response({'error': 'Something went wrong on our side. Try again in a moment.'}, status=500)

    if isinstance(exc, ValidationError):
        # Bad input: one message per field, plus the first one as the main error.
        fields = response.data if isinstance(response.data, dict) else {}
        fields = {key: _first_message(value) for key, value in fields.items()}
        message = next(iter(fields.values()), _first_message(response.data))
        response.data = {'error': message, 'fields': fields}
    else:
        # Any other error: replace DRF's wording with our friendly message.
        response.data = {'error': MESSAGES.get(response.status_code, 'That request could not be completed.')}
    return response


# Unknown addresses under /api/ get a JSON error like the rest of the API (only used when DEBUG is off).
def not_found(request, exception=None):
    if request.path.startswith('/api/'):
        return JsonResponse({'error': MESSAGES[404]}, status=404)
    return page_not_found(request, exception)


# Unexpected server errors under /api/ also stay JSON, with no details.
def server_error(request):
    if request.path.startswith('/api/'):
        return JsonResponse({'error': 'Something went wrong on our side. Try again in a moment.'}, status=500)
    return default_server_error(request)
