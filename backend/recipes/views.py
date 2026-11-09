# API endpoints for recipe generation, the recipe assistant, saved recipes, meal and water logs and the dashboard.
import itertools
import logging
from datetime import timedelta

from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import ConsumedMeal, GeneratedRecipe, SavedRecipe, WaterLog
from .seed_data import SAMPLE_RECIPES
from .services import ai, assistant
from .services.allergens import find_allergens
from .services.nutrition import (
    assess_recipe,
    calculate_nutrition,
    meal_targets,
    normalize_ingredients,
    nutrition_looks_wrong,
)
from .services.suggestions import suggest_substitutions, suggest_supplements, suggest_wellness

logger = logging.getLogger(__name__)

# Saved recipes per page.
PAGE_SIZE = 6
# Rotates through the sample recipes.
SAMPLE_CYCLE = itertools.count()


# Checks the Generate Recipe form (FR-09). Every filter must be one of the allowed values.
class GenerateRequest(serializers.Serializer):
    ingredients = serializers.ListField(child=serializers.CharField(max_length=80), allow_empty=False, max_length=60, error_messages={'empty': 'Please enter at least one ingredient.'})
    meal = serializers.ChoiceField(choices=['Breakfast', 'Lunch', 'Dinner', 'Snack'], default='Dinner')
    cuisine = serializers.ChoiceField(choices=['Any', 'Asian', 'Mediterranean', 'Mexican', 'Western'], default='Any')
    difficulty = serializers.ChoiceField(choices=['Any', 'Easy', 'Medium', 'Hard'], default='Any')
    budget = serializers.ChoiceField(choices=['Any', 'Low', 'Medium', 'High'], default='Any')
    minutes = serializers.ChoiceField(choices=[15, 30, 60], required=False, allow_null=True)
    calories = serializers.IntegerField(min_value=50, max_value=2500, required=False, allow_null=True)
    servings = serializers.IntegerField(min_value=1, max_value=12, default=2)
    notes = serializers.CharField(max_length=300, allow_blank=True, default='')


# The names of the user's allergies.
def user_allergies(user):
    return list(user.allergies.values_list('name', flat=True))


def recipe_payload(recipe, user):
    """A recipe as the frontend shows it. Alignment and suggestions use the current profile."""
    profile = user.profile
    allergies = user_allergies(user)
    nutrition = {'kcal': recipe.calories, 'protein': recipe.protein_g, 'carbs': recipe.carbs_g, 'fat': recipe.fat_g}
    content = recipe.content
    # Everything the recipe card needs. Goal alignment and suggestions are worked out fresh each time.
    return {
        'id': recipe.id,
        'title': recipe.title,
        'description': content['description'],
        'minutes': recipe.cooking_time,
        'servings': recipe.servings,
        'difficulty': recipe.difficulty,
        'meal': recipe.meal_type,
        'cuisine': recipe.cuisine_type,
        'budget': recipe.estimated_cost,
        'diet': recipe.diet,
        'source': recipe.source,
        'nutrition': nutrition,
        'nutritionSource': recipe.nutrition_source,
        'nutritionWarning': recipe.nutrition_warning,
        # The browser gets ingredient names and amounts only, not the internal gram and nutrition figures.
        'ingredients': [{'name': i['name'], 'amount': i['amount'], 'missing': i['missing']} for i in content['ingredients']],
        'steps': content['steps'],
        'why_it_fits': content['why_it_fits'],
        'label_checks': content['label_checks'],
        'constraint_warning': content['constraint_warning'],
        'allergiesChecked': recipe.allergies_checked,
        'alignment': assess_recipe(nutrition, recipe.meal_type, profile),
        'substitutions': suggest_substitutions(content['ingredients'], allergies, profile.diet),
        'supplements': suggest_supplements(nutrition, recipe.meal_type, profile),
    }


# The error returned when the finished recipe contains an allergen.
def blocked_response(found):
    return Response(
        {
            'code': 'blocked',
            'allergens': found,
            'error': f"We blocked this recipe because it contains {', '.join(found)}. Generate another one.",
        },
        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


def store_recipe(user, data, recipe, source, allergies):
    """Runs the nutrition steps and saves a recipe that has passed the allergy check."""
    # Recalculate nutrition from our dataset instead of trusting the AI's numbers.
    nutrition, nutrition_source = calculate_nutrition(recipe)
    profile = user.profile
    return GeneratedRecipe.objects.create(
        user=user,
        title=recipe['title'][:200],
        meal_type=data['meal'],
        cuisine_type=data['cuisine'],
        difficulty=recipe['difficulty'],
        estimated_cost=data['budget'],
        cooking_time=recipe['minutes'],
        servings=recipe['servings'],
        # Stored as '' when the user has no specific diet.
        diet='' if profile.diet == 'No specific diet' else profile.diet,
        # Negative values are never stored.
        calories=max(nutrition['kcal'], 0),
        protein_g=max(nutrition['protein'], 0),
        carbs_g=max(nutrition['carbs'], 0),
        fat_g=max(nutrition['fat'], 0),
        nutrition_source=nutrition_source,
        nutrition_warning=nutrition_looks_wrong(nutrition),
        content={key: recipe[key] for key in ['description', 'ingredients', 'steps', 'why_it_fits', 'label_checks', 'constraint_warning']},
        allergies_checked=allergies,
        source=source,
        ai_model=ai.MODEL if source == 'ai' else '',
    )


# Shared steps for real and sample recipes: check the request first, then check the result.
class BaseGenerateView(APIView):
    def prepare(self, request):
        """Validates the request and checks the ingredients. Returns (data, allergies, error response)."""
        serializer = GenerateRequest(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Clean the ingredient names (trim, lowercase, aliases, duplicates).
        data = dict(serializer.validated_data)
        data['ingredients'] = normalize_ingredients(data['ingredients'])
        if not data['ingredients']:
            raise serializers.ValidationError({'ingredients': 'Please enter at least one ingredient.'})
        # Check the typed ingredients against the user's allergies before calling the AI (FR-06).
        try:
            allergies = user_allergies(request.user)
            conflicts = find_allergens(data['ingredients'], allergies)
        # If the check itself fails, block rather than risk an unsafe recipe.
        except DatabaseError:
            logger.exception('Allergy check failed')
            return None, None, Response(
                {'code': 'blocked', 'error': 'We could not check your allergies, so no recipe was generated. Try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        # A listed allergen in the ingredients: stop here.
        if conflicts:
            return None, None, Response(
                {
                    'code': 'blocked',
                    'allergens': conflicts,
                    'error': f"Your ingredients include {', '.join(conflicts)}, which you listed as an allergy. Remove it to continue.",
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        return data, allergies, None

    def finish(self, request, data, recipe, source, allergies):
        """The allergy check on the finished recipe. Unsafe recipes are never stored."""
        # Check the AI's ingredients too, since it could add something unsafe.
        try:
            found = find_allergens([i['name'] for i in recipe['ingredients']], allergies)
        except DatabaseError:
            logger.exception('Allergy check failed')
            return Response(
                {'code': 'blocked', 'error': 'We could not check your allergies, so this recipe was blocked. Try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if found:
            return blocked_response(found)
        # Safe: save it and return it.
        stored = store_recipe(request.user, data, recipe, source, allergies)
        return Response(recipe_payload(stored, request.user), status=status.HTTP_201_CREATED)


# POST /api/recipes/generate: write a recipe with Claude, limited to 10 an hour per user.
class GenerateRecipeView(BaseGenerateView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'generate'

    def post(self, request):
        data, allergies, error = self.prepare(request)
        if error:
            return error

        # What gets sent to the AI. With no consent, only the form's cooking choices go.
        ai_request = dict(data)
        profile = request.user.profile
        # Allergies are always checked here. They only go to the AI with the person's consent.
        if profile.health_consent:
            ai_request.update(
                diet='' if profile.diet == 'No specific diet' else profile.diet,
                allergies=allergies,
                dislikes=profile.dislikes,
                targets=meal_targets(profile, data['meal']),
            )
        # Turn each AI error into a clear message for the user.
        try:
            recipe = ai.write_recipe(ai_request)
        except ai.NotConfigured:
            return Response(
                {'code': 'not_configured', 'error': "The AI recipe generator isn't connected yet."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ai.Refused:
            return Response(
                {'error': "We couldn't write a recipe for that request. Change your notes and try again."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except ai.Malformed:
            return Response({'code': 'ai_unavailable', 'error': 'The recipe came back incomplete. Generate it again.'}, status=status.HTTP_502_BAD_GATEWAY)
        except ai.Unavailable:
            return Response({'code': 'ai_unavailable', 'error': "The recipe couldn't be generated right now. Try again in a moment."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return self.finish(request, data, recipe, 'ai', allergies)


# POST /api/recipes/sample
class SampleRecipeView(BaseGenerateView):
    """A labelled fallback for demos when the AI isn't available (risk R01)."""

    def post(self, request):
        data, allergies, error = self.prepare(request)
        if error:
            return error
        # Pick the next sample recipe in turn.
        recipe = SAMPLE_RECIPES[next(SAMPLE_CYCLE) % len(SAMPLE_RECIPES)]
        return self.finish(request, data, recipe, 'sample', allergies)


# Checks the assistant chat history sent by the browser.
class AskRequest(serializers.Serializer):
    class Turn(serializers.Serializer):
        role = serializers.ChoiceField(choices=['user', 'assistant'])
        content = serializers.CharField(max_length=2000)

    # At most 12 messages, so requests stay small.
    messages = serializers.ListField(child=Turn(), allow_empty=False, max_length=12)

    def validate_messages(self, messages):
        # The last message must be the user's question, under 500 characters.
        if messages[-1]['role'] != 'user':
            raise serializers.ValidationError('End with your question.')
        if len(messages[-1]['content']) > 500:
            raise serializers.ValidationError('Keep your question under 500 characters.')
        # Messages must alternate: user, assistant, user...
        if any(m['role'] == ('assistant' if i % 2 == 0 else 'user') for i, m in enumerate(messages)):
            raise serializers.ValidationError('Questions and answers must take turns.')
        return messages


# POST /api/recipes/<id>/ask
class RecipeAssistantView(APIView):
    """Answers cooking questions about one of the person's own recipes."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'assistant'

    # Pretend it doesn't exist while the feature is switched off.
    def post(self, request, pk):
        if not assistant.enabled():
            return Response({'error': 'We could not find that.'}, status=status.HTTP_404_NOT_FOUND)
        # Users can only ask about their own recipes.
        recipe = get_object_or_404(GeneratedRecipe, pk=pk)
        if recipe.user_id != request.user.id:
            raise PermissionDenied
        body = AskRequest(data=request.data)
        body.is_valid(raise_exception=True)

        profile = request.user.profile
        # Same consent rule as recipe generation: foods to avoid only go with consent.
        avoid = []
        if profile.health_consent:
            avoid = user_allergies(request.user) + ([profile.dislikes] if profile.dislikes else [])
        try:
            answer = assistant.ask(recipe, avoid, body.validated_data['messages'])
        except ai.NotConfigured:
            return Response({'code': 'not_configured', 'error': "The assistant isn't connected yet."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ai.Refused:
            return Response({'error': "I can't help with that. Try a question about cooking this recipe."}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except ai.Unavailable:
            return Response({'error': "The assistant couldn't answer right now. Try again in a moment."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'answer': answer})


# A saved recipe with its note, rating and the full recipe.
def saved_payload(item, user):
    return {
        'id': item.id,
        'note': item.note,
        'rating': item.rating,
        'savedAt': item.saved_at.isoformat(),
        'recipe': recipe_payload(item.generated_recipe, user),
    }


# GET and POST /api/saved: list saved recipes (FR-13) or save one (FR-12).
class SavedListView(APIView):
    # Filter chips on the Saved Recipes page and the query for each.
    TAGS = {
        'Breakfast': Q(generated_recipe__meal_type='Breakfast'),
        'Lunch': Q(generated_recipe__meal_type='Lunch'),
        'Dinner': Q(generated_recipe__meal_type='Dinner'),
        'Vegan': Q(generated_recipe__diet='Vegan'),
        'High protein': Q(generated_recipe__protein_g__gte=25),
        'Under 30 min': Q(generated_recipe__cooking_time__lt=30),
    }

    def get(self, request):
        # Only this user's saved recipes.
        items = SavedRecipe.objects.filter(user=request.user).select_related('generated_recipe')
        total_saved = items.count()
        tag = request.query_params.get('tag', '')
        if tag in self.TAGS:
            items = items.filter(self.TAGS[tag])
        # Search titles and ingredients.
        search = request.query_params.get('q', '').strip()
        if search:
            items = items.filter(
                Q(generated_recipe__title__icontains=search) | Q(generated_recipe__content__ingredients__icontains=search)
            )
        # Work out the number of pages (rounding up) and keep the page number in range.
        count = items.count()
        pages = max(1, -(-count // PAGE_SIZE))
        try:
            page = min(max(int(request.query_params.get('page', 1)), 1), pages)
        except ValueError:
            page = 1
        offset = (page - 1) * PAGE_SIZE
        return Response({
            'results': [saved_payload(item, request.user) for item in items[offset:offset + PAGE_SIZE]],
            'count': count,
            'totalSaved': total_saved,
            'page': page,
            'pages': pages,
        })

    def post(self, request):
        # Checks the save request.
        class Body(serializers.Serializer):
            recipeId = serializers.IntegerField()
            note = serializers.CharField(max_length=500, allow_blank=True, default='')
            rating = serializers.IntegerField(min_value=0, max_value=5, default=0)

        body = Body(data=request.data)
        body.is_valid(raise_exception=True)
        # Users can only save their own recipes.
        recipe = get_object_or_404(GeneratedRecipe, pk=body.validated_data['recipeId'])
        if recipe.user_id != request.user.id:
            raise PermissionDenied
        try:
            # The database blocks saving the same recipe twice. Report that as a 409 conflict.
            with transaction.atomic():
                item = SavedRecipe.objects.create(
                    user=request.user,
                    generated_recipe=recipe,
                    note=body.validated_data['note'],
                    rating=body.validated_data['rating'],
                )
        except IntegrityError:
            return Response({'error': 'Recipe already saved.'}, status=status.HTTP_409_CONFLICT)
        return Response(saved_payload(item, request.user), status=status.HTTP_201_CREATED)


# DELETE /api/saved/<id>: remove a saved recipe, if it belongs to the user.
class SavedDetailView(APIView):
    def delete(self, request, pk):
        item = get_object_or_404(SavedRecipe, pk=pk)
        if item.user_id != request.user.id:
            raise PermissionDenied
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# A logged meal as the front end shows it.
def meal_payload(meal):
    return {
        'id': meal.id,
        'date': meal.date.isoformat(),
        'title': meal.title,
        'meal': meal.meal_type,
        'kcal': meal.calories,
        'protein': meal.protein_g,
        'carbs': meal.carbs_g,
        'fat': meal.fat_g,
    }


# Adds up calories and macros for a list of meals.
def totals_of(meals):
    return {
        'kcal': sum(m.calories for m in meals),
        'protein': sum(m.protein_g for m in meals),
        'carbs': sum(m.carbs_g for m in meals),
        'fat': sum(m.fat_g for m in meals),
    }


# GET and POST /api/log: the nutrition tracker (FR-14).
class MealLogView(APIView):
    def get(self, request):
        # Today's meals plus totals for each of the last 7 days (for the Progress chart).
        today = timezone.localdate()
        dates = [today - timedelta(days=offset) for offset in range(6, -1, -1)]
        meals = list(ConsumedMeal.objects.filter(user=request.user, date__gte=dates[0]))
        return Response({
            'today': [meal_payload(m) for m in meals if m.date == today],
            'days': [
                {'date': d.isoformat(), **totals_of([m for m in meals if m.date == d])}
                for d in dates
            ],
        })

    def post(self, request):
        # Log a recipe as eaten. Its nutrition is copied into the log.
        class Body(serializers.Serializer):
            recipeId = serializers.IntegerField()

        body = Body(data=request.data)
        body.is_valid(raise_exception=True)
        recipe = get_object_or_404(GeneratedRecipe, pk=body.validated_data['recipeId'])
        if recipe.user_id != request.user.id:
            raise PermissionDenied
        meal = ConsumedMeal.objects.create(
            user=request.user,
            recipe=recipe,
            title=recipe.title,
            meal_type=recipe.meal_type,
            calories=recipe.calories,
            protein_g=recipe.protein_g,
            carbs_g=recipe.carbs_g,
            fat_g=recipe.fat_g,
        )
        return Response(meal_payload(meal), status=status.HTTP_201_CREATED)


# DELETE /api/log/<id>: remove a logged meal, if it belongs to the user.
class MealDetailView(APIView):
    def delete(self, request, pk):
        meal = get_object_or_404(ConsumedMeal, pk=pk)
        if meal.user_id != request.user.id:
            raise PermissionDenied
        meal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# PUT /api/water: set today's glasses of water (0 to 50).
class WaterView(APIView):
    def put(self, request):
        class Body(serializers.Serializer):
            glasses = serializers.IntegerField(min_value=0, max_value=50)

        body = Body(data=request.data)
        body.is_valid(raise_exception=True)
        # One row per user per day: update it, or create it if it's missing.
        log, _created = WaterLog.objects.update_or_create(
            user=request.user,
            date=timezone.localdate(),
            defaults={'glasses': body.validated_data['glasses']},
        )
        return Response({'glasses': log.glasses})


# GET /api/dashboard: today's totals, water, recipes made today, recent saves and a wellness tip.
class DashboardView(APIView):
    def get(self, request):
        user = request.user
        today = timezone.localdate()
        meals = list(ConsumedMeal.objects.filter(user=user, date=today))
        totals = totals_of(meals)
        water = WaterLog.objects.filter(user=user, date=today).first()
        recent = SavedRecipe.objects.filter(user=user).select_related('generated_recipe')[:3]
        return Response({
            'totals': totals,
            'water': water.glasses if water else 0,
            'generatedToday': GeneratedRecipe.objects.filter(user=user, generated_at__date=today).count(),
            'recent': [
                {
                    'id': item.id,
                    'title': item.generated_recipe.title,
                    'meal': item.generated_recipe.meal_type,
                    'minutes': item.generated_recipe.cooking_time,
                    'kcal': item.generated_recipe.calories,
                }
                for item in recent
            ],
            'wellness': suggest_wellness(user.profile, totals['kcal']),
        })
