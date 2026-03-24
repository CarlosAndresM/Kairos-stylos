import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/app/auth/login/login-form'

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Kyroy Stilos',
  description: 'Inicia sesión en tu espacio Kyroy Stilos',
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 font-sans">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/salon-bg.png"
          alt="Salon Background"
          fill
          className="object-cover transition-opacity duration-1000"
          priority
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[8px]" />
      </div>

      {/* Decorative Blur Elements */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-orange-400/20 blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-rose-400/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md transition-all duration-500 animate-in fade-in zoom-in slide-in-from-bottom-8">
        {/* Logo/Header */}
        <div className="mb-6 flex flex-col items-center">
             <div className="bg-white p-3 rounded-2xl shadow-2xl mb-4 border border-white/50">
                <Image 
                    src="/LOGO.png" 
                    alt="Kyroy Stilos" 
                    width={60} 
                    height={60}
                    className="object-contain"
                />
             </div>
             <h1 className="text-white text-3xl font-black tracking-tight drop-shadow-lg italic uppercase">
                Kyroy Stilos
             </h1>
             <p className="text-[#FEB47B] text-[10px] font-black tracking-[0.2em] drop-shadow-sm uppercase mt-1">by Karen Ovalle</p>
        </div>

        <Card className="bg-white/95 dark:bg-slate-900/95 border-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-10 pb-4 text-center">
            <CardTitle className="text-slate-900 dark:text-white text-2xl font-black tracking-tight uppercase">
              Bienvenido a tu Espacio Kyroy
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <LoginForm />
            
          </CardContent>
        </Card>
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-6 left-0 right-0 text-center animate-in fade-in delay-700">
        <p className="text-white/60 text-xs font-semibold tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Kyroy Stilos. Todos los derechos reservados.
        </p>
      </div>
    </main>
  )
}
