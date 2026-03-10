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
        <main className="flex-1 overflow-y-auto">
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