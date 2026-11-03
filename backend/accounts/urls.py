from django.urls import path

from . import views
from .refresh import PasswordAwareRefreshView

urlpatterns = [
    path('auth/register', views.RegisterView.as_view()),
    path('auth/verify-email', views.VerifyEmailView.as_view()),
    path('auth/login', views.LoginView.as_view()),
    path('auth/login/verify', views.LoginVerifyView.as_view()),
    path('auth/resend-code', views.ResendCodeView.as_view()),
    path('auth/password/forgot', views.ForgotPasswordView.as_view()),
    path('auth/password/reset', views.ResetPasswordView.as_view()),
    path('auth/refresh', PasswordAwareRefreshView.as_view()),
    path('auth/devices', views.TrustedDevicesView.as_view()),
    path('profile', views.ProfileView.as_view()),
    path('account', views.AccountView.as_view()),
]
