from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, ProfileSerializer, RegisterSerializer

MAX_FAILED_LOGINS = 5
LOCK_SECONDS = 15 * 60


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        update_last_login(None, user)
        return Response(tokens_for(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')).split(',')[0].strip()
        key = f'failed-login:{email}:{ip}'
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
        update_last_login(None, user)
        return Response(tokens_for(user))


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
