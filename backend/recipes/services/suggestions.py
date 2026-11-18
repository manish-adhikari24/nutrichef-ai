"""Substitutions, supplements and wellness, all drawn from rule tables (FR-10, FR-11, FR-16)."""
import re

from recipes.models import ActivityGuidanceRule, Diet, SubstitutionRule, SupplementRule

from .allergens import find_allergens
from .nutrition import bmi_category, daily_targets, meal_targets

# Shown with every supplement note and wellness tip.
SUPPLEMENT_DISCLAIMER = 'General information only; consult a healthcare professional before using supplements.'
WELLNESS_DISCLAIMER = 'General wellness information only, not medical or professional fitness advice.'

# A last check that no rule ever suggests treating a condition or a dose (FR-11, NFR-04).
MEDICAL_TERMS = r'\b(diabetes|cancer|disease|disorder|treat|treats|cure|cures|diagnos\w*|dose|dosage|mg|injury)\b'


# True if a substitute suits the user's diet: it contains none of the diet's blocked words.
def _fits_diet(name, blocked_words):
    text = name.lower()
    return not any(word in text for word in blocked_words)


# Suggests swaps for ingredients the user doesn't have (FR-10).
def suggest_substitutions(ingredients, allergies, diet):
    # Rules in priority order (lower rank first).
    rules = list(SubstitutionRule.objects.order_by('rank', 'id'))
    # The words the user's diet rules out, from the diets table.
    blocked_words = Diet.objects.filter(name=diet).values_list('blocked_words', flat=True).first() or []
    suggestions = []
    # Only the ingredients marked as missing.
    for ingredient in (i for i in ingredients if i.get('missing')):
        text = ingredient['name'].lower()
        # Most specific rule wins, so buttermilk isn't treated as milk.
        matched = [r for r in rules if r.match in text]
        if not matched:
            continue
        longest = max(len(r.match) for r in matched)
        # Keep options that don't trigger an allergy and suit the diet.
        options = [
            {'name': r.substitute, 'reason': r.reason}
            for r in matched
            if len(r.match) == longest
            and not find_allergens([r.substitute], allergies)
            and _fits_diet(r.substitute, blocked_words)
        ]
        if options:
            suggestions.append({'ingredient': ingredient['name'], 'options': options})
    return suggestions


# Optional supplement notes (FR-11). Returns nothing if the user turned them off in Settings.
def suggest_supplements(nutrition, meal, profile):
    if not profile.show_supplements:
        return []
    # Work out which rules apply: low protein for this meal, a training goal, or a vegan diet.
    target = meal_targets(profile, meal)
    triggers = set()
    if target and nutrition['protein'] < target['protein'] * 0.8:
        triggers.add('protein_short')
    if profile.fitness_goal in ('muscle_gain', 'athletic_performance'):
        triggers.add('training_goal')
    if profile.diet == 'Vegan':
        triggers.add('vegan_diet')
    # Every note carries the disclaimer. Any rule text with medical words is skipped.
    return [
        {'title': rule.title, 'text': rule.text, 'disclaimer': SUPPLEMENT_DISCLAIMER}
        for rule in SupplementRule.objects.filter(trigger__in=triggers)
        if not re.search(MEDICAL_TERMS, rule.text.lower())
    ]


# One general wellness tip for the dashboard (FR-16), or None if switched off.
def suggest_wellness(profile, eaten_kcal):
    if not profile.show_wellness:
        return None
    # Does the user still have calories left today?
    targets = daily_targets(profile)
    calories_left = bool(targets and targets['kcal'] > eaten_kcal)
    category = bmi_category(profile)
    # Rules are checked in order. The first one whose conditions all fit is used.
    for rule in ActivityGuidanceRule.objects.all():
        if rule.goal_type and rule.goal_type != profile.fitness_goal:
            continue
        if rule.bmi_category and rule.bmi_category != category:
            continue
        if rule.calories_remaining and not calories_left:
            continue
        return {'title': rule.title, 'text': rule.text, 'disclaimer': WELLNESS_DISCLAIMER}
    return None
