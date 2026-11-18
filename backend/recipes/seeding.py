"""Loads the reference data in recipes/seed/*.json into the database.

Run with `python manage.py seed`. Render runs it on every deploy (build.sh), and the
test runner runs it before the tests. Each run replaces the reference tables with the
contents of the files, so editing a JSON file and re-seeding is all it takes to change
the data. User data (accounts, recipes, logs) is never touched.
"""
import json
from pathlib import Path

from django.db import transaction

from .models import (
    ActivityGuidanceRule,
    ActivityLevel,
    Allergen,
    AllergenAlias,
    AllergenException,
    ChoiceOption,
    Diet,
    FitnessGoal,
    IngredientAlias,
    IngredientCategory,
    MealType,
    NutritionItem,
    SampleRecipe,
    SubstitutionRule,
    SupplementRule,
)

SEED_DIR = Path(__file__).resolve().parent / 'seed'

# Every table this command fills. They hold only reference data, so they can be emptied and refilled.
SEEDED_MODELS = [
    NutritionItem, IngredientCategory, IngredientAlias, AllergenAlias, AllergenException, Allergen,
    SubstitutionRule, SupplementRule, ActivityGuidanceRule, SampleRecipe, Diet, FitnessGoal,
    ActivityLevel, MealType, ChoiceOption,
]


def read(name):
    with open(SEED_DIR / name, encoding='utf-8') as fh:
        return json.load(fh)


@transaction.atomic
def load_seed():
    """Replaces every reference table with the seed files. Returns {table name: rows}.

    It runs in one transaction, so if any file is wrong nothing changes.
    """
    for model in SEEDED_MODELS:
        model.objects.all().delete()

    categories = {
        row['name']: IngredientCategory.objects.create(name=row['name'], sort_order=i)
        for i, row in enumerate(read('ingredient_categories.json'))
    }
    NutritionItem.objects.bulk_create([
        NutritionItem(
            name=row['name'], kcal=row['kcal'], protein=row['protein'], carbs=row['carbs'], fat=row['fat'],
            category=categories[row['category']] if row.get('category') else None, sort_order=i,
        )
        for i, row in enumerate(read('nutrition.json'))
    ])
    IngredientAlias.objects.bulk_create([
        IngredientAlias(alias=alias, name=name) for alias, name in read('ingredient_aliases.json').items()
    ])

    allergens = read('allergens.json')
    Allergen.objects.bulk_create([Allergen(name=row['name'], sort_order=i) for i, row in enumerate(allergens)])
    AllergenAlias.objects.bulk_create([
        AllergenAlias(allergen=row['name'], word=word) for row in allergens for word in row['aliases']
    ])
    AllergenException.objects.bulk_create([
        AllergenException(allergen=row['name'], phrase=phrase) for row in allergens for phrase in row['exceptions']
    ])

    SubstitutionRule.objects.bulk_create([SubstitutionRule(**row) for row in read('substitutions.json')])
    SupplementRule.objects.bulk_create([SupplementRule(**row) for row in read('supplements.json')])
    ActivityGuidanceRule.objects.bulk_create([
        ActivityGuidanceRule(
            goal_type=row['goal'], bmi_category=row['bmi_category'], calories_remaining=row['calories_remaining'],
            priority=row['priority'], title=row['title'], text=row['text'],
        )
        for row in read('wellness.json')
    ])
    SampleRecipe.objects.bulk_create([
        SampleRecipe(title=row['title'], recipe=row, sort_order=i) for i, row in enumerate(read('sample_recipes.json'))
    ])

    # Form choices.
    Diet.objects.bulk_create([Diet(sort_order=i, **row) for i, row in enumerate(read('diets.json'))])
    FitnessGoal.objects.bulk_create([FitnessGoal(sort_order=i, **row) for i, row in enumerate(read('fitness_goals.json'))])
    ActivityLevel.objects.bulk_create([ActivityLevel(sort_order=i, **row) for i, row in enumerate(read('activity_levels.json'))])
    MealType.objects.bulk_create([MealType(sort_order=i, **row) for i, row in enumerate(read('meal_types.json'))])
    ChoiceOption.objects.bulk_create([
        ChoiceOption(group=group, value=row['value'], label=row['label'], sort_order=i)
        for group, rows in read('choices.json').items()
        for i, row in enumerate(rows)
    ])

    return {model._meta.db_table: model.objects.count() for model in SEEDED_MODELS}
