'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Menu,
  X,
  ChevronRight,
  MapPin,
  Shield,
  Wallet,
  TrendingDown,
  ClipboardList
} from 'lucide-react'

import { cn } from '@/lib/utils'


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

const NAV_GROUPS = [
  {
    label: 'Administración',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
      },
      {
        title: 'Usuarios Admin',
        href: '/dashboard/usuarios-admin',
        icon: Shield,
        roles: ['ADMINISTRADOR_TOTAL']
      },
      {
        title: 'Sucursales',
        href: '/dashboard/sedes',
        icon: MapPin,
        roles: ['ADMINISTRADOR_TOTAL']
      },
      {
        title: 'Ventas y Factura',
        href: '/dashboard/ventas',
        icon: Receipt,
        roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
      },
      {
        title: 'Gastos',
        href: '/dashboard/gastos',
        icon: TrendingDown,
        roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
      },
    ]
  },
  {
    label: 'Trabajador',
    items: [
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
        title: 'Servicio de Trabajador',
        href: '/dashboard/servicio-trabajador',
        icon: Ticket,
        roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
      },
    ]
  },
  {
    label: 'Nómina',
    items: [
      {
        title: 'Técnicos',
        href: '/dashboard/nomina',
        icon: History,
        roles: ['ADMINISTRADOR_TOTAL']
      },
      {
        title: 'Administradores de Punto',
        href: '/dashboard/nomina-admin',
        icon: History,
        roles: ['ADMINISTRADOR_TOTAL']
      },
    ]
  },
  {
    label: 'Negocio',
    items: [
      {
        title: 'Servicios & Productos',
        href: '/dashboard/catalogos',
        icon: Package,
        roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
      },
      {
        title: 'Solicitudes Productos',
        href: '/dashboard/solicitudes',
        icon: ClipboardList,
        roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
      },
    ]
  },
  {
    label: 'Cliente',
    items: [
      {
        title: 'Clientes',
        href: '/dashboard/clientes',
        icon: Users,
        roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
      },
      {
        title: 'Créditos',
        href: '/dashboard/creditos',
        icon: Receipt,
        roles: ['ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO']
      },
    ]
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
  const isMobile = useIsMobile()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  // Cerrar drawer al cambiar de ruta en móvil
  React.useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Filtrar grupos y sus items según el rol
  const filteredGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(role))
  })).filter(group => group.items.length > 0)

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
          className="fixed top-4 left-4 z-50 size-10 rounded-full bg-[#ffcdd4] border-2 border-rose-200 flex items-center justify-center text-rose-900 shadow-xl md:hidden"
          title="Abrir menú"
        >
          <Menu className="size-5" />
        </button>
      )}

      <aside
        className={cn(
          "flex flex-col bg-[#ffcdd4] text-rose-950 border-r border-rose-200 shadow-xl transition-all duration-300",
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
        <div className="flex items-center h-16 px-4 border-b border-rose-200/50"> {/* Reduced height from 20 to 16 */}
          <div className={cn(
            "flex items-center gap-2 transition-all duration-300",
            isCollapsed ? "mx-auto" : "px-1"
          )}>
            <div className="relative size-10 flex-shrink-0 animate-in fade-in zoom-in duration-500 bg-white/50 rounded-xl p-1.5 border border-rose-200 shadow-inner backdrop-blur-md">
              <Image
                src="/LOGO.png"
                alt="kairos Stylos Logo"
                fill
                className="object-contain drop-shadow-sm"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-base font-black tracking-tight text-rose-950 leading-tight drop-shadow-sm">
                  kairos Stylos
                </span>
                <span className="text-[9px] uppercase tracking-widest text-rose-800/80 font-black">
                  by Karen Ovalle
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar"> {/* Aumentado space-y para separar grupos */}
          {filteredGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-rose-800/40 mb-2">
                  {group.label}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative overflow-hidden",
                        isActive
                          ? "bg-white/60 text-rose-950 shadow-md border border-rose-200/50"
                          : "hover:bg-white/30 text-rose-900/70 hover:text-rose-950"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r-full" />
                      )}
                      <item.icon className={cn(
                        "size-4.5 transition-transform group-hover:scale-110 duration-200",
                        isActive ? "text-rose-600" : "text-rose-400 group-hover:text-rose-600"
                      )} />
                      {!isCollapsed && (
                        <span className={cn(
                          "text-sm font-bold transition-colors",
                          isActive ? "text-rose-950" : "text-rose-900/70 group-hover:text-rose-950"
                        )}>
                          {item.title}
                        </span>
                      )}
                      {isActive && !isCollapsed && (
                        <ChevronRight className="ml-auto size-3.5 text-rose-400" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>



        {/* Collapse Toggle - solo en desktop */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-4 top-20 size-8 rounded-full bg-white border-2 border-rose-200 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white shadow-xl transition-all hover:scale-110 cursor-pointer group/toggle z-50"
            title={isCollapsed ? "Mostrar menú" : "Esconder menú"}
          >
            <Menu className={cn("size-4 transition-transform", isCollapsed ? "rotate-180" : "rotate-0")} />
          </button>
        )}

        {/* Botón cerrar en móvil dentro del sidebar */}
        {isMobile && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 size-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-500 hover:text-rose-700 transition-all"
            title="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        )}
      </aside>
    </>
  )
}

