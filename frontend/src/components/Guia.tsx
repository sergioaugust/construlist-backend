import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

// ── Conteúdo do guia por página ───────────────────────────────────────────────
const GUIAS: Record<string, { titulo: string; passos: { icone: string; titulo: string; texto: string }[] }> = {
  '/': {
    titulo: '👋 Bem-vindo ao CONSTRULIST!',
    passos: [
      { icone: '🎉', titulo: 'Sua conta foi criada!', texto: 'Este é seu painel principal. Aqui você verá um resumo dos seus orçamentos e clientes.' },
      { icone: '👤', titulo: 'Complete seu perfil', texto: 'Clique em "Perfil" no menu lateral e adicione seu nome, empresa, logo e assinatura. Esses dados aparecerão no PDF.' },
      { icone: '👥', titulo: 'Cadastre seus clientes', texto: 'Antes de criar orçamentos, cadastre seus clientes na seção "Clientes".' },
      { icone: '📄', titulo: 'Crie seu primeiro orçamento', texto: 'Clique em "Orçamentos" e depois em "Novo Orçamento". Você pode usar a IA para montar tudo automaticamente!' },
    ],
  },
  '/clientes': {
    titulo: '👥 Clientes',
    passos: [
      { icone: '➕', titulo: 'Cadastre seus clientes', texto: 'Clique em "Novo Cliente" para adicionar o nome, telefone, e-mail e endereço.' },
      { icone: '🔗', titulo: 'Clientes vinculados', texto: 'Cada orçamento precisa estar vinculado a um cliente. Cadastre antes de criar orçamentos.' },
      { icone: '🔍', titulo: 'Busca rápida', texto: 'Use a barra de busca para encontrar clientes pelo nome.' },
    ],
  },
  '/orcamentos': {
    titulo: '📄 Orçamentos',
    passos: [
      { icone: '🤖', titulo: 'Use a IA!', texto: 'Descreva o serviço no campo da IA e ela monta o orçamento com materiais e mão de obra automaticamente.' },
      { icone: '📝', titulo: 'Adicione itens manualmente', texto: 'Você também pode adicionar itens manualmente. Digite no campo de descrição para ver sugestões automáticas.' },
      { icone: '📄', titulo: 'Gere o PDF', texto: 'Depois de salvar, clique em "Gerar PDF" para baixar o orçamento profissional com seu logo e dados.' },
      { icone: '📊', titulo: 'Controle o status', texto: 'Mude o status do orçamento para Enviado, Aprovado ou Recusado usando o menu de ações (⋮).' },
    ],
  },
  '/perfil': {
    titulo: '👤 Perfil',
    passos: [
      { icone: '🏢', titulo: 'Dados da empresa', texto: 'Preencha seu nome, empresa, telefone, e-mail e CPF/CNPJ. Esses dados aparecem no cabeçalho do PDF.' },
      { icone: '🖼️', titulo: 'Adicione seu logo', texto: 'Faça upload do logo da sua empresa. Ele aparecerá no canto superior direito do PDF.' },
      { icone: '✍️', titulo: 'Assinatura digital', texto: 'Adicione sua assinatura. Ela aparecerá no rodapé do orçamento como linha de assinatura.' },
      { icone: '🎨', titulo: 'Cor do orçamento', texto: 'Escolha uma cor para personalizar o visual do seu PDF.' },
    ],
  },
}

interface GuiaProps {
  rota: string
}

export default function Guia({ rota }: GuiaProps) {
  const [visivel, setVisivel] = useState(false)
  const [passo, setPasso]     = useState(0)

  const guia = GUIAS[rota]

  useEffect(() => {
    if (!guia) return

    // Verifica se é primeiro acesso geral
    const primeiroAcesso = localStorage.getItem('primeiro_acesso') === 'true'

    // Verifica se já mostrou o guia desta rota
    const jaViu = localStorage.getItem(`guia_visto_${rota}`)

    if (primeiroAcesso || !jaViu) {
      // Pequeno delay para não aparecer junto com o carregamento da página
      const timer = setTimeout(() => {
        setPasso(0)
        setVisivel(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [rota])

  const fechar = () => {
    setVisivel(false)
    localStorage.setItem(`guia_visto_${rota}`, 'true')
    // Remove flag de primeiro acesso após ver o dashboard
    if (rota === '/') {
      localStorage.removeItem('primeiro_acesso')
    }
  }

  const avancar = () => {
    if (!guia) return
    if (passo < guia.passos.length - 1) {
      setPasso(p => p + 1)
    } else {
      fechar()
    }
  }

  const voltar = () => {
    if (passo > 0) setPasso(p => p - 1)
  }

  if (!visivel || !guia) return null

  const passoAtual = guia.passos[passo]
  const ultimo = passo === guia.passos.length - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-5 py-4 flex items-center justify-between">
          <p className="text-white font-bold text-sm">{guia.titulo}</p>
          <button onClick={fechar} className="text-blue-200 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-6">
          <div className="text-4xl mb-3 text-center">{passoAtual.icone}</div>
          <h3 className="text-base font-bold text-gray-900 text-center mb-2">{passoAtual.titulo}</h3>
          <p className="text-sm text-gray-500 text-center leading-relaxed">{passoAtual.texto}</p>
        </div>

        {/* Indicador de passos */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {guia.passos.map((_, i) => (
            <div key={i}
              className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button onClick={voltar} disabled={passo === 0}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors">
            <ChevronLeft size={16} /> Anterior
          </button>

          <button onClick={fechar}
            className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
            Pular guia
          </button>

          <button onClick={avancar}
            className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            {ultimo ? 'Entendido! ✅' : <>Próximo <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}