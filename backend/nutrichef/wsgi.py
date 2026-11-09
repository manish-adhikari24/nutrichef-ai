# WSGI entry point. Gunicorn on Render loads `application` from here to serve the API.
import os

from django.core.wsgi import get_wsgi_application

# Tell Django which settings file to use, then build the app.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nutrichef.settings')
application = get_wsgi_application()
