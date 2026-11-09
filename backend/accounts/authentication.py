"""Signs people out everywhere after a password reset."""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication



# True if the token was created ("iat" = issued at) before the user last changed their password.
def issued_before_password_change(user, token):
    changed = user.password_changed_at
    return bool(changed and token.get('iat', 0) < int(changed.timestamp()))


# The normal JWT check, plus refusing any token from before a password change.
# settings.py makes this the default for every API request.
class PasswordAwareJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if issued_before_password_change(user, validated_token):
            raise AuthenticationFailed('Your password was changed. Please sign in again.')
        return user
