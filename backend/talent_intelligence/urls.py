from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserRegisterView, CandidateViewSet, JobViewSet, RankingView

router = DefaultRouter()
router.register(r'candidates', CandidateViewSet, basename='candidate')
router.register(r'jobs', JobViewSet, basename='job')

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='register'),
    path('rank/', RankingView.as_view(), name='rank'),
    path('', include(router.urls)),
]
