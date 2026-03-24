'use client'

import * as React from 'react'
import { Search, DollarSign, ArrowUpCircle, History, Filter } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { NumericFormat } from 'react-number-format'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Calendar as CalendarIcon,
  Camera,
  Upload,
  FileText,
  Eye,
  Trash2,
  CheckCircle2
} from 'lucide-react'
import { getCredits, payCredit, getCreditHistory } from '@/features/billing/credit-services'
import { toast } from '@/lib/toast-helper'
import { LoadingGate } from '@/components/ui/loading-gate'
import { Loader2 } from 'lucide-react'

export default function CreditsPage() {
  // Estados principales
  const [mounted, setMounted] = React.useState(false)
  const [credits, setCredits] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<'PENDIENTES' | 'HISTORICO'>('PENDIENTES')

  // Estados para abono
  const [isPayModalOpen, setIsPayModalOpen] = React.useState(false)
  const [selectedCredit, setSelectedCredit] = React.useState<any>(null)
  const [payAmount, setPayAmount] = React.useState<number>(0)
  const [abonoDate, setAbonoDate] = React.useState<Date>(new Date())
  const [abonoEvidenceUrl, setAbonoEvidenceUrl] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isUploadingEvidence, setIsUploadingEvidence] = React.useState(false)

  // Referencia para input de archivo
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Estados para trazabilidad
  const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false)
  const [creditHistory, setCreditHistory] = React.useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (mounted) fetchData()
  }, [mounted, activeTab])

  const fetchData = async () => {
    setLoading(true)
    const res = await getCredits(activeTab === 'HISTORICO')
    if (res.success) setCredits(res.data)
    setLoading(false)
  }

  const handlePayClick = (credit: any) => {
    setSelectedCredit(credit)
    setPayAmount(Number(credit.CR_VALOR_PENDIENTE))
    setAbonoDate(new Date())
    setAbonoEvidenceUrl('')
    setIsPayModalOpen(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingEvidence(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setAbonoEvidenceUrl(data.url)
        toast.success('Imagen cargada', 'La evidencia se ha adjuntado correctamente.')
      } else {
        toast.error('Error al subir', data.error || 'No se pudo subir la imagen.')
      }
    } catch (error) {
      toast.error('Error de red')
    } finally {
      setIsUploadingEvidence(false)
    }
  }

  const handleViewHistory = async (credit: any) => {
    setSelectedCredit(credit)
    setIsHistoryModalOpen(true)
    setLoadingHistory(true)
    try {
      const res = await getCreditHistory(credit.CR_IDCREDITO_PK)
      if (res.success) {
        setCreditHistory(res.data)
      } else {
        toast.error('Error', res.error || 'No se pudo cargar la trazabilidad.')
      }
    } catch (error) {
      toast.error('Error de sistema')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleConfirmPay = async () => {
    if (!selectedCredit || payAmount <= 0) {
      toast.error('Monto inválido', 'Por favor ingrese un valor superior a 0.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await payCredit(selectedCredit.CR_IDCREDITO_PK, payAmount, {
        date: abonoDate,
        evidenceUrl: abonoEvidenceUrl
      })
      if (res.success) {
        toast.success('Pago exitoso', 'El saldo del crédito ha sido actualizado.')
        setIsPayModalOpen(false)
        fetchData()
      } else {
        toast.error('Error', res.error || 'Ocurrió un problema al procesar el pago.')
      }
    } catch (error) {
      toast.error('Error de sistema')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredCredits = credits.filter(c =>
    c.FC_NUMERO_FACTURA.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.FC_CLIENTE_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.FC_CLIENTE_TELEFONO.includes(searchTerm)
  )

  const totalDebt = credits.reduce((acc, curr) => acc + Number(curr.CR_VALOR_PENDIENTE), 0)

  if (!mounted) return null

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Cuentas por Cobrar <span className="text-[#FF7E5F]">(Créditos)</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Gestión de facturas a crédito y seguimiento de pagos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('PENDIENTES')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'PENDIENTES' 
                  ? "bg-white dark:bg-slate-700 text-[#FF7E5F] shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <DollarSign className="size-3.5" />
              Pendientes
            </button>
            <button
              onClick={() => setActiveTab('HISTORICO')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'HISTORICO' 
                  ? "bg-white dark:bg-slate-700 text-[#FF7E5F] shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <History className="size-3.5" />
              Histórico
            </button>
          </div>
          
          <div className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-3 rounded-2xl flex flex-col justify-center min-w-[200px] shadow-lg shadow-slate-200 dark:shadow-none">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">TOTAL CARTERA</span>
            <span className="text-2xl font-black text-white">$ {totalDebt.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar por factura, cliente o teléfono..."
            className="pl-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <LoadingGate>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] px-6"># Fac</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Registro</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Sede</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Cliente</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Teléfono</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Servicios</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Total</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Pendiente</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredCredits.length > 0 ? (
                filteredCredits.map((credit, i) => (
                  <TableRow key={credit.CR_IDCREDITO_PK} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                    <TableCell className="px-6 py-4 font-bold text-xs text-slate-900 dark:text-white">
                      #{credit.FC_NUMERO_FACTURA}
                    </TableCell>
                    <TableCell className="text-[10px] font-medium text-slate-500 uppercase">
                      {format(new Date(credit.CR_FECHA), 'dd/MM/yy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-[10px] font-medium text-slate-500 uppercase">
                      {credit.sucursal_nombre}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {credit.cliente_display || credit.FC_CLIENTE_NOMBRE}
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-500">
                      {credit.FC_CLIENTE_TELEFONO}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-[10px] text-slate-500">
                      {credit.servicios || '---'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs text-slate-400">
                      $ {Number(credit.FC_TOTAL).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(credit.CR_VALOR_PENDIENTE) > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                          $ {Number(credit.CR_VALOR_PENDIENTE).toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
                          <CheckCircle2 className="size-3 mr-1" /> Liquidado
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-6">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewHistory(credit)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-[#FF7E5F] hover:bg-[#FF7E5F]/5"
                          title="Ver Trazabilidad"
                        >
                          <History className="size-4" />
                        </Button>
                        {Number(credit.CR_VALOR_PENDIENTE) > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handlePayClick(credit)}
                            className="h-8 px-4 bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white rounded-xl shadow-sm text-[10px] font-bold"
                          >
                            Abonar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-slate-400 italic text-xs">
                    No se encontraron créditos pendientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      </LoadingGate>

      {/* MODAL DE ABONO */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Registrar Pago / Abono</DialogTitle>
            <DialogDescription className="text-slate-500">
              Actualice el saldo del crédito seleccionado.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {selectedCredit && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Factura:</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">#{selectedCredit.FC_NUMERO_FACTURA}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Cliente:</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedCredit.FC_CLIENTE_NOMBRE}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                  <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Saldo pendiente:</span>
                  <span className="text-lg font-black text-red-600 dark:text-red-400">$ {Number(selectedCredit.CR_VALOR_PENDIENTE).toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-[#FF7E5F] block tracking-wider ItalIC">MONTO A PAGAR / ABONAR:</label>
                  <NumericFormat
                    value={payAmount}
                    onValueChange={(vals) => setPayAmount(vals.floatValue || 0)}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="$ "
                    className="w-full h-12 border border-slate-200 dark:border-slate-800 px-4 text-xl font-black bg-slate-50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7E5F]/20 rounded-xl transition-all"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400">FECHA DE ABONO:</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-10 border-slate-200 dark:border-slate-800 rounded-xl justify-start px-3 font-medium text-xs hover:bg-slate-50"
                        >
                          <CalendarIcon className="mr-2 size-4 text-[#FF7E5F]" />
                          {abonoDate ? format(abonoDate, "dd/MM/yyyy") : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl border border-slate-200 overflow-hidden" align="start">
                        <Calendar mode="single" selected={abonoDate} onSelect={(d) => d && setAbonoDate(d)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold uppercase text-slate-400">EVIDENCIA PAGO:</label>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 border-slate-200 dark:border-slate-800 rounded-xl justify-start px-3 font-medium text-xs",
                        abonoEvidenceUrl ? "bg-emerald-50 text-emerald-700 border-emerald-500" : "bg-white"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingEvidence}
                      type="button"
                    >
                      {isUploadingEvidence ? (
                        <Loader2 className="mr-2 size-4 animate-spin font-bold" />
                      ) : abonoEvidenceUrl ? (
                        <CheckCircle2 className="mr-2 size-4 text-emerald-600" />
                      ) : (
                        <Camera className="mr-2 size-4 text-slate-400" />
                      )}
                      {isUploadingEvidence ? "Subiendo..." : abonoEvidenceUrl ? "Adjuntado" : "Foto / Voucher"}
                    </Button>

                    {abonoEvidenceUrl && (
                      <button
                        type="button"
                        onClick={() => setAbonoEvidenceUrl('')}
                        className="absolute -right-1 -top-1 bg-red-600 text-white rounded-full p-1 shadow-sm hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {abonoEvidenceUrl && (
                  <div className="border border-slate-100 dark:border-slate-800 bg-slate-50 rounded-xl p-2 overflow-hidden">
                    <img
                      src={abonoEvidenceUrl}
                      alt="Vista previa evidencia"
                      className="w-full h-32 object-contain hover:scale-105 transition-all cursor-zoom-in"
                      onClick={() => window.open(abonoEvidenceUrl, '_blank')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-2 sm:gap-0 sm:justify-between border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs h-11 px-6 text-slate-500 hover:bg-white"
              onClick={() => setIsPayModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white text-xs h-11 px-8 rounded-xl shadow-lg shadow-[#FF7E5F]/20 gap-2 border-none"
              onClick={handleConfirmPay}
              disabled={isSubmitting || payAmount <= 0}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin text-white" />
              ) : (
                <DollarSign className="size-4" />
              )}
              {isSubmitting ? 'Procesando...' : 'Registrar Abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL DE TRAZABILIDAD */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-2xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-0 bg-white dark:bg-slate-900 overflow-hidden">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Trazabilidad de pagos</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              Historial completo de abonos realizados para liquidar esta deuda.
            </DialogDescription>
          </DialogHeader>

          <div className="p-0 max-h-[500px] overflow-y-auto">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="size-10 animate-spin text-slate-200" />
                <span className="text-xs font-bold text-slate-400">Recuperando historial...</span>
              </div>
            ) : creditHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold uppercase text-slate-500 h-12 px-6">FECHA DEL ABONO</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase text-slate-500 h-12 text-right px-6">MONTO ABONADO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditHistory.map((abono) => (
                      <TableRow key={abono.AB_IDABONO_PK} className="hover:bg-slate-50 transition-colors border-b border-slate-100 dark:border-slate-800">
                        <TableCell className="px-6 py-5">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {format(new Date(abono.AB_FECHA), "dd 'de' MMMM, yyyy", { locale: es })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-6 py-5">
                          <div className="flex items-center justify-end gap-4">
                            {abono.AB_EVIDENCIA_URL && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-[#FF7E5F] hover:bg-[#FF7E5F]/5 rounded-xl border-none"
                                onClick={() => window.open(abono.AB_EVIDENCIA_URL, '_blank')}
                                title="Ver Comprobante"
                              >
                                <Camera className="size-4 mr-2" />
                                Ver Foto
                              </Button>
                            )}
                            <span className="text-lg font-black text-slate-900 dark:text-white">
                              $ {Number(abono.AB_MONTO).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="bg-orange-50 p-6 rounded-full">
                  <History className="h-12 w-12 text-orange-200" />
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase text-slate-400 italic">No hay abonos registrados todavía.</p>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Proceda a registrar el primer pago del cliente.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <Button
              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold h-11 rounded-xl shadow-lg border-none"
              onClick={() => setIsHistoryModalOpen(false)}
            >
              Cerrar Historial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
