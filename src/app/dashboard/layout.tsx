import { Sidebar } from '@/components/layout/sidebar'
import { UserProfileDropdown } from '@/components/layout/user-profile-dropdown'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/jwt-utils'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const sessionUser = cookieStore.get('session_user')
  let user = null
  if (sessionUser && sessionUser.value) {
    user = await decrypt(sessionUser.value);
  }

  const userRole = user?.role || 'INVITADO'
  const userName = user?.username || 'Usuario'

  return (
    <div className="flex h-screen bg-background dark:bg-slate-950 overflow-hidden font-sans">
      {/* Sidebar - en desktop ocupa espacio, en móvil es drawer superpuesto */}
      <Sidebar role={userRole} />

      {/* Main Content Area - en móvil ocupa todo el ancho */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          {/* Enhanced Background Glows - Rosados/Naranjas con Blur más intensos */}
          <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-[#FF7E5F]/20 via-rose-300/10 to-transparent blur-[120px] -z-10 pointer-events-none animate-pulse duration-[8s]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-tr from-[#FEB47B]/20 via-pink-300/10 to-transparent blur-[120px] -z-10 pointer-events-none animate-pulse duration-[12s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-rose-400/15 blur-[100px] -z-10 pointer-events-none" />

          <div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
