import { useState } from 'react'
import { Loader2, Eye, EyeOff, HardHat, ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react'

interface LoginProps {
  onLogin: (token: string) => void
}

type Step = 'login' | 'register' | 'forgot_email' | 'forgot_code' | 'forgot_newpass' | 'forgot_done'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Login({ onLogin }: LoginProps) {
  const [step, setStep]         = useState<Step>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [regNome,  setRegNome]  = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass,  setRegPass]  = useState('')
  const [regPass2, setRegPass2] = useState('')
  const [showReg,  setShowReg]  = useState(false)

  const [forgotEmail,  setForgotEmail]  = useState('')
  const [forgotCode,   setForgotCode]   = useState('')
  const [newPassword,  setNewPassword]  = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [showNew,      setShowNew]      = useState(false)

  const [popupMsg, setPopupMsg] = useState('')
  const showPopup = (msg: string) => {
    setPopupMsg(msg)
    setTimeout(() => setPopupMsg(''), 4000)
  }

  const handleLogin = async () => {
    setError('')
    if (!username || !password) { setError('Preencha usuário e senha.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/login/`, {
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

  const handleRegister = async () => {
    setError('')
    if (!regNome.trim())        { setError('Informe seu nome.'); return }
    if (!regEmail.trim())       { setError('Informe seu e-mail.'); return }
    if (!regPass)               { setError('Informe uma senha.'); return }
    if (regPass.length < 6)     { setError('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (regPass !== regPass2)   { setError('As senhas não coincidem.'); return }

    setLoading(true)
    try {
      const usernameGerado = regNome.trim().toLowerCase().split(' ')[0] + Math.floor(Math.random() * 900 + 100)
      const res = await fetch(`${API}/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameGerado, email: regEmail, password: regPass }),
      })
      const data = await res.json()
      if (res.ok) {
        const loginRes = await fetch(`${API}/api/login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameGerado, password: regPass }),
        })
        const loginData = await loginRes.json()
        if (loginRes.ok && loginData.access) {
          localStorage.setItem('token', loginData.access)
          localStorage.setItem('primeiro_acesso', 'true')
          onLogin(loginData.access)
        }
      } else {
        setError(data.error || 'Erro ao criar conta. Tente novamente.')
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
      const res = await fetch(`${API}/api/password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      if (res.ok) { showPopup('✅ Código enviado! Verifique seu e-mail.'); setStep('forgot_code') }
      else { setError('E-mail não encontrado no sistema.') }
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
      const res = await fetch(`${API}/api/password-reset/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode }),
      })
      if (res.ok) { setStep('forgot_newpass') }
      else { setError('Código inválido ou expirado.') }
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
      const res = await fetch(`${API}/api/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, new_password: newPassword }),
      })
      if (res.ok) { setStep('forgot_done') }
      else { setError('Erro ao salvar senha.') }
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

  const goRegister = () => {
    setStep('register'); setError('')
    setRegNome(''); setRegEmail(''); setRegPass(''); setRegPass2('')
  }

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4 py-8">

      {popupMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          {popupMsg}
        </div>
      )}

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

        {/* Cabeçalho */}
        <div className="bg-blue-600 px-8 py-7 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <HardHat size={26} className="text-white" strokeWidth={2.5} />
            <span className="text-2xl font-black text-white tracking-tight">CONSTRULIST</span>
          </div>
          <p className="text-blue-100 text-sm">Sistema de Orçamentos</p>
        </div>

        <div className="px-8 py-7">

          {/* ── LOGIN ─────────────────────────────────────────────────────── */}
          {step === 'login' && (
            <div className="space-y-4">
              <p className="text-center text-sm font-semibold text-gray-600">Faça seu login</p>

              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Usuário</label>
                <input type="text" placeholder="seu_usuario" value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Aguarde...</span>
                  : 'ENTRAR'}
              </button>

              {/* Divisor visual */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Botão cadastro — DESTACADO */}
              <button onClick={goRegister}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                <UserPlus size={16} />
                CRIAR CONTA GRÁTIS
              </button>

              <div className="text-center">
                <button onClick={() => { setStep('forgot_email'); setError('') }}
                  className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                  🔒 Esqueceu sua senha?
                </button>
              </div>
            </div>
          )}

          {/* ── CADASTRO ──────────────────────────────────────────────────── */}
          {step === 'register' && (
            <div className="space-y-4">
              <button onClick={() => { setStep('login'); setError('') }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
                <ArrowLeft size={13} /> Voltar ao login
              </button>

              <div>
                <p className="text-base font-bold text-gray-800 mb-0.5">Criar sua conta</p>
                <p className="text-xs text-gray-400">Gratuito para começar. Sem cartão de crédito.</p>
              </div>

              {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Seu nome</label>
                <input type="text" placeholder="João Silva" value={regNome}
                  onChange={e => setRegNome(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">E-mail</label>
                <input type="email" placeholder="seu@email.com" value={regEmail}
                  onChange={e => setRegEmail(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showReg ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={regPass}
                    onChange={e => setRegPass(e.target.value)} className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => setShowReg(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showReg ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirmar senha</label>
                <input type={showReg ? 'text' : 'password'} placeholder="Repita a senha" value={regPass2}
                  onChange={e => setRegPass2(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  className={inputCls} />
              </div>

              <button onClick={handleRegister} disabled={loading}
                className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" />Criando conta...</>
                  : <><UserPlus size={16} />CRIAR CONTA E ENTRAR</>}
              </button>

              <p className="text-center text-xs text-gray-400">
                Já tem conta?{' '}
                <button onClick={() => { setStep('login'); setError('') }}
                  className="text-blue-600 font-semibold hover:underline">
                  Fazer login
                </button>
              </p>
            </div>
          )}

          {/* ── RECUPERAR — email ──────────────────────────────────────────── */}
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
                  className={inputCls} />
              </div>
              <button onClick={handleSendCode} disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Enviando...</span> : 'ENVIAR CÓDIGO'}
              </button>
            </div>
          )}

          {/* ── RECUPERAR — código ────────────────────────────────────────── */}
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
                  className={inputCls + ' text-center tracking-widest font-bold'} />
              </div>
              <button onClick={handleVerifyCode} disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Verificando...</span> : 'VERIFICAR CÓDIGO'}
              </button>
              <div className="text-center">
                <button onClick={handleSendCode} className="text-xs text-blue-600 hover:underline">Reenviar código</button>
              </div>
            </div>
          )}

          {/* ── RECUPERAR — nova senha ─────────────────────────────────────── */}
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
                    className={inputCls + ' pr-10'} />
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
                  className={inputCls} />
              </div>
              <button onClick={handleNewPassword} disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Salvando...</span> : 'SALVAR NOVA SENHA'}
              </button>
            </div>
          )}

          {/* ── CONCLUÍDO ─────────────────────────────────────────────────── */}
          {step === 'forgot_done' && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 size={52} className="mx-auto text-green-500" />
              <div>
                <p className="text-sm font-bold text-gray-800">Senha atualizada!</p>
                <p className="text-xs text-gray-400 mt-1">Faça login com sua nova senha.</p>
              </div>
              <button onClick={resetForgot}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
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