"""Exact and alias-based allergen matching (FR-06)."""
import re

from recipes.models import AllergenAlias, AllergenException

# The allergies a user can tick on the Allergy Profile page.
COMMON_ALLERGENS = ['Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'Lupin']


# True if any allergen word appears in the ingredient name as a whole word (plural "s"/"es" allowed).
def _matches(name, words, exceptions):
    text = name.lower()
    # First blank out safe phrases, e.g. "coconut milk" for a milk allergy.
    for phrase in exceptions:
        text = text.replace(phrase, ' ')
    return any(re.search(rf'\b{re.escape(word)}(s|es)?\b', text) for word in words)


def find_allergens(names, allergies):
    """Returns each listed allergy found in the names. Database errors propagate so the caller can block the recipe."""
    # No allergies listed: nothing to check.
    if not allergies:
        return []
    # Load the alternate names for each allergy, e.g. milk -> cheese, butter, cream.
    aliases = {}
    for row in AllergenAlias.objects.filter(allergen__in=allergies):
        aliases.setdefault(row.allergen, []).append(row.word)
    # Load the safe phrases for each allergy.
    exceptions = {}
    for row in AllergenException.objects.filter(allergen__in=allergies):
        exceptions.setdefault(row.allergen, []).append(row.phrase)
    # Keep each allergy that matches any ingredient. Without aliases, use the allergy's own name.
    return [
        allergy for allergy in allergies
        if any(_matches(name, aliases.get(allergy, [allergy.lower()]), exceptions.get(allergy, [])) for name in names)
    ]
