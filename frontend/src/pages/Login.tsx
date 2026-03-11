import { useState } from 'react'
import { Loader2, Eye, EyeOff, HardHat, ArrowLeft, CheckCircle2 } from 'lucide-react'

interface LoginProps {
  onLogin: (token: string) => void
}

type Step = 'login' | 'forgot_email' | 'forgot_code' | 'forgot_newpass' | 'forgot_done'

export default function Login({ onLogin }: LoginProps) {
  const [step, setStep]         = useState<Step>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [forgotEmail, setForgotEmail]   = useState('')
  const [forgotCode, setForgotCode]     = useState('')
  const [newPassword, setNewPassword]   = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [showNew, setShowNew]           = useState(false)
  const [popupMsg, setPopupMsg]         = useState('')

  const showPopup = (msg: string) => {
    setPopupMsg(msg)
    setTimeout(() => setPopupMsg(''), 4000)
  }

  const handleLogin = async () => {
    setError('')
    if (!username || !password) { setError('Preencha usuário e senha.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.access) {
        localStorage.setItem('token', data.access)
        onLogin(data.access)
      } else {
        setError('Usuário ou senha incorretos.')
      }
    } catch {
      setError('Erro ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    setError('')
    if (!forgotEmail) { setError('Digite seu e-mail.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      if (res.ok) {
        showPopup('✅ Código enviado! Verifique seu e-mail.')
        setStep('forgot_code')
      } else {
        setError('E-mail não encontrado no sistema.')
      }
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setError('')
    if (!forgotCode) { setError('Digite o código recebido.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/password-reset/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode }),
      })
      if (res.ok) {
        setStep('forgot_newpass')
      } else {
        setError('Código inválido ou expirado.')
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleNewPassword = async () => {
    setError('')
    if (!newPassword || !newPassword2) { setError('Preencha os dois campos.'); return }
    if (newPassword !== newPassword2)  { setError('As senhas não coincidem.'); return }
    if (newPassword.length < 6)        { setError('Mínimo 6 caracteres.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, new_password: newPassword }),
      })
      if (res.ok) {
        setStep('forgot_done')
      } else {
        setError('Erro ao salvar senha.')
      }
    } catch {
      setError('Erro ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  const resetForgot = () => {
    setStep('login'); setForgotEmail(''); setForgotCode('')
    setNewPassword(''); setNewPassword2(''); setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">

      {/* Popup */}
      {popupMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          {popupMsg}
        </div>
      )}

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

        {/* Cabeçalho */}
        <div className="bg-blue-600 px-8 py-7 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <HardHat size={24} className="text-white" strokeWidth={2.5} />
            <span className="text-2xl font-black text-white tracking-tight">CONSTRULIST</span>
          </div>
          <p className="text-blue-100 text-sm">Sistema de Orçamentos</p>
        </div>

        <div className="px-8 py-7">

          {/* ── LOGIN ───────────────────────────────────────────────────────── */}
          {step === 'login' && (
            <div className="space-y-4">
              <p className="text-center text-sm font-semibold text-gray-600">Faça seu login</p>

              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Usuário</label>
                <input type="text" placeholder="seu_usuario" value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button onClick={handleLogin} disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Aguarde...</span>
                  : 'ENTRAR'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300">ou</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2">Ainda não é cliente?</p>
                <a href="https://wa.link/knslsm" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-green-500 text-green-600 text-sm font-bold rounded-xl hover:bg-green-50 transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Solicite uma demonstração
                </a>
              </div>

              <div className="text-center pt-1">
                <button onClick={() => { setStep('forgot_email'); setError('') }}
                  className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                  🔒 Esqueceu sua senha?
                </button>
              </div>
            </div>
          )}

          {/* ── RECUPERAR — email ────────────────────────────────────────────── */}
          {step === 'forgot_email' && (
            <div className="space-y-4">
              <button onClick={resetForgot} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
                <ArrowLeft size={13} /> Voltar ao login
              </button>
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">Recuperar senha</p>
                <p className="text-xs text-gray-400">Informe o e-mail da sua conta para receber o código.</p>
              </div>
              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">E-mail da conta</label>
                <input type="email" placeholder="seu@email.com" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <button onClick={handleSendCode} disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Enviando...</span> : 'ENVIAR CÓDIGO'}
              </button>
            </div>
          )}

          {/* ── RECUPERAR — código ───────────────────────────────────────────── */}
          {step === 'forgot_code' && (
            <div className="space-y-4">
              <button onClick={() => { setStep('forgot_email'); setError('') }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
                <ArrowLeft size={13} /> Voltar
              </button>
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">Digite o código</p>
                <p className="text-xs text-gray-400">Código enviado para <span className="font-semibold text-gray-600">{forgotEmail}</span></p>
              </div>
              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Código de verificação</label>
                <input type="text" placeholder="000000" maxLength={6} value={forgotCode}
                  onChange={e => setForgotCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-center tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <button onClick={handleVerifyCode} disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Verificando...</span> : 'VERIFICAR CÓDIGO'}
              </button>
              <div className="text-center">
                <button onClick={handleSendCode} className="text-xs text-blue-600 hover:underline">Reenviar código</button>
              </div>
            </div>
          )}

          {/* ── RECUPERAR — nova senha ───────────────────────────────────────── */}
          {step === 'forgot_newpass' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">Criar nova senha</p>
                <p className="text-xs text-gray-400">Escolha uma senha segura com pelo menos 6 caracteres.</p>
              </div>
              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nova senha</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} placeholder="••••••••" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
                  <button type="button" onClick={() => setShowNew(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirmar nova senha</label>
                <input type={showNew ? 'text' : 'password'} placeholder="••••••••" value={newPassword2}
                  onChange={e => setNewPassword2(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNewPassword()}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
              </div>
              <button onClick={handleNewPassword} disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Salvando...</span> : 'SALVAR NOVA SENHA'}
              </button>
            </div>
          )}

          {/* ── CONCLUÍDO ────────────────────────────────────────────────────── */}
          {step === 'forgot_done' && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 size={52} className="mx-auto text-green-500" />
              <div>
                <p className="text-sm font-bold text-gray-800">Senha atualizada!</p>
                <p className="text-xs text-gray-400 mt-1">Faça login com sua nova senha.</p>
              </div>
              <button onClick={resetForgot}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
                IR PARA O LOGIN
              </button>
            </div>
          )}

        </div>

        <div className="border-t border-gray-100 py-3 text-center">
          <span className="text-xs text-gray-300">v1.0 • 2026</span>
        </div>
      </div>
    </div>
  )
}