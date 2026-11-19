# Database tables for recipes, saved recipes, meal and water logs, and the reference data.
from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------- Reference data, loaded from recipes/seed/*.json by `python manage.py seed` ----------

# Groups for the ingredient suggestion chips on the Generate page, e.g. Proteins, Vegetables.
class IngredientCategory(models.Model):
    name = models.CharField(max_length=40, unique=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'ingredient_categories'
        ordering = ['sort_order', 'id']


# Nutrition per 100 g of each ingredient. Items with a category are offered as suggestion chips.
class NutritionItem(models.Model):
    """Values per 100 g."""

    name = models.CharField(max_length=80, unique=True)
    kcal = models.FloatField()
    protein = models.FloatField()
    carbs = models.FloatField()
    fat = models.FloatField()
    category = models.ForeignKey(IngredientCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='items')
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'nutrition_dataset'
        ordering = ['sort_order', 'id']


# The allergies a user can pick on the Allergy Profile page.
class Allergen(models.Model):
    name = models.CharField(max_length=40, unique=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'allergens'
        ordering = ['sort_order', 'id']


# Other names for the same ingredient, e.g. "spring onion" -> "green onion".
class IngredientAlias(models.Model):
    alias = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=80)

    class Meta:
        db_table = 'ingredient_aliases'


# Words that mean an allergen, e.g. Milk -> cheese, butter, whey.
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


# A swap for a missing ingredient. Lower rank shows first.
class SubstitutionRule(models.Model):
    match = models.CharField(max_length=60)
    substitute = models.CharField(max_length=80)
    reason = models.CharField(max_length=40)
    rank = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = 'substitution_rules'
        ordering = ['id']


# Supplement notes and the situation that triggers each one (FR-11).
class SupplementRule(models.Model):
    trigger = models.CharField(max_length=30)  # protein_short, training_goal or vegan_diet
    title = models.CharField(max_length=60)
    text = models.TextField()

    class Meta:
        db_table = 'supplement_rules'
        ordering = ['id']


# Wellness tips and when to show each one (FR-16).
class ActivityGuidanceRule(models.Model):
    goal_type = models.CharField(max_length=24, blank=True)  # blank matches every goal
    bmi_category = models.CharField(max_length=16, blank=True)  # blank matches every category
    calories_remaining = models.BooleanField(default=False)
    time_of_day = models.CharField(max_length=10, blank=True)  # morning, afternoon or evening; blank matches any time
    priority = models.PositiveSmallIntegerField(default=10)  # lower numbers are checked first
    title = models.CharField(max_length=80)
    text = models.TextField()
    disclaimer_required = models.BooleanField(default=True)

    class Meta:
        db_table = 'activity_guidance_rules'
        ordering = ['priority', 'id']


# Labelled example recipes, used when the AI isn't available (risk R01). `recipe` holds the whole recipe.
class SampleRecipe(models.Model):
    title = models.CharField(max_length=200, unique=True)
    recipe = models.JSONField()
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'sample_recipes'
        ordering = ['sort_order', 'id']


# ---------- Form choices, also seeded ----------

# Diets for the profile. A substitute containing one of `blocked_words` is never suggested for that diet.
class Diet(models.Model):
    name = models.CharField(max_length=24, unique=True)
    blocked_words = models.JSONField(default=list)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'diets'
        ordering = ['sort_order', 'id']


# Fitness goals, with the daily calorie adjustment and macro split used for suggested targets.
class FitnessGoal(models.Model):
    value = models.CharField(max_length=24, unique=True)
    label = models.CharField(max_length=40)
    calorie_adjust = models.SmallIntegerField(default=0)
    protein_pct = models.PositiveSmallIntegerField()
    carbs_pct = models.PositiveSmallIntegerField()
    fat_pct = models.PositiveSmallIntegerField()
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'fitness_goals'
        ordering = ['sort_order', 'id']


# Activity levels. `value` is the multiplier used in the calorie estimate, e.g. "1.375".
class ActivityLevel(models.Model):
    value = models.CharField(max_length=5, unique=True)
    label = models.CharField(max_length=60)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'activity_levels'
        ordering = ['sort_order', 'id']


# Meal types, with each meal's share of the daily calories.
class MealType(models.Model):
    name = models.CharField(max_length=16, unique=True)
    calorie_share = models.FloatField()
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'meal_types'
        ordering = ['sort_order', 'id']


# Simple drop-down choices, grouped: sex, cuisine, difficulty, budget and prep_time.
class ChoiceOption(models.Model):
    group = models.CharField(max_length=20)
    value = models.CharField(max_length=40)
    label = models.CharField(max_length=60)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'choice_options'
        ordering = ['group', 'sort_order', 'id']
        constraints = [models.UniqueConstraint(fields=['group', 'value'], name='unique_choice_per_group')]


# ---------- User data ----------

# Every recipe the AI (or the sample) produced for a user, with its nutrition and allergy check.
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


# One chat message about a recipe: the cook's message or the assistant's reply.
class RecipeMessage(models.Model):
    recipe = models.ForeignKey(GeneratedRecipe, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10)  # user or assistant
    content = models.TextField()
    # True on an assistant reply that changed the recipe.
    changed_recipe = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recipe_messages'
        ordering = ['id']


# A recipe the user chose to keep, with an optional note and star rating.
class SavedRecipe(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_recipes')
    generated_recipe = models.ForeignKey(GeneratedRecipe, on_delete=models.CASCADE, related_name='saves')
    note = models.CharField(max_length=500, blank=True)
    rating = models.PositiveSmallIntegerField(default=0)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_recipes'
        ordering = ['-saved_at', '-id']
        # The same recipe can only be saved once per user.
        constraints = [models.UniqueConstraint(fields=['user', 'generated_recipe'], name='unique_saved_recipe')]


# A meal the user logged as eaten. The nutrition is copied, so it stays even if the recipe is deleted.
class ConsumedMeal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='consumed_meals')
    # SET_NULL keeps the logged meal if the recipe is removed.
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


# Glasses of water per user per day.
class WaterLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='water_logs')
    date = models.DateField(default=timezone.localdate)
    glasses = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'water_logs'
        constraints = [models.UniqueConstraint(fields=['user', 'date'], name='unique_water_per_day')]
