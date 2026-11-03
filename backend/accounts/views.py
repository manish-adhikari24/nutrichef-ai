from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from . import security
from .models import OneTimeCode, TrustedDevice, User
from .serializers import LoginSerializer, ProfileSerializer, RegisterSerializer

MAX_FAILED_LOGINS = 5
LOCK_SECONDS = 15 * 60
WRONG_CODE = 'That code is wrong or has expired. Check your email or request a new code.'
EMAIL_FAILED = "We couldn't send the email. Try again in a moment."


def tokens_for(user, keep_signed_in=False):
    update_last_login(None, user)
    refresh = RefreshToken.for_user(user)
    data = {'access': str(refresh.access_token), 'refresh': str(refresh)}
    if keep_signed_in:
        data['deviceToken'] = security.trust_device(user)
    return data


def client_ip(request):
    return request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')).split(',')[0].strip()


def send_code(user, purpose):
    """Sends a code, returning an error response if the email can't be sent."""
    try:
        security.issue_code(user, purpose)
    except security.EmailNotSent:
        return Response({'error': EMAIL_FAILED}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return None


class PublicView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []


class RegisterView(PublicView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = serializer.save()
        failed = send_code(user, OneTimeCode.VERIFY)
        if failed:
            return failed
        return Response({'status': 'verify_email', 'email': user.email}, status=status.HTTP_201_CREATED)


class VerifyEmailView(PublicView):
    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        user = User.objects.filter(email=email).first()
        if user is None or not security.check_code(user, OneTimeCode.VERIFY, request.data.get('code', '')):
            return Response({'error': WRONG_CODE}, status=status.HTTP_400_BAD_REQUEST)
        user.email_verified = True
        user.save(update_fields=['email_verified'])
        return Response(tokens_for(user, bool(request.data.get('keepSignedIn'))))


class LoginView(PublicView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        key = f'failed-login:{email}:{client_ip(request)}'
        if cache.get(key, 0) >= MAX_FAILED_LOGINS:
            return Response(
                {'error': 'Too many attempts. Wait 15 minutes and try again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(request, username=email, password=serializer.validated_data['password'])
        if user is None:
            cache.set(key, cache.get(key, 0) + 1, LOCK_SECONDS)
            # The same message for a wrong password or unknown email prevents account enumeration.
            return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        cache.delete(key)

        if not user.email_verified:
            failed = send_code(user, OneTimeCode.VERIFY)
            if failed:
                return failed
            return Response(
                {'code': 'verify_email', 'email': user.email, 'error': "Verify your email first. We've sent you a code."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if security.is_trusted_device(user, request.data.get('deviceToken')):
            return Response(tokens_for(user))

        failed = send_code(user, OneTimeCode.LOGIN)
        if failed:
            return failed
        return Response({'status': 'code_sent', 'ticket': security.make_ticket(user)})


class LoginVerifyView(PublicView):
    def post(self, request):
        user_id = security.read_ticket(request.data.get('ticket'))
        user = User.objects.filter(pk=user_id).first() if user_id else None
        if user is None:
            return Response({'error': 'Your sign-in expired. Sign in again.'}, status=status.HTTP_400_BAD_REQUEST)
        if not security.check_code(user, OneTimeCode.LOGIN, request.data.get('code', '')):
            return Response({'error': WRONG_CODE}, status=status.HTTP_400_BAD_REQUEST)
        return Response(tokens_for(user, bool(request.data.get('keepSignedIn'))))


class ResendCodeView(PublicView):
    """Always answers the same way, so it can't reveal which emails have accounts."""

    def post(self, request):
        purpose = request.data.get('purpose')
        if purpose == OneTimeCode.LOGIN:
            user_id = security.read_ticket(request.data.get('ticket'))
            user = User.objects.filter(pk=user_id).first() if user_id else None
        elif purpose in (OneTimeCode.VERIFY, OneTimeCode.RESET):
            user = User.objects.filter(email=str(request.data.get('email', '')).strip().lower()).first()
        else:
            raise serializers.ValidationError({'purpose': 'Choose a valid code type.'})
        if user is not None and not (purpose == OneTimeCode.VERIFY and user.email_verified):
            failed = send_code(user, purpose)
            if failed:
                return failed
        return Response({'status': 'sent'})


class ForgotPasswordView(PublicView):
    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            raise serializers.ValidationError({'email': 'Enter your email address.'})
        user = User.objects.filter(email=email).first()
        if user is not None:
            failed = send_code(user, OneTimeCode.RESET)
            if failed:
                return failed
        return Response({'status': 'sent'})


class ResetPasswordView(PublicView):
    def post(self, request):
        data = request.data
        user = User.objects.filter(email=str(data.get('email', '')).strip().lower()).first()
        password = str(data.get('password', ''))
        if password != str(data.get('confirmPassword', '')):
            raise serializers.ValidationError({'confirmPassword': 'Passwords do not match.'})
        if user is not None:
            try:
                validate_password(password, user)
            except DjangoValidationError as error:
                raise serializers.ValidationError({'password': error.messages[0]}) from error
        if user is None or not security.check_code(user, OneTimeCode.RESET, data.get('code', '')):
            return Response({'error': WRONG_CODE}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user.set_password(password)
            user.password_changed_at = timezone.now()
            # Receiving the code proves they own the email address.
            user.email_verified = True
            user.save(update_fields=['password', 'password_changed_at', 'email_verified'])
            TrustedDevice.objects.filter(user=user).delete()
        return Response({'status': 'reset'})


class TrustedDevicesView(APIView):
    def delete(self, request):
        TrustedDevice.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
    def get(self, request):
        return Response(ProfileSerializer.to_payload(request.user))

    def put(self, request):
        serializer = ProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save_for(request.user)
        request.user.refresh_from_db()
        return Response(ProfileSerializer.to_payload(request.user))


class AccountView(APIView):
    def delete(self, request):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
