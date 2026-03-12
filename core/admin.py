#Permite você criar clientes manualmente pelo painel admin.
#É a forma mais rápida de testar se o model está funcionando.
from django.contrib import admin
from .models import Cliente, Orcamento, ItemOrcamento


class ItemOrcamentoInline(admin.TabularInline):
    model = ItemOrcamento
    extra = 1 #Mostra uma linha vazia automática para criar item


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):

    list_display = (
        'titulo',
        'cliente',
        'status',
        'validade_dias',
        'criado_em',
        'total_geral'
    )

    list_filter = (
        'status',
        'criado_em'
    )

    search_fields = (
        'titulo',
        'cliente__nome'
    )

    inlines = [ItemOrcamentoInline]


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):

    list_display = (
        'nome',
        'telefone',
        'email',
        'criado_em'
    )

    search_fields = (
        'nome',
        'telefone',
        'email'
    )


@admin.register(ItemOrcamento)
class ItemOrcamentoAdmin(admin.ModelAdmin):

    list_display = (
        'descricao',
        'orcamento',
        'tipo',
        'quantidade',
        'valor_unitario',
        'subtotal'
    )

    list_filter = (
        'tipo',
    )
