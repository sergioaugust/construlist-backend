import Guia from '../components/Guia'
import { useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Search, Phone, Mail, MapPin, User, X, Loader2 } from 'lucide-react'
import api from '../services/api'

interface Cliente {
  id: number; nome: string; telefone: string; email: string; cpf_cnpj: string
  cep: string; endereco: string; numero: string; complemento: string
  bairro: string; cidade: string; estado: string; criado_em: string
}
interface FormData {
  nome: string; telefone: string; email: string; cpf_cnpj: string
  cep: string; endereco: string; numero: string; complemento: string
  bairro: string; cidade: string; estado: string
}
interface IBGEMunicipio { id: number; nome: string }

const ESTADOS = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' }, { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' },
]

const FORM_INITIAL: FormData = {
  nome: '', telefone: '', email: '', cpf_cnpj: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
}

const fmtTel = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}
const fmtCEP = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '')
}
const fmtCPFCNPJ = (v: string) => {
  const d = v.replace(/\D/g, '')
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/[.-]$/, '')
  return d.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/[./-]$/, '')
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, required, error, children, className = '' }: { label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm text-gray-800 bg-white transition-all outline-none
   focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-gray-300
   ${err ? 'border-red-400 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'}`

export default function Clientes() {
  const { pathname } = useLocation()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<FormData>(FORM_INITIAL)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [salvando, setSalvando] = useState(false)
  const [cidades, setCidades] = useState<string[]>([])
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [loadingCEP, setLoadingCEP] = useState(false)

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/clientes/')
      setClientes(data)
    } catch { console.error('Erro ao carregar clientes') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  useEffect(() => {
    if (!form.estado) { setCidades([]); return }
    setLoadingCidades(true); setCidades([]); setForm(f => ({ ...f, cidade: '' }))
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: IBGEMunicipio[]) => setCidades(data.map(m => m.nome.toUpperCase())))
      .catch(() => setCidades([]))
      .finally(() => setLoadingCidades(false))
  }, [form.estado])

  const buscarCEP = async (cep: string) => {
    const raw = cep.replace(/\D/g, '')
    if (raw.length !== 8) return
    setLoadingCEP(true)
    try {
      const r = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const data = await r.json()
      if (!data.erro) {
        const estadoEncontrado = ESTADOS.find(e => e.sigla === data.uf)
        setForm(f => ({ ...f, endereco: data.logradouro?.toUpperCase() || f.endereco, bairro: data.bairro?.toUpperCase() || f.bairro, estado: estadoEncontrado?.sigla || f.estado }))
        if (estadoEncontrado) setTimeout(() => setForm(f => ({ ...f, cidade: data.localidade?.toUpperCase() || '' })), 800)
      }
    } catch { console.error('Erro ao buscar CEP') }
    finally { setLoadingCEP(false) }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = (): boolean => {
    const e: Partial<FormData> = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'E-mail inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const openModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditando(cliente)
      setForm({ nome: cliente.nome || '', telefone: cliente.telefone || '', email: cliente.email || '', cpf_cnpj: cliente.cpf_cnpj || '', cep: cliente.cep || '', endereco: cliente.endereco || '', numero: cliente.numero || '', complemento: cliente.complemento || '', bairro: cliente.bairro || '', cidade: cliente.cidade || '', estado: cliente.estado || '' })
    } else { setEditando(null); setForm(FORM_INITIAL) }
    setErrors({}); setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditando(null); setForm(FORM_INITIAL); setErrors({}) }

  const salvar = async () => {
    if (!validate()) return
    setSalvando(true)
    try {
      if (editando) await api.patch(`/api/clientes/${editando.id}/`, form)
      else await api.post('/api/clientes/', form)
      await fetchClientes(); closeModal()
    } catch (err) { console.error('Erro ao salvar cliente', err) }
    finally { setSalvando(false) }
  }

  const deletar = async (id: number) => {
    if (!confirm('Remover este cliente?')) return
    await api.delete(`/api/clientes/${id}/`)
    fetchClientes()
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.email?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <>
      <Guia rota={pathname} />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md">
            <Plus size={16} /> Novo Cliente
          </button>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por nome, e-mail ou cidade..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 size={24} className="animate-spin mr-2" /> Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <User size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Cliente" para começar</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtrados.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all flex items-center gap-4 group">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {c.nome?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.nome}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                    {c.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={11} /> {c.email}</span>}
                    {c.telefone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={11} /> {c.telefone}</span>}
                    {(c.cidade || c.estado) && <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={11} /> {[c.cidade, c.estado].filter(Boolean).join(' - ')}</span>}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(c)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-all">Editar</button>
                  <button onClick={() => deletar(c.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-all">Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <Modal title={editando ? 'Editar Cliente' : 'Novo Cliente'} onClose={closeModal}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><User size={12} /> Dados Pessoais</p>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Nome completo / Razão social" required error={errors.nome}>
                    <input autoFocus type="text" placeholder="Ex: João da Silva" value={form.nome} onChange={e => handleChange('nome', e.target.value)} className={inputCls(errors.nome)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Telefone / WhatsApp" error={errors.telefone}>
                      <input type="text" placeholder="(69) 99999-9999" value={form.telefone} onChange={e => handleChange('telefone', fmtTel(e.target.value))} className={inputCls(errors.telefone)} />
                    </Field>
                    <Field label="E-mail" error={errors.email}>
                      <input type="email" placeholder="joao@email.com" value={form.email} onChange={e => handleChange('email', e.target.value)} className={inputCls(errors.email)} />
                    </Field>
                  </div>
                  <Field label="CPF / CNPJ" error={errors.cpf_cnpj}>
                    <input type="text" placeholder="000.000.000-00" value={form.cpf_cnpj} onChange={e => handleChange('cpf_cnpj', fmtCPFCNPJ(e.target.value))} className={inputCls(errors.cpf_cnpj)} />
                  </Field>
                </div>
              </div>
              <div className="border-t border-gray-100" />
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><MapPin size={12} /> Endereço</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CEP" error={errors.cep}>
                      <div className="relative">
                        <input type="text" placeholder="00000-000" value={form.cep} onChange={e => { const f = fmtCEP(e.target.value); handleChange('cep', f); if (f.replace(/\D/g, '').length === 8) buscarCEP(f) }} className={inputCls(errors.cep)} />
                        {loadingCEP && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                      </div>
                    </Field>
                    <Field label="Bairro">
                      <input type="text" placeholder="Bairro" value={form.bairro} onChange={e => handleChange('bairro', e.target.value.toUpperCase())} className={inputCls()} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Logradouro" className="col-span-2">
                      <input type="text" placeholder="Rua, Av..." value={form.endereco} onChange={e => handleChange('endereco', e.target.value.toUpperCase())} className={inputCls()} />
                    </Field>
                    <Field label="Número">
                      <input type="text" placeholder="Nº" value={form.numero} onChange={e => handleChange('numero', e.target.value)} className={inputCls()} />
                    </Field>
                  </div>
                  <Field label="Complemento">
                    <input type="text" placeholder="Apto, sala..." value={form.complemento} onChange={e => handleChange('complemento', e.target.value.toUpperCase())} className={inputCls()} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Estado">
                      <select value={form.estado} onChange={e => handleChange('estado', e.target.value)} className={inputCls() + ' cursor-pointer'}>
                        <option value="">Selecione o estado</option>
                        {ESTADOS.map(e => <option key={e.sigla} value={e.sigla}>{e.sigla} — {e.nome}</option>)}
                      </select>
                    </Field>
                    <Field label="Cidade">
                      <div className="relative">
                        <select value={form.cidade} onChange={e => handleChange('cidade', e.target.value)} disabled={!form.estado || loadingCidades} className={`${inputCls()} cursor-pointer disabled:opacity-50`}>
                          <option value="">{loadingCidades ? 'Carregando...' : !form.estado ? 'Selecione o estado' : 'Selecione a cidade'}</option>
                          {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {loadingCidades && <Loader2 size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-blue-500 animate-spin pointer-events-none" />}
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                {salvando && <Loader2 size={14} className="animate-spin" />}
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar cliente'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </>
  )
}