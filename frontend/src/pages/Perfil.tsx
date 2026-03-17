import Guia from '../components/Guia'
import { useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, Upload, X, Building2, User, Phone, Mail, FileText } from 'lucide-react'
import api from '../services/api'

interface PerfilData {
  id?: number; nome: string; empresa: string; email: string; telefone: string
  cpf_cnpj: string; endereco: string; logo: string; assinatura: string; cor_orcamento: string
}

const CORES = [
  { id: 'azul',         label: 'Azul',        hex: '#2563EB' },
  { id: 'verde',        label: 'Verde',        hex: '#16a34a' },
  { id: 'vermelho',     label: 'Vermelho',     hex: '#dc2626' },
  { id: 'amarelo',      label: 'Amarelo',      hex: '#ca8a04' },
  { id: 'cinza_chumbo', label: 'Cinza Chumbo', hex: '#4b5563' },
  { id: 'preto',        label: 'Preto',        hex: '#111827' },
]

function formatTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}
function formatCpfCnpj(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '')
  return d.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/-$/, '')
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Perfil() {
  const { pathname } = useLocation()
  const [perfil, setPerfil] = useState<PerfilData>({
    nome: '', empresa: '', email: '', telefone: '', cpf_cnpj: '', endereco: '', logo: '', assinatura: '', cor_orcamento: 'azul',
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const assinaturaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/api/perfil/').then(r => setPerfil(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const salvar = async () => {
    setSalvando(true)
    try {
      await api.patch('/api/perfil/', perfil)
      setSalvo(true); setTimeout(() => setSalvo(false), 3000)
    } catch (e) { console.error('Erro ao salvar perfil', e) }
    finally { setSalvando(false) }
  }

  const handleImageUpload = async (file: File, campo: 'logo' | 'assinatura') => {
    if (!file.type.startsWith('image/')) return
    const base64 = await fileToBase64(file)
    setPerfil(p => ({ ...p, [campo]: base64 }))
  }

  const handleDrop = (e: React.DragEvent, campo: 'logo' | 'assinatura') => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleImageUpload(file, campo)
  }

  const set = (campo: keyof PerfilData, valor: string) => setPerfil(p => ({ ...p, [campo]: valor }))

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400"><Loader2 size={24} className="animate-spin mr-2" /> Carregando perfil...</div>

  return (
    <>
      <Guia rota={pathname} />
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dados que aparecem nos orçamentos e no rodapé dos PDFs</p>
        </div>

        <div className="space-y-5">

          {/* Logo */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Logo da Empresa</p>
            {perfil.logo ? (
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={perfil.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                </div>
                <div>
                  <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-2 transition-colors"><Upload size={14} /> Alterar logo</button>
                  <p className="text-xs text-gray-400 mb-2">O logo aparecerá no cabeçalho dos PDFs</p>
                  <button onClick={() => set('logo', '')} className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"><X size={12} /> Remover logo</button>
                </div>
              </div>
            ) : (
              <div onClick={() => logoInputRef.current?.click()} onDrop={e => handleDrop(e, 'logo')} onDragOver={e => e.preventDefault()} className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500">Clique para adicionar o logo</p>
                <p className="text-xs text-gray-400 mt-0.5">PNG, JPG ou SVG — aparecerá no cabeçalho dos PDFs</p>
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'logo') }} />
          </div>

          {/* Assinatura */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Assinatura Digital</p>
            {perfil.assinatura ? (
              <div className="flex items-center gap-4">
                <div className="w-40 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={perfil.assinatura} alt="Assinatura" className="w-full h-full object-contain p-2" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-0.5">Sua assinatura digital</p>
                  <p className="text-xs text-gray-400 mb-2">Será incluída automaticamente nos PDFs</p>
                  <button onClick={() => assinaturaInputRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-1 transition-colors"><Upload size={14} /> Alterar assinatura</button>
                  <button onClick={() => set('assinatura', '')} className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"><X size={12} /> Remover assinatura</button>
                </div>
              </div>
            ) : (
              <div onClick={() => assinaturaInputRef.current?.click()} onDrop={e => handleDrop(e, 'assinatura')} onDragOver={e => e.preventDefault()} className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                <FileText size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500">Clique para adicionar sua assinatura</p>
                <p className="text-xs text-gray-400 mt-0.5">PNG ou JPG com fundo transparente ou branco</p>
              </div>
            )}
            <input ref={assinaturaInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'assinatura') }} />
          </div>

          {/* Cor */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cor do Orçamento</p>
            <p className="text-xs text-gray-400 mb-4">Escolha a cor dos detalhes do seu orçamento</p>
            <div className="flex items-center gap-3 flex-wrap">
              {CORES.map(cor => (
                <button key={cor.id} onClick={() => set('cor_orcamento', cor.id)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${perfil.cor_orcamento === cor.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                  <div className="w-9 h-9 rounded-full shadow-sm" style={{ backgroundColor: cor.hex, outline: perfil.cor_orcamento === cor.id ? `3px solid ${cor.hex}` : 'none', outlineOffset: '3px' }} />
                  <span className="text-xs font-medium text-gray-600">{cor.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dados */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Dados Pessoais / Empresa</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5 block"><User size={11} /> Nome</label>
                <input type="text" placeholder="Seu nome completo" value={perfil.nome} onChange={e => set('nome', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5 block"><Building2 size={11} /> Empresa</label>
                <input type="text" placeholder="Nome da empresa" value={perfil.empresa} onChange={e => set('empresa', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5 block"><Mail size={11} /> Email</label>
                <input type="email" placeholder="seu@email.com" value={perfil.email} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5 block"><Phone size={11} /> Telefone</label>
                <input type="text" placeholder="(69) 99999-9999" value={perfil.telefone} onChange={e => set('telefone', formatTelefone(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">CPF/CNPJ</label>
                <input type="text" placeholder="000.000.000-00" value={perfil.cpf_cnpj} onChange={e => set('cpf_cnpj', formatCpfCnpj(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Endereço Completo (com CEP)</label>
              <input type="text" placeholder="Rua, Nº, Bairro, Cidade/UF - CEP" value={perfil.endereco} onChange={e => set('endereco', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={salvar} disabled={salvando} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm ${salvo ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'}`}>
              {salvando ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : salvo ? <><Save size={15} /> Salvo com sucesso!</> : <><Save size={15} /> Salvar</>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}