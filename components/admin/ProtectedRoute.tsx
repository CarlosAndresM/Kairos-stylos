"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { canAccessSucursales, canManageUsers, canPagarEmpleadas, canRegistrarCobros } from '@/lib/permissions'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    // Verificar permisos según la ruta
    const path = pathname || ''
    
    // Rutas que solo super_admin puede acceder
    if (path.includes('/admin/sucursales') && !canAccessSucursales(user)) {
      router.push('/admin/dashboard')
      return
    }

    // Rutas que solo super_admin y admin_sucursal pueden acceder
    if (path.includes('/admin/usuarios') && !canManageUsers(user)) {
      router.push('/admin/dashboard')
      return
    }

    if (path.includes('/admin/servicios') && user.role !== 'super_admin' && user.role !== 'admin_sucursal') {
      router.push('/admin/dashboard')
      return
    }

    // Rutas que solo super_admin, admin_sucursal y cajera pueden acceder
    if (path.includes('/admin/cobros') && !canRegistrarCobros(user)) {
      router.push('/admin/dashboard')
      return
    }

    if (path.includes('/admin/pagos') && !canPagarEmpleadas(user)) {
      router.push('/admin/dashboard')
      return
    }

    // Rutas que solo empleada puede acceder
    if (path.includes('/admin/empleada') && user.role !== 'empleada') {
      router.push('/admin/dashboard')
      return
    }

    setIsChecking(false)
  }, [loading, isAuthenticated, user, pathname, router])

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return <>{children}</>
}

