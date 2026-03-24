'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  Receipt,
  Users,
  Briefcase,
  Package,
  Ticket,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  MapPin,
  Shield,
  Wallet,
  TrendingDown
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/features/auth/services'
import { toast } from '@/lib/toast-helper'

// Hook para detectar si estamos en móvil
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

const NAV_ITEMS = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
  },
  {
    title: 'Ventas (Facturas)',
    href: '/dashboard/ventas',
    icon: Receipt,
    roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
  },
  {
    title: 'Trabajadores',
    href: '/dashboard/trabajadores',
    icon: Briefcase,
    roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
  },
  {
    title: 'Vales',
    href: '/dashboard/vales',
    icon: Wallet,
    roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
  },
  {
    title: 'Usuarios Admin',
    href: '/dashboard/usuarios-admin',
    icon: Shield,
    roles: ['ADMINISTRADOR_TOTAL']
  },
  {
    title: 'Clientes',
    href: '/dashboard/clientes',
    icon: Users,
    roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
  },
  {
    title: 'Servicios & Productos',
    href: '/dashboard/catalogos',
    icon: Package,
    roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
  },
  {
    title: 'Servicio de Trabajador',
    href: '/dashboard/servicio-trabajador',
    icon: Ticket,
    roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
  },
  {
    title: 'Sucursales',
    href: '/dashboard/sedes',
    icon: MapPin,
    roles: ['ADMINISTRADOR_TOTAL']
  },
  {
    title: 'Nomina Tecnicos',
    href: '/dashboard/nomina',
    icon: History,
    roles: ['ADMINISTRADOR_TOTAL']
  },
  {
    title: 'Gastos',
    href: '/dashboard/gastos',
    icon: TrendingDown,
    roles: ['ADMINISTRADOR_TOTAL']
  },
  {
    title: 'Créditos',
    href: '/dashboard/creditos',
    icon: Receipt,
    roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
  }
]

interface SidebarProps {
  role?: string
}

// Contexto para controlar el sidebar desde el header en móvil
export const SidebarContext = React.createContext<{
  openMobile: () => void
}>({
  openMobile: () => { }
})

export function Sidebar({ role = 'ADMINISTRADOR_TOTAL' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  // Cerrar drawer al cambiar de ruta en móvil
  React.useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const res = await logout()
      if (res.success) {
        toast.success('Sesión cerrada', 'Has cerrado sesión correctamente.')
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error', 'No se pudo cerrar la sesión.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(role))

  // En móvil, el sidebar se esconde/muestra como drawer
  const sidebarVisible = isMobile ? isMobileOpen : true

  return (
    <>
      {/* Overlay para cerrar en móvil */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Botón hamburguesa flotante para móvil */}
      {isMobile && !isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-50 size-10 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center text-slate-200 shadow-xl md:hidden"
          title="Abrir menú"
        >
          <Menu className="size-5" />
        </button>
      )}

      <aside
        className={cn(
          "flex flex-col bg-slate-950 text-slate-200 border-r border-slate-800 shadow-xl transition-all duration-300",
          // Desktop: ocupa h-screen de forma normal en el flex layout
          !isMobile && "relative h-screen",
          // Desktop collapse
          !isMobile && (isCollapsed ? "w-20" : "w-64"),
          // Móvil: posición fija como drawer
          isMobile && "fixed top-0 left-0 h-full z-50 w-72",
          isMobile && (isMobileOpen ? "translate-x-0" : "-translate-x-full")
        )}
      >
        {/* Logo Area */}
        <div className="flex items-center h-16 px-4 border-b border-slate-800/50"> {/* Reduced height from 20 to 16 */}
          <div className={cn(
            "flex items-center gap-2 transition-all duration-300", // Reduced gap
            isCollapsed ? "mx-auto" : "px-1"
          )}>
            <div className="relative size-10 flex-shrink-0 animate-in fade-in zoom-in duration-500"> {/* Reduced size from 12 to 10 */}
              <Image
                src="/LOGO.png"
                alt="Kyroy Stilos Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-base font-bold tracking-tight text-white leading-tight"> {/* Reduced text size from lg to base */}
                  Kyroy Stilos
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#FF7E5F] font-black"> {/* Reduced from 10px to 9px */}
                  by Karen Ovalle
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar"> {/* Reduced py-6 to py-4, space-y-2 to space-y-1 */}
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative overflow-hidden", // Reduced gap-4 to gap-3, px-4 to px-3, py-3 to py-2
                  isActive
                    ? "bg-gradient-to-r from-[#FF7E5F]/20 to-[#FEB47B]/10 text-white shadow-sm"
                    : "hover:bg-white/5 text-slate-400 hover:text-white"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF7E5F] rounded-r-full shadow-[0_0_10px_rgba(255,126,95,0.5)]" />
                )}
                <item.icon className={cn(
                  "size-4.5 transition-transform group-hover:scale-110 duration-200", // Slightly reduced size
                  isActive ? "text-[#FF7E5F]" : "text-slate-500 group-hover:text-slate-300"
                )} />
                {!isCollapsed && (
                  <span className={cn(
                    "text-sm font-medium transition-colors", // Reduced font size to text-sm
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  )}>
                    {item.title}
                  </span>
                )}
                {isActive && !isCollapsed && (
                  <ChevronRight className="ml-auto size-3.5 text-[#FF7E5F]/50" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800/50"> {/* Reduced p-4 to p-3 */}
          <Button
            variant="ghost"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl px-3 py-5 transition-all", // Reduced gap-4 to gap-3, px-4 to px-3, py-6 to py-5
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className={cn("size-4.5", isLoggingOut && "animate-pulse")} />
            {!isCollapsed && <span className="font-medium text-sm"> {/* Reduced text size to sm */}
              {isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}
            </span>}
          </Button>
        </div>

        {/* Collapse Toggle - solo en desktop */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-4 top-20 size-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 hover:text-[#FF7E5F] hover:border-[#FF7E5F]/50 shadow-xl transition-all hover:scale-110 cursor-pointer group/toggle z-50"
            title={isCollapsed ? "Mostrar menú" : "Esconder menú"}
          >
            <Menu className={cn("size-4 transition-transform", isCollapsed ? "rotate-180" : "rotate-0")} />
          </button>
        )}

        {/* Botón cerrar en móvil dentro del sidebar */}
        {isMobile && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 size-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            title="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        )}
      </aside>
    </>
  )
}

