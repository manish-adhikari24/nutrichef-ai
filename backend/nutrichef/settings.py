# Django settings for the NutriChef AI API. Secrets come from environment variables, never from this file.
import os
import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

# The backend folder. Local secrets are read from backend/.env (which Git ignores).
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

# Debug mode only when DJANGO_DEBUG=1 (local development). Production is always off.
DEBUG = os.environ.get('DJANGO_DEBUG') == '1'

# Used to sign tokens and hash codes. Production refuses to start without a real one.
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError('Set DJANGO_SECRET_KEY, or DJANGO_DEBUG=1 for local development.')
    SECRET_KEY = 'local-development-only-key-not-for-production-use'

# Host names this API answers to. Render adds its own address automatically.
ALLOWED_HOSTS = [h for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h]
if os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    ALLOWED_HOSTS.append(os.environ['RENDER_EXTERNAL_HOSTNAME'])

# Websites allowed to call the API from the browser: the Vite dev server locally, Vercel in production.
CORS_ALLOWED_ORIGINS = [
    o for o in os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',') if o
]

# Django's built-in apps, CORS and REST framework, then our two apps.
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'accounts',
    'recipes',
]

# Code that runs on every request, in order: security headers, static files, CORS, then Django's defaults.
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'nutrichef.urls'
WSGI_APPLICATION = 'nutrichef.wsgi.application'
# Use our email-based User model instead of Django's default.
AUTH_USER_MODEL = 'accounts.User'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Templates are only used by the admin site. The API itself returns JSON.
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# PostgreSQL through DATABASE_URL in production, SQLite for local development.
# conn_max_age keeps database connections open for 10 minutes so requests are faster.
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
    ),
}

# BCryptSHA256 uses a bcrypt cost factor of 12 by default (NFR-01).
PASSWORD_HASHERS = ['django.contrib.auth.hashers.BCryptSHA256PasswordHasher']
# Password rules: at least 10 characters, mixed character types, not like the user's name or email,
# not a common password and not found in a data breach.
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'accounts.validators.ComplexityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
        'OPTIONS': {'user_attributes': ('email', 'first_name', 'last_name')},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'accounts.validators.BreachedPasswordValidator'},
]
# Tests never call Have I Been Pwned. Its own test turns the check back on with a fake reply.
PASSWORD_BREACH_CHECK = 'test' not in sys.argv

# Email codes go through Brevo's HTTP API. Without a key, local development logs them instead.
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', '')
EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'NutriChef AI')

REST_FRAMEWORK = {
    # Every request needs a valid JWT unless a view says otherwise.
    'DEFAULT_AUTHENTICATION_CLASSES': ['accounts.authentication.PasswordAwareJWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    # JSON in and JSON out only.
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    # Our consistent {"error", "fields"} error format.
    'EXCEPTION_HANDLER': 'nutrichef.exceptions.api_exception_handler',
    # Per-user limits on the AI endpoints, to control cost.
    'DEFAULT_THROTTLE_RATES': {
        'generate': os.environ.get('GENERATE_RATE', '10/hour'),
        'chat': os.environ.get('CHAT_RATE', '30/hour'),
    },
}

# Access tokens are short-lived. The refresh token gets a new one without signing in again.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'UPDATE_LAST_LOGIN': False,
}

# Australian English and Sydney time. Dates are stored in UTC.
LANGUAGE_CODE = 'en-au'
TIME_ZONE = 'Australia/Sydney'
USE_I18N = False
USE_TZ = True

# Where collectstatic puts the admin site's CSS and JS.
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Production only: HTTPS everywhere, secure cookies, HSTS and no MIME sniffing.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 3600
    SECURE_CONTENT_TYPE_NOSNIFF = True

# Send log messages to the console, which Render shows in its Logs tab.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}
