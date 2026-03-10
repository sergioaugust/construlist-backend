from rest_framework import serializers
from .models import Cliente, Orcamento, ItemOrcamento, Perfil

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ['usuario', 'criado_em']


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    # subtotal calculado automaticamente
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemOrcamento
        fields = '__all__'

    def get_subtotal(self, obj):
        return float(obj.subtotal)


class OrcamentoSerializer(serializers.ModelSerializer):
    itens = ItemOrcamentoSerializer(many=True, read_only=True)
    total_geral = serializers.SerializerMethodField()
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)

    def get_total_geral(self, obj):
        return float(obj.total_geral)

    class Meta:
        model = Orcamento
        fields = '__all__'
        read_only_fields = ['usuario', 'criado_em']

class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perfil
        fields = '__all__'
        read_only_fields = ['usuario']