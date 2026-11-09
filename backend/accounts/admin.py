# Django admin setup for the accounts app.
from django.contrib import admin

from .models import User

# Lets staff view and manage user accounts at /admin.
admin.site.register(User)
