"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  Building2,
  Users,
  Scissors,
  DollarSign,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccessSucursales, canManageUsers, canPagarEmpleadas, canRegistrarCobros } from '@/lib/permissions'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  if (!user) return null

  interface MenuItem {
    href: string
    label: string
    icon: React.ComponentType<{ size?: number }>
  }

  const menuItems: MenuItem[] = []

  // Dashboard - todos los roles
  if (user.role === 'empleada') {
    // Para empleadas, el dashboard es su panel personal
    menuItems.push({
      href: '/admin/empleada',
      label: 'Mi Panel',
      icon: LayoutDashboard,
    })
  } else {
    // Para otros roles, el dashboard normal
    menuItems.push({
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    })
  }

  // Sucursales - solo super_admin
  if (canAccessSucursales(user)) {
    menuItems.push({
      href: '/admin/sucursales',
      label: 'Sucursales',
      icon: Building2,
    })
  }

  // Usuarios - super_admin y admin_sucursal
  if (canManageUsers(user)) {
    menuItems.push({
      href: '/admin/usuarios',
      label: 'Usuarios',
      icon: Users,
    })
  }

  // Servicios - super_admin y admin_sucursal
  if (user.role === 'super_admin' || user.role === 'admin_sucursal') {
    menuItems.push({
      href: '/admin/servicios',
      label: 'Servicios',
      icon: Scissors,
    })
  }

  // Cobros - super_admin, admin_sucursal y cajera
  if (canRegistrarCobros(user)) {
    menuItems.push({
      href: '/admin/cobros',
      label: 'Cobros',
      icon: DollarSign,
    })
  }

  // Pagos - super_admin, admin_sucursal y cajera con permiso
  if (canPagarEmpleadas(user)) {
    menuItems.push({
      href: '/admin/pagos',
      label: 'Pagos',
      icon: CreditCard,
    })
  }

  const SidebarContent = () => (
    <>
      {/* Logo y nombre */}
      <div className="p-4 md:p-6 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/LOGO.png"
              alt="Kyroy Stilos Logo"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <h2 className="font-bold text-foreground font-brand text-lg">Kyroy Stilos</h2>
            <p className="text-xs text-muted-foreground">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Menú */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                  : 'text-foreground hover:bg-primary/5'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Usuario y logout */}
      <div className="p-4 border-t border-primary/10">
        <div className="mb-3 px-4 py-2 bg-muted/50 rounded-lg">
          <p className="text-sm font-semibold text-foreground truncate">{user.nombre}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <p className="text-xs text-primary mt-1 capitalize">{user.role.replace('_', ' ')}</p>
        </div>
        <button
          onClick={() => {
            setIsMobileOpen(false)
            logout()
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Botón hamburguesa móvil */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-primary/10"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay móvil */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-primary/10 h-screen sticky top-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Sidebar Móvil */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-screen w-64 bg-white border-r border-primary/10 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  )
}

