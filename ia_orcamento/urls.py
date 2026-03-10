from django.urls import path
from .views import criar_orcamento_ia

urlpatterns = [
    path("gerar/", criar_orcamento_ia, name="gerar_orcamento_ia")
]