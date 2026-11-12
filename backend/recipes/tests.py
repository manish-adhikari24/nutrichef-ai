# Automated tests for recipes, profile, nutrition, allergies, saved recipes, tracking, errors and the recipe chat.
# Run with: python manage.py test recipes
import json
from unittest.mock import patch

from django.core.cache import cache
from django.db import DatabaseError
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, UserProfile
from recipes.models import GeneratedRecipe, SavedRecipe
from recipes.services import ai
from recipes.services.allergens import find_allergens
from recipes.services.nutrition import calculate_nutrition

# A complete, valid profile used by most tests.
PROFILE = {
    'firstName': 'Test', 'lastName': 'Cook', 'age': 30, 'sex': 'female', 'heightCm': '165', 'weightKg': '65',
    'activity': '1.375', 'goal': 'maintenance', 'calorieTarget': 1880, 'proteinPct': 25, 'carbsPct': 45, 'fatPct': 30,
    'diet': 'No specific diet', 'allergies': ['Soy'], 'otherAllergies': 'kiwi', 'dislikes': '',
    'healthConsent': True, 'showSupplements': True, 'showWellness': True,
}
# A valid sign-up form.
REGISTER = {
    'firstName': 'Test', 'lastName': 'Cook', 'email': 'Test@Example.test',
    'password': 'Kettle-Basil-47!', 'confirmPassword': 'Kettle-Basil-47!', 'acceptedTerms': True,
}


# Builds a fake AI recipe. Tests can change the first ingredient or any field.
def ai_recipe(name='Chicken breast', **changes):
    return {
        'title': 'Test bowl', 'description': 'A bowl.', 'minutes': 20, 'servings': 2, 'difficulty': 'Easy',
        'nutrition': {'kcal': 500, 'protein': 30, 'carbs': 50, 'fat': 18},
        'ingredients': [
            {'name': name, 'amount': '300 g', 'missing': False, 'grams': 300, 'kcal': 495, 'protein': 93, 'carbs': 0, 'fat': 11},
            {'name': 'Unknown spice', 'amount': '1 tsp', 'missing': True, 'grams': 2, 'kcal': 5, 'protein': 0, 'carbs': 1, 'fat': 0},
        ],
        'steps': ['Cook it.'], 'why_it_fits': 'It fits.', 'label_checks': [], 'constraint_warning': '',
        **changes,
    }


# Shared setup: a signed-in, verified user with a saved profile.
class Base(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            'test@example.test', REGISTER['password'], first_name='Test', last_name='Cook', email_verified=True,
        )
        UserProfile.objects.create(user=self.user)
        token = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(self.client.put('/api/profile', PROFILE, format='json').status_code, 200)

    # Helper: a second user, for checking people can't see each other's data.
    def other_client_user(self):
        other = User.objects.create_user('other@example.test', REGISTER['password'])
        UserProfile.objects.create(user=other)
        return other


# FR-03: profile.
class ProfileTests(Base):
    # The saved profile comes back unchanged.
    def test_profile_round_trip(self):
        data = self.client.get('/api/profile').data
        self.assertEqual(data['allergies'], ['Soy'])
        self.assertEqual(data['otherAllergies'], 'kiwi')
        self.assertEqual(data['calorieTarget'], 1880)

    # Macros must total 100%, and only allowed values are accepted.
    def test_macros_must_total_100_and_enums_are_checked(self):
        response = self.client.put('/api/profile', {**PROFILE, 'proteinPct': 50}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('macros', response.data['fields'])
        self.assertEqual(self.client.put('/api/profile', {**PROFILE, 'goal': 'magic'}, format='json').status_code, 400)
        self.assertEqual(self.client.put('/api/profile', {**PROFILE, 'calorieTarget': 300}, format='json').status_code, 400)

    # There are no medical fields, and any sent are ignored (NFR-04).
    def test_profile_has_no_medical_fields(self):
        names = {field.name for field in UserProfile._meta.get_fields()}
        self.assertFalse(names & {'conditions', 'diagnosis', 'medical_conditions'})
        self.client.put('/api/profile', {**PROFILE, 'conditions': ['Diabetes']}, format='json')
        self.assertNotIn('conditions', self.client.get('/api/profile').data)

    # Deleting the account removes the user.
    def test_account_delete_removes_data(self):
        self.assertEqual(self.client.delete('/api/account').status_code, 204)
        self.assertFalse(User.objects.filter(email='test@example.test').exists())


# FR-06: allergen matching.
class AllergenTests(APITestCase):
    # Alternate names are caught, and safe phrases like coconut milk aren't flagged.
    def test_aliases_and_exceptions(self):
        self.assertEqual(find_allergens(['coconut milk', 'eggplant', 'butternut squash', 'buckwheat'], ['Milk', 'Eggs', 'Wheat']), [])
        self.assertEqual(
            find_allergens(['peanut butter', 'Worcestershire sauce', 'tofu', 'Scrambled eggs'], ['Peanuts', 'Fish', 'Soy', 'Eggs']),
            ['Peanuts', 'Fish', 'Soy', 'Eggs'],
        )
        self.assertEqual(find_allergens(['Kiwi fruit'], ['kiwi']), ['kiwi'])


# FR-07: nutrition calculation.
class NutritionTests(APITestCase):
    # Dataset values are used where possible, AI values for unknown ingredients.
    def test_dataset_used_with_ai_values_for_unknown(self):
        nutrition, source = calculate_nutrition(ai_recipe())
        self.assertEqual(source, 'partly_estimated')
        self.assertEqual(nutrition['kcal'], round((165 * 3 + 5) / 2))
        self.assertEqual(nutrition['protein'], round(31 * 3 / 2))

    # If an ingredient has no values, the recipe's own estimate is used.
    def test_missing_values_fall_back_to_recipe_estimate(self):
        recipe = ai_recipe()
        del recipe['ingredients'][1]['kcal']
        nutrition, source = calculate_nutrition(recipe)
        self.assertEqual(source, 'ai_estimated')
        self.assertEqual(nutrition['kcal'], 500)


# FR-05, FR-06, FR-08, FR-09: recipe generation, with the AI replaced by a fake.
class GenerateTests(Base):
    BODY = {'ingredients': ['Chicken fillet', ' chicken breast ', 'lemon'], 'meal': 'Lunch', 'cuisine': 'Asian', 'budget': 'Low'}

    # A recipe is generated, stored and analysed against the user's goals.
    @patch('recipes.services.ai.write_recipe', return_value=ai_recipe())
    def test_generates_stores_and_analyses(self, write):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 201)
        sent = write.call_args[0][0]
        self.assertEqual(sent['ingredients'], ['chicken breast', 'lemon'])
        self.assertEqual(sent['allergies'], ['Soy', 'kiwi'])
        self.assertEqual(response.data['allergiesChecked'], ['Soy', 'kiwi'])
        self.assertEqual(len(response.data['alignment']), 4)
        self.assertEqual(response.data['nutritionSource'], 'partly_estimated')
        stored = GeneratedRecipe.objects.get()
        self.assertEqual((stored.ai_model, stored.cuisine_type, stored.estimated_cost), (ai.MODEL, 'Asian', 'Low'))

    # An allergen in the typed ingredients stops the request before the AI is called.
    @patch('recipes.services.ai.write_recipe', return_value=ai_recipe())
    def test_input_allergen_blocks_before_calling_ai(self, write):
        response = self.client.post('/api/recipes/generate', {'ingredients': ['tofu']}, format='json')
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.data['allergens'], ['Soy'])
        write.assert_not_called()

    # An AI recipe containing an allergen is blocked and not stored.
    @patch('recipes.services.ai.write_recipe', return_value=ai_recipe('Soy sauce'))
    def test_unsafe_ai_recipe_blocked_and_not_stored(self, _write):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.data['code'], 'blocked')
        self.assertEqual(GeneratedRecipe.objects.count(), 0)

    # If the allergy check fails, the recipe is blocked.
    @patch('recipes.views.find_allergens', side_effect=DatabaseError)
    @patch('recipes.services.ai.write_recipe')
    def test_allergy_check_failure_blocks(self, write, _find):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 503)
        write.assert_not_called()

    # Without consent, no health details go to the AI, but allergies are still checked.
    @patch('recipes.services.ai.write_recipe', return_value=ai_recipe())
    def test_no_consent_keeps_health_data_from_ai_but_still_checks(self, write):
        self.client.put('/api/profile', {**PROFILE, 'healthConsent': False}, format='json')
        self.client.post('/api/recipes/generate', self.BODY, format='json')
        sent = write.call_args[0][0]
        self.assertNotIn('allergies', sent)
        self.assertNotIn('targets', sent)
        self.assertEqual(self.client.post('/api/recipes/generate', {'ingredients': ['tofu']}, format='json').status_code, 422)

    # Invalid filters are rejected.
    def test_validation_errors(self):
        self.assertEqual(self.client.post('/api/recipes/generate', {'ingredients': []}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/recipes/generate', {'ingredients': ['egg'], 'cuisine': 'Klingon'}, format='json').status_code, 400)

    # With no API key, a clear error is shown and the sample recipe still works.
    @patch.dict('os.environ', {}, clear=True)
    def test_missing_key_gives_controlled_error_and_sample_works(self):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data['code'], 'not_configured')
        sample = self.client.post('/api/recipes/sample', self.BODY, format='json')
        self.assertEqual(sample.status_code, 201)
        self.assertEqual(sample.data['source'], 'sample')

    # An AI outage gives a clear error.
    @patch('recipes.services.ai.write_recipe', side_effect=ai.Unavailable)
    def test_outage_gives_controlled_error(self, _write):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data['code'], 'ai_unavailable')


# Fake objects that look like the Anthropic SDK's responses.
class FakeBlock:
    type = 'text'

    def __init__(self, text):
        self.text = text


class FakeResponse:
    def __init__(self, text, stop_reason='end_turn'):
        self.content = [FakeBlock(text)]
        self.stop_reason = stop_reason


# Tests for ai.py, with the Anthropic client replaced by a fake.
@patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
class AiTests(APITestCase):
    REQUEST = {'meal': 'Dinner', 'cuisine': 'Any', 'difficulty': 'Any', 'budget': 'Any', 'servings': 2, 'ingredients': ['eggs']}

    # A malformed first reply is retried, then the good one is used.
    @patch('recipes.services.ai.anthropic.Anthropic')
    def test_retries_once_then_succeeds(self, client):
        create = client.return_value.beta.messages.create
        create.side_effect = [FakeResponse('not json'), FakeResponse(json.dumps(ai_recipe()))]
        self.assertEqual(ai.write_recipe(self.REQUEST)['title'], 'Test bowl')
        self.assertEqual(create.call_count, 2)

    # Two malformed replies in a row give up with an error.
    @patch('recipes.services.ai.anthropic.Anthropic')
    def test_gives_up_after_second_malformed_reply(self, client):
        create = client.return_value.beta.messages.create
        create.return_value = FakeResponse('{"title": ""}')
        with self.assertRaises(ai.Malformed):
            ai.write_recipe(self.REQUEST)
        self.assertEqual(create.call_count, 2)

    # A refusal from the model is reported.
    @patch('recipes.services.ai.anthropic.Anthropic')
    def test_refusal_is_reported(self, client):
        client.return_value.beta.messages.create.return_value = FakeResponse('', 'refusal')
        with self.assertRaises(ai.Refused):
            ai.write_recipe(self.REQUEST)

    # The prompt contains no name, body details or "allergy" labels.
    def test_prompt_has_no_health_labels_or_personal_details(self):
        prompt = ai.build_prompt({**self.REQUEST, 'allergies': ['Peanuts'], 'dislikes': 'olives', 'targets': {'kcal': 600}})
        self.assertIn('Ingredients to avoid: Peanuts, olives', prompt)
        self.assertNotIn('llerg', prompt)


# FR-11 to FR-14 and FR-16: saved recipes, tracking, supplements and wellness.
class SavedAndTrackingTests(Base):
    # Helper: create a stored recipe for a user.
    def make_recipe(self, title='Test bowl', user=None):
        return GeneratedRecipe.objects.create(
            user=user or self.user, title=title, meal_type='Dinner', difficulty='Easy', cooking_time=20, servings=2,
            calories=500, protein_g=30, carbs_g=50, fat_g=18, nutrition_source='calculated',
            content={'description': '', 'ingredients': [{'name': 'Eggs', 'amount': '2', 'missing': False}], 'steps': ['Cook.'], 'why_it_fits': '', 'label_checks': [], 'constraint_warning': ''},
        )

    # A recipe can be saved once, and only by its owner.
    def test_save_duplicate_and_ownership(self):
        recipe = self.make_recipe()
        self.assertEqual(self.client.post('/api/saved', {'recipeId': recipe.id, 'note': 'Nice', 'rating': 5}, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/saved', {'recipeId': recipe.id}, format='json').status_code, 409)
        foreign = self.make_recipe(user=self.other_client_user())
        self.assertEqual(self.client.post('/api/saved', {'recipeId': foreign.id}, format='json').status_code, 403)

    # Saved recipes are paged, filtered and searched.
    def test_list_paginates_filters_and_searches(self):
        for number in range(8):
            recipe = self.make_recipe(f'Recipe {number}')
            SavedRecipe.objects.create(user=self.user, generated_recipe=recipe)
        data = self.client.get('/api/saved').data
        self.assertEqual((len(data['results']), data['pages'], data['count']), (6, 2, 8))
        self.assertEqual(data['results'][0]['recipe']['title'], 'Recipe 7')
        self.assertEqual(len(self.client.get('/api/saved?page=2').data['results']), 2)
        self.assertEqual(self.client.get('/api/saved?q=recipe 3').data['count'], 1)
        self.assertEqual(self.client.get('/api/saved?q=eggs').data['count'], 8)
        self.assertEqual(self.client.get('/api/saved?tag=Lunch').data['count'], 0)
        self.assertEqual(self.client.get('/api/saved?tag=Under 30 min').data['count'], 8)

    # Only the owner can delete a saved recipe.
    def test_delete_enforces_ownership(self):
        other = self.other_client_user()
        foreign = SavedRecipe.objects.create(user=other, generated_recipe=self.make_recipe(user=other))
        self.assertEqual(self.client.delete(f'/api/saved/{foreign.id}').status_code, 403)
        mine = SavedRecipe.objects.create(user=self.user, generated_recipe=self.make_recipe())
        self.assertEqual(self.client.delete(f'/api/saved/{mine.id}').status_code, 204)

    # The dashboard shows today's totals, water and a wellness tip.
    def test_dashboard_totals_water_and_wellness(self):
        recipe = self.make_recipe()
        self.assertEqual(self.client.post('/api/log', {'recipeId': recipe.id}, format='json').status_code, 201)
        self.assertEqual(self.client.put('/api/water', {'glasses': 3}, format='json').status_code, 200)
        data = self.client.get('/api/dashboard').data
        self.assertEqual(data['totals']['kcal'], 500)
        self.assertEqual(data['water'], 3)
        self.assertIn('disclaimer', data['wellness'])
        log = self.client.get('/api/log').data
        self.assertEqual(len(log['today']), 1)
        self.assertEqual(len(log['days']), 7)

    # Supplement and wellness notes carry disclaimers and follow the Settings toggles.
    def test_wellness_and_supplements_respect_settings_and_disclaimers(self):
        recipe = self.make_recipe()
        self.client.put('/api/profile', {**PROFILE, 'goal': 'muscle_gain'}, format='json')
        saved = self.client.post('/api/saved', {'recipeId': recipe.id}, format='json').data
        supplements = saved['recipe']['supplements']
        self.assertTrue(supplements)
        self.assertTrue(all('consult a healthcare professional' in s['disclaimer'] for s in supplements))
        self.client.put('/api/profile', {**PROFILE, 'showSupplements': False, 'showWellness': False}, format='json')
        self.assertEqual(self.client.get('/api/saved').data['results'][0]['recipe']['supplements'], [])
        self.assertIsNone(self.client.get('/api/dashboard').data['wellness'])


# FR-15: errors use the standard {"error"} shape.
@override_settings(REST_FRAMEWORK={
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'EXCEPTION_HANDLER': 'nutrichef.exceptions.api_exception_handler',
})
class ErrorFormatTests(APITestCase):
    def test_errors_use_the_standard_shape(self):
        response = self.client.get('/api/profile')
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.data)


# Fake Anthropic replies for the chat tests: a plain answer, or a call to the update_recipe tool.
class FakeToolUse:
    type = 'tool_use'
    name = 'update_recipe'

    def __init__(self, recipe, summary='Made it spicier.'):
        self.input = {'summary': summary, 'recipe': recipe}


class FakeAnswer:
    stop_reason = 'end_turn'

    def __init__(self, *blocks):
        self.content = [FakeBlock(b) if isinstance(b, str) else b for b in blocks]


# The recipe chat, switched on and with the AI replaced by a fake.
@patch.dict('os.environ', {'RECIPE_CHAT_ENABLED': '1', 'ANTHROPIC_API_KEY': 'test-key'})
class ChatTests(Base):
    # Helper: create a recipe to chat about.
    def make_recipe(self, user=None):
        return GeneratedRecipe.objects.create(
            user=user or self.user, title='Test bowl', meal_type='Dinner', difficulty='Easy', cooking_time=20, servings=2,
            calories=500, protein_g=30, carbs_g=50, fat_g=18, nutrition_source='calculated',
            content={'description': '', 'ingredients': [{'name': 'Eggs', 'amount': '2', 'missing': False}], 'steps': ['Cook.'], 'why_it_fits': '', 'label_checks': [], 'constraint_warning': ''},
        )

    # Helper: send one chat message.
    def chat(self, recipe, message='How do I keep it moist?'):
        return self.client.post(f'/api/recipes/{recipe.id}/chat', {'message': message}, format='json')

    # A question gets an answer, the recipe stays the same, and both messages are stored.
    @patch('recipes.services.chat.anthropic.Anthropic')
    def test_question_is_answered_and_stored(self, client):
        create = client.return_value.beta.messages.create
        create.return_value = FakeAnswer('Use a lid.')
        recipe = self.make_recipe()
        response = self.chat(recipe)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['changed'])
        self.assertEqual([m['content'] for m in response.data['messages']], ['How do I keep it moist?', 'Use a lid.'])
        self.assertEqual(recipe.messages.count(), 2)
        sent = create.call_args.kwargs
        last = sent['messages'][-1]['content']
        self.assertIn('<recipe>', last)
        self.assertIn('<avoid>Soy, kiwi</avoid>', last)
        self.assertNotIn('Test Cook', last)
        self.assertEqual(sent['tools'][0]['name'], 'update_recipe')

        # The next message carries the earlier turns as history.
        create.return_value = FakeAnswer('About 3 days.')
        self.chat(recipe, 'How long does it keep?')
        history = create.call_args.kwargs['messages']
        self.assertEqual([m['role'] for m in history], ['user', 'assistant', 'user'])
        self.assertEqual(history[0]['content'], 'How do I keep it moist?')

    # A change replaces the recipe in place, with nutrition recalculated, and the saved copy shows it too.
    @patch('recipes.services.chat.anthropic.Anthropic')
    def test_change_updates_the_recipe_in_place(self, client):
        client.return_value.beta.messages.create.return_value = FakeAnswer(FakeToolUse(ai_recipe(title='Spicy bowl')))
        recipe = self.make_recipe()
        self.client.post('/api/saved', {'recipeId': recipe.id}, format='json')
        response = self.chat(recipe, 'Make it spicier')
        self.assertTrue(response.data['changed'])
        self.assertEqual(response.data['recipe']['title'], 'Spicy bowl')
        self.assertEqual(response.data['recipe']['id'], recipe.id)
        self.assertEqual(response.data['messages'][1]['content'], 'Made it spicier.')
        recipe.refresh_from_db()
        self.assertEqual(recipe.title, 'Spicy bowl')
        self.assertEqual(recipe.nutrition_source, 'partly_estimated')
        self.assertEqual(GeneratedRecipe.objects.count(), 1)
        self.assertEqual(self.client.get('/api/saved').data['results'][0]['recipe']['title'], 'Spicy bowl')

    # A change that adds an allergen is refused and the recipe is left alone.
    @patch('recipes.services.chat.anthropic.Anthropic')
    def test_unsafe_change_is_blocked(self, client):
        client.return_value.beta.messages.create.return_value = FakeAnswer(FakeToolUse(ai_recipe('Soy sauce', title='Soy bowl')))
        recipe = self.make_recipe()
        response = self.chat(recipe, 'Add soy sauce')
        self.assertFalse(response.data['changed'])
        self.assertIn('Soy', response.data['messages'][1]['content'])
        recipe.refresh_from_db()
        self.assertEqual(recipe.title, 'Test bowl')

    # Without consent no avoid list is sent, but a change is still allergy-checked.
    @patch('recipes.services.chat.anthropic.Anthropic')
    def test_no_consent_sends_no_avoid_list_but_still_checks(self, client):
        create = client.return_value.beta.messages.create
        create.return_value = FakeAnswer(FakeToolUse(ai_recipe('Soy sauce')))
        self.client.put('/api/profile', {**PROFILE, 'healthConsent': False}, format='json')
        response = self.chat(self.make_recipe(), 'Add soy sauce')
        self.assertIn('<avoid>none listed</avoid>', create.call_args.kwargs['messages'][-1]['content'])
        self.assertFalse(response.data['changed'])

    # An incomplete recipe from the AI, a refusal or an outage changes nothing and stores nothing.
    @patch('recipes.services.chat.anthropic.Anthropic')
    def test_bad_replies_change_nothing(self, client):
        create = client.return_value.beta.messages.create
        recipe = self.make_recipe()
        create.return_value = FakeAnswer(FakeToolUse({'title': 'Broken'}))
        self.assertEqual(self.chat(recipe, 'Make it spicier').status_code, 503)
        refusal = FakeAnswer('No.')
        refusal.stop_reason = 'refusal'
        create.return_value = refusal
        self.assertEqual(self.chat(recipe).status_code, 422)
        recipe.refresh_from_db()
        self.assertEqual(recipe.title, 'Test bowl')
        self.assertEqual(recipe.messages.count(), 0)

    # The recent list is newest first, a recipe reopens with its chat, and deleting removes it.
    @patch('recipes.services.chat.anthropic.Anthropic')
    def test_recent_list_open_and_delete(self, client):
        client.return_value.beta.messages.create.return_value = FakeAnswer('Use a lid.')
        first = self.make_recipe()
        second = self.make_recipe()
        self.chat(first)
        recent = self.client.get('/api/recipes/recent').data['results']
        self.assertEqual([r['id'] for r in recent], [second.id, first.id])
        opened = self.client.get(f'/api/recipes/{first.id}').data
        self.assertEqual(opened['recipe']['title'], 'Test bowl')
        self.assertEqual(len(opened['messages']), 2)
        self.assertFalse(opened['saved'])
        self.assertEqual(self.client.delete(f'/api/recipes/{first.id}').status_code, 204)
        self.assertEqual(len(self.client.get('/api/recipes/recent').data['results']), 1)

    # Users can't open, chat about or delete other people's recipes, or see them in their list.
    def test_other_peoples_recipes_are_forbidden(self):
        other = self.make_recipe(user=self.other_client_user())
        self.assertEqual(self.chat(other).status_code, 403)
        self.assertEqual(self.client.get(f'/api/recipes/{other.id}').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/recipes/{other.id}').status_code, 403)
        self.assertEqual(self.client.get('/api/recipes/recent').data['results'], [])

    # Messages must be 1 to 500 characters.
    def test_message_rules(self):
        recipe = self.make_recipe()
        self.assertEqual(self.chat(recipe, '').status_code, 400)
        self.assertEqual(self.chat(recipe, 'x' * 501).status_code, 400)

    # The chat is off unless switched on.
    def test_switched_off_by_default(self):
        recipe = self.make_recipe()
        with patch.dict('os.environ', {'RECIPE_CHAT_ENABLED': ''}):
            self.assertEqual(self.chat(recipe).status_code, 404)
            self.assertEqual(self.client.get('/api/recipes/recent').status_code, 404)
            self.assertEqual(self.client.get(f'/api/recipes/{recipe.id}').status_code, 404)
            self.assertEqual(self.client.delete(f'/api/recipes/{recipe.id}').status_code, 404)
