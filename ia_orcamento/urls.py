from django.urls import path
from .views import gerar_orcamento_view

urlpatterns = [
    path('gerar/', gerar_orcamento_view),
]