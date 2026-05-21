'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { Check, X, Info, AlertTriangle } from 'lucide-react'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Render corresponding icon based on variant
        let IconElement = null
        if (variant === 'success') {
          IconElement = (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20 text-white">
                <Check className="w-5 h-5" strokeWidth={3} />
              </div>
            </div>
          )
        } else if (variant === 'destructive') {
          IconElement = (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500 shadow-lg shadow-rose-500/20 text-white">
                <X className="w-5 h-5" strokeWidth={3} />
              </div>
            </div>
          )
        } else if (variant === 'warning') {
          IconElement = (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20 text-white">
                <AlertTriangle className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>
          )
        } else if (variant === 'info') {
          IconElement = (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/20 text-white">
                <Info className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>
          )
        }

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex gap-4 items-center w-full">
              {IconElement}
              <div className="grid gap-1 flex-1 min-w-0">
                {title && <ToastTitle className="leading-tight tracking-tight uppercase font-black text-[13px] text-slate-900 dark:text-white">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-[12px] opacity-90 leading-normal font-medium text-slate-500 dark:text-slate-400">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
