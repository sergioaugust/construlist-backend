from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    ClienteViewSet, OrcamentoViewSet, ItemOrcamentoViewSet,
    perfil_view, register_view, me_view,
    password_reset_request, password_reset_verify, password_reset_confirm
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)
router.register(r'orcamentos', OrcamentoViewSet)
router.register(r'itens', ItemOrcamentoViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/perfil/', perfil_view),
    path('api/me/', me_view),
    path('api/register/', register_view),
    path('api/login/', TokenObtainPairView.as_view(), name='login'),
    path('api/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('api/password-reset/', password_reset_request),
    path('api/password-reset/verify/', password_reset_verify),
    path('api/password-reset/confirm/', password_reset_confirm),
    path('ia/', include('ia_orcamento.urls')),
]