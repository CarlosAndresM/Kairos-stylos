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
import { Input } from '@/components/ui/input'
import { Search, Loader2, ShieldAlert } from 'lucide-react'
import { searchOldInvoiceForWarranty } from '@/features/billing/services'
import { toast } from '@/lib/toast-helper'
import { NumericFormat } from 'react-number-format'

interface GarantiaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: { detalleOriginalId: number, tecnicoOriginalId: number }) => void
}

export function GarantiaModal({ isOpen, onClose, onSuccess }: GarantiaModalProps) {
  const [invoiceNumber, setInvoiceNumber] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [invoiceData, setInvoiceData] = React.useState<any>(null)
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [selectedServiceId, setSelectedServiceId] = React.useState<number | null>(null)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) {
      setInvoiceNumber('')
      setInvoiceData(null)
      setSearchResults([])
      setSelectedServiceId(null)
      setOpen(false)
    }
  }, [isOpen])

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async () => {
    if (!invoiceNumber.trim()) {
      toast.error('Ingrese un número de factura o cliente')
      return
    }

    setIsLoading(true)
    try {
      const res = await searchOldInvoiceForWarranty(invoiceNumber.trim())
      if (res.success && res.data) {
        setSearchResults(res.data)
        setOpen(true)
      } else {
        toast.error('No se encontraron coincidencias')
        setSearchResults([])
        setOpen(false)
      }
    } catch (error) {
      toast.error('Error al buscar factura')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!selectedServiceId) {
      toast.error('Seleccione un servicio a cubrir por garantía')
      return
    }

    const service = invoiceData.services.find((s: any) => s.fd_iddetalle_pk === selectedServiceId)
    if (!service) return

    onSuccess({
      detalleOriginalId: service.fd_iddetalle_pk,
      tecnicoOriginalId: service.tecnico_id
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <ShieldAlert className="size-5 text-emerald-600" />
            Vincular Garantía
          </DialogTitle>
          <DialogDescription>
            Busca la factura anterior para relacionar el mal servicio y descontarlo al técnico responsable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="relative w-full" ref={containerRef}>
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="size-4" />
                </div>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setOpen(true)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Número de factura o cliente..."
                  className="pl-9 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                  autoComplete="off"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm px-6">
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            {open && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <ul className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                  {searchResults.map((result: any) => (
                    <li
                      key={result.invoice.fc_idfactura_pk}
                      className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex flex-col group transition-colors border-b border-slate-50 last:border-0"
                      onClick={() => {
                        setInvoiceData(result)
                        setInvoiceNumber(result.invoice.fc_numero_factura)
                        if (result.services.length === 1) {
                          setSelectedServiceId(result.services[0].fd_iddetalle_pk)
                        } else {
                          setSelectedServiceId(null)
                        }
                        setOpen(false)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          Factura #{result.invoice.fc_numero_factura}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                          {new Date(result.invoice.fc_fecha).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-1">
                        Cliente: {result.invoice.cliente_display}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {invoiceData && (
            <div className="bg-slate-50 border rounded-xl p-3 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Factura #{invoiceData.invoice.fc_numero_factura}</span>
                <span className="text-xs font-bold text-slate-800">{invoiceData.invoice.cliente_display}</span>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Seleccionar servicio defectuoso:</p>
                {invoiceData.services.length === 0 && (
                  <p className="text-xs italic text-slate-500">Esta factura no tiene servicios registrados.</p>
                )}
                {invoiceData.services.map((s: any) => (
                  <div 
                    key={s.fd_iddetalle_pk}
                    onClick={() => setSelectedServiceId(s.fd_iddetalle_pk)}
                    className={"p-3 border rounded-xl cursor-pointer flex justify-between items-center transition-all " + (selectedServiceId === s.fd_iddetalle_pk ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-200 hover:border-emerald-300')}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">{s.sv_nombre}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Técnico original: <span className="font-bold text-slate-700">{s.tecnico_nombre}</span></span>
                    </div>
                    <div className={"size-4 rounded-full border-2 flex items-center justify-center " + (selectedServiceId === s.fd_iddetalle_pk ? 'border-emerald-600' : 'border-slate-300')}>
                      {selectedServiceId === s.fd_iddetalle_pk && <div className="size-2 rounded-full bg-emerald-600" />}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedServiceId} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
            Confirmar Garantía
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
