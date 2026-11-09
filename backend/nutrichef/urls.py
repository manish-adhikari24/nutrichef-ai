# Top-level URL routes for the whole API.
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


# Health check: Render and UptimeRobot call this to see if the API is up (and to keep it awake).
def health(_request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    # Django's built-in admin site.
    path('admin/', admin.site.urls),
    path('api/health', health),
    # Sign-up, login, password reset, profile and account routes.
    path('api/', include('accounts.urls')),
    # Recipe generation, saved recipes, meal and water logs, and the dashboard.
    path('api/', include('recipes.urls')),
]
