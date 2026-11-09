# URL routes for the accounts app. All of these sit under /api/.
from django.urls import path

from . import views
from .refresh import PasswordAwareRefreshView

urlpatterns = [
    # Create an account (emails a verification code).
    path('auth/register', views.RegisterView.as_view()),
    # Check the emailed code and sign the new user in.
    path('auth/verify-email', views.VerifyEmailView.as_view()),
    # Step 1 of sign-in: email and password.
    path('auth/login', views.LoginView.as_view()),
    # Step 2 of sign-in: the emailed code on a new device.
    path('auth/login/verify', views.LoginVerifyView.as_view()),
    # Send another code (with a cooldown).
    path('auth/resend-code', views.ResendCodeView.as_view()),
    # Forgot password: email a reset code, then set a new password with it.
    path('auth/password/forgot', views.ForgotPasswordView.as_view()),
    path('auth/password/reset', views.ResetPasswordView.as_view()),
    # Swap a refresh token for a new access token.
    path('auth/refresh', PasswordAwareRefreshView.as_view()),
    # Forget every "Keep me signed in" device.
    path('auth/devices', views.TrustedDevicesView.as_view()),
    # Read or update the profile and goals.
    path('profile', views.ProfileView.as_view()),
    # Delete the account and all its data.
    path('account', views.AccountView.as_view()),
]
