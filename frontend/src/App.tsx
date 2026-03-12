import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Orcamentos from './pages/Orcamentos'
import Perfil from './pages/Perfil'
import Login from './pages/Login'

export default function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  )

  const handleLogin = (t: string) => setToken(t)

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar onLogout={handleLogout} />
        {/* pt-16 no mobile para não sobrepor o botão hamburguer, lg:pt-0 no desktop */}
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/clientes"   element={<Clientes />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/perfil"     element={<Perfil />} />
            <Route path="*"           element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}