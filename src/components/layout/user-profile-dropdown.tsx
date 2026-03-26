'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  LogOut,
  ChevronDown,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/features/auth/services'
import { toast } from '@/lib/toast-helper'

interface UserProfileDropdownProps {
  userName: string
  userRole: string
}

export function UserProfileDropdown({ userName, userRole }: UserProfileDropdownProps) {
  const router = useRouter()
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 md:gap-3 pl-1 md:pl-2 group cursor-pointer bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 p-1.5 md:p-2 rounded-2xl transition-all outline-none shadow-lg">
          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-1">
              <p className="text-sm font-black text-white leading-none drop-shadow-md">{userName}</p>
              <ChevronDown className="size-3 text-white/70 group-hover:text-white transition-colors" />
            </div>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-tighter mt-1 leading-none">{userRole}</p>
          </div>
          <div className="size-9 md:size-11 rounded-xl bg-gradient-to-br from-[#FF7E5F] to-[#FEB47B] flex items-center justify-center border-2 border-white/20 shadow-xl group-hover:scale-105 transition-transform">
            <User className="size-5 md:size-7 text-white" />
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 mt-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-top-2 duration-200">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Mi Cuenta</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
          </div>
        </DropdownMenuLabel>



        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-600 dark:text-slate-300 hover:text-red-600 transition-colors group"
        >
          <div className="size-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
            {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">{isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>
            <span className="text-[10px] text-slate-400 font-medium">Finalizar jornada</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
