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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { searchOldInvoiceForWarranty } from '@/features/billing/services'
import { toast } from '@/lib/toast-helper'
import { NumericFormat } from 'react-number-format'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface GarantiaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: { detalleOriginalId: number, tecnicoOriginalId: number }) => void
}

export function GarantiaModal({ isOpen, onClose, onSuccess }: GarantiaModalProps) {
  const [invoiceNumber, setInvoiceNumber] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [clientData, setClientData] = React.useState<any>(null)
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [selectedServiceId, setSelectedServiceId] = React.useState<number | null>(null)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) {
      setInvoiceNumber('')
      setClientData(null)
      setSearchResults([])
      setSelectedServiceId(null)
      setServiceSearch('')
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
      toast.error('Ingrese un número de factura, cliente o teléfono')
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

    if (!clientData) return;
    const allServices = clientData.invoices.flatMap((inv: any) => inv.services)
    const service = allServices.find((s: any) => s.fd_iddetalle_pk === selectedServiceId)
    if (!service) return

    onSuccess({
      detalleOriginalId: service.fd_iddetalle_pk,
      tecnicoOriginalId: service.tecnico_id
    })
    onClose()
  }

  // Group search results by client
  const groupedClients = React.useMemo(() => {
    const map = new Map();
    searchResults.forEach(result => {
      // Usar nombre y telefono como llave, si no tiene teléfono usar solo nombre
      const key = `${result.invoice.cliente_display}-${result.invoice.fc_cliente_telefono || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          name: result.invoice.cliente_display,
          phone: result.invoice.fc_cliente_telefono,
          invoices: []
        });
      }
      map.get(key).invoices.push(result);
    });
    return Array.from(map.values());
  }, [searchResults]);

  // Extract all services for the selected client and sort by date DESC
  const allClientServices = React.useMemo(() => {
    if (!clientData) return [];
    return clientData.invoices
      .flatMap((inv: any) => inv.services.map((s: any) => ({ ...s, invoice: inv.invoice })))
      .sort((a: any, b: any) => new Date(b.invoice.fc_fecha).getTime() - new Date(a.invoice.fc_fecha).getTime());
  }, [clientData]);

  const [serviceSearch, setServiceSearch] = React.useState('')
  const filteredClientServices = React.useMemo(() => {
    if (!serviceSearch.trim()) return allClientServices;
    const lowerSearch = serviceSearch.toLowerCase();
    return allClientServices.filter((s: any) => s.sv_nombre.toLowerCase().includes(lowerSearch));
  }, [allClientServices, serviceSearch]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <ShieldAlert className="size-5 text-emerald-600" />
            Vincular Garantía
          </DialogTitle>
          <DialogDescription>
            Busca la factura, nombre o teléfono para encontrar el cliente y selecciona el servicio original defectuoso.
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
                  placeholder="Número de factura, nombre o teléfono..."
                  className="pl-9 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                  autoComplete="off"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm px-4 sm:px-6 shrink-0">
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            {open && groupedClients.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <ul className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                  {groupedClients.map((client: any, idx: number) => (
                    <li
                      key={idx}
                      className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex flex-col group transition-colors border-b border-slate-50 last:border-0"
                      onClick={() => {
                        setClientData(client)
                        setInvoiceNumber(client.name)
                        setSelectedServiceId(null)
                        setServiceSearch('')
                        setOpen(false)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          {client.name} {client.phone ? ` - ${client.phone}` : ''}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                          {client.invoices.length} {client.invoices.length === 1 ? 'Factura' : 'Facturas'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {clientData && (
            <div className="bg-slate-50 border rounded-xl p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-2 gap-1">
                <span className="text-xs font-bold text-slate-800 uppercase">{clientData.name}</span>
                {clientData.phone && <span className="text-xs font-bold text-slate-500">{clientData.phone}</span>}
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Seleccionar servicio defectuoso de su historial:</p>
                  <div className="relative w-full sm:w-48 shrink-0">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search className="size-3" />
                    </div>
                    <Input
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Filtrar servicio..."
                      className="h-7 pl-8 text-xs bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                {filteredClientServices.length === 0 ? (
                  <p className="text-xs italic text-slate-500">No se encontraron servicios registrados.</p>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <Table wrapperClassName="max-h-[40vh] sm:max-h-72 overflow-y-auto overflow-x-auto custom-scrollbar">
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 w-[40px] text-center"></TableHead>
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 min-w-[120px]">Servicio</TableHead>
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 min-w-[100px]">Técnico original</TableHead>
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 text-center min-w-[80px]">Factura</TableHead>
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 text-center min-w-[80px]">Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClientServices.map((s: any) => (
                          <TableRow 
                            key={s.fd_iddetalle_pk}
                            onClick={() => setSelectedServiceId(s.fd_iddetalle_pk)}
                            className={`cursor-pointer transition-colors border-b border-slate-100/50 last:border-0 ${selectedServiceId === s.fd_iddetalle_pk ? 'bg-emerald-50/50 hover:bg-emerald-50/70' : 'hover:bg-slate-50/50'}`}
                          >
                            <TableCell className="px-2 sm:px-4 py-3 text-center">
                              <div className={`size-4 mx-auto rounded-full border-2 flex items-center justify-center transition-colors ${selectedServiceId === s.fd_iddetalle_pk ? 'border-emerald-600' : 'border-slate-300'}`}>
                                {selectedServiceId === s.fd_iddetalle_pk && <div className="size-2 rounded-full bg-emerald-600" />}
                              </div>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-3">
                              <span className="text-xs font-bold text-slate-800">{s.sv_nombre}</span>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-3">
                              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">{s.tecnico_nombre}</span>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-3 text-center">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase whitespace-nowrap">
                                #{s.invoice.fc_numero_factura}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-3 text-center">
                              <span className="text-[10px] font-medium text-slate-500 tabular-nums whitespace-nowrap">
                                {format(new Date(s.invoice.fc_fecha), "dd/MM/yyyy", { locale: es })}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedServiceId} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl w-full sm:w-auto mt-2 sm:mt-0">
            Confirmar Garantía
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
