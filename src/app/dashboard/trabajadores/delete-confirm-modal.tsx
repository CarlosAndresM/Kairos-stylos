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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
  workerName: string
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  workerName
}: DeleteConfirmModalProps) {
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleConfirm = async () => {
    if (!password) return
    setIsSubmitting(true)
    try {
      await onConfirm(password)
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] border border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-2xl p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 pb-4 flex flex-col items-center text-center">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full w-12 h-12 flex items-center justify-center mb-3 shadow-inner">
            <AlertCircle className="size-6 animate-pulse" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">
            ¿Eliminar Trabajador?
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-400 font-medium max-w-[280px] pt-1">
            Esta acción es irreversible y requiere contraseña administrativa.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center">
            Estás a punto de eliminar permanentemente a <span className="font-bold text-rose-600 dark:text-rose-500">"{workerName}"</span>.
          </p>

          <div className="space-y-2">
            <Label htmlFor="admin-password" title="Contraseña Administrativa" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block text-center">
              Contraseña de Seguridad
            </Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              className="rounded-xl border-slate-200 focus:ring-rose-500/20 focus:border-rose-500 h-10 text-center tracking-widest font-black placeholder:tracking-normal placeholder:font-normal transition-all text-sm bg-slate-50/50 dark:bg-slate-900/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30">
            <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 tracking-tight leading-normal">
              Si tiene registros asociados (facturas, vales), se impedirá la eliminación automática.
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 gap-2 flex flex-col sm:flex-row-reverse">
          <Button
            type="button"
            disabled={!password || isSubmitting}
            onClick={handleConfirm}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl h-10 px-6 shadow-md shadow-rose-600/10 text-xs uppercase tracking-wider flex-1 sm:flex-none min-w-[140px] transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Eliminar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl font-bold text-xs uppercase tracking-wider h-10 px-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-1 sm:flex-none"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
