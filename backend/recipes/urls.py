from django.urls import path

from . import views

urlpatterns = [
    path('recipes/generate', views.GenerateRecipeView.as_view()),
    path('recipes/sample', views.SampleRecipeView.as_view()),
    path('saved', views.SavedListView.as_view()),
    path('saved/<int:pk>', views.SavedDetailView.as_view()),
    path('log', views.MealLogView.as_view()),
    path('log/<int:pk>', views.MealDetailView.as_view()),
    path('water', views.WaterView.as_view()),
    path('dashboard', views.DashboardView.as_view()),
]
