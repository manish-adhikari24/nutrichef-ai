"""Reads the seeded form choices from the database, for validation and for the website."""
from rest_framework import serializers

from .models import ActivityLevel, Allergen, ChoiceOption, Diet, FitnessGoal, MealType


def allergen_names():
    return list(Allergen.objects.values_list('name', flat=True))


def meal_types():
    return list(MealType.objects.values_list('name', flat=True))


def diets():
    return list(Diet.objects.values_list('name', flat=True))


def goals():
    return list(FitnessGoal.objects.values_list('value', flat=True))


def activity_levels():
    return list(ActivityLevel.objects.values_list('value', flat=True))


def choices(group):
    """The values of one group in choices.json, e.g. 'cuisine' or 'sex'."""
    return list(ChoiceOption.objects.filter(group=group).values_list('value', flat=True))


def prep_minutes():
    """The allowed time limits in minutes (prep_time choices other than 'any')."""
    return [int(v) for v in choices('prep_time') if v.isdigit()]


class DbChoiceField(serializers.CharField):
    """A text field whose allowed values come from the database instead of the code.

    `values` is a function returning the allowed values, so it reads the current data on each request.
    """

    def __init__(self, values, **kwargs):
        self.values = values
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        # A blank value is only allowed where the field says so (e.g. sex).
        if value == '' and self.allow_blank:
            return value
        if value not in self.values():
            raise serializers.ValidationError(f'"{value}" is not a valid choice.')
        return value
