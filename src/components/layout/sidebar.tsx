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
  Shield // Added Shield
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/features/auth/services'
import { toast } from '@/lib/toast-helper'

const NAV_ITEMS = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMINISTRADOR_TOTAL', 'CAJERO']
  },
  {
    title: 'Ventas (Facturas)',
    href: '/dashboard/ventas',
    icon: Receipt,
    roles: ['ADMINISTRADOR_TOTAL', 'CAJERO']
  },
  {
    title: 'Trabajadores',
    href: '/dashboard/trabajadores',
    icon: Briefcase,
    roles: ['ADMINISTRADOR_TOTAL', 'CAJERO']
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
    roles: ['ADMINISTRADOR_TOTAL', 'CAJERO']
  },
  {
    title: 'Servicios & Productos',
    href: '/dashboard/catalogos',
    icon: Package,
    roles: ['ADMINISTRADOR_TOTAL', 'CAJERO']
  },
  {
    title: 'Vales',
    href: '/dashboard/vales',
    icon: Ticket,
    roles: ['ADMINISTRADOR_TOTAL', 'CAJERO']
  },
  {
    title: 'Sucursales',
    href: '/dashboard/sedes',
    icon: MapPin,
    roles: ['ADMINISTRADOR_TOTAL']
  },
  {
    title: 'Nómina',
    href: '/dashboard/nomina',
    icon: History,
    roles: ['ADMINISTRADOR_TOTAL']
  },
  {
    title: 'Créditos',
    href: '/dashboard/creditos',
    icon: Receipt,
    roles: ['ADMINISTRADOR_TOTAL', 'CAJERO']
  }
]

interface SidebarProps {
  role?: string
}

export function Sidebar({ role = 'ADMINISTRADOR_TOTAL' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

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

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-slate-950 text-slate-200 transition-all duration-300 border-r border-slate-800 shadow-xl",
        isCollapsed ? "w-20" : "w-64" // Reduced width from 72 to 64
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

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-20 size-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 hover:text-[#FF7E5F] hover:border-[#FF7E5F]/50 shadow-xl transition-all hover:scale-110 cursor-pointer group/toggle z-50" // Adjusted top from 24 to 20
        title={isCollapsed ? "Mostrar menú" : "Esconder menú"}
      >
        <Menu className={cn("size-4 transition-transform", isCollapsed ? "rotate-180" : "rotate-0")} />
      </button>
    </aside>
  )
}

