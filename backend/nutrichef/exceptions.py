# One error format for the whole API, so the front end always knows where to find the message.
import logging

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


# Digs into DRF's nested lists and dicts of errors and returns the first message as text.
def _first_message(value):
    if isinstance(value, (list, tuple)):
        return _first_message(value[0]) if value else 'This value is invalid.'
    if isinstance(value, dict):
        return _first_message(next(iter(value.values()))) if value else 'This value is invalid.'
    return str(value)


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
