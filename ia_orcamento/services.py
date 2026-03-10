import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()



SYSTEM_PROMPT = """Você é um assistente especializado em orçamentos para prestadores de serviços de construção civil no Brasil.

Quando o usuário descrever um serviço, você deve retornar APENAS um JSON válido (sem texto extra, sem markdown, sem explicações) com a seguinte estrutura:

{
  "materiais": [
    {
      "descricao": "NOME DO MATERIAL EM CAIXA ALTA",
      "unidade": "m²",
      "quantidade": 10,
      "valor_unitario": 85.00
    }
  ],
  "mao_de_obra": [
    {
      "descricao": "Serviço de execução completa",
      "unidade": "m²",
      "quantidade": 10,
      "valor_unitario": 45.00
    }
  ],
  "observacao": "Texto explicativo breve sobre o orçamento, alertas importantes, variações de preço ou informações relevantes para o prestador de serviço."
}

REGRAS OBRIGATÓRIAS:
1. MATERIAIS: nomes sempre em CAIXA ALTA. Ex: "PORCELANATO 60X60CM", "CIMENTO CP-II 50KG", "TINTA ACRÍLICA PREMIUM 18L"
2. MÃO DE OBRA: máximo 3 linhas, agrupadas por tipo de serviço. Ex: "Serviço de assentamento de piso", "Serviço de pintura e acabamento"
3. Use preços de referência realistas do mercado brasileiro atual
4. Quantidades baseadas nas medidas informadas pelo usuário
5. Unidades padronizadas: m², m³, un, kg, sc, lata, pt, hr
6. NÃO inclua comentários, valores totais ou textos fora do JSON
7. A observacao deve ser objetiva, útil e baseada especificamente no que o usuário descreveu
"""

def gerar_orcamento_ia(descricao: str) -> dict:
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    """
    Retorna um dicionário com materiais, mao_de_obra e observacao.
    Em caso de erro, retorna estrutura vazia com mensagem.
    """
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": descricao},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=2000,
        )

        texto = chat_completion.choices[0].message.content.strip()

        # Remove possíveis blocos de markdown se o modelo insistir
        if texto.startswith("```"):
            texto = texto.split("```")[1]
            if texto.startswith("json"):
                texto = texto[4:]
            texto = texto.strip()

        resultado = json.loads(texto)

        # Garantir estrutura mínima
        if "materiais" not in resultado:
            resultado["materiais"] = []
        if "mao_de_obra" not in resultado:
            resultado["mao_de_obra"] = []
        if "observacao" not in resultado:
            resultado["observacao"] = ""

        return resultado

    except json.JSONDecodeError:
        return {
            "materiais": [],
            "mao_de_obra": [],
            "observacao": "Não foi possível interpretar a resposta da IA. Tente descrever o serviço com mais detalhes.",
            "erro": True
        }
    except Exception as e:
        return {
            "materiais": [],
            "mao_de_obra": [],
            "observacao": f"Erro ao conectar com a IA: {str(e)}",
            "erro": True
        }