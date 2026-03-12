import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, User,
  ChevronLeft, ChevronRight, Menu, X, LogOut
} from 'lucide-react'

const API_URL = 'https://construlist.up.railway.app'

interface SidebarProps {
  onLogout: () => void
}

interface UserInfo {
  nome: string
  empresa: string
}

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/clientes',  icon: Users,            label: 'Clientes'    },
  { to: '/orcamentos',icon: FileText,          label: 'Orçamentos'  },
  { to: '/perfil',    icon: User,              label: 'Perfil'      },
]

export default function Sidebar({ onLogout }: SidebarProps) {
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userInfo, setUserInfo]     = useState<UserInfo>({ nome: '', empresa: '' })
  const [menuOpen, setMenuOpen]     = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Busca dados do usuário logado
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API_URL}/api/me/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setUserInfo({ nome: d.nome || d.username || '', empresa: d.empresa || '' }))
      .catch(() => {})
  }, [])

  // Fecha menu ao clicar fora
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    onLogout()
    navigate('/')
  }

  // Inicial do nome para o avatar
  const inicial = (userInfo.nome || '?')[0].toUpperCase()

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
             ${isActive
               ? 'bg-blue-600 text-white shadow-sm'
               : 'text-gray-300 hover:bg-white/10 hover:text-white'
             }
             ${collapsed ? 'justify-center' : ''}`
          }
        >
          <Icon size={18} className="flex-shrink-0" />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>
  )

  // ── Menu do usuário (canto inferior) ──────────────────────────────────────
  const UserMenu = ({ showLabel }: { showLabel: boolean }) => (
    <div ref={menuRef} className="relative px-3 pb-4">
      <button
        onClick={() => setMenuOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
          text-gray-300 hover:bg-white/10 hover:text-white transition-all
          ${!showLabel ? 'justify-center' : ''}`}
      >
        {/* Avatar com inicial */}
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {inicial}
        </div>
        {showLabel && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-xs font-semibold truncate">
              {userInfo.nome}
            </p>
            {userInfo.empresa && (
              <p className="text-gray-400 text-xs truncate">{userInfo.empresa}</p>
            )}
          </div>
        )}
      </button>

      {/* Menu suspenso */}
      {menuOpen && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {/* Cabeçalho do menu */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{userInfo.nome}</p>
            {userInfo.empresa && (
              <p className="text-xs text-gray-500 truncate">{userInfo.empresa}</p>
            )}
          </div>
          {/* Botão Sair */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} className="text-red-500" />
            Sair
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* ── MOBILE: botão hamburguer ───────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#1e2a3a] text-white rounded-xl flex items-center justify-center shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* ── MOBILE: overlay ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE: drawer ────────────────────────────────────────────────── */}
      <div className={`
        lg:hidden fixed top-0 left-0 h-full w-64 bg-[#1e2a3a] z-50 flex flex-col
        transform transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <span className="text-white font-bold text-lg tracking-wide">CONSTRULIST</span>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        <NavItems onClick={() => setMobileOpen(false)} />
        <div className="border-t border-white/10">
          <UserMenu showLabel={true} />
        </div>
      </div>

      {/* ── DESKTOP: sidebar ──────────────────────────────────────────────── */}
      <div className={`
        hidden lg:flex flex-col h-screen bg-[#1e2a3a] sticky top-0
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-56'}
      `}>
        {/* Logo + collapse button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          {!collapsed && (
            <span className="text-white font-bold text-base tracking-wide truncate">CONSTRULIST</span>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <NavItems />

        {/* Separador + User Menu */}
        <div className="border-t border-white/10">
          <UserMenu showLabel={!collapsed} />
        </div>
      </div>
    </>
  )
}