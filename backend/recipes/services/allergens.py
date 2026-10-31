"""Exact and alias-based allergen matching (FR-06)."""
import re

from recipes.models import AllergenAlias, AllergenException

COMMON_ALLERGENS = ['Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'Lupin']


def _matches(name, words, exceptions):
    text = name.lower()
    for phrase in exceptions:
        text = text.replace(phrase, ' ')
    return any(re.search(rf'\b{re.escape(word)}(s|es)?\b', text) for word in words)


def find_allergens(names, allergies):
    """Returns each listed allergy found in the names. Database errors propagate so the caller can block the recipe."""
    if not allergies:
        return []
    aliases = {}
    for row in AllergenAlias.objects.filter(allergen__in=allergies):
        aliases.setdefault(row.allergen, []).append(row.word)
    exceptions = {}
    for row in AllergenException.objects.filter(allergen__in=allergies):
        exceptions.setdefault(row.allergen, []).append(row.phrase)
    return [
        allergy for allergy in allergies
        if any(_matches(name, aliases.get(allergy, [allergy.lower()]), exceptions.get(allergy, [])) for name in names)
    ]
