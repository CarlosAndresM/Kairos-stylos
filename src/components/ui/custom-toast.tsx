'use client'

import * as React from 'react'
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface CustomToastProps {
  id: string | number
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
}

export const CustomToast = ({ id, title, description, variant, duration = 4000 }: CustomToastProps) => {
  const [progress, setProgress] = React.useState(100)

  React.useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(newProgress)
      if (newProgress === 0) clearInterval(timer)
    }, 16) // ~60fps

    return () => clearInterval(timer)
  }, [duration])

  const variants = {
    success: {
      icon: <Check className="w-6 h-6 text-white" strokeWidth={3} />,
      iconBg: 'bg-emerald-500 shadow-emerald-200/50',
      progressBar: 'bg-emerald-500',
      badgeText: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    error: {
      icon: <X className="w-6 h-6 text-white" strokeWidth={3} />,
      iconBg: 'bg-rose-500 shadow-rose-200/50',
      progressBar: 'bg-rose-500',
      badgeText: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    info: {
      icon: <Info className="w-6 h-6 text-white" strokeWidth={2} />,
      iconBg: 'bg-blue-500 shadow-blue-200/50',
      progressBar: 'bg-blue-500',
      badgeText: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2} />,
      iconBg: 'bg-amber-500 shadow-amber-200/50',
      progressBar: 'bg-amber-500',
      badgeText: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  }

  const { icon, iconBg, progressBar, badgeText } = variants[variant]

  return (
    <div className="group relative w-full sm:w-[380px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center p-4">
        {/* Visual Badge/Icon Section */}
        <div className="flex-shrink-0 mr-4">
          <div className={cn(
            "w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-500",
            iconBg
          )}>
            {icon}
          </div>
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 py-1">
          <h3 className="text-[14px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-medium line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Close Button Container */}
        <div className="flex-shrink-0 ml-2 self-start flex flex-col justify-between h-full">
           <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              sonnerToast.dismiss(id)
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modern Progress Bar - Animated Bottom Border */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-100 dark:bg-slate-800">
        <div
          className={cn("h-full transition-all duration-300 ease-out", progressBar)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// WRAPPER: Usa estas funciones en el resto de tu app en lugar de llamar a Sonner directamente
// ============================================================================
export const notify = {
  success: (title: string, description?: string, duration?: number) => {
    sonnerToast.custom((t) => (
      <CustomToast id={t} title={title} description={description} variant="success" duration={duration} />
    ))
  },
  error: (title: string, description?: string, duration?: number) => {
    sonnerToast.custom((t) => (
      <CustomToast id={t} title={title} description={description} variant="error" duration={duration} />
    ))
  },
  info: (title: string, description?: string, duration?: number) => {
    sonnerToast.custom((t) => (
      <CustomToast id={t} title={title} description={description} variant="info" duration={duration} />
    ))
  },
  warning: (title: string, description?: string, duration?: number) => {
    sonnerToast.custom((t) => (
      <CustomToast id={t} title={title} description={description} variant="warning" duration={duration} />
    ))
  },
}