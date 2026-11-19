# URL routes for the recipes app. All of these sit under /api/.
from django.urls import path

from . import views

urlpatterns = [
    # Every seeded list the website needs (allergens, ingredients, form choices).
    path('reference', views.ReferenceView.as_view()),
    # Ask the AI for a new recipe (rate limited).
    path('recipes/generate', views.GenerateRecipeView.as_view()),
    # A clearly labelled example recipe for when the AI is unavailable.
    path('recipes/sample', views.SampleRecipeView.as_view()),
    # Recent recipes, one recipe with its chat (open or delete), and sending a chat message.
    path('recipes/recent', views.RecentRecipesView.as_view()),
    path('recipes/<int:pk>', views.RecipeDetailView.as_view()),
    path('recipes/<int:pk>/chat', views.RecipeChatView.as_view()),
    # List and save recipes, then view or delete one saved recipe.
    path('saved', views.SavedListView.as_view()),
    path('saved/<int:pk>', views.SavedDetailView.as_view()),
    # Today's meal log, and removing one logged meal.
    path('log', views.MealLogView.as_view()),
    path('log/<int:pk>', views.MealDetailView.as_view()),
    # Glasses of water drunk today.
    path('water', views.WaterView.as_view()),
    # Daily totals, recent recipes and wellness tip for the dashboard home page.
    path('dashboard', views.DashboardView.as_view()),
]
