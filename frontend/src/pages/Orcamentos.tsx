import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, MoreVertical, Eye, Send, CheckCircle, XCircle,
  FileText, Trash2, X, Loader2, Sparkles, ChevronRight,
  AlertTriangle, Package, Hammer, Info
} from 'lucide-react'
import api from '../services/api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cliente { id: number; nome: string }
interface Item {
  id?: number
  tipo: 'material' | 'mao_de_obra'
  descricao: string
  unidade: string
  quantidade: number | string
  valor_unitario: number | string
  subtotal?: number
}
interface ItemForm extends Item { _key: string }
interface Orcamento {
  id: number
  titulo: string
  status: string
  cliente: number
  cliente_nome: string
  total_geral: number
  criado_em: string
  validade_dias: number
  descricao?: string
  condicoes_pagamento?: string
  observacoes?: string
  itens?: Item[]
}
interface IAItem {
  descricao: string
  unidade: string
  quantidade: number
  valor_unitario: number
}
interface IAResponse {
  materiais: IAItem[]
  mao_de_obra: IAItem[]
  observacao?: string
  erro?: boolean
}

// ── Sugestões de itens comuns ─────────────────────────────────────────────────
const SUGESTOES_ITENS = [
  { descricao: 'Tinta Suvinil (18L)', unidade: 'lata', valor_unitario: 280, tipo: 'material' },
  { descricao: 'Tinta acrílica premium', unidade: 'L', valor_unitario: 45, tipo: 'material' },
  { descricao: 'Massa corrida acrílica', unidade: 'kg', valor_unitario: 12, tipo: 'material' },
  { descricao: 'Rolo de pintura (lã)', unidade: 'un', valor_unitario: 25, tipo: 'material' },
  { descricao: 'Pincel/trincha', unidade: 'un', valor_unitario: 15, tipo: 'material' },
  { descricao: 'Lixa para parede', unidade: 'un', valor_unitario: 8, tipo: 'material' },
  { descricao: 'Fita crepe', unidade: 'un', valor_unitario: 6, tipo: 'material' },
  { descricao: 'Lona plástica de proteção', unidade: 'm²', valor_unitario: 3, tipo: 'material' },
  { descricao: 'Cimento CP-II', unidade: 'sc 50kg', valor_unitario: 38, tipo: 'material' },
  { descricao: 'Areia média lavada', unidade: 'm³', valor_unitario: 120, tipo: 'material' },
  { descricao: 'Brita 1', unidade: 'm³', valor_unitario: 140, tipo: 'material' },
  { descricao: 'Tijolo cerâmico 6 furos', unidade: 'un', valor_unitario: 1.2, tipo: 'material' },
  { descricao: 'Piso porcelanato 60x60', unidade: 'm²', valor_unitario: 85, tipo: 'material' },
  { descricao: 'Rejunte', unidade: 'kg', valor_unitario: 12, tipo: 'material' },
  { descricao: 'Cola para piso (ACIII)', unidade: 'sc 20kg', valor_unitario: 55, tipo: 'material' },
  { descricao: 'Gesso em pó', unidade: 'sc 40kg', valor_unitario: 28, tipo: 'material' },
  { descricao: 'Drywall 12,5mm', unidade: 'chapa', valor_unitario: 42, tipo: 'material' },
  { descricao: 'Perfil metálico drywall', unidade: 'm', valor_unitario: 8, tipo: 'material' },
  { descricao: 'Mão de obra — preparação e pintura', unidade: 'm²', valor_unitario: 28, tipo: 'mao_de_obra' },
  { descricao: 'Mão de obra — assentamento de piso', unidade: 'm²', valor_unitario: 45, tipo: 'mao_de_obra' },
  { descricao: 'Mão de obra — reboco/emboço', unidade: 'm²', valor_unitario: 35, tipo: 'mao_de_obra' },
  { descricao: 'Mão de obra — alvenaria', unidade: 'm²', valor_unitario: 50, tipo: 'mao_de_obra' },
  { descricao: 'Mão de obra — instalação elétrica', unidade: 'pt', valor_unitario: 120, tipo: 'mao_de_obra' },
  { descricao: 'Mão de obra — instalação hidráulica', unidade: 'pt', valor_unitario: 150, tipo: 'mao_de_obra' },
  { descricao: 'Mão de obra — gesso liso', unidade: 'm²', valor_unitario: 30, tipo: 'mao_de_obra' },
  { descricao: 'Mão de obra — drywall', unidade: 'm²', valor_unitario: 55, tipo: 'mao_de_obra' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2)
const fmt = (v: number) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const calcSub = (i: ItemForm) =>
  (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0)

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#6b7280', bg: '#f3f4f6' },
  enviado:  { label: 'Enviado',  color: '#d97706', bg: '#fef3c7' },
  aprovado: { label: 'Aprovado', color: '#059669', bg: '#d1fae5' },
  recusado: { label: 'Recusado', color: '#dc2626', bg: '#fee2e2' },
}

const newItem = (tipo: 'material' | 'mao_de_obra' = 'material'): ItemForm => ({
  _key: uid(), tipo, descricao: '', unidade: 'un', quantidade: 1, valor_unitario: 0,
})

const iaItemToForm = (item: IAItem, tipo: 'material' | 'mao_de_obra'): ItemForm => ({
  _key: uid(),
  tipo,
  descricao: item.descricao || '',
  unidade: item.unidade || 'un',
  quantidade: Number(item.quantidade) || 1,
  valor_unitario: Number(item.valor_unitario) || 0,
})

// ── ESC + click-outside hook ──────────────────────────────────────────────────
function useModal(onClose: () => void) {
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }
  return { overlayRef, handleOverlay }
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.rascunho
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: c.color, backgroundColor: c.bg }}>
      {c.label}
    </span>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ msg, sub, onConfirm, onCancel, danger = false }:
  { msg: string; sub?: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  const { overlayRef, handleOverlay } = useModal(onCancel)
  return (
    <div ref={overlayRef} onClick={handleOverlay}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{msg}</p>
            {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
            Não, continuar
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all
              ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
            Sim, cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Item Row ──────────────────────────────────────────────────────────────────
function ItemRow({ item, onChange, onRemove }:
  { item: ItemForm; onChange: (k: string, f: keyof ItemForm, v: string) => void; onRemove: (k: string) => void }) {
  const [sugs, setSugs] = useState<typeof SUGESTOES_ITENS>([])
  const [showSugs, setShowSugs] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (item.descricao.length < 2) { setSugs([]); setShowSugs(false); return }
    const q = item.descricao.toLowerCase()
    const found = SUGESTOES_ITENS.filter(s => s.descricao.toLowerCase().includes(q)).slice(0, 5)
    setSugs(found)
    setShowSugs(found.length > 0)
  }, [item.descricao])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSugs(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const pickSug = (s: typeof SUGESTOES_ITENS[0]) => {
    onChange(item._key, 'descricao', s.descricao)
    onChange(item._key, 'unidade', s.unidade)
    onChange(item._key, 'valor_unitario', String(s.valor_unitario))
    onChange(item._key, 'tipo', s.tipo as 'material' | 'mao_de_obra')
    setShowSugs(false)
  }

  const sub = calcSub(item)

  return (
    <div className="grid grid-cols-[1fr_90px_80px_110px_90px_32px] gap-2 items-center">
      <div ref={wrapRef} className="relative">
        <input
          type="text"
          placeholder="Descrição do item..."
          value={item.descricao}
          onChange={e => onChange(item._key, 'descricao', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
        />
        {showSugs && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
            {sugs.map(s => (
              <button key={s.descricao} onClick={() => pickSug(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors">
                <span className="text-gray-800 font-medium">{s.descricao}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                  {s.unidade} · {fmt(s.valor_unitario)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input type="text" placeholder="un" value={item.unidade}
        onChange={e => onChange(item._key, 'unidade', e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />

      <input type="number" min="0" step="0.01" value={item.quantidade}
        onChange={e => onChange(item._key, 'quantidade', e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />

      <input type="number" min="0" step="0.01" placeholder="0,00" value={item.valor_unitario}
        onChange={e => onChange(item._key, 'valor_unitario', e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />

      <div className="text-sm font-semibold text-gray-700 text-right pr-1">{fmt(sub)}</div>

      <button onClick={() => onRemove(item._key)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── NOVO ORÇAMENTO MODAL ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
interface NovoOrcamentoModalProps {
  clientes: Cliente[]
  onClose: () => void
  onSaved: () => void
}
function NovoOrcamentoModal({ clientes, onClose, onSaved }: NovoOrcamentoModalProps) {
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [condicoesPagamento, setCondicoesPagamento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [validade, setValidade] = useState('')
  const [materiais, setMateriais] = useState<ItemForm[]>([newItem('material')])
  const [maoDeObra, setMaoDeObra] = useState<ItemForm[]>([newItem('mao_de_obra')])
  const [iaPrompt, setIaPrompt] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [iaObservacao, setIaObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)

  const hasContent = titulo || materiais.some(i => i.descricao) || maoDeObra.some(i => i.descricao)
  const handleClose = useCallback(() => {
    if (hasContent) setShowCancelConfirm(true)
    else onClose()
  }, [hasContent, onClose])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleClose])

  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) handleClose()
  }

  const changeItem = (list: ItemForm[], setList: (v: ItemForm[]) => void) =>
    (key: string, field: keyof ItemForm, value: string) =>
      setList(list.map(i => i._key === key ? { ...i, [field]: value } : i))

  const addItem = (tipo: 'material' | 'mao_de_obra') => {
    if (tipo === 'material') setMateriais(p => [...p, newItem('material')])
    else setMaoDeObra(p => [...p, newItem('mao_de_obra')])
  }

  const removeItem = (tipo: 'material' | 'mao_de_obra', key: string) => {
    if (tipo === 'material') setMateriais(p => p.filter(i => i._key !== key))
    else setMaoDeObra(p => p.filter(i => i._key !== key))
  }

  const totalMat = materiais.reduce((s, i) => s + calcSub(i), 0)
  const totalMao = maoDeObra.reduce((s, i) => s + calcSub(i), 0)
  const totalGeral = totalMat + totalMao

  // ── IA — agora recebe JSON estruturado ─────────────────────────────────────
  const gerarIA = async () => {
    if (!iaPrompt.trim()) return
    setIaLoading(true)
    setIaObservacao('')
    try {
      const resp = await fetch('http://localhost:8000/ia/gerar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: iaPrompt }),
      })
      const data: IAResponse = await resp.json()

      if (data.materiais && data.materiais.length > 0) {
        setMateriais(data.materiais.map(i => iaItemToForm(i, 'material')))
      }

      if (data.mao_de_obra && data.mao_de_obra.length > 0) {
        setMaoDeObra(data.mao_de_obra.map(i => iaItemToForm(i, 'mao_de_obra')))
      }

      if (data.observacao) {
        setIaObservacao(data.observacao)
      }

      if (!titulo && iaPrompt.length < 80) setTitulo(iaPrompt)
    } catch (e) {
      console.error('Erro IA', e)
      setIaObservacao('Erro ao conectar com a IA. Verifique se o servidor está rodando.')
    } finally {
      setIaLoading(false)
    }
  }

  const salvar = async () => {
    const e: Record<string, string> = {}
    if (!titulo.trim()) e.titulo = 'Informe o título'
    if (!clienteId) e.cliente = 'Selecione um cliente'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSalvando(true)
    try {
      const payload = {
        titulo,
        cliente: Number(clienteId),
        descricao,
        condicoes_pagamento: condicoesPagamento,
        observacoes,
        status: 'rascunho',
        validade_dias: validade ? Math.ceil((new Date(validade).getTime() - Date.now()) / 86400000) : 15,
      }
      const { data: orc } = await api.post('/api/orcamentos/', payload)

      const todosItens = [
        ...materiais.filter(i => i.descricao.trim()),
        ...maoDeObra.filter(i => i.descricao.trim()),
      ]
      await Promise.all(todosItens.map(item =>
        api.post('/api/itens/', {
          orcamento: orc.id,
          tipo: item.tipo,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
        })
      ))
      onSaved()
    } catch (err) {
      console.error('Erro ao salvar', err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <div ref={overlayRef} onClick={handleOverlay}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 flex flex-col">

          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Novo Orçamento</h2>
              <p className="text-xs text-gray-400 mt-0.5">Preencha os dados do orçamento</p>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">

            {/* Bloco 1: Cliente */}
            <section className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Cliente</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    Selecionar Cliente <span className="text-red-500">*</span>
                  </label>
                  <select value={clienteId} onChange={e => { setClienteId(e.target.value); setErrors(p => ({ ...p, cliente: '' })) }}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer
                      ${errors.cliente ? 'border-red-400' : 'border-gray-200'}`}>
                    <option value="">Escolha um cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {errors.cliente && <p className="text-xs text-red-500 mt-1">{errors.cliente}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                    Título do Orçamento <span className="text-red-500">*</span>
                  </label>
                  <input type="text" placeholder="Ex: Reforma de banheiro" value={titulo}
                    onChange={e => { setTitulo(e.target.value); setErrors(p => ({ ...p, titulo: '' })) }}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                      ${errors.titulo ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo}</p>}
                </div>
              </div>
            </section>

            {/* Bloco 2: IA */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Sparkles size={12} /> Assistente IA de Orçamento
              </p>
              <p className="text-xs text-blue-500/80 mb-3">Descreva o serviço — a IA monta o orçamento com materiais, mão de obra e preços de referência.</p>
              <textarea
                rows={2}
                placeholder='Ex: "Reforma de banheiro 4m², troca de piso porcelanato, reboco e pintura, instalação de box blindex"'
                value={iaPrompt}
                onChange={e => setIaPrompt(e.target.value)}
                className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none mb-3"
              />
              <button onClick={gerarIA} disabled={iaLoading || !iaPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-all">
                {iaLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {iaLoading ? 'Gerando orçamento com IA...' : 'Gerar Orçamento com IA'}
              </button>

              {/* Observação da IA */}
              {iaObservacao && (
                <div className="mt-3 flex items-start gap-2.5 bg-white/70 border border-blue-200 rounded-xl px-3.5 py-3">
                  <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-700 mb-0.5">Observações da IA</p>
                    <p className="text-xs text-blue-800/80 leading-relaxed">{iaObservacao}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Bloco 3: Descrição */}
            <section>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Descrição do Serviço</p>
              <textarea rows={2} placeholder="Descreva detalhadamente o serviço a ser realizado..."
                value={descricao} onChange={e => setDescricao(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
            </section>

            {/* Bloco 4: Itens */}
            <section>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Itens do Orçamento</p>

              <div className="grid grid-cols-[1fr_90px_80px_110px_90px_32px] gap-2 mb-2 px-1">
                {['Descrição', 'Unidade', 'Qtd.', 'Valor Unit.', 'Total', ''].map(h => (
                  <div key={h} className="text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</div>
                ))}
              </div>

              {/* Materiais */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={13} className="text-blue-500" />
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Materiais / Itens</span>
                </div>
                <div className="space-y-2">
                  {materiais.map(item => (
                    <ItemRow key={item._key} item={item}
                      onChange={changeItem(materiais, setMateriais)}
                      onRemove={k => removeItem('material', k)} />
                  ))}
                </div>
                <button onClick={() => addItem('material')}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
                  <Plus size={13} /> Adicionar material
                </button>
                <div className="text-xs text-gray-500 text-right mt-1">
                  Subtotal Materiais: <span className="font-semibold text-gray-700">{fmt(totalMat)}</span>
                </div>
              </div>

              {/* Mão de Obra */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Hammer size={13} className="text-orange-500" />
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Mão de Obra</span>
                </div>
                <div className="space-y-2">
                  {maoDeObra.map(item => (
                    <ItemRow key={item._key} item={item}
                      onChange={changeItem(maoDeObra, setMaoDeObra)}
                      onRemove={k => removeItem('mao_de_obra', k)} />
                  ))}
                </div>
                <button onClick={() => addItem('mao_de_obra')}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-all">
                  <Plus size={13} /> Adicionar mão de obra
                </button>
                <div className="text-xs text-gray-500 text-right mt-1">
                  Subtotal Mão de Obra: <span className="font-semibold text-gray-700">{fmt(totalMao)}</span>
                </div>
              </div>

              {/* Total Geral */}
              <div className="flex justify-end mt-4">
                <div className="bg-gray-900 text-white rounded-xl px-5 py-3 flex items-center gap-4">
                  <span className="text-sm font-semibold opacity-80">Total Geral</span>
                  <span className="text-xl font-bold text-blue-300">{fmt(totalGeral)}</span>
                </div>
              </div>
            </section>

            {/* Bloco 5: Detalhes */}
            <section className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Detalhes</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Validade do Orçamento</label>
                  <input type="date" value={validade} onChange={e => setValidade(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Condições de Pagamento</label>
                  <input type="text" placeholder="Ex: 50% no ato, 50% na entrega..." value={condicoesPagamento}
                    onChange={e => setCondicoesPagamento(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Observações</label>
                <textarea rows={2} placeholder="Informações adicionais..." value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
              </div>
            </section>

          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
            <button onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
              {salvando && <Loader2 size={14} className="animate-spin" />}
              {salvando ? 'Salvando...' : 'Criar Orçamento'}
            </button>
          </div>
        </div>
      </div>

      {showCancelConfirm && (
        <ConfirmModal
          msg="Deseja cancelar o orçamento?"
          sub="Todos os dados preenchidos serão perdidos. Orçamentos cancelados não são salvos como rascunho."
          onConfirm={() => { setShowCancelConfirm(false); onClose() }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── DETALHE ORÇAMENTO ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function DetalheOrcamento({ orc, onBack }: { orc: Orcamento; onBack: () => void; onUpdate: () => void }) {
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/itens/?orcamento=${orc.id}`)
      .then(r => setItens(r.data))
      .finally(() => setLoading(false))
  }, [orc.id])

  const gerarPDF = () => {
    window.open(`http://localhost:8000/api/orcamentos/${orc.id}/gerar_pdf/`, '_blank')
  }

  const materiais = itens.filter(i => i.tipo === 'material')
  const maoDeObra = itens.filter(i => i.tipo === 'mao_de_obra')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ChevronRight size={15} className="rotate-180" /> Voltar aos orçamentos
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold text-gray-400">#{orc.id}</span>
            <StatusBadge status={orc.status} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{orc.titulo}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orc.cliente_nome}</p>
        </div>
        <button onClick={gerarPDF}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
          <FileText size={15} /> Gerar PDF
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : (
        <>
          {materiais.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
                <Package size={14} className="text-blue-500" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Materiais / Itens</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left px-5 py-2.5">Descrição</th>
                    <th className="text-center px-3 py-2.5">Unid.</th>
                    <th className="text-center px-3 py-2.5">Qtd.</th>
                    <th className="text-right px-3 py-2.5">Unit.</th>
                    <th className="text-right px-5 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {materiais.map((item, i) => (
                    <tr key={i} className={`text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-5 py-3 text-gray-800">{item.descricao}</td>
                      <td className="px-3 py-3 text-center text-gray-500">{item.unidade}</td>
                      <td className="px-3 py-3 text-center text-gray-500">{item.quantidade}</td>
                      <td className="px-3 py-3 text-right text-gray-500">{fmt(Number(item.valor_unitario))}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-700">{fmt(Number(item.subtotal || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {maoDeObra.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-orange-50 border-b border-orange-100">
                <Hammer size={14} className="text-orange-500" />
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Mão de Obra</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left px-5 py-2.5">Descrição</th>
                    <th className="text-center px-3 py-2.5">Unid.</th>
                    <th className="text-center px-3 py-2.5">Qtd.</th>
                    <th className="text-right px-3 py-2.5">Unit.</th>
                    <th className="text-right px-5 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {maoDeObra.map((item, i) => (
                    <tr key={i} className={`text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}>
                      <td className="px-5 py-3 text-gray-800">{item.descricao}</td>
                      <td className="px-3 py-3 text-center text-gray-500">{item.unidade}</td>
                      <td className="px-3 py-3 text-center text-gray-500">{item.quantidade}</td>
                      <td className="px-3 py-3 text-right text-gray-500">{fmt(Number(item.valor_unitario))}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-700">{fmt(Number(item.subtotal || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <div className="bg-gray-900 text-white rounded-xl px-6 py-4 flex items-center gap-6">
              <span className="text-sm font-semibold opacity-70">Total Geral</span>
              <span className="text-2xl font-bold text-blue-300">{fmt(orc.total_geral)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [showNovo, setShowNovo] = useState(false)
  const [detalhe, setDetalhe] = useState<Orcamento | null>(null)
  const [menu, setMenu] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [orc, cli] = await Promise.all([
        api.get('/api/orcamentos/'),
        api.get('/api/clientes/'),
      ])
      setOrcamentos(orc.data)
      setClientes(cli.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const changeStatus = async (id: number, status: string) => {
    await api.patch(`/api/orcamentos/${id}/`, { status })
    setMenu(null)
    fetchAll()
  }

  const deletar = async (id: number) => {
    await api.delete(`/api/orcamentos/${id}/`)
    setConfirmDelete(null)
    fetchAll()
  }

  const gerarPDF = (id: number) => {
    window.open(`http://localhost:8000/api/orcamentos/${id}/gerar_pdf/`, '_blank')
    setMenu(null)
  }

  const filtrados = orcamentos.filter(o =>
    o.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
    o.cliente_nome?.toLowerCase().includes(busca.toLowerCase())
  )

  if (detalhe) {
    return <DetalheOrcamento orc={detalhe} onBack={() => setDetalhe(null)} onUpdate={fetchAll} />
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowNovo(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar por título ou cliente..."
          value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum orçamento encontrado</p>
          <p className="text-sm mt-1">Clique em "Novo Orçamento" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(orc => (
            <div key={orc.id}
              className="bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:shadow-md transition-all flex items-center gap-4 group">

              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                #{orc.id}
              </div>

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetalhe(orc)}>
                <p className="font-semibold text-gray-900 truncate">{orc.titulo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {orc.cliente_nome} · {new Date(orc.criado_em).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge status={orc.status} />
                <span className="text-sm font-bold text-gray-800 min-w-[80px] text-right">
                  {fmt(orc.total_geral)}
                </span>

                <div className="relative" ref={menu === orc.id ? menuRef : undefined}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenu(menu === orc.id ? null : orc.id) }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                    <MoreVertical size={16} />
                  </button>

                  {menu === orc.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-1.5 w-52 overflow-hidden">

                      <button onClick={() => { setDetalhe(orc); setMenu(null) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Eye size={15} className="text-gray-400" /> Ver detalhes
                      </button>

                      <div className="h-px bg-gray-100 mx-3 my-1" />

                      {orc.status !== 'enviado' && orc.status !== 'aprovado' && (
                        <button onClick={() => changeStatus(orc.id, 'enviado')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors">
                          <Send size={15} className="text-amber-500" /> Marcar como Enviado
                        </button>
                      )}

                      {orc.status !== 'aprovado' && (
                        <button onClick={() => changeStatus(orc.id, 'aprovado')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors">
                          <CheckCircle size={15} className="text-green-500" /> Aprovar
                        </button>
                      )}

                      {orc.status !== 'recusado' && (
                        <button onClick={() => changeStatus(orc.id, 'recusado')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors">
                          <XCircle size={15} className="text-red-500" /> Recusar
                        </button>
                      )}

                      <button onClick={() => { gerarPDF(orc.id) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 transition-colors">
                        <FileText size={15} className="text-blue-500" /> Gerar PDF
                      </button>

                      <div className="h-px bg-gray-100 mx-3 my-1" />

                      <button onClick={() => { setConfirmDelete(orc.id); setMenu(null) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={15} className="text-red-500" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNovo && (
        <NovoOrcamentoModal
          clientes={clientes}
          onClose={() => setShowNovo(false)}
          onSaved={() => { setShowNovo(false); fetchAll() }}
        />
      )}

      {confirmDelete !== null && (
        <ConfirmModal
          msg="Excluir este orçamento?"
          sub="Esta ação não pode ser desfeita."
          danger
          onConfirm={() => deletar(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}