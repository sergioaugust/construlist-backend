from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import ClienteViewSet, OrcamentoViewSet, ItemOrcamentoViewSet, perfil_view
from django.contrib import admin
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import perfil_view, register_view
from core.views import (
    perfil_view, register_view,
    password_reset_request, password_reset_verify, password_reset_confirm
)


router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'orcamentos', OrcamentoViewSet, basename='orcamento')
router.register(r'itens', ItemOrcamentoViewSet, basename='itemorcamento')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/perfil/', perfil_view),
    path("api/login/", TokenObtainPairView.as_view()),
    path("api/refresh/", TokenRefreshView.as_view()),
    path('api/register/', register_view),
    path('api/password-reset/',         password_reset_request),
    path('api/password-reset/verify/',  password_reset_verify),
    path('api/password-reset/confirm/', password_reset_confirm),
    path("ia/", include("ia_orcamento.urls")),
]