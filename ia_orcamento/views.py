import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .services import gerar_orcamento_ia


@csrf_exempt
def criar_orcamento_ia(request):
    if request.method != 'POST':
        return JsonResponse({'erro': 'Método não permitido'}, status=405)

    try:
        data = json.loads(request.body)
        descricao = data.get('descricao', '').strip()

        if not descricao:
            return JsonResponse({'erro': 'Descrição não informada'}, status=400)

        resultado = gerar_orcamento_ia(descricao)
        return JsonResponse(resultado)

    except json.JSONDecodeError:
        return JsonResponse({'erro': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)