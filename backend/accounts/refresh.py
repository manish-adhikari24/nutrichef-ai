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
        token = RefreshToken(attrs['refresh'])
        user = User.objects.filter(pk=token.get('user_id')).first()
        if user is None or issued_before_password_change(user, token):
            raise AuthenticationFailed('Please sign in again.')
        return super().validate(attrs)


class PasswordAwareRefreshView(TokenRefreshView):
    serializer_class = PasswordAwareRefreshSerializer
