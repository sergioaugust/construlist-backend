import base64
import io
import random
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.core.mail import send_mail
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
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
from .models import Cliente, Orcamento, ItemOrcamento, Perfil, PasswordResetCode
from .serializers import ClienteSerializer, OrcamentoSerializer, ItemOrcamentoSerializer, PerfilSerializer

COR_MAP = {
    'azul':         colors.HexColor('#2563EB'),
    'verde':        colors.HexColor('#16a34a'),
    'vermelho':     colors.HexColor('#dc2626'),
    'amarelo':      colors.HexColor('#ca8a04'),
    'cinza_chumbo': colors.HexColor('#4b5563'),
    'preto':        colors.HexColor('#111827'),
}

# ── Cada usuário vê só seus dados ─────────────────────────────────────────────
class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Cliente.objects.filter(usuario=self.request.user).order_by('-criado_em')

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class ItemOrcamentoViewSet(viewsets.ModelViewSet):
    serializer_class = ItemOrcamentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        orcamento_id = self.request.query_params.get('orcamento')
        if orcamento_id:
            return ItemOrcamento.objects.filter(
                orcamento_id=orcamento_id,
                orcamento__usuario=self.request.user
            )
        return ItemOrcamento.objects.filter(orcamento__usuario=self.request.user)


class OrcamentoViewSet(viewsets.ModelViewSet):
    serializer_class = OrcamentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Orcamento.objects.filter(usuario=self.request.user).order_by('-criado_em')

    def perform_create(self, serializer):
    # Calcula o próximo número sequencial para este usuário
        ultimo = Orcamento.objects.filter(usuario=self.request.user).order_by('-numero').first()
        proximo_numero = (ultimo.numero + 1) if ultimo else 1
        serializer.save(usuario=self.request.user, numero=proximo_numero)

    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        orc = self.get_object()
        itens = ItemOrcamento.objects.filter(orcamento=orc)
        materiais  = [i for i in itens if i.tipo == 'material']
        mao_de_obra = [i for i in itens if i.tipo == 'mao_de_obra']

        perfil, _ = Perfil.objects.get_or_create(usuario=request.user)
        cor_principal = COR_MAP.get(perfil.cor_orcamento or 'azul', COR_MAP['azul'])

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
            rightMargin=1.8*cm, leftMargin=1.8*cm,
            topMargin=1.5*cm, bottomMargin=2*cm)

        W = A4[0] - 3.6*cm
        s_titulo      = ParagraphStyle('titulo', fontName='Helvetica-Bold', fontSize=18, textColor=cor_principal, spaceAfter=2)
        s_sub         = ParagraphStyle('sub', fontName='Helvetica', fontSize=9, textColor=colors.HexColor('#6b7280'))
        s_label       = ParagraphStyle('label', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#9ca3af'))
        s_valor       = ParagraphStyle('valor', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#111827'))
        s_sec         = ParagraphStyle('sec', fontName='Helvetica-Bold', fontSize=9, textColor=colors.white)
        s_total_label = ParagraphStyle('tl', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#374151'))
        s_total_val   = ParagraphStyle('tv', fontName='Helvetica-Bold', fontSize=14, textColor=cor_principal, alignment=TA_RIGHT)
        s_obs         = ParagraphStyle('obs', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#374151'), leading=12)
        s_emp         = ParagraphStyle('emp', fontName='Helvetica-Bold', fontSize=13, textColor=colors.HexColor('#111827'), spaceAfter=5)
        s_resp        = ParagraphStyle('resp', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#6b7280'), spaceAfter=3, leading=13)
        s_num_orc     = ParagraphStyle('numorc', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#9ca3af'), alignment=TA_RIGHT, spaceAfter=6)

        from datetime import date
        data_emissao   = orc.criado_em.strftime('%d/%m/%Y') if orc.criado_em else date.today().strftime('%d/%m/%Y')
        nome_empresa   = perfil.empresa or perfil.nome or 'CONSTRULIST'
        nome_prestador = perfil.nome or ''
        email_p        = perfil.email or ''
        tel_p          = perfil.telefone or ''
        cpf_cnpj_raw   = (perfil.cpf_cnpj or '').replace('.','').replace('-','').replace('/','').replace(' ','')
        end_p          = perfil.endereco or ''

        doc_label = ''
        if cpf_cnpj_raw:
            doc_label = f'CPF: {perfil.cpf_cnpj}' if len(cpf_cnpj_raw) <= 11 else f'CNPJ: {perfil.cpf_cnpj}'

        contato_parts = []
        if tel_p:   contato_parts.append(tel_p)
        if email_p: contato_parts.append(email_p)
        contato_str = '  |  '.join(contato_parts)

        logo_cell = Paragraph('', s_sub)
        if perfil.logo:
            try:
                img_data = base64.b64decode(perfil.logo.split(',')[1] if ',' in perfil.logo else perfil.logo)
                logo_img = RLImage(io.BytesIO(img_data), width=3.8*cm, height=2.2*cm)
                logo_img.hAlign = 'RIGHT'
                logo_cell = logo_img
            except Exception:
                pass

        info_col = [Paragraph(f'<b>{nome_empresa}</b>', s_emp)]
        if nome_prestador and nome_prestador != nome_empresa:
            info_col.append(Paragraph(f'Responsável: {nome_prestador}', s_resp))
        if contato_str:
            info_col.append(Paragraph(contato_str, s_resp))
        if doc_label:
            info_col.append(Paragraph(doc_label, s_resp))
        if end_p:
            info_col.append(Paragraph(end_p, s_resp))

        right_col = [Paragraph(f'Orçamento #{orc.id}', s_num_orc), Spacer(1, 6), logo_cell]
        header_t = Table([[info_col, right_col]], colWidths=[W*0.58, W*0.42])
        header_t.setStyle(TableStyle([
            ('VALIGN',(0,0),(0,0),'TOP'), ('VALIGN',(1,0),(1,0),'TOP'),
            ('ALIGN',(1,0),(1,0),'RIGHT'),
            ('BOTTOMPADDING',(0,0),(-1,-1),0), ('TOPPADDING',(0,0),(-1,-1),0),
            ('LEFTPADDING',(0,0),(-1,-1),0), ('RIGHTPADDING',(0,0),(-1,-1),0),
        ]))
        story = []
        story.append(header_t)
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width=W, thickness=2, color=cor_principal, spaceAfter=12))
        story.append(Paragraph(orc.titulo, s_titulo))
        story.append(Spacer(1, 12))

        status_labels = {'rascunho':'Rascunho','enviado':'Enviado','aprovado':'Aprovado','recusado':'Recusado'}
        info_data = [
            [Paragraph('CLIENTE',s_label), Paragraph('STATUS',s_label), Paragraph('EMISSÃO',s_label), Paragraph('VALIDADE',s_label)],
            [Paragraph(orc.cliente.nome if orc.cliente else '—',s_valor), Paragraph(status_labels.get(orc.status,orc.status),s_valor), Paragraph(data_emissao,s_valor), Paragraph(f'{orc.validade_dias} dias',s_valor)],
        ]
        info_t = Table(info_data, colWidths=[W*0.35, W*0.2, W*0.2, W*0.25])
        info_t.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#f9fafb')),
            ('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),
            ('INNERGRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),
            ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6),
            ('LEFTPADDING',(0,0),(-1,-1),8),
        ]))
        story.append(info_t)
        story.append(Spacer(1, 10))

        if orc.descricao and orc.descricao.strip():
            s_dl = ParagraphStyle('dl', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#374151'), spaceAfter=3)
            s_dt = ParagraphStyle('dt', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#374151'), leading=12)
            desc_block = Table([[[Paragraph('DESCRIÇÃO DO SERVIÇO',s_dl), Paragraph(orc.descricao.strip(),s_dt)]]], colWidths=[W])
            desc_block.setStyle(TableStyle([
                ('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),
                ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#f9fafb')),
                ('TOPPADDING',(0,0),(-1,-1),8), ('BOTTOMPADDING',(0,0),(-1,-1),8),
                ('LEFTPADDING',(0,0),(-1,-1),10), ('RIGHTPADDING',(0,0),(-1,-1),10),
            ]))
            story.append(desc_block)
            story.append(Spacer(1, 10))

        def sec_title(txt):
            t = Table([[Paragraph(txt, s_sec)]], colWidths=[W])
            t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,-1),cor_principal),
                ('TOPPADDING',(0,0),(-1,-1),5), ('BOTTOMPADDING',(0,0),(-1,-1),5),
                ('LEFTPADDING',(0,0),(-1,-1),8),
            ]))
            return t

        def tabela_itens(itens_list):
            sH  = ParagraphStyle('h',  fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)
            sBL = ParagraphStyle('bl', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#374151'))
            sBR = ParagraphStyle('br', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#374151'), alignment=TA_RIGHT)
            cw = [W*0.45, W*0.1, W*0.1, W*0.18, W*0.17]
            rows = [[Paragraph('DESCRIÇÃO',sH), Paragraph('UNID.',sH), Paragraph('QTD.',sH), Paragraph('UNIT.',sH), Paragraph('TOTAL',sH)]]
            for i in itens_list:
                sub = float(i.subtotal or 0)
                rows.append([
                    Paragraph(i.descricao, sBL),
                    Paragraph(i.unidade or '', sBL),
                    Paragraph(str(i.quantidade), sBL),
                    Paragraph(f'R$ {float(i.valor_unitario):,.2f}'.replace(',','X').replace('.',',').replace('X','.'), sBR),
                    Paragraph(f'R$ {sub:,.2f}'.replace(',','X').replace('.',',').replace('X','.'), sBR),
                ])
            t = Table(rows, colWidths=cw)
            t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#4a5568')),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f9fafb')]),
                ('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#e5e7eb')),
                ('TOPPADDING',(0,0),(-1,-1),5), ('BOTTOMPADDING',(0,0),(-1,-1),5),
                ('LEFTPADDING',(0,0),(-1,-1),6), ('RIGHTPADDING',(0,0),(-1,-1),6),
                ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ]))
            return t

        if materiais:
            story.append(KeepTogether([sec_title('MATERIAIS / ITENS'), Spacer(1,4), tabela_itens(materiais)]))
            total_mat = sum(float(i.subtotal) for i in materiais)
            st = ParagraphStyle('sr', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#374151'), alignment=TA_RIGHT)
            story.append(Table([[Paragraph(f'Subtotal Materiais:  R$ {total_mat:,.2f}'.replace(',','X').replace('.',',').replace('X','.'), st)]], colWidths=[W]))
            story.append(Spacer(1, 12))

        if mao_de_obra:
            story.append(KeepTogether([sec_title('MÃO DE OBRA'), Spacer(1,4), tabela_itens(mao_de_obra)]))
            total_mao = sum(float(i.subtotal) for i in mao_de_obra)
            st = ParagraphStyle('sr2', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#374151'), alignment=TA_RIGHT)
            story.append(Table([[Paragraph(f'Subtotal Mão de Obra:  R$ {total_mao:,.2f}'.replace(',','X').replace('.',',').replace('X','.'), st)]], colWidths=[W]))
            story.append(Spacer(1, 12))

        total_geral = float(orc.total_geral)
        total_str = f'R$ {total_geral:,.2f}'.replace(',','X').replace('.',',').replace('X','.')
        total_t = Table([[Paragraph('TOTAL GERAL', s_total_label), Paragraph(total_str, s_total_val)]], colWidths=[W*0.5, W*0.5])
        total_t.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#f1f5f9')),
            ('BOX',(0,0),(-1,-1),1.5,cor_principal),
            ('TOPPADDING',(0,0),(-1,-1),12), ('BOTTOMPADDING',(0,0),(-1,-1),12),
            ('LEFTPADDING',(0,0),(-1,-1),16), ('RIGHTPADDING',(0,0),(-1,-1),16),
            ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ]))
        story.append(total_t)
        story.append(Spacer(1, 16))

        extras = []
        if orc.condicoes_pagamento:
            extras.append(Paragraph(f'<b>Condições de Pagamento:</b> {orc.condicoes_pagamento}', s_obs))
            extras.append(Spacer(1, 4))
        if orc.observacoes:
            extras.append(Paragraph(f'<b>Observações:</b> {orc.observacoes}', s_obs))
        if extras:
            obs_t = Table([[extras]], colWidths=[W])
            obs_t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#fffbeb')),
                ('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#fcd34d')),
                ('TOPPADDING',(0,0),(-1,-1),10), ('BOTTOMPADDING',(0,0),(-1,-1),10),
                ('LEFTPADDING',(0,0),(-1,-1),12), ('RIGHTPADDING',(0,0),(-1,-1),12),
            ]))
            story.append(obs_t)
            story.append(Spacer(1, 16))

        linha_assinatura = HRFlowable(width=6*cm, thickness=0.5, color=colors.HexColor('#9ca3af'))
        col_prestador = []
        if perfil.assinatura:
            try:
                sig_data = base64.b64decode(perfil.assinatura.split(',')[1] if ',' in perfil.assinatura else perfil.assinatura)
                sig_img = RLImage(io.BytesIO(sig_data), width=4.5*cm, height=1.8*cm)
                col_prestador.append(sig_img)
            except Exception:
                col_prestador.append(Spacer(1, 1.8*cm))
        else:
            col_prestador.append(Spacer(1, 1.8*cm))
        col_prestador += [linha_assinatura, Paragraph(nome_empresa or 'Prestador de Serviço', ParagraphStyle('as', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#374151')))]
        col_cliente = [Spacer(1, 1.8*cm), linha_assinatura, Paragraph('Contratante / Cliente', ParagraphStyle('ac', fontName='Helvetica-Bold', fontSize=8, textColor=colors.HexColor('#374151')))]
        assin_t = Table([[col_prestador, col_cliente]], colWidths=[W*0.5, W*0.5])
        assin_t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'BOTTOM'), ('TOPPADDING',(0,0),(-1,-1),0)]))
        story.append(KeepTogether([assin_t]))

        def footer_canvas(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 7)
            canvas.setFillColor(colors.HexColor('#9ca3af'))
            canvas.drawCentredString(A4[0]/2, 1.2*cm, f'CONSTRULIST  •  Orçamento #{orc.id}  •  {data_emissao}')
            canvas.drawRightString(A4[0]-1.8*cm, 1.2*cm, f'Página {doc.page}')
            canvas.setStrokeColor(cor_principal)
            canvas.setLineWidth(1.5)
            canvas.line(1.8*cm, 1.6*cm, A4[0]-1.8*cm, 1.6*cm)
            canvas.restoreState()

        doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="orcamento_{orc.id}.pdf"'
        return response


# ── Perfil ────────────────────────────────────────────────────────────────────
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def perfil_view(request):
    perfil, _ = Perfil.objects.get_or_create(usuario=request.user)
    if request.method == 'GET':
        return Response(PerfilSerializer(perfil).data)
    serializer = PerfilSerializer(perfil, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ── Me — dados do usuário logado ──────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    perfil, _ = Perfil.objects.get_or_create(usuario=request.user)
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'nome': perfil.nome or request.user.get_full_name() or request.user.username,
        'empresa': perfil.empresa or '',
    })


# ── Register ──────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email    = request.data.get('email', '')
    if not username or not password:
        return Response({'error': 'Username e password são obrigatórios'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Usuário já existe'}, status=400)
    User.objects.create_user(username=username, password=password, email=email)
    return Response({'message': 'Usuário criado com sucesso'}, status=201)


# ── Password Reset ────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'Se este email existir, você receberá um código.'})
    code = str(random.randint(100000, 999999))
    PasswordResetCode.objects.create(user=user, code=code)
    send_mail('Código de recuperação — CONSTRULIST', f'Seu código é: {code}\n\nExpira em 15 minutos.', None, [email])
    return Response({'message': 'Código enviado.'})

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_verify(request):
    email = request.data.get('email')
    code  = request.data.get('code')
    try:
        user  = User.objects.get(email=email)
        reset = PasswordResetCode.objects.filter(user=user, code=code, used=False).latest('created_at')
        if not reset.is_valid():
            return Response({'error': 'Código expirado'}, status=400)
        return Response({'message': 'Código válido'})
    except Exception:
        return Response({'error': 'Código inválido'}, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    email    = request.data.get('email')
    code     = request.data.get('code')
    password = request.data.get('password')
    try:
        user  = User.objects.get(email=email)
        reset = PasswordResetCode.objects.filter(user=user, code=code, used=False).latest('created_at')
        if not reset.is_valid():
            return Response({'error': 'Código expirado'}, status=400)
        user.set_password(password)
        user.save()
        reset.used = True
        reset.save()
        return Response({'message': 'Senha alterada com sucesso'})
    except Exception:
        return Response({'error': 'Código inválido'}, status=400)