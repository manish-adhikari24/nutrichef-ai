# Test runner that loads the seed data into the test database, so tests see the same reference data as the live site.
from django.test.runner import DiscoverRunner


class SeededTestRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        config = super().setup_databases(**kwargs)
        from recipes.seeding import load_seed

        load_seed()
        return config
