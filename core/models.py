from django.db import models
from django.contrib.auth.models import User
import random
from django.utils import timezone


class Cliente(models.Model):
    usuario     = models.ForeignKey(User, on_delete=models.CASCADE)
    nome        = models.CharField(max_length=200)
    telefone    = models.CharField(max_length=20, blank=True)
    email       = models.EmailField(blank=True)
    cpf_cnpj    = models.CharField(max_length=20, blank=True)
    cep         = models.CharField(max_length=10, blank=True)
    endereco    = models.CharField(max_length=300, blank=True)
    numero      = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=100, blank=True)
    bairro      = models.CharField(max_length=100, blank=True)
    cidade      = models.CharField(max_length=100, blank=True)
    estado      = models.CharField(max_length=2, blank=True)
    criado_em   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class Orcamento(models.Model):
    STATUS_CHOICES = [
        ('rascunho', 'Rascunho'),
        ('enviado',  'Enviado'),
        ('aprovado', 'Aprovado'),
        ('recusado', 'Recusado'),
    ]
    usuario             = models.ForeignKey(User, on_delete=models.CASCADE)
    cliente             = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    numero              = models.PositiveIntegerField(default=1)  # ← sequencial por usuário
    titulo              = models.CharField(max_length=300)
    descricao           = models.TextField(blank=True)
    condicoes_pagamento = models.TextField(blank=True)
    observacoes         = models.TextField(blank=True)
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='rascunho')
    validade_dias       = models.IntegerField(default=15)
    criado_em           = models.DateTimeField(auto_now_add=True)

    @property
    def total_geral(self):
        return sum(item.subtotal for item in self.itens.all())

    def __str__(self):
        return f"#{self.numero} — {self.titulo}"


class ItemOrcamento(models.Model):
    TIPO_CHOICES = [
        ('material',    'Material'),
        ('mao_de_obra', 'Mão de Obra'),
    ]
    orcamento      = models.ForeignKey(Orcamento, on_delete=models.CASCADE, related_name='itens')
    tipo           = models.CharField(max_length=20, choices=TIPO_CHOICES, default='material')
    descricao      = models.CharField(max_length=300)
    quantidade     = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unidade        = models.CharField(max_length=20, default='un')
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    criado_em      = models.DateTimeField(auto_now_add=True)

    @property
    def subtotal(self):
        return self.quantidade * self.valor_unitario

    def __str__(self):
        return self.descricao


class Perfil(models.Model):
    usuario       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    nome          = models.CharField(max_length=200, blank=True)
    empresa       = models.CharField(max_length=200, blank=True)
    email         = models.EmailField(blank=True)
    telefone      = models.CharField(max_length=20, blank=True)
    cpf_cnpj      = models.CharField(max_length=20, blank=True)
    endereco      = models.CharField(max_length=300, blank=True)
    logo          = models.TextField(blank=True)
    assinatura    = models.TextField(blank=True)
    cor_orcamento = models.CharField(max_length=20, blank=True, default='azul')

    def __str__(self):
        return f"Perfil de {self.usuario.username}"


class PasswordResetCode(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    code       = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used       = models.BooleanField(default=False)

    def is_valid(self):
        return not self.used and (timezone.now() - self.created_at).seconds < 900