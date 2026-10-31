from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from recipes.services.allergens import COMMON_ALLERGENS

from .models import User, UserAllergy, UserProfile


class RegisterSerializer(serializers.Serializer):
    firstName = serializers.CharField(max_length=150)
    lastName = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)
    confirmPassword = serializers.CharField(max_length=128, trim_whitespace=False)
    acceptedTerms = serializers.BooleanField()

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError('This email is already registered.')
        return email

    def validate_acceptedTerms(self, value):
        if not value:
            raise serializers.ValidationError('Accept the Terms and Conditions to create your account.')
        return value

    def validate(self, data):
        if data['password'] != data['confirmPassword']:
            raise serializers.ValidationError({'confirmPassword': 'Passwords do not match.'})
        try:
            validate_password(data['password'])
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': error.messages[0]}) from error
        return data

    @transaction.atomic
    def create(self, data):
        user = User.objects.create_user(
            data['email'],
            data['password'],
            first_name=data['firstName'].strip(),
            last_name=data['lastName'].strip(),
            terms_accepted_at=timezone.now(),
        )
        UserProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)


class ProfileSerializer(serializers.Serializer):
    """Reads and writes a person's profile in the shape the frontend uses."""

    firstName = serializers.CharField(max_length=150)
    lastName = serializers.CharField(max_length=150)
    age = serializers.IntegerField(min_value=13, max_value=120, allow_null=True, required=False)
    sex = serializers.ChoiceField(choices=[''] + UserProfile.SEXES, allow_blank=True, required=False)
    heightCm = serializers.DecimalField(max_digits=5, decimal_places=1, min_value=100, max_value=250, allow_null=True, required=False)
    weightKg = serializers.DecimalField(max_digits=5, decimal_places=1, min_value=25, max_value=350, allow_null=True, required=False)
    activity = serializers.ChoiceField(choices=UserProfile.ACTIVITY)
    goal = serializers.ChoiceField(choices=UserProfile.GOALS)
    calorieTarget = serializers.IntegerField(min_value=1000, max_value=6000, allow_null=True, required=False)
    proteinPct = serializers.IntegerField(min_value=0, max_value=100)
    carbsPct = serializers.IntegerField(min_value=0, max_value=100)
    fatPct = serializers.IntegerField(min_value=0, max_value=100)
    diet = serializers.ChoiceField(choices=UserProfile.DIETS)
    allergies = serializers.ListField(child=serializers.ChoiceField(choices=COMMON_ALLERGENS), max_length=20)
    otherAllergies = serializers.CharField(max_length=500, allow_blank=True, required=False)
    dislikes = serializers.CharField(max_length=300, allow_blank=True, required=False)
    healthConsent = serializers.BooleanField()
    showSupplements = serializers.BooleanField()
    showWellness = serializers.BooleanField()

    def validate(self, data):
        if data['proteinPct'] + data['carbsPct'] + data['fatPct'] != 100:
            raise serializers.ValidationError({'macros': 'Percentages must total 100%.'})
        return data

    @staticmethod
    def to_payload(user):
        profile = user.profile
        allergies = list(user.allergies.all())
        return {
            'firstName': user.first_name,
            'lastName': user.last_name,
            'email': user.email,
            'age': profile.age if profile.age is not None else '',
            'sex': profile.sex,
            'heightCm': str(profile.height_cm) if profile.height_cm is not None else '',
            'weightKg': str(profile.weight_kg) if profile.weight_kg is not None else '',
            'activity': profile.activity,
            'goal': profile.fitness_goal,
            'calorieTarget': profile.calorie_target if profile.calorie_target is not None else '',
            'proteinPct': profile.protein_pct,
            'carbsPct': profile.carbs_pct,
            'fatPct': profile.fat_pct,
            'diet': profile.diet,
            'allergies': [a.name for a in allergies if not a.is_custom],
            'otherAllergies': ', '.join(a.name for a in allergies if a.is_custom),
            'dislikes': profile.dislikes,
            'healthConsent': profile.health_consent,
            'showSupplements': profile.show_supplements,
            'showWellness': profile.show_wellness,
        }

    @transaction.atomic
    def save_for(self, user):
        data = self.validated_data
        user.first_name = data['firstName'].strip()
        user.last_name = data['lastName'].strip()
        user.save(update_fields=['first_name', 'last_name'])

        UserProfile.objects.update_or_create(user=user, defaults={
            'age': data.get('age'),
            'sex': data.get('sex', ''),
            'height_cm': data.get('heightCm'),
            'weight_kg': data.get('weightKg'),
            'activity': data['activity'],
            'fitness_goal': data['goal'],
            'calorie_target': data.get('calorieTarget'),
            'protein_pct': data['proteinPct'],
            'carbs_pct': data['carbsPct'],
            'fat_pct': data['fatPct'],
            'diet': data['diet'],
            'dislikes': data.get('dislikes', '').strip(),
            'health_consent': data['healthConsent'],
            'show_supplements': data['showSupplements'],
            'show_wellness': data['showWellness'],
        })

        common = list(dict.fromkeys(data['allergies']))
        custom = list(dict.fromkeys(
            a.strip()[:80] for a in data.get('otherAllergies', '').split(',') if a.strip()
        ))
        user.allergies.all().delete()
        UserAllergy.objects.bulk_create(
            [UserAllergy(user=user, name=name) for name in common]
            + [UserAllergy(user=user, name=name, is_custom=True) for name in custom if name not in common]
        )
