"""Token refresh that refuses tokens issued before a password reset. Kept apart from
authentication.py to avoid a circular import through Simple JWT's views."""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .authentication import issued_before_password_change
from .models import User


class PasswordAwareRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        # Find who the refresh token belongs to.
        token = RefreshToken(attrs['refresh'])
        user = User.objects.filter(pk=token.get('user_id')).first()
        # Refuse it if the account was deleted or the password changed since it was issued.
        if user is None or issued_before_password_change(user, token):
            raise AuthenticationFailed('Please sign in again.')
        # Otherwise do the normal checks and return a new access token.
        return super().validate(attrs)


# The /api/auth/refresh endpoint, using the stricter check above.
class PasswordAwareRefreshView(TokenRefreshView):
    serializer_class = PasswordAwareRefreshSerializer
