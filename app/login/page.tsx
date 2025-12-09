"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { login } from '@/lib/auth'
import { seedData } from '@/lib/seed'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    // Inicializar datos si no existen
    seedData()

    // Si ya está autenticado, redirigir
    if (isAuthenticated && user) {
      router.push('/admin/dashboard')
    }
  }, [isAuthenticated, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = login(email, password)
      if (user) {
        // Redirigir según rol
        if (user.role === 'empleada') {
          router.push('/admin/empleada')
        } else {
          router.push('/admin/dashboard')
        }
      } else {
        setError('Email o contraseña incorrectos')
      }
    } catch (err) {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-primary/10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              <Image
                src="/LOGO.png"
                alt="Kyroy Stilos Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              <span className="font-brand bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Kyroy Stilos
              </span>
            </h1>
            <p className="text-muted-foreground">Sistema de Gestión</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-input bg-white text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-input bg-white text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Link para volver */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Volver a la página principal
            </a>
          </div>

          {/* Credenciales de prueba */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">Credenciales de prueba:</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Super Admin:</strong> admin@kyroy.com / admin123</p>
              <p><strong>Admin Sucursal:</strong> admin1@kyroy.com / admin123</p>
              <p><strong>Cajera:</strong> cajera1@kyroy.com / cajera123</p>
              <p><strong>Empleada:</strong> empleada1@kyroy.com / empleada123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

