from django.conf import settings
from django.db import models
from django.utils import timezone


class NutritionItem(models.Model):
    """Values per 100 g."""

    name = models.CharField(max_length=80, unique=True)
    kcal = models.FloatField()
    protein = models.FloatField()
    carbs = models.FloatField()
    fat = models.FloatField()

    class Meta:
        db_table = 'nutrition_dataset'


class IngredientAlias(models.Model):
    alias = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=80)

    class Meta:
        db_table = 'ingredient_aliases'


class AllergenAlias(models.Model):
    allergen = models.CharField(max_length=40)
    word = models.CharField(max_length=60)

    class Meta:
        db_table = 'allergen_aliases'
        constraints = [models.UniqueConstraint(fields=['allergen', 'word'], name='unique_allergen_word')]


class AllergenException(models.Model):
    """Phrases containing an allergen's word that don't contain the allergen, like coconut milk."""

    allergen = models.CharField(max_length=40)
    phrase = models.CharField(max_length=60)

    class Meta:
        db_table = 'allergen_exceptions'
        constraints = [models.UniqueConstraint(fields=['allergen', 'phrase'], name='unique_allergen_phrase')]


class SubstitutionRule(models.Model):
    match = models.CharField(max_length=60)
    substitute = models.CharField(max_length=80)
    reason = models.CharField(max_length=40)
    rank = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = 'substitution_rules'
        ordering = ['id']


class SupplementRule(models.Model):
    trigger = models.CharField(max_length=30)  # protein_short, training_goal or vegan_diet
    title = models.CharField(max_length=60)
    text = models.TextField()

    class Meta:
        db_table = 'supplement_rules'
        ordering = ['id']


class ActivityGuidanceRule(models.Model):
    goal_type = models.CharField(max_length=24, blank=True)  # blank matches every goal
    bmi_category = models.CharField(max_length=16, blank=True)  # blank matches every category
    calories_remaining = models.BooleanField(default=False)
    priority = models.PositiveSmallIntegerField(default=10)  # lower numbers are checked first
    title = models.CharField(max_length=80)
    text = models.TextField()
    disclaimer_required = models.BooleanField(default=True)

    class Meta:
        db_table = 'activity_guidance_rules'
        ordering = ['priority', 'id']


class GeneratedRecipe(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='generated_recipes')
    title = models.CharField(max_length=200)
    meal_type = models.CharField(max_length=16)
    cuisine_type = models.CharField(max_length=20, blank=True)
    difficulty = models.CharField(max_length=10)
    estimated_cost = models.CharField(max_length=10, blank=True)
    cooking_time = models.PositiveSmallIntegerField()
    servings = models.PositiveSmallIntegerField()
    diet = models.CharField(max_length=24, blank=True)
    calories = models.PositiveIntegerField()
    protein_g = models.PositiveIntegerField()
    carbs_g = models.PositiveIntegerField()
    fat_g = models.PositiveIntegerField()
    nutrition_source = models.CharField(max_length=20)  # calculated, partly_estimated or ai_estimated
    nutrition_warning = models.BooleanField(default=False)
    content = models.JSONField()  # description, ingredients, steps and notes
    allergies_checked = models.JSONField(default=list)
    source = models.CharField(max_length=10, default='ai')  # ai or sample
    ai_model = models.CharField(max_length=40, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'generated_recipes'
        ordering = ['-generated_at']


class SavedRecipe(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_recipes')
    generated_recipe = models.ForeignKey(GeneratedRecipe, on_delete=models.CASCADE, related_name='saves')
    note = models.CharField(max_length=500, blank=True)
    rating = models.PositiveSmallIntegerField(default=0)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_recipes'
        ordering = ['-saved_at', '-id']
        constraints = [models.UniqueConstraint(fields=['user', 'generated_recipe'], name='unique_saved_recipe')]


class ConsumedMeal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='consumed_meals')
    recipe = models.ForeignKey(GeneratedRecipe, null=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=200)
    meal_type = models.CharField(max_length=16)
    date = models.DateField(default=timezone.localdate, db_index=True)
    calories = models.PositiveIntegerField()
    protein_g = models.PositiveIntegerField()
    carbs_g = models.PositiveIntegerField()
    fat_g = models.PositiveIntegerField()

    class Meta:
        db_table = 'consumed_meals'
        ordering = ['id']


class WaterLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='water_logs')
    date = models.DateField(default=timezone.localdate)
    glasses = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'water_logs'
        constraints = [models.UniqueConstraint(fields=['user', 'date'], name='unique_water_per_day')]
