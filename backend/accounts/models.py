# Database tables for accounts: users, profiles, allergies, email codes and trusted devices.
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models import F, Q


# Creates users keyed on email instead of Django's default username.
class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        # Emails are stored in lowercase so "Test@x.com" and "test@x.com" are the same account.
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        # set_password hashes it with bcrypt. The plain password is never stored.
        user.set_password(password)
        user.save(using=self._db)
        return user

    # Used by "manage.py createsuperuser" to make an admin account.
    def create_superuser(self, email, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True)
        return self.create_user(email, password, **extra)


# The "users" table. People sign in with their email, so there is no username.
class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    # When they accepted the Terms at sign-up.
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    # Becomes True once they enter the code we emailed them.
    email_verified = models.BooleanField(default=False)
    # Tokens issued before this time are refused (signs them out everywhere after a reset).
    password_changed_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        db_table = 'users'


class UserProfile(models.Model):
    """Meal personalisation data only. It has no field for medical diagnoses (NFR-04)."""

    # Allowed values, checked by the profile serializer.
    GOALS = ['weight_loss', 'maintenance', 'muscle_gain', 'athletic_performance']
    SEXES = ['female', 'male', 'other']
    # Activity multipliers, from sedentary (1.2) to very active (1.9).
    ACTIVITY = ['1.2', '1.375', '1.55', '1.725', '1.9']
    DIETS = ['No specific diet', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Low carb']

    # One profile per user. Deleting the user deletes the profile too.
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # Body details are optional, so they can be blank.
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    sex = models.CharField(max_length=10, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    activity = models.CharField(max_length=5, default='1.375')
    fitness_goal = models.CharField(max_length=24, default='maintenance')
    # Daily calories and how they split between protein, carbs and fat.
    calorie_target = models.PositiveIntegerField(null=True, blank=True)
    protein_pct = models.PositiveSmallIntegerField(default=25)
    carbs_pct = models.PositiveSmallIntegerField(default=45)
    fat_pct = models.PositiveSmallIntegerField(default=30)
    diet = models.CharField(max_length=24, default='No specific diet')
    dislikes = models.CharField(max_length=300, blank=True)
    # Whether the user agreed to send health details to the AI.
    health_consent = models.BooleanField(default=False)
    # Settings page toggles for supplement notes and wellness tips.
    show_supplements = models.BooleanField(default=True)
    show_wellness = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'
        # The database itself refuses macros that don't add up to 100%.
        constraints = [
            models.CheckConstraint(
                condition=Q(protein_pct__gte=0) & Q(carbs_pct__gte=100 - F('protein_pct') - F('fat_pct'))
                & Q(carbs_pct__lte=100 - F('protein_pct') - F('fat_pct')),
                name='macro_percentages_total_100',
            ),
        ]


# One row per allergy. is_custom marks ones the user typed themselves rather than picked from the list.
class UserAllergy(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='allergies')
    name = models.CharField(max_length=80)
    is_custom = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_allergies'
        # The same allergy can't be listed twice for one user.
        constraints = [models.UniqueConstraint(fields=['user', 'name'], name='unique_user_allergy')]
        ordering = ['id']


class OneTimeCode(models.Model):
    """A 6-digit email code, stored only as a keyed hash."""

    # What the code is for.
    VERIFY = 'verify'
    LOGIN = 'login'
    RESET = 'reset'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='codes')
    purpose = models.CharField(max_length=10)
    # HMAC-SHA256 of the code, never the code itself.
    code_hash = models.CharField(max_length=64)
    # Wrong guesses so far (the limit is 5).
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    # Set once the code is used or replaced, so it can't be used again.
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'one_time_codes'
        # Speeds up finding a user's latest code for a purpose.
        indexes = [models.Index(fields=['user', 'purpose', 'created_at'])]


class TrustedDevice(models.Model):
    """A browser where the person chose to stay signed in, skipping the sign-in code for 30 days."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trusted_devices')
    # Only a hash of the device token is stored. The browser keeps the real token.
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'trusted_devices'
