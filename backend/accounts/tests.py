from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.contrib.auth.hashers import identify_hasher
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts import security
from accounts.models import OneTimeCode, TrustedDevice, User

PASSWORD = 'Kettle-Basil-47!'
REGISTER = {
    'firstName': 'Test', 'lastName': 'Cook', 'email': 'Test@Example.test',
    'password': PASSWORD, 'confirmPassword': PASSWORD, 'acceptedTerms': True,
}


class Emails:
    """Captures the codes that would have been emailed."""

    def __init__(self):
        self.sent = []

    def __call__(self, to, subject, text):
        code = next(line for line in text.splitlines() if line.isdigit() and len(line) == 6)
        self.sent.append((to, subject, code))

    @property
    def last_code(self):
        return self.sent[-1][2]


class AuthTestCase(APITestCase):
    def setUp(self):
        cache.clear()
        self.emails = Emails()
        patcher = patch('accounts.security.send_email', self.emails)
        patcher.start()
        self.addCleanup(patcher.stop)

    def register_and_verify(self, keep=False):
        self.client.post('/api/auth/register', REGISTER, format='json')
        return self.client.post(
            '/api/auth/verify-email',
            {'email': 'test@example.test', 'code': self.emails.last_code, 'keepSignedIn': keep},
            format='json',
        )

    def backdate_codes(self):
        OneTimeCode.objects.update(created_at=timezone.now() - timedelta(minutes=2))

    def login(self, **extra):
        return self.client.post(
            '/api/auth/login', {'email': 'test@example.test', 'password': PASSWORD, **extra}, format='json'
        )


class RegistrationTests(AuthTestCase):
    def test_register_sends_code_and_gives_no_tokens_until_verified(self):
        response = self.client.post('/api/auth/register', REGISTER, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'verify_email')
        self.assertNotIn('access', response.data)
        user = User.objects.get(email='test@example.test')
        self.assertFalse(user.email_verified)
        self.assertEqual(identify_hasher(user.password).algorithm, 'bcrypt_sha256')
        self.assertIn('$12$', user.password)
        self.assertEqual(self.emails.sent[0][0], 'test@example.test')

    def test_correct_code_verifies_and_signs_in(self):
        response = self.register_and_verify()
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertTrue(User.objects.get().email_verified)

    def test_wrong_code_is_rejected_and_attempts_are_limited(self):
        self.client.post('/api/auth/register', REGISTER, format='json')
        right = self.emails.last_code
        wrong = '000000' if right != '000000' else '111111'
        for _ in range(5):
            response = self.client.post('/api/auth/verify-email', {'email': 'test@example.test', 'code': wrong}, format='json')
            self.assertEqual(response.status_code, 400)
        # After five wrong tries even the right code no longer works.
        response = self.client.post('/api/auth/verify-email', {'email': 'test@example.test', 'code': right}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_expired_code_is_rejected(self):
        self.client.post('/api/auth/register', REGISTER, format='json')
        OneTimeCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        response = self.client.post('/api/auth/verify-email', {'email': 'test@example.test', 'code': self.emails.last_code}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_codes_are_stored_hashed(self):
        self.client.post('/api/auth/register', REGISTER, format='json')
        stored = OneTimeCode.objects.get().code_hash
        self.assertNotIn(self.emails.last_code, stored)
        self.assertEqual(len(stored), 64)

    def test_resend_has_a_cooldown(self):
        self.client.post('/api/auth/register', REGISTER, format='json')
        self.client.post('/api/auth/resend-code', {'purpose': 'verify', 'email': 'test@example.test'}, format='json')
        self.assertEqual(len(self.emails.sent), 1)
        self.backdate_codes()
        self.client.post('/api/auth/resend-code', {'purpose': 'verify', 'email': 'test@example.test'}, format='json')
        self.assertEqual(len(self.emails.sent), 2)

    def test_email_failure_is_reported(self):
        with patch('accounts.security.send_email', side_effect=security.EmailNotSent):
            response = self.client.post('/api/auth/register', REGISTER, format='json')
        self.assertEqual(response.status_code, 503)

    def test_register_validation(self):
        cases = [
            ({'email': 'nope'}, 'email'),
            ({'confirmPassword': 'different'}, 'confirmPassword'),
            ({'password': 'Short1!', 'confirmPassword': 'Short1!'}, 'password'),
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


class LoginTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register_and_verify()
        self.backdate_codes()

    def test_login_needs_an_emailed_code(self):
        response = self.login()
        self.assertEqual(response.data['status'], 'code_sent')
        self.assertNotIn('access', response.data)
        verify = self.client.post('/api/auth/login/verify', {'ticket': response.data['ticket'], 'code': self.emails.last_code}, format='json')
        self.assertEqual(verify.status_code, 200)
        self.assertIn('access', verify.data)
        self.assertNotIn('deviceToken', verify.data)

    def test_keep_signed_in_trusts_the_device_and_skips_the_code(self):
        ticket = self.login().data['ticket']
        verify = self.client.post(
            '/api/auth/login/verify', {'ticket': ticket, 'code': self.emails.last_code, 'keepSignedIn': True}, format='json'
        )
        device = verify.data['deviceToken']
        sent_before = len(self.emails.sent)
        again = self.login(deviceToken=device)
        self.assertIn('access', again.data)
        self.assertEqual(len(self.emails.sent), sent_before)

    def test_expired_or_fake_device_still_needs_a_code(self):
        ticket = self.login().data['ticket']
        device = self.client.post(
            '/api/auth/login/verify', {'ticket': ticket, 'code': self.emails.last_code, 'keepSignedIn': True}, format='json'
        ).data['deviceToken']
        TrustedDevice.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.backdate_codes()
        self.assertEqual(self.login(deviceToken=device).data['status'], 'code_sent')
        self.backdate_codes()
        self.assertEqual(self.login(deviceToken='made-up').data['status'], 'code_sent')

    def test_tampered_ticket_is_rejected(self):
        self.login()
        response = self.client.post('/api/auth/login/verify', {'ticket': 'fake', 'code': self.emails.last_code}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_unverified_account_is_sent_to_verification(self):
        User.objects.update(email_verified=False)
        response = self.login()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'verify_email')

    def test_login_is_generic_and_rate_limited(self):
        wrong = self.client.post('/api/auth/login', {'email': 'test@example.test', 'password': 'wrong'}, format='json')
        unknown = self.client.post('/api/auth/login', {'email': 'x@example.test', 'password': 'wrong'}, format='json')
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(wrong.data['error'], unknown.data['error'])
        for _ in range(4):
            self.client.post('/api/auth/login', {'email': 'test@example.test', 'password': 'wrong'}, format='json')
        self.assertEqual(self.login().status_code, 429)

    def test_login_updates_last_login(self):
        User.objects.update(last_login=None)
        ticket = self.login().data['ticket']
        self.client.post('/api/auth/login/verify', {'ticket': ticket, 'code': self.emails.last_code}, format='json')
        self.assertIsNotNone(User.objects.get().last_login)

    def test_protected_endpoints_require_a_valid_token(self):
        for path in ['/api/profile', '/api/dashboard', '/api/saved', '/api/log']:
            self.assertEqual(self.client.get(path).status_code, 401, path)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid')
        self.assertEqual(self.client.get('/api/profile').status_code, 401)


class PasswordResetTests(AuthTestCase):
    NEW = 'Lemon-Thyme-82?'

    def setUp(self):
        super().setUp()
        self.tokens = self.register_and_verify(keep=True).data
        self.backdate_codes()

    def reset(self, **changes):
        self.client.post('/api/auth/password/forgot', {'email': 'test@example.test'}, format='json')
        body = {'email': 'test@example.test', 'code': self.emails.last_code, 'password': self.NEW, 'confirmPassword': self.NEW, **changes}
        return self.client.post('/api/auth/password/reset', body, format='json')

    def test_forgot_password_does_not_reveal_accounts(self):
        known = self.client.post('/api/auth/password/forgot', {'email': 'test@example.test'}, format='json')
        unknown = self.client.post('/api/auth/password/forgot', {'email': 'nobody@example.test'}, format='json')
        self.assertEqual((known.status_code, known.data), (unknown.status_code, unknown.data))

    def test_reset_changes_password_and_signs_out_everywhere(self):
        self.assertEqual(self.reset().status_code, 200)
        self.assertTrue(User.objects.get().check_password(self.NEW))
        self.assertFalse(TrustedDevice.objects.exists())
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")
        with patch('accounts.authentication.issued_before_password_change', return_value=True):
            self.assertEqual(self.client.get('/api/profile').status_code, 401)
        self.client.credentials()
        User.objects.update(password_changed_at=timezone.now() + timedelta(seconds=5))
        refresh = self.client.post('/api/auth/refresh', {'refresh': self.tokens['refresh']}, format='json')
        self.assertEqual(refresh.status_code, 401)

    def test_reset_needs_the_right_code(self):
        self.client.post('/api/auth/password/forgot', {'email': 'test@example.test'}, format='json')
        wrong = '000000' if self.emails.last_code != '000000' else '111111'
        body = {'email': 'test@example.test', 'code': wrong, 'password': self.NEW, 'confirmPassword': self.NEW}
        self.assertEqual(self.client.post('/api/auth/password/reset', body, format='json').status_code, 400)
        self.assertTrue(User.objects.get().check_password(PASSWORD))

    def test_reset_applies_password_rules(self):
        response = self.reset(password='password', confirmPassword='password')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data['fields'])


class PasswordRuleTests(TestCase):
    def assert_rejected(self, password, user=None):
        with self.assertRaises(ValidationError):
            validate_password(password, user)

    def test_rules(self):
        user = User(email='manish@example.test', first_name='Manish', last_name='Adhikari')
        self.assert_rejected('Short1!')  # under 10 characters
        self.assert_rejected('alllowercase1!')  # no uppercase
        self.assert_rejected('NoNumbersHere!')  # no number
        self.assert_rejected('NoSymbols123')  # no symbol
        self.assert_rejected('Manish2026!', user)  # too close to their name
        validate_password(PASSWORD, user)

    @override_settings(PASSWORD_BREACH_CHECK=True)
    @patch('accounts.validators.urllib.request.urlopen')
    def test_breached_password_is_rejected_and_only_a_prefix_is_sent(self, urlopen):
        import hashlib

        digest = hashlib.sha1(PASSWORD.encode()).hexdigest().upper()
        reply = MagicMock()
        reply.read.return_value = f'{digest[5:]}:42\r\nABCDEF0123456789ABCDEF0123456789ABC:0'.encode()
        urlopen.return_value.__enter__.return_value = reply
        with self.assertRaises(ValidationError):
            validate_password(PASSWORD)
        url = urlopen.call_args[0][0].full_url
        self.assertTrue(url.endswith('/range/' + digest[:5]))
        self.assertNotIn(digest[5:], url)

    @override_settings(PASSWORD_BREACH_CHECK=True)
    @patch('accounts.validators.urllib.request.urlopen', side_effect=OSError)
    def test_breach_service_outage_allows_the_password(self, _urlopen):
        validate_password(PASSWORD)
