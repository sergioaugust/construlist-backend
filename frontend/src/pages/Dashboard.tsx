import { useEffect, useState } from 'react'
import { FileText, Users, CheckCircle, Clock, TrendingUp, DollarSign } from 'lucide-react'
import api from '../services/api'

interface Orcamento {
  id: number
  titulo: string
  status: string
  total_geral: number
  criado_em: string
  cliente: number
  cliente_nome?: string
}

export default function Dashboard() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/orcamentos/')
      .then(res => {
        const data = res.data.results || res.data
        setOrcamentos(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const total = orcamentos.length
  const aprovados = orcamentos.filter(o => o.status === 'aprovado').length
  const pendentes = orcamentos.filter(o => o.status !== 'aprovado').length
  const clientes = new Set(orcamentos.map(o => o.cliente)).size

  const totalAprovado = orcamentos
    .filter(o => o.status === 'aprovado')
    .reduce((acc, o) => acc + Number(o.total_geral), 0)

  const totalPendente = orcamentos
    .filter(o => o.status !== 'aprovado')
    .reduce((acc, o) => acc + Number(o.total_geral), 0)

  const totalGeral = totalAprovado + totalPendente
  const progresso = totalGeral > 0 ? Math.round((totalAprovado / totalGeral) * 100) : 0

  function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, string> = {
      aprovado: 'bg-green-100 text-green-700',
      rascunho: 'bg-gray-100 text-gray-500',
      enviado: 'bg-blue-100 text-blue-700',
      recusado: 'bg-red-100 text-red-600',
    }
    const labels: Record<string, string> = {
      aprovado: 'Aprovado', rascunho: 'Rascunho',
      enviado: 'Enviado', recusado: 'Recusado',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg[status] || 'bg-gray-100 text-gray-500'}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm">Visão geral dos seus orçamentos</p>
      </div>

      {/* Cards superiores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Orçamentos', value: total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Aprovados', value: aprovados, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Clientes', value: clientes, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`${bg} p-2.5 rounded-lg`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-green-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">Total Aprovado</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            R$ {totalAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">Total Pendente</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Total Geral (Aprovado + Pendente)</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-700">Progresso de Aprovação</span>
          <span className="text-sm font-bold text-blue-600">{progresso}% aprovado</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>● Aprovado: R$ {totalAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span>Falta aprovar: R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Orçamentos recentes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Orçamentos Recentes</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {orcamentos.slice(0, 5).map(orc => (
            <div key={orc.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-8">#{orc.id}</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{orc.titulo}</p>
                  <p className="text-xs text-gray-400">
                    {orc.cliente_nome} • {new Date(orc.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={orc.status} />
                <span className="font-bold text-gray-700 text-sm">
                  R$ {Number(orc.total_geral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
          {orcamentos.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Nenhum orçamento criado ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}