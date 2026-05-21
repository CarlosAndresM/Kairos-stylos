'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default'
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Manejado por el callback de confirmación si es necesario
    } finally {
      setIsSubmitting(false)
    }
  }

  // Configuración de estilos e iconos según la variante
  const variantConfig = {
    destructive: {
      icon: <AlertCircle className="size-6 animate-pulse" />,
      iconBg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-500',
      confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10 focus:ring-rose-500/20',
      accentBg: 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20 text-rose-700 dark:text-rose-400'
    },
    warning: {
      icon: <AlertTriangle className="size-6" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-500',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10 focus:ring-amber-500/20',
      accentBg: 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-100/50 dark:border-amber-900/20 text-amber-700 dark:text-amber-400'
    },
    default: {
      icon: <Info className="size-6" />,
      iconBg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-500',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10 focus:ring-blue-500/20',
      accentBg: 'bg-blue-50/30 dark:bg-blue-950/10 border-blue-100/50 dark:border-blue-900/20 text-blue-700 dark:text-blue-400'
    }
  }

  const config = variantConfig[variant]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent 
        className="sm:max-w-[400px] border border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-2xl p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        showCloseButton={!isSubmitting}
      >
        <DialogHeader className="p-6 pb-4 flex flex-col items-center text-center">
          <div className={cn("p-3 rounded-full w-12 h-12 flex items-center justify-center mb-3 shadow-inner", config.iconBg)}>
            {config.icon}
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-400 dark:text-slate-500 font-medium max-w-[280px] pt-1">
            Esta acción requiere tu confirmación para continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <div className={cn("p-3 rounded-xl border leading-relaxed text-xs text-center font-medium", config.accentBg)}>
            {description}
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 gap-2 flex flex-col sm:flex-row-reverse">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={cn(
              "font-bold rounded-xl h-10 px-6 text-xs uppercase tracking-wider flex-1 sm:flex-none min-w-[120px] transition-all hover:scale-[1.01] active:scale-[0.99]",
              config.confirmBtn
            )}
          >
            {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {confirmText}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl font-bold text-xs uppercase tracking-wider h-10 px-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-1 sm:flex-none"
          >
            {cancelText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
