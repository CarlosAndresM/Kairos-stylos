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
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Calendar, FileText, Wallet, Eye } from 'lucide-react'
import { previewLiquidadionRetiro, liquidarTrabajadorPorRetiro } from '@/features/nomina/services'
import { VolantePago } from '@/components/nomina/volante-pago'
import { toast } from '@/lib/toast-helper'

interface RetirementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  workerId: number
  workerName: string
  workerRole: string
}

export function RetirementModal({
  isOpen,
  onClose,
  onSuccess,
  workerId,
  workerName,
  workerRole
}: RetirementModalProps) {
  const [fechaRetiro, setFechaRetiro] = React.useState<string>(new Date().toISOString().split('T')[0])
  const [motivo, setMotivo] = React.useState('')
  const [basePay, setBasePay] = React.useState<number>(0)
  const [password, setPassword] = React.useState('')
  const [isPreviewing, setIsPreviewing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<any | null>(null)

  // Reset states on open/close
  React.useEffect(() => {
    if (isOpen) {
      setFechaRetiro(new Date().toISOString().split('T')[0])
      setMotivo('')
      setBasePay(0)
      setPassword('')
      setPreviewData(null)
    }
  }, [isOpen])

  const handlePreview = async () => {
    setIsPreviewing(true)
    try {
      const res = await previewLiquidadionRetiro(workerId, new Date(fechaRetiro), basePay)
      if (res.success && res.data) {
        setPreviewData(res.data)
        toast.success('PREVISUALIZACIÓN GENERADA', 'El volante de pago se ha calculado correctamente.')
      } else {
        toast.error('ERROR AL CALCULAR', res.error || 'No se pudo generar la previsualización.')
      }
    } catch (err) {
      console.error(err)
      toast.error('ERROR', 'Ocurrió un error inesperado.')
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleConfirmLiquidation = async () => {
    if (!password) {
      toast.error('CONTRASEÑA REQUERIDA', 'Debes ingresar tu contraseña de administrador.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await liquidarTrabajadorPorRetiro(workerId, new Date(fechaRetiro), motivo, basePay)
      if (res.success) {
        toast.success('TRABAJADOR LIQUIDADO', res.message || 'La liquidación ha sido confirmada con éxito.')
        onSuccess()
        onClose()
      } else {
        toast.error('ERROR EN LIQUIDACIÓN', res.error || 'Ocurrió un error al procesar el retiro.')
      }
    } catch (err) {
      console.error(err)
      toast.error('ERROR', 'Error al enviar la solicitud.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[650px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-3xl p-0 shadow-2xl animate-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 pb-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 text-orange-500 rounded-2xl">
              <Wallet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">
                Liquidar por Retiro a "{workerName}"
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-medium pt-1">
                Genera el volante definitivo, consolida deudas y desactiva al colaborador.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Formulario Inicial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-retiro" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Fecha de Retiro
              </Label>
              <Input
                id="fecha-retiro"
                type="date"
                className="rounded-xl border-slate-200 dark:border-slate-800 h-10 text-xs font-bold bg-white dark:bg-slate-900"
                value={fechaRetiro}
                onChange={(e) => {
                  setFechaRetiro(e.target.value)
                  setPreviewData(null) // Reset preview since parameters changed
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-pay" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                Sueldo Base Proporcional
              </Label>
              <Input
                id="base-pay"
                type="number"
                placeholder={workerRole === 'TECNICO' ? "0 (Automático)" : "0"}
                className={`rounded-xl border-slate-200 dark:border-slate-800 h-10 text-xs font-bold bg-white dark:bg-slate-900 ${
                  workerRole === 'TECNICO' ? 'opacity-65 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40 text-slate-400' : ''
                }`}
                value={workerRole === 'TECNICO' ? '0' : (basePay || '')}
                disabled={workerRole === 'TECNICO'}
                onChange={(e) => {
                  setBasePay(Number(e.target.value))
                  setPreviewData(null)
                }}
              />
              {workerRole === 'TECNICO' && (
                <p className="text-[8px] text-slate-400 font-medium tracking-tight">
                  * Pago automático de comisiones (Sueldo Base $0)
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label className="hidden md:block text-[10px] font-bold uppercase text-slate-400 tracking-wider opacity-0">Acción</Label>
              <Button
                type="button"
                onClick={handlePreview}
                disabled={isPreviewing || !fechaRetiro}
                className="w-full bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white font-bold rounded-xl h-10 text-xs shadow-md shadow-coral-500/10 transition-all flex items-center justify-center gap-2 border-none"
              >
                {isPreviewing ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                Previsualizar Volante
              </Button>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="motivo-retiro" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <FileText className="size-3.5" /> Motivo / Observaciones
              </Label>
              <Input
                id="motivo-retiro"
                placeholder="Ej. Renuncia voluntaria, término de mutuo acuerdo..."
                className="rounded-xl border-slate-200 dark:border-slate-800 h-10 text-xs font-medium bg-white dark:bg-slate-900"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>

          {/* Área de Previsualización */}
          {previewData ? (
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30 max-h-[400px] overflow-y-auto">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF7E5F] mb-4 text-center">Previsualización del Volante de Pago Definitivo</h4>
              <VolantePago data={previewData.volante} auditData={previewData.auditData} />
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 italic text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/30 dark:bg-slate-900/10">
              <AlertCircle className="size-5 text-slate-300 animate-pulse" />
              <span>Haz clic en "Previsualizar Volante" para calcular las ganancias, comisiones acumuladas y saldos pendientes de deudas del trabajador.</span>
            </div>
          )}

          {/* Confirmación y Contraseña de Seguridad */}
          {previewData && (
            <div className="border border-orange-100/80 dark:border-orange-950/30 bg-orange-50/30 dark:bg-orange-950/10 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="size-4 animate-bounce" /> Confirmación Administrativa de Retiro
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                Al confirmar la liquidación, el usuario de <span className="font-bold text-orange-600 dark:text-orange-400">"{workerName}"</span> quedará completamente <span className="font-bold">INACTIVO</span> y todas sus deudas pendientes serán marcadas como <span className="font-bold">LIQUIDADAS/PAGADAS</span> con este volante final de balance.
              </p>

              <div className="space-y-2 max-w-sm mx-auto">
                <Label htmlFor="retirement-password" className="text-[9px] font-black uppercase text-slate-400 tracking-widest block text-center">
                  Contraseña de Seguridad Administrador
                </Label>
                <Input
                  id="retirement-password"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl border-slate-200 dark:border-slate-800 h-10 text-center tracking-widest font-black placeholder:tracking-normal placeholder:font-normal bg-white dark:bg-slate-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 gap-2 flex flex-col sm:flex-row-reverse">
          <Button
            type="button"
            disabled={!previewData || !password || isSubmitting}
            onClick={handleConfirmLiquidation}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl h-10 px-6 shadow-md shadow-orange-600/10 text-xs uppercase tracking-wider flex-1 sm:flex-none min-w-[150px] transition-all hover:scale-[1.01] active:scale-[0.99] border-none"
          >
            {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Confirmar y Retirar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl font-bold text-xs uppercase tracking-wider h-10 px-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-1 sm:flex-none border border-transparent"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
