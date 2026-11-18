# `python manage.py seed`: loads the reference data from recipes/seed/*.json into the database.
from django.core.management.base import BaseCommand

from recipes.seeding import load_seed


class Command(BaseCommand):
    help = 'Load the reference data (nutrition, allergens, rules, form choices) from recipes/seed/*.json.'

    def handle(self, *args, **options):
        counts = load_seed()
        for table, rows in counts.items():
            self.stdout.write(f'  {table}: {rows}')
        self.stdout.write(self.style.SUCCESS(f'Seeded {sum(counts.values())} rows into {len(counts)} tables.'))
