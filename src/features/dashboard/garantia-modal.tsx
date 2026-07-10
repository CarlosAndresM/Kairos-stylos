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
  onSuccess: (data: { detalleOriginalId: number, tecnicoOriginalId: number, factura?: string, servicio?: string, tecnicoOriginalNombre?: string }) => void
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
      setSearchResults([])
      setClientData(null)
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

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const query = invoiceNumber.trim();
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setSearchResults([]);
        setOpen(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [invoiceNumber]);

  const performSearch = async (query: string) => {
    setIsLoading(true)
    try {
      const res = await searchOldInvoiceForWarranty(query)
      if (res.success && res.data && res.data.length > 0) {
        setSearchResults(res.data)
        setOpen(true)
      } else {
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
    
    let selectedInv = null;
    let service = null;
    
    for(const inv of clientData.invoices) {
      const s = inv.services.find((serv: any) => serv.fd_iddetalle_pk === selectedServiceId);
      if (s) {
        selectedInv = inv;
        service = s;
        break;
      }
    }
    
    if (!service || !selectedInv) return;

    onSuccess({
      detalleOriginalId: service.fd_iddetalle_pk,
      tecnicoOriginalId: service.tecnico_id,
      factura: selectedInv.invoice.fc_numero_factura,
      servicio: service.sv_nombre,
      tecnicoOriginalNombre: service.tecnico_nombre
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
      <DialogContent className="sm:max-w-5xl max-w-5xl max-h-[95vh] p-4 sm:p-5 overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <ShieldAlert className="size-5 text-emerald-600" />
            Vincular Garantía
          </DialogTitle>
          <DialogDescription>
            Busca la factura, nombre o teléfono para encontrar el cliente y selecciona el servicio original defectuoso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[60vh] min-h-[400px] max-h-[800px] overflow-hidden my-1">
          {/* Panel Izquierdo: Buscador y Resultados */}
          <div className="md:col-span-4 flex flex-col gap-2 h-full border-r pr-2 md:pr-3 overflow-hidden">
            <div className="relative shrink-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="size-4" />
              </div>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Buscar cliente, factura o teléfono..."
                className="pl-9 pr-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all h-10 text-sm shadow-sm"
                autoComplete="off"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
              {groupedClients.length > 0 ? (
                <ul className="space-y-1 pb-4">
                  {groupedClients.map((client: any, idx: number) => {
                    const isSelected = clientData?.name === client.name && clientData?.phone === client.phone;
                    return (
                      <li
                        key={idx}
                        className={`px-3 py-2.5 rounded-lg cursor-pointer flex flex-col transition-all border ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                        onClick={() => {
                          setClientData(client)
                          setSelectedServiceId(null)
                          setServiceSearch('')
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-sm font-bold truncate ${isSelected ? 'text-emerald-800' : 'text-slate-700'}`}>
                            {client.name}
                          </span>
                          {client.phone && (
                            <span className="text-xs font-medium text-slate-500">{client.phone}</span>
                          )}
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase w-fit mt-1">
                            {client.invoices.length} {client.invoices.length === 1 ? 'Factura' : 'Facturas'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : invoiceNumber.trim().length >= 2 && !isLoading ? (
                <p className="text-xs text-center text-slate-500 italic mt-6">No se encontraron clientes.</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40 space-y-2 pb-10">
                  <Search className="size-8 text-slate-300" />
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Busca para ver resultados</p>
                </div>
              )}
            </div>
          </div>

          {/* Panel Derecho: Tabla de Servicios */}
          <div className="md:col-span-8 flex flex-col h-full overflow-hidden">
            {clientData ? (
              <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-xl p-2 sm:p-3 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-200 pb-2 mb-2 gap-2 shrink-0">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-slate-800 uppercase truncate" title={clientData.name}>{clientData.name}</span>
                    {clientData.phone && <span className="text-xs font-medium text-slate-500">{clientData.phone}</span>}
                  </div>
                  <div className="relative w-full sm:w-56 shrink-0">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search className="size-3" />
                    </div>
                    <Input
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Filtrar servicio..."
                      className="h-8 pl-8 text-xs bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm">
                  {filteredClientServices.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                      <p className="text-sm font-medium text-slate-500">No se encontraron servicios registrados.</p>
                      <p className="text-xs text-slate-400 mt-1">Intenta cambiar el filtro de búsqueda.</p>
                    </div>
                  ) : (
                    <Table wrapperClassName="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative h-full">
                      <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 w-[40px] text-center"></TableHead>
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 min-w-[140px]">Servicio</TableHead>
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 min-w-[120px]">Técnico original</TableHead>
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 text-center min-w-[80px]">Factura</TableHead>
                          <TableHead className="px-2 sm:px-4 py-3 text-[10px] font-bold uppercase text-slate-500 text-center min-w-[90px]">Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClientServices.map((s: any) => (
                          <TableRow 
                            key={s.fd_iddetalle_pk}
                            onClick={() => setSelectedServiceId(s.fd_iddetalle_pk)}
                            className={`cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${selectedServiceId === s.fd_iddetalle_pk ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/60'}`}
                          >
                            <TableCell className="px-2 sm:px-4 py-3 text-center align-middle">
                              <div className={`size-4 mx-auto rounded-full border-2 flex items-center justify-center transition-colors ${selectedServiceId === s.fd_iddetalle_pk ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300 bg-white'}`}>
                                {selectedServiceId === s.fd_iddetalle_pk && <div className="size-2 rounded-full bg-emerald-600" />}
                              </div>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-3 align-middle">
                              <span className="text-xs font-bold text-slate-800 block">{s.sv_nombre}</span>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-3 align-middle">
                              <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap block">{s.tecnico_nombre}</span>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-3 text-center align-middle">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase whitespace-nowrap inline-block">
                                #{s.invoice.fc_numero_factura}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-3 text-center align-middle">
                              <span className="text-[11px] font-medium text-slate-500 tabular-nums whitespace-nowrap block">
                                {format(new Date(s.invoice.fc_fecha), "dd/MM/yyyy", { locale: es })}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="text-center space-y-3 opacity-60 max-w-xs">
                  <div className="size-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ShieldAlert className="size-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Ningún cliente seleccionado</p>
                  <p className="text-xs text-slate-500">Busca a la izquierda y selecciona un cliente para ver su historial completo de servicios.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl w-full sm:w-auto h-11 px-6">Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedServiceId} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl w-full sm:w-auto h-11 px-8 mt-2 sm:mt-0 font-medium shadow-sm transition-all">
            Confirmar Garantía
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
