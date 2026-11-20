# Top-level URL routes for the whole API.
import os

from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


# Health check: Render and UptimeRobot call this to see if the API is up (and to keep it awake).
def health(_request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('api/health', health),
    # Sign-up, login, password reset, profile and account routes.
    path('api/', include('accounts.urls')),
    # Recipe generation, saved recipes, meal and water logs, and the dashboard.
    path('api/', include('recipes.urls')),
]

# Django's admin site: on locally, and in production only if DJANGO_ADMIN_ENABLED=1 is set,
# so its login page isn't public by default.
if settings.DEBUG or os.environ.get('DJANGO_ADMIN_ENABLED') == '1':
    urlpatterns.append(path('admin/', admin.site.urls))

# JSON errors for unknown /api/ addresses and server errors.
handler404 = 'nutrichef.exceptions.not_found'
handler500 = 'nutrichef.exceptions.server_error'
