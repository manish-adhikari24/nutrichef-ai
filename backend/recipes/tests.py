from unittest.mock import patch

from django.contrib.auth.hashers import identify_hasher
from django.core.cache import cache
from django.db import DatabaseError
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import User, UserProfile
from recipes.models import GeneratedRecipe, SavedRecipe
from recipes.services import ai
from recipes.services.allergens import find_allergens
from recipes.services.nutrition import calculate_nutrition

PROFILE = {
    'firstName': 'Test', 'lastName': 'Cook', 'age': 30, 'sex': 'female', 'heightCm': '165', 'weightKg': '65',
    'activity': '1.375', 'goal': 'maintenance', 'calorieTarget': 1880, 'proteinPct': 25, 'carbsPct': 45, 'fatPct': 30,
    'diet': 'No specific diet', 'allergies': ['Soy'], 'otherAllergies': 'kiwi', 'dislikes': '',
    'healthConsent': True, 'showSupplements': True, 'showWellness': True,
}
REGISTER = {
    'firstName': 'Test', 'lastName': 'Cook', 'email': 'Test@Example.test',
    'password': 'Str0ng-pass!23', 'confirmPassword': 'Str0ng-pass!23', 'acceptedTerms': True,
}


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


class Base(APITestCase):
    def setUp(self):
        cache.clear()
        response = self.client.post('/api/auth/register', REGISTER, format='json')
        self.assertEqual(response.status_code, 201)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        self.user = User.objects.get(email='test@example.test')
        self.assertEqual(self.client.put('/api/profile', PROFILE, format='json').status_code, 200)

    def other_client_user(self):
        other = User.objects.create_user('other@example.test', 'Str0ng-pass!23')
        UserProfile.objects.create(user=other)
        return other


class AccountTests(APITestCase):
    def test_register_hashes_password_with_bcrypt(self):
        self.client.post('/api/auth/register', REGISTER, format='json')
        user = User.objects.get(email='test@example.test')
        self.assertNotIn('Str0ng', user.password)
        self.assertEqual(identify_hasher(user.password).algorithm, 'bcrypt_sha256')
        self.assertIn('$12$', user.password)

    def test_register_validation(self):
        cases = [
            ({'email': 'nope'}, 'email'),
            ({'confirmPassword': 'different'}, 'confirmPassword'),
            ({'password': 'short', 'confirmPassword': 'short'}, 'password'),
            ({'acceptedTerms': False}, 'acceptedTerms'),
        ]
        for changes, field in cases:
            response = self.client.post('/api/auth/register', {**REGISTER, **changes}, format='json')
            self.assertEqual(response.status_code, 400, changes)
            self.assertIn(field, response.data['fields'])

    def test_duplicate_email_rejected_case_insensitively(self):
        self.client.post('/api/auth/register', REGISTER, format='json')
        response = self.client.post('/api/auth/register', {**REGISTER, 'email': 'TEST@example.test'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_login_is_generic_and_rate_limited(self):
        cache.clear()
        self.client.post('/api/auth/register', REGISTER, format='json')
        wrong = self.client.post('/api/auth/login', {'email': 'test@example.test', 'password': 'wrong'}, format='json')
        unknown = self.client.post('/api/auth/login', {'email': 'x@example.test', 'password': 'wrong'}, format='json')
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(wrong.data['error'], unknown.data['error'])
        for _ in range(4):
            self.client.post('/api/auth/login', {'email': 'test@example.test', 'password': 'wrong'}, format='json')
        locked = self.client.post('/api/auth/login', {'email': 'test@example.test', 'password': REGISTER['password']}, format='json')
        self.assertEqual(locked.status_code, 429)

    def test_login_success_updates_last_login(self):
        cache.clear()
        self.client.post('/api/auth/register', REGISTER, format='json')
        User.objects.update(last_login=None)
        response = self.client.post('/api/auth/login', {'email': 'TEST@example.test', 'password': REGISTER['password']}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIsNotNone(User.objects.get().last_login)

    def test_protected_endpoints_require_a_valid_token(self):
        for path in ['/api/profile', '/api/dashboard', '/api/saved', '/api/log']:
            self.assertEqual(self.client.get(path).status_code, 401, path)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid')
        self.assertEqual(self.client.get('/api/profile').status_code, 401)


class ProfileTests(Base):
    def test_profile_round_trip(self):
        data = self.client.get('/api/profile').data
        self.assertEqual(data['allergies'], ['Soy'])
        self.assertEqual(data['otherAllergies'], 'kiwi')
        self.assertEqual(data['calorieTarget'], 1880)

    def test_macros_must_total_100_and_enums_are_checked(self):
        response = self.client.put('/api/profile', {**PROFILE, 'proteinPct': 50}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('macros', response.data['fields'])
        self.assertEqual(self.client.put('/api/profile', {**PROFILE, 'goal': 'magic'}, format='json').status_code, 400)
        self.assertEqual(self.client.put('/api/profile', {**PROFILE, 'calorieTarget': 300}, format='json').status_code, 400)

    def test_profile_has_no_medical_fields(self):
        names = {field.name for field in UserProfile._meta.get_fields()}
        self.assertFalse(names & {'conditions', 'diagnosis', 'medical_conditions'})
        self.client.put('/api/profile', {**PROFILE, 'conditions': ['Diabetes']}, format='json')
        self.assertNotIn('conditions', self.client.get('/api/profile').data)

    def test_account_delete_removes_data(self):
        self.assertEqual(self.client.delete('/api/account').status_code, 204)
        self.assertFalse(User.objects.filter(email='test@example.test').exists())


class AllergenTests(APITestCase):
    def test_aliases_and_exceptions(self):
        self.assertEqual(find_allergens(['coconut milk', 'eggplant', 'butternut squash', 'buckwheat'], ['Milk', 'Eggs', 'Wheat']), [])
        self.assertEqual(
            find_allergens(['peanut butter', 'Worcestershire sauce', 'tofu', 'Scrambled eggs'], ['Peanuts', 'Fish', 'Soy', 'Eggs']),
            ['Peanuts', 'Fish', 'Soy', 'Eggs'],
        )
        self.assertEqual(find_allergens(['Kiwi fruit'], ['kiwi']), ['kiwi'])


class NutritionTests(APITestCase):
    def test_dataset_used_with_ai_values_for_unknown(self):
        nutrition, source = calculate_nutrition(ai_recipe())
        self.assertEqual(source, 'partly_estimated')
        self.assertEqual(nutrition['kcal'], round((165 * 3 + 5) / 2))
        self.assertEqual(nutrition['protein'], round(31 * 3 / 2))

    def test_missing_values_fall_back_to_recipe_estimate(self):
        recipe = ai_recipe()
        del recipe['ingredients'][1]['kcal']
        nutrition, source = calculate_nutrition(recipe)
        self.assertEqual(source, 'ai_estimated')
        self.assertEqual(nutrition['kcal'], 500)


class GenerateTests(Base):
    BODY = {'ingredients': ['Chicken fillet', ' chicken breast ', 'lemon'], 'meal': 'Lunch', 'cuisine': 'Asian', 'budget': 'Low'}

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

    @patch('recipes.services.ai.write_recipe', return_value=ai_recipe())
    def test_input_allergen_blocks_before_calling_ai(self, write):
        response = self.client.post('/api/recipes/generate', {'ingredients': ['tofu']}, format='json')
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.data['allergens'], ['Soy'])
        write.assert_not_called()

    @patch('recipes.services.ai.write_recipe', return_value=ai_recipe('Soy sauce'))
    def test_unsafe_ai_recipe_blocked_and_not_stored(self, _write):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.data['code'], 'blocked')
        self.assertEqual(GeneratedRecipe.objects.count(), 0)

    @patch('recipes.views.find_allergens', side_effect=DatabaseError)
    @patch('recipes.services.ai.write_recipe')
    def test_allergy_check_failure_blocks(self, write, _find):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 503)
        write.assert_not_called()

    @patch('recipes.services.ai.write_recipe', return_value=ai_recipe())
    def test_no_consent_keeps_health_data_from_ai_but_still_checks(self, write):
        self.client.put('/api/profile', {**PROFILE, 'healthConsent': False}, format='json')
        self.client.post('/api/recipes/generate', self.BODY, format='json')
        sent = write.call_args[0][0]
        self.assertNotIn('allergies', sent)
        self.assertNotIn('targets', sent)
        self.assertEqual(self.client.post('/api/recipes/generate', {'ingredients': ['tofu']}, format='json').status_code, 422)

    def test_validation_errors(self):
        self.assertEqual(self.client.post('/api/recipes/generate', {'ingredients': []}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/recipes/generate', {'ingredients': ['egg'], 'cuisine': 'Klingon'}, format='json').status_code, 400)

    @patch.dict('os.environ', {}, clear=True)
    def test_missing_key_gives_controlled_error_and_sample_works(self):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data['code'], 'not_configured')
        sample = self.client.post('/api/recipes/sample', self.BODY, format='json')
        self.assertEqual(sample.status_code, 201)
        self.assertEqual(sample.data['source'], 'sample')

    @patch('recipes.services.ai.write_recipe', side_effect=ai.Unavailable)
    def test_outage_gives_controlled_error(self, _write):
        response = self.client.post('/api/recipes/generate', self.BODY, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data['code'], 'ai_unavailable')


class FakeBlock:
    type = 'text'

    def __init__(self, text):
        self.text = text


class FakeResponse:
    def __init__(self, text, stop_reason='end_turn'):
        self.content = [FakeBlock(text)]
        self.stop_reason = stop_reason


@patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'})
class AiRetryTests(APITestCase):
    REQUEST = {'meal': 'Dinner', 'cuisine': 'Any', 'difficulty': 'Any', 'budget': 'Any', 'servings': 2, 'ingredients': ['eggs']}

    @patch('recipes.services.ai.anthropic.Anthropic')
    def test_retries_once_then_succeeds(self, client):
        import json
        client.return_value.beta.messages.create.side_effect = [FakeResponse('not json'), FakeResponse(json.dumps(ai_recipe()))]
        self.assertEqual(ai.write_recipe(self.REQUEST)['title'], 'Test bowl')
        self.assertEqual(client.return_value.beta.messages.create.call_count, 2)

    @patch('recipes.services.ai.anthropic.Anthropic')
    def test_gives_up_after_second_malformed_reply(self, client):
        client.return_value.beta.messages.create.return_value = FakeResponse('{"title": ""}')
        with self.assertRaises(ai.Malformed):
            ai.write_recipe(self.REQUEST)
        self.assertEqual(client.return_value.beta.messages.create.call_count, 2)

    @patch('recipes.services.ai.anthropic.Anthropic')
    def test_refusal_is_reported(self, client):
        client.return_value.beta.messages.create.return_value = FakeResponse('', 'refusal')
        with self.assertRaises(ai.Refused):
            ai.write_recipe(self.REQUEST)


class SavedAndTrackingTests(Base):
    def make_recipe(self, title='Test bowl', user=None):
        return GeneratedRecipe.objects.create(
            user=user or self.user, title=title, meal_type='Dinner', difficulty='Easy', cooking_time=20, servings=2,
            calories=500, protein_g=30, carbs_g=50, fat_g=18, nutrition_source='calculated',
            content={'description': '', 'ingredients': [{'name': 'Eggs', 'amount': '2', 'missing': False}], 'steps': ['Cook.'], 'why_it_fits': '', 'label_checks': [], 'constraint_warning': ''},
        )

    def test_save_duplicate_and_ownership(self):
        recipe = self.make_recipe()
        self.assertEqual(self.client.post('/api/saved', {'recipeId': recipe.id, 'note': 'Nice', 'rating': 5}, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/saved', {'recipeId': recipe.id}, format='json').status_code, 409)
        foreign = self.make_recipe(user=self.other_client_user())
        self.assertEqual(self.client.post('/api/saved', {'recipeId': foreign.id}, format='json').status_code, 403)

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

    def test_delete_enforces_ownership(self):
        other = self.other_client_user()
        foreign = SavedRecipe.objects.create(user=other, generated_recipe=self.make_recipe(user=other))
        self.assertEqual(self.client.delete(f'/api/saved/{foreign.id}').status_code, 403)
        mine = SavedRecipe.objects.create(user=self.user, generated_recipe=self.make_recipe())
        self.assertEqual(self.client.delete(f'/api/saved/{mine.id}').status_code, 204)

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
