"""Ingredient clean-up, nutrition calculation and goal alignment (FR-04, FR-07, FR-08)."""
import re

from recipes.models import IngredientAlias, NutritionItem

MEAL_SHARE = {'Breakfast': 0.25, 'Lunch': 0.3, 'Dinner': 0.35, 'Snack': 0.1}
CALORIE_TOLERANCE = 0.1
MACRO_TOLERANCE_POINTS = 8
KEYS = ['kcal', 'protein', 'carbs', 'fat']


def normalize_ingredients(raw_names):
    """Trims, lowercases, maps aliases and merges duplicates."""
    aliases = dict(IngredientAlias.objects.values_list('alias', 'name'))
    seen = []
    for raw in raw_names:
        clean = re.sub(r'\s+', ' ', raw).strip().lower()
        name = aliases.get(clean, clean)
        if name and name not in seen:
            seen.append(name)
    return seen


def _lookup(name, items):
    """Finds the longest dataset name contained in the ingredient name."""
    text = name.lower()
    matches = [key for key in items if re.search(rf'\b{re.escape(key)}(s|es)?\b', text)]
    return items[max(matches, key=len)] if matches else None


def calculate_nutrition(recipe):
    """Per-serving values from the dataset, using AI estimates for anything it doesn't cover."""
    items = {item.name: item for item in NutritionItem.objects.all()}
    servings = max(recipe.get('servings') or 1, 1)
    totals = dict.fromkeys(KEYS, 0.0)
    from_dataset = 0
    ingredients = recipe['ingredients']

    for ingredient in ingredients:
        item = _lookup(ingredient['name'], items)
        grams = ingredient.get('grams') or 0
        if item and grams > 0:
            from_dataset += 1
            for key in KEYS:
                totals[key] += getattr(item, key) * grams / 100
        elif all(ingredient.get(key) is not None for key in KEYS):
            for key in KEYS:
                totals[key] += ingredient[key]
        else:
            # Without values for one ingredient, the only complete figure is the recipe's own estimate.
            return dict(recipe['nutrition']), 'ai_estimated'

    if from_dataset == 0:
        source = 'ai_estimated'
    elif from_dataset == len(ingredients):
        source = 'calculated'
    else:
        source = 'partly_estimated'
    return {key: round(totals[key] / servings) for key in KEYS}, source


def nutrition_looks_wrong(n):
    energy = n['protein'] * 4 + n['carbs'] * 4 + n['fat'] * 9
    return (
        n['kcal'] < 30 or n['kcal'] > 2500 or n['protein'] > 200 or n['carbs'] > 400 or n['fat'] > 200
        or abs(energy - n['kcal']) > n['kcal'] * 0.35
    )


def daily_targets(profile):
    kcal = profile.calorie_target
    if not kcal:
        return None
    return {
        'kcal': kcal,
        'protein': round(kcal * profile.protein_pct / 100 / 4),
        'carbs': round(kcal * profile.carbs_pct / 100 / 4),
        'fat': round(kcal * profile.fat_pct / 100 / 9),
    }


def meal_targets(profile, meal):
    daily = daily_targets(profile)
    if not daily:
        return None
    share = MEAL_SHARE.get(meal, MEAL_SHARE['Dinner'])
    return {key: round(value * share) for key, value in daily.items()}


def assess_recipe(nutrition, meal, profile):
    """Pass or warning for calories and each macro. Returns None if no target is set."""
    target = meal_targets(profile, meal)
    if not target:
        return None
    meal_name = meal.lower()
    diff = round((nutrition['kcal'] - target['kcal']) / target['kcal'] * 100)
    within = abs(diff) <= CALORIE_TOLERANCE * 100
    results = [{
        'key': 'kcal',
        'label': 'Calories',
        'pass': within,
        'text': (
            f"{nutrition['kcal']} kcal is within your {meal_name} target of {target['kcal']}." if within
            else f"Calories {'exceed' if diff > 0 else 'are under'} your {meal_name} target by {abs(diff)}%."
        ),
    }]
    energy = nutrition['protein'] * 4 + nutrition['carbs'] * 4 + nutrition['fat'] * 9
    for key, label, per_gram, goal in [
        ('protein', 'Protein', 4, profile.protein_pct),
        ('carbs', 'Carbs', 4, profile.carbs_pct),
        ('fat', 'Fat', 9, profile.fat_pct),
    ]:
        actual = round(nutrition[key] * per_gram * 100 / energy) if energy else 0
        ok = abs(actual - goal) <= MACRO_TOLERANCE_POINTS
        results.append({
            'key': key,
            'label': label,
            'pass': ok,
            'text': (
                f'{actual}% of calories, close to your {goal}% goal.' if ok
                else f"{actual}% of calories, {'above' if actual > goal else 'below'} your {goal}% goal."
            ),
        })
    return results


def bmi_category(profile):
    if not profile.height_cm or not profile.weight_kg:
        return ''
    height = float(profile.height_cm) / 100
    value = float(profile.weight_kg) / (height * height)
    if value < 18.5:
        return 'underweight'
    if value < 25:
        return 'healthy'
    if value < 30:
        return 'overweight'
    return 'obese'
