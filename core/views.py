import random
from django.core.mail import send_mail
from django.conf import settings as django_settings
from .models import PasswordResetCode
import base64
import io
from django.http import HttpResponse
from django.contrib.auth.models import User
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, Image as RLImage
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from .models import Cliente, Orcamento, ItemOrcamento, Perfil
from .serializers import ClienteSerializer, OrcamentoSerializer, ItemOrcamentoSerializer, PerfilSerializer

# ── Mapa de cores do orçamento ────────────────────────────────────────────────
COR_MAP = {
    'azul':         colors.HexColor('#2563EB'),
    'verde':        colors.HexColor('#16a34a'),
    'vermelho':     colors.HexColor('#dc2626'),
    'amarelo':      colors.HexColor('#ca8a04'),
    'cinza_chumbo': colors.HexColor('#4b5563'),
    'preto':        colors.HexColor('#111827'),
}

# ── ViewSets ──────────────────────────────────────────────────────────────────
class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('-criado_em')
    serializer_class = ClienteSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = User.objects.first()
        serializer.save(usuario=user)


class ItemOrcamentoViewSet(viewsets.ModelViewSet):
    serializer_class = ItemOrcamentoSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        orcamento_id = self.request.query_params.get('orcamento')
        if orcamento_id:
            return ItemOrcamento.objects.filter(orcamento_id=orcamento_id)
        return ItemOrcamento.objects.all()


class OrcamentoViewSet(viewsets.ModelViewSet):
    serializer_class = OrcamentoSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Orcamento.objects.all().order_by('-criado_em')

    def perform_create(self, serializer):
        user = User.objects.first()
        serializer.save(usuario=user)

    # ── Gerar PDF ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        orc = self.get_object()
        itens = ItemOrcamento.objects.filter(orcamento=orc)
        materiais = [i for i in itens if i.tipo == 'material']
        mao_de_obra = [i for i in itens if i.tipo == 'mao_de_obra']

        # Carregar perfil do usuário
        user = User.objects.first()
        perfil, _ = Perfil.objects.get_or_create(usuario=user)

        # Cor do orçamento
        cor_principal = COR_MAP.get(perfil.cor_orcamento or 'azul', COR_MAP['azul'])
        cor_header_rgb = (
            cor_principal.red,
            cor_principal.green,
            cor_principal.blue,
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.8 * cm,
            leftMargin=1.8 * cm,
            topMargin=1.5 * cm,
            bottomMargin=2 * cm,
        )

        styles = getSampleStyleSheet()
        W = A4[0] - 3.6 * cm  # largura útil

        # ── Estilos customizados ───────────────────────────────────────────────
        s_titulo = ParagraphStyle('titulo', fontName='Helvetica-Bold', fontSize=18,
                                   textColor=cor_principal, spaceAfter=2)
        s_sub = ParagraphStyle('sub', fontName='Helvetica', fontSize=9,
                                textColor=colors.HexColor('#6b7280'), spaceAfter=0)
        s_label = ParagraphStyle('label', fontName='Helvetica', fontSize=8,
                                  textColor=colors.HexColor('#9ca3af'))
        s_valor = ParagraphStyle('valor', fontName='Helvetica-Bold', fontSize=9,
                                  textColor=colors.HexColor('#111827'))
        s_sec = ParagraphStyle('sec', fontName='Helvetica-Bold', fontSize=9,
                                textColor=colors.white)
        s_total_label = ParagraphStyle('tl', fontName='Helvetica-Bold', fontSize=10,
                                        textColor=colors.HexColor('#374151'))
        s_total_val = ParagraphStyle('tv', fontName='Helvetica-Bold', fontSize=14,
                                      textColor=cor_principal, alignment=TA_RIGHT)
        s_obs = ParagraphStyle('obs', fontName='Helvetica', fontSize=8,
                                textColor=colors.HexColor('#374151'), leading=12)
        s_footer = ParagraphStyle('footer', fontName='Helvetica', fontSize=7,
                                   textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)

        story = []

        from datetime import date
        data_emissao = orc.criado_em.strftime('%d/%m/%Y') if orc.criado_em else date.today().strftime('%d/%m/%Y')

        # ── Dados do perfil ────────────────────────────────────────────────────
        nome_empresa   = perfil.empresa or perfil.nome or 'CONSTRULIST'
        nome_prestador = perfil.nome or ''
        email_p        = perfil.email or ''
        tel_p          = perfil.telefone or ''
        cpf_cnpj_raw   = (perfil.cpf_cnpj or '').replace('.','').replace('-','').replace('/','').replace(' ','')
        end_p          = perfil.endereco or ''

        # CPF ou CNPJ — detecta pelo número de dígitos
        if cpf_cnpj_raw:
            if len(cpf_cnpj_raw) <= 11:
                doc_label = f'CPF: {perfil.cpf_cnpj}'
            else:
                doc_label = f'CNPJ: {perfil.cpf_cnpj}'
        else:
            doc_label = ''

        # Contato: telefone | email
        contato_parts = []
        if tel_p:   contato_parts.append(tel_p)
        if email_p: contato_parts.append(email_p)
        contato_str = '  |  '.join(contato_parts)

        # ── Estilos do cabeçalho ───────────────────────────────────────────────
        s_emp = ParagraphStyle('emp', fontName='Helvetica-Bold', fontSize=13,
                               textColor=colors.HexColor('#111827'), spaceAfter=5)
        s_resp = ParagraphStyle('resp', fontName='Helvetica', fontSize=8,
                                textColor=colors.HexColor('#6b7280'), spaceAfter=3, leading=13)
        s_num_orc = ParagraphStyle('numorc', fontName='Helvetica', fontSize=8,
                                   textColor=colors.HexColor('#9ca3af'), alignment=TA_RIGHT, spaceAfter=6)

        # ── Logo ───────────────────────────────────────────────────────────────
        logo_cell = Paragraph('', s_sub)
        if perfil.logo:
            try:
                img_data = base64.b64decode(perfil.logo.split(',')[1] if ',' in perfil.logo else perfil.logo)
                logo_img = RLImage(io.BytesIO(img_data), width=3.8 * cm, height=2.2 * cm)
                logo_img.hAlign = 'RIGHT'
                logo_cell = logo_img
            except Exception:
                pass

        # ── Coluna esquerda: dados da empresa ──────────────────────────────────
        info_col = [
            Paragraph(f'<b>{nome_empresa}</b>', s_emp),
        ]
        if nome_prestador and nome_prestador != nome_empresa:
            info_col.append(Paragraph(f'Responsável: {nome_prestador}', s_resp))
        if contato_str:
            info_col.append(Paragraph(contato_str, s_resp))
        if doc_label:
            info_col.append(Paragraph(doc_label, s_resp))
        if end_p:
            info_col.append(Paragraph(end_p, s_resp))

        # ── Coluna direita: número do orçamento (topo) + logo (base) ──────────
        right_col = [
            Paragraph(f'Orçamento #{orc.id}', s_num_orc),
            Spacer(1, 6),
            logo_cell,
        ]

        header_t = Table([[info_col, right_col]], colWidths=[W * 0.58, W * 0.42])
        header_t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (0, 0), 'TOP'),
            ('VALIGN', (1, 0), (1, 0), 'TOP'),
            ('ALIGN',  (1, 0), (1, 0), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING',    (0, 0), (-1, -1), 0),
            ('LEFTPADDING',   (0, 0), (-1, -1), 0),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
        ]))
        story.append(header_t)
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width=W, thickness=2, color=cor_principal, spaceAfter=12))

        # ── Título do orçamento ────────────────────────────────────────────────
        story.append(Paragraph(orc.titulo, s_titulo))
        story.append(Spacer(1, 12))

        # ── Informações do orçamento ───────────────────────────────────────────
        status_labels = {
            'rascunho': 'Rascunho', 'enviado': 'Enviado',
            'aprovado': 'Aprovado', 'recusado': 'Recusado',
        }

        info_data = [
            [
                Paragraph('CLIENTE', s_label), Paragraph('STATUS', s_label),
                Paragraph('EMISSÃO', s_label), Paragraph('VALIDADE', s_label),
            ],
            [
                Paragraph(orc.cliente.nome if orc.cliente else '—', s_valor),
                Paragraph(status_labels.get(orc.status, orc.status), s_valor),
                Paragraph(data_emissao, s_valor),
                Paragraph(f'{orc.validade_dias} dias', s_valor),
            ],
        ]
        info_t = Table(info_data, colWidths=[W * 0.35, W * 0.2, W * 0.2, W * 0.25])
        info_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f9fafb')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('ROUNDEDCORNERS', [4]),
        ]))
        story.append(info_t)
        story.append(Spacer(1, 10))

        # ── Descrição do serviço (só se preenchida) ────────────────────────────
        if orc.descricao and orc.descricao.strip():
            s_desc_label = ParagraphStyle('dlabel', fontName='Helvetica-Bold', fontSize=8,
                                          textColor=colors.HexColor('#374151'), spaceAfter=3)
            s_desc_texto = ParagraphStyle('dtexto', fontName='Helvetica', fontSize=8,
                                          textColor=colors.HexColor('#374151'), leading=12)
            desc_block = Table(
                [[
                    [Paragraph('DESCRIÇÃO DO SERVIÇO', s_desc_label),
                     Paragraph(orc.descricao.strip(), s_desc_texto)]
                ]],
                colWidths=[W]
            )
            desc_block.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(desc_block)
            story.append(Spacer(1, 10))

        story.append(Spacer(1, 4))

        # ── Helper: tabela de itens ────────────────────────────────────────────
        def sec_title(texto, icone=''):
            t = Table([[Paragraph(f'{icone}  {texto}', s_sec)]],
                      colWidths=[W])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), cor_principal),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('ROUNDEDCORNERS', [4]),
            ]))
            return t

        def tabela_itens(lista):
            col_desc = W * 0.46
            col_un = W * 0.1
            col_qtd = W * 0.1
            col_unit = W * 0.17
            col_tot = W * 0.17

            sH = ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=8,
                                 textColor=colors.white, alignment=TA_CENTER)
            sC = ParagraphStyle('tc', fontName='Helvetica', fontSize=8,
                                 textColor=colors.HexColor('#374151'))
            sR = ParagraphStyle('tr', fontName='Helvetica', fontSize=8,
                                 textColor=colors.HexColor('#374151'), alignment=TA_RIGHT)
            sBR = ParagraphStyle('tbr', fontName='Helvetica-Bold', fontSize=8,
                                  textColor=colors.HexColor('#111827'), alignment=TA_RIGHT)

            header = [
                Paragraph('DESCRIÇÃO', sH),
                Paragraph('UNID.', sH),
                Paragraph('QTD.', sH),
                Paragraph('UNIT.', sH),
                Paragraph('TOTAL', sH),
            ]
            rows = [header]
            for item in lista:
                sub = float(item.subtotal)
                rows.append([
                    Paragraph(item.descricao, sC),
                    Paragraph(item.unidade, ParagraphStyle('tc2', fontName='Helvetica', fontSize=8,
                              textColor=colors.HexColor('#374151'), alignment=TA_CENTER)),
                    Paragraph(str(item.quantidade), ParagraphStyle('tc3', fontName='Helvetica', fontSize=8,
                              textColor=colors.HexColor('#374151'), alignment=TA_CENTER)),
                    Paragraph(f'R$ {float(item.valor_unitario):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.'), sR),
                    Paragraph(f'R$ {sub:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.'), sBR),
                ])

            t = Table(rows, colWidths=[col_desc, col_un, col_qtd, col_unit, col_tot])
            style = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e5e7eb')),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]
            t.setStyle(TableStyle(style))
            return t

        # ── Materiais ──────────────────────────────────────────────────────────
        if materiais:
            story.append(KeepTogether([
                sec_title('MATERIAIS / ITENS'),
                Spacer(1, 4),
                tabela_itens(materiais),
            ]))
            total_mat = sum(float(i.subtotal) for i in materiais)
            st = ParagraphStyle('sr', fontName='Helvetica-Bold', fontSize=8,
                                 textColor=colors.HexColor('#374151'), alignment=TA_RIGHT)
            story.append(Table(
                [[Paragraph(f'Subtotal Materiais:  R$ {total_mat:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.'), st)]],
                colWidths=[W]
            ))
            story.append(Spacer(1, 12))

        # ── Mão de Obra ────────────────────────────────────────────────────────
        if mao_de_obra:
            story.append(KeepTogether([
                sec_title('MÃO DE OBRA'),
                Spacer(1, 4),
                tabela_itens(mao_de_obra),
            ]))
            total_mao = sum(float(i.subtotal) for i in mao_de_obra)
            st = ParagraphStyle('sr2', fontName='Helvetica-Bold', fontSize=8,
                                  textColor=colors.HexColor('#374151'), alignment=TA_RIGHT)
            story.append(Table(
                [[Paragraph(f'Subtotal Mão de Obra:  R$ {total_mao:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.'), st)]],
                colWidths=[W]
            ))
            story.append(Spacer(1, 12))

        # ── Total Geral ────────────────────────────────────────────────────────
        total_geral = float(orc.total_geral)
        total_str = f'R$ {total_geral:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
        total_t = Table(
            [[
                Paragraph('TOTAL GERAL', s_total_label),
                Paragraph(total_str, s_total_val),
            ]],
            colWidths=[W * 0.5, W * 0.5]
        )
        total_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
            ('BOX', (0, 0), (-1, -1), 1.5, cor_principal),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 16),
            ('RIGHTPADDING', (0, 0), (-1, -1), 16),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROUNDEDCORNERS', [6]),
        ]))
        story.append(total_t)
        story.append(Spacer(1, 16))

        # ── Condições de pagamento e observações ───────────────────────────────
        extras = []
        if orc.condicoes_pagamento:
            extras.append(Paragraph(f'<b>Condições de Pagamento:</b> {orc.condicoes_pagamento}', s_obs))
            extras.append(Spacer(1, 4))
        if orc.observacoes:
            extras.append(Paragraph(f'<b>Observações:</b> {orc.observacoes}', s_obs))
        if extras:
            obs_t = Table([[extras]], colWidths=[W])
            obs_t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fffbeb')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#fcd34d')),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ]))
            story.append(obs_t)
            story.append(Spacer(1, 16))

        # ── Assinaturas ────────────────────────────────────────────────────────
        linha_assinatura = HRFlowable(width=6 * cm, thickness=0.5,
                                       color=colors.HexColor('#9ca3af'))

        # Coluna esquerda: assinatura do prestador
        col_prestador = []
        if perfil.assinatura:
            try:
                if ',' in perfil.assinatura:
                    sig_data = base64.b64decode(perfil.assinatura.split(',')[1])
                else:
                    sig_data = base64.b64decode(perfil.assinatura)
                sig_img = RLImage(io.BytesIO(sig_data), width=4.5 * cm, height=1.8 * cm)
                col_prestador.append(sig_img)
            except Exception:
                col_prestador.append(Spacer(1, 1.8 * cm))
        else:
            col_prestador.append(Spacer(1, 1.8 * cm))

        col_prestador.append(linha_assinatura)
        col_prestador.append(Paragraph(nome_empresa or 'Prestador de Serviço',
                                         ParagraphStyle('as', fontName='Helvetica-Bold',
                                                         fontSize=8, textColor=colors.HexColor('#374151'))))

        # Coluna direita: assinatura do cliente
        col_cliente = [
            Spacer(1, 1.8 * cm),
            linha_assinatura,
            Paragraph('Contratante / Cliente',
                       ParagraphStyle('ac', fontName='Helvetica-Bold', fontSize=8,
                                       textColor=colors.HexColor('#374151'))),
        ]

        assin_t = Table(
            [[col_prestador, col_cliente]],
            colWidths=[W * 0.5, W * 0.5]
        )
        assin_t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(KeepTogether([assin_t]))

        # ── Footer (via canvas) ────────────────────────────────────────────────
        def footer_canvas(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 7)
            canvas.setFillColor(colors.HexColor('#9ca3af'))
            footer_text = f'CONSTRULIST  •  Orçamento #{orc.id}  •  {data_emissao}'
            canvas.drawCentredString(A4[0] / 2, 1.2 * cm, footer_text)
            canvas.drawRightString(A4[0] - 1.8 * cm, 1.2 * cm, f'Página {doc.page}')
            # Linha superior do footer
            canvas.setStrokeColor(cor_principal)
            canvas.setLineWidth(1.5)
            canvas.line(1.8 * cm, 1.6 * cm, A4[0] - 1.8 * cm, 1.6 * cm)
            canvas.restoreState()

        doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="orcamento_{orc.id}.pdf"'
        return response


# ── Perfil view ────────────────────────────────────────────────────────────────
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([AllowAny])
def perfil_view(request):
    user = User.objects.first()
    perfil, _ = Perfil.objects.get_or_create(usuario=user)
    if request.method == 'GET':
        return Response(PerfilSerializer(perfil).data)
    serializer = PerfilSerializer(perfil, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    email    = request.data.get('email', '').strip()

    if not username or not password:
        return Response({'error': 'Usuário e senha obrigatórios.'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'username': ['Este usuário já existe.']}, status=400)

    if email and User.objects.filter(email=email).exists():
        return Response({'email': ['Este e-mail já está em uso.']}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email)
    return Response({'id': user.id, 'username': user.username}, status=201)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Envia código de 6 dígitos para o email do usuário."""
    from django.core.mail import send_mail
    from django.conf import settings as django_settings
    from .models import PasswordResetCode
    import random

    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'E-mail obrigatório.'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'E-mail não encontrado.'}, status=404)

    # Gera código de 6 dígitos
    code = str(random.randint(100000, 999999))

    # Invalida códigos anteriores do mesmo usuário
    PasswordResetCode.objects.filter(user=user, used=False).update(used=True)

    # Salva novo código
    PasswordResetCode.objects.create(user=user, code=code)

    # Envia email
    send_mail(
        subject='CONSTRULIST — Código de recuperação de senha',
        message=f'Seu código de verificação é: {code}\n\nEle expira em 15 minutos.\n\nSe não foi você, ignore este email.',
        from_email=django_settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )

    return Response({'message': 'Código enviado.'}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_verify(request):
    """Verifica se o código é válido."""
    from .models import PasswordResetCode

    email = request.data.get('email', '').strip()
    code  = request.data.get('code', '').strip()

    if not email or not code:
        return Response({'error': 'Email e código obrigatórios.'}, status=400)

    try:
        user = User.objects.get(email=email)
        reset = PasswordResetCode.objects.filter(
            user=user, code=code, used=False
        ).latest('created_at')
    except (User.DoesNotExist, PasswordResetCode.DoesNotExist):
        return Response({'error': 'Código inválido.'}, status=400)

    if not reset.is_valid():
        return Response({'error': 'Código expirado.'}, status=400)

    return Response({'message': 'Código válido.'}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Confirma o código e atualiza a senha."""
    from .models import PasswordResetCode

    email        = request.data.get('email', '').strip()
    code         = request.data.get('code', '').strip()
    new_password = request.data.get('new_password', '').strip()

    if not email or not code or not new_password:
        return Response({'error': 'Todos os campos são obrigatórios.'}, status=400)

    if len(new_password) < 6:
        return Response({'error': 'Senha muito curta.'}, status=400)

    try:
        user = User.objects.get(email=email)
        reset = PasswordResetCode.objects.filter(
            user=user, code=code, used=False
        ).latest('created_at')
    except (User.DoesNotExist, PasswordResetCode.DoesNotExist):
        return Response({'error': 'Código inválido.'}, status=400)

    if not reset.is_valid():
        return Response({'error': 'Código expirado.'}, status=400)

    # Atualiza senha
    user.set_password(new_password)
    user.save()

    # Invalida o código
    reset.used = True
    reset.save()

    return Response({'message': 'Senha atualizada com sucesso.'}, status=200)