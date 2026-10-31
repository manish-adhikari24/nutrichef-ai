from django.db import migrations

from recipes import seed_data


def seed(apps, _schema_editor):
    model = apps.get_model
    model('recipes', 'NutritionItem').objects.bulk_create([
        model('recipes', 'NutritionItem')(name=name, kcal=v[0], protein=v[1], carbs=v[2], fat=v[3])
        for name, v in seed_data.NUTRITION.items()
    ])
    model('recipes', 'IngredientAlias').objects.bulk_create([
        model('recipes', 'IngredientAlias')(alias=alias, name=name)
        for alias, name in seed_data.INGREDIENT_ALIASES.items()
    ])
    model('recipes', 'AllergenAlias').objects.bulk_create([
        model('recipes', 'AllergenAlias')(allergen=allergen, word=word)
        for allergen, words in seed_data.ALLERGEN_WORDS.items() for word in words
    ])
    model('recipes', 'AllergenException').objects.bulk_create([
        model('recipes', 'AllergenException')(allergen=allergen, phrase=phrase)
        for allergen, phrases in seed_data.ALLERGEN_EXCEPTIONS.items() for phrase in phrases
    ])
    model('recipes', 'SubstitutionRule').objects.bulk_create([
        model('recipes', 'SubstitutionRule')(match=match, substitute=substitute, reason=reason)
        for match, substitute, reason in seed_data.SUBSTITUTIONS
    ])
    model('recipes', 'SupplementRule').objects.bulk_create([
        model('recipes', 'SupplementRule')(trigger=trigger, title=title, text=text)
        for trigger, title, text in seed_data.SUPPLEMENTS
    ])
    model('recipes', 'ActivityGuidanceRule').objects.bulk_create([
        model('recipes', 'ActivityGuidanceRule')(
            goal_type=goal, bmi_category=bmi, calories_remaining=remaining, priority=priority, title=title, text=text,
        )
        for goal, bmi, remaining, priority, title, text in seed_data.WELLNESS
    ])


class Migration(migrations.Migration):
    dependencies = [('recipes', '0001_initial')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
