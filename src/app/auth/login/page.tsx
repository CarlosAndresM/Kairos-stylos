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
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
      </div>

      {/* Decorative Blur Elements */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-orange-200/30 blur-[100px]" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-rose-200/30 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md transition-all duration-500 animate-in fade-in zoom-in slide-in-from-bottom-8">
        {/* Logo/Header */}
        <div className="mb-4 flex flex-col items-center">
             <div className="bg-white/80 p-2 rounded-xl shadow-lg backdrop-blur-md mb-2">
                <Image 
                    src="/LOGO.png" 
                    alt="Kyroy Stilos" 
                    width={50} 
                    height={50}
                    className="object-contain"
                />
             </div>
             <h1 className="text-white text-2xl font-extrabold tracking-tight drop-shadow-md">
                Kyroy Stilos
             </h1>
             <p className="text-white/90 text-xs font-semibold tracking-wide drop-shadow-sm uppercase">by Karen Ovalle</p>
        </div>

        <Card className="bg-white/30 dark:bg-black/20 border-white/40 shadow-2xl backdrop-blur-2xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pt-6 pb-4 text-center">
            <CardTitle className="text-[#4A4A4A] dark:text-white text-2xl font-bold tracking-tight">
              Bienvenido a tu Espacio Kyroy
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
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
