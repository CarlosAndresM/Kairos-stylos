'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface LoadingGateProps {
  children: React.ReactNode
}

/**
 * Componente que asegura un estado de carga consistente de al menos 0.5 segundos.
 * Mantiene el contenido renderizado por detrás para una transición fluida.
 */
export function LoadingGate({ children }: LoadingGateProps) {
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Activamos la entrada suave en el siguiente frame de renderizado
    const frame = requestAnimationFrame(() => {
      setMounted(true)
    })

    // Forzamos al menos 0.5 segundos de carga para consistencia visual
    const timer = setTimeout(() => {
      setFadeOut(true) // Iniciamos salida suave (0.5s)
      setTimeout(() => setLoading(false), 500)
    }, 500)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* Contenido (siempre se carga por detrás y es visible bajo el blur) */}
      <div className="w-full flex-1 flex flex-col">
        {children}
      </div>

      {/* Overlay de carga (posicionamiento absoluto anclado al contenedor <main> relativo del layout para cubrir banner y página) */}
      {loading && (
        <div className={cn(
          "absolute inset-0 z-[80] flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-500 ease-in-out",
          mounted && !fadeOut ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative size-16">
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
              <div className="absolute inset-0 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">
              Cargando...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
