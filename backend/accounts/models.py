from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models import F, Q


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True)
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        db_table = 'users'


class UserProfile(models.Model):
    """Meal personalisation data only. It has no field for medical diagnoses (NFR-04)."""

    GOALS = ['weight_loss', 'maintenance', 'muscle_gain', 'athletic_performance']
    SEXES = ['female', 'male', 'other']
    ACTIVITY = ['1.2', '1.375', '1.55', '1.725', '1.9']
    DIETS = ['No specific diet', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Low carb']

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    sex = models.CharField(max_length=10, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    activity = models.CharField(max_length=5, default='1.375')
    fitness_goal = models.CharField(max_length=24, default='maintenance')
    calorie_target = models.PositiveIntegerField(null=True, blank=True)
    protein_pct = models.PositiveSmallIntegerField(default=25)
    carbs_pct = models.PositiveSmallIntegerField(default=45)
    fat_pct = models.PositiveSmallIntegerField(default=30)
    diet = models.CharField(max_length=24, default='No specific diet')
    dislikes = models.CharField(max_length=300, blank=True)
    health_consent = models.BooleanField(default=False)
    show_supplements = models.BooleanField(default=True)
    show_wellness = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'
        constraints = [
            models.CheckConstraint(
                condition=Q(protein_pct__gte=0) & Q(carbs_pct__gte=100 - F('protein_pct') - F('fat_pct'))
                & Q(carbs_pct__lte=100 - F('protein_pct') - F('fat_pct')),
                name='macro_percentages_total_100',
            ),
        ]


class UserAllergy(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='allergies')
    name = models.CharField(max_length=80)
    is_custom = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_allergies'
        constraints = [models.UniqueConstraint(fields=['user', 'name'], name='unique_user_allergy')]
        ordering = ['id']
