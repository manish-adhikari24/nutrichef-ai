# This migration used to load the reference data from seed_data.py.
# The data now lives in recipes/seed/*.json and is loaded by `python manage.py seed`,
# so this step does nothing. It stays so databases that already ran it keep a matching history.
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('recipes', '0001_initial')]
    operations = []
