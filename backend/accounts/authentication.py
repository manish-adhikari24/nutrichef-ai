"""Signs people out everywhere after a password reset."""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication



def issued_before_password_change(user, token):
    changed = user.password_changed_at
    return bool(changed and token.get('iat', 0) < int(changed.timestamp()))


class PasswordAwareJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if issued_before_password_change(user, validated_token):
            raise AuthenticationFailed('Your password was changed. Please sign in again.')
        return user
