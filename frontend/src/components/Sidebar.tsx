import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Settings, LogOut, ChevronLeft, ChevronRight, HardHat, Menu, X } from 'lucide-react'

const links = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes',   icon: Users,           label: 'Clientes' },
  { to: '/orcamentos', icon: FileText,         label: 'Orçamentos' },
  { to: '/perfil',     icon: Settings,         label: 'Perfil' },
]

interface SidebarProps {
  onLogout: () => void
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Botão hamburguer mobile ────────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-[#1e2a3a] text-white p-2 rounded-lg shadow-lg">
        <Menu size={20} />
      </button>

      {/* ── Overlay mobile ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={`
        fixed md:relative z-50 md:z-auto
        h-screen bg-[#1e2a3a] text-white flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-56'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo + botão fechar mobile */}
        <div className={`flex items-center p-4 pt-5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-black text-blue-400 tracking-tight">CONSTRULIST</h1>
              <p className="text-xs text-gray-500 mt-0.5">Sistema de Orçamentos</p>
            </div>
          )}
          {collapsed && <HardHat size={22} className="text-blue-400" />}

          {/* Fechar no mobile */}
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-gray-400 hover:text-white ml-2">
            <X size={18} />
          </button>
        </div>

        {/* Botão recolher — só desktop */}
        <div className={`hidden md:flex px-3 mb-3 ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 px-2 space-y-0.5">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${collapsed ? 'justify-center' : ''}
                ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10'}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé */}
        <div className={`p-3 border-t border-white/10 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          <button
            onClick={onLogout}
            title={collapsed ? 'Sair' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-red-400 transition-colors
              ${collapsed ? 'justify-center w-full' : 'w-full'}`}>
            <LogOut size={16} className="shrink-0" />
            {!collapsed && 'Sair'}
          </button>
          {!collapsed && <p className="text-xs text-gray-600 px-3">v1.0 • 2026</p>}
        </div>
      </aside>
    </>
  )
}