import logging

from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)

MESSAGES = {
    401: 'Please sign in to continue.',
    403: 'You do not have permission to do that.',
    404: 'We could not find that.',
    405: 'That action is not allowed.',
    429: 'Too many requests. Try again later.',
}


def _first_message(value):
    if isinstance(value, (list, tuple)):
        return _first_message(value[0]) if value else 'This value is invalid.'
    if isinstance(value, dict):
        return _first_message(next(iter(value.values()))) if value else 'This value is invalid.'
    return str(value)


def api_exception_handler(exc, context):
    """Returns {"error": message, "fields": {...}} and never exposes a stack trace (FR-15)."""
    response = exception_handler(exc, context)
    if response is None:
        logger.exception('Unhandled API error', exc_info=exc)
        return Response({'error': 'Something went wrong on our side. Try again in a moment.'}, status=500)

    if isinstance(exc, ValidationError):
        fields = response.data if isinstance(response.data, dict) else {}
        fields = {key: _first_message(value) for key, value in fields.items()}
        message = next(iter(fields.values()), _first_message(response.data))
        response.data = {'error': message, 'fields': fields}
    else:
        response.data = {'error': MESSAGES.get(response.status_code, 'That request could not be completed.')}
    return response
