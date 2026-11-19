"""Substitutions, supplements and wellness, all drawn from rule tables (FR-10, FR-11, FR-16)."""
import re

from django.utils import timezone

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
# Morning (5am to noon), afternoon (noon to 5pm) or evening, in the app's time zone.
def part_of_day(now=None):
    hour = (now or timezone.localtime()).hour
    if 5 <= hour < 12:
        return 'morning'
    if 12 <= hour < 17:
        return 'afternoon'
    return 'evening'


def wellness_tips(profile, eaten_kcal, limit=3, now=None):
    """Up to `limit` general wellness tips that fit the user's goal, BMI, calories left and the time of day (FR-16).

    Returns [] if the user turned wellness suggestions off in Settings.
    """
    if not profile.show_wellness:
        return []
    # Does the user still have calories left today?
    targets = daily_targets(profile)
    calories_left = bool(targets and targets['kcal'] > eaten_kcal)
    category = bmi_category(profile)
    time = part_of_day(now)
    tips = []
    # Rules are checked in priority order. Each one whose conditions all fit is used, up to the limit.
    for rule in ActivityGuidanceRule.objects.all():
        if rule.goal_type and rule.goal_type != profile.fitness_goal:
            continue
        if rule.bmi_category and rule.bmi_category != category:
            continue
        if rule.calories_remaining and not calories_left:
            continue
        if rule.time_of_day and rule.time_of_day != time:
            continue
        # A last check that no tip mentions treating a condition or a dose (NFR-04).
        if re.search(MEDICAL_TERMS, rule.text.lower()):
            continue
        tips.append({'title': rule.title, 'text': rule.text, 'disclaimer': WELLNESS_DISCLAIMER})
        if len(tips) == limit:
            break
    return tips


# The single tip shown on the dashboard, or None.
def suggest_wellness(profile, eaten_kcal):
    tips = wellness_tips(profile, eaten_kcal, limit=1)
    return tips[0] if tips else None


def weekly_insights(days, targets, water_goal):
    """Plain-language facts about the last 7 days, worked out from the meal and water logs.

    `days` is oldest first, each {'kcal', 'protein', 'meals', 'water', ...}. Returns [{key, label, value, detail}].
    """
    logged = [d for d in days if d['meals'] > 0]
    # Days in a row with a meal logged, counting back from today (or from yesterday if today is still empty).
    streak = 0
    for day in reversed(days if days[-1]['meals'] else days[:-1]):
        if not day['meals']:
            break
        streak += 1
    insights = [
        {'key': 'logged', 'label': 'Days logged', 'value': f'{len(logged)} of 7', 'detail': 'Days with at least one meal logged.'},
        {'key': 'streak', 'label': 'Logging streak', 'value': f"{streak} {'day' if streak == 1 else 'days'}", 'detail': 'In a row, up to today.'},
    ]
    if targets and logged:
        average = round(sum(d['kcal'] for d in logged) / len(logged))
        on_protein = sum(1 for d in logged if d['protein'] >= targets['protein'] * 0.9)
        insights += [
            {'key': 'calories', 'label': 'Average calories', 'value': f'{average:,} kcal',
             'detail': f"On the days you logged, against your {targets['kcal']:,} kcal target."},
            {'key': 'protein', 'label': 'Protein on target', 'value': f'{on_protein} of {len(logged)} days',
             'detail': 'Days you reached at least 90% of your protein target.'},
        ]
    average_water = sum(d['water'] for d in days) / len(days)
    goal_days = sum(1 for d in days if d['water'] >= water_goal)
    insights.append({'key': 'water', 'label': 'Average water', 'value': f'{average_water:.1f} glasses',
                     'detail': f'A day. You reached {water_goal} glasses on {goal_days} of 7 days.'})
    return insights
