'use client'

import * as React from 'react'
import { 
    Plus, 
    Search, 
    Receipt, 
    User, 
    DollarSign, 
    ChevronRight, 
    Loader2, 
    Pencil, 
    Trash2, 
    Eye,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    Calendar as CalendarIcon,
    Filter,
    X
} from 'lucide-react'
import { LoadingGate } from '@/components/ui/loading-gate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { BillingModal } from '@/app/dashboard/ventas/billing-modal'
import { getInvoiceById, deleteInvoice, verifyAdminPassword, getInvoicesByFilter } from '@/features/billing/services'
import { toast } from '@/lib/toast-helper'
import { addDays, subDays, startOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { TableFilter } from '@/components/ui/table-filter'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface BillingClientProps {
  initialInvoices: any[]
  technicians: any[]
  services: any[]
  products: any[]
  paymentMethods: any[]
  sucursales: any[]
  sessionUser: any
}

/**
 * Componente cliente para la gestión de facturación y ventas
 */
export function BillingClient({
  initialInvoices,
  technicians,
  services,
  products,
  paymentMethods,
  sucursales,
  sessionUser
}: BillingClientProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const [searchTerm, setSearchTerm] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null)
  const [isFetchingInfo, setIsFetchingInfo] = React.useState(false)
  const [invoices, setInvoices] = React.useState<any[]>(initialInvoices)
  const [isLoading, setIsLoading] = React.useState(false)

  // Filtros interactivos (APEX style)
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date())
  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  const [isAdminDeleteAuthOpen, setIsAdminDeleteAuthOpen] = React.useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<any>(null)
  const [adminPassword, setAdminPassword] = React.useState('')
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Fetch invoices when date changes
  const fetchInvoices = React.useCallback(async (date: Date) => {
    setIsLoading(true)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await getInvoicesByFilter({ date: dateStr })
      if (res.success) {
        setInvoices(res.data)
      } else {
        toast.error('Error al cargar ventas del día')
      }
    } catch (error) {
      toast.error('Error de red')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Refetch when date changes
  React.useEffect(() => {
    fetchInvoices(currentDate)
  }, [currentDate, fetchInvoices])

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter(inv => {
      // Búsqueda general
      const searchMatch = !searchTerm ||
        (inv.cliente_display || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.FC_NUMERO_FACTURA || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.sucursal_nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.servicios || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      // Filtros por columna
      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;

        const val = inv[col]?.toString();
        if (!values.includes(val)) return false;
      }

      return true;
    });
  }, [invoices, searchTerm, activeFilters])

  // Obtener opciones únicas para los filtros (LOV)
  const getFilterOptions = (col: string) => {
    return Array.from(new Set(invoices.map(inv => inv[col]?.toString() || ''))).filter(Boolean).sort()
  }

  const handleFilterChange = (col: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [col]: values }))
  }

  const navigateDay = (dir: 'prev' | 'next') => {
    setCurrentDate(prev => dir === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const handleOpenInvoice = async (invoice: any) => {
    setIsFetchingInfo(true)
    try {
      const res = await getInvoiceById(invoice.FC_IDFACTURA_PK)
      if (res.success) {
        setSelectedInvoice(res.data)
        setIsModalOpen(true)
      } else {
        toast.error(res.error || 'Error al obtener detalles de la factura')
      }
    } catch (error) {
      toast.error('Error de red')
    } finally {
      setIsFetchingInfo(false)
    }
  }

  const confirmDeleteInvoice = async () => {
    if (!adminPassword) {
      toast.error('Ingrese la contraseña de administrador')
      return
    }

    setIsDeleting(true)
    try {
      const authRes = await verifyAdminPassword(adminPassword)
      if (!authRes.success) {
        toast.error(authRes.error || 'Contraseña incorrecta')
        return
      }

      const res = await deleteInvoice(invoiceToDelete.FC_IDFACTURA_PK)
      if (res.success) {
        toast.success('Factura eliminada correctamente')
        setIsAdminDeleteAuthOpen(false)
        setAdminPassword('')
        setInvoiceToDelete(null)
      } else {
        toast.error(res.error || 'Error al eliminar factura')
      }
    } catch (error) {
      toast.error('Error de sistema al eliminar')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleNewInvoice = () => {
    setSelectedInvoice(null)
    setIsModalOpen(true)
  }

  return (
    <LoadingGate>
      <div className="space-y-6">
      {/* Date Navigation & Actions Header */}
      <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-slate-100 dark:bg-slate-900/50 p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border-2 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDay('prev')}
            className="h-9 w-9 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="size-5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-4 rounded-none font-black text-xs uppercase tracking-tighter flex gap-2 border-x border-slate-200 dark:border-slate-800"
              >
                <CalendarIcon className="size-4 text-[#FF7E5F]" />
                {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
                initialFocus
                className="font-bold"
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDay('next')}
            className="h-9 w-9 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRightIcon className="size-5" />
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center flex-1 sm:justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Filtro rápido..."
              className="pl-10 h-10 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-950 font-bold text-xs uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>

          <Button
            onClick={handleNewInvoice}
            className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white font-black gap-2 rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-10 px-6 text-sm uppercase italic"
          >
            <Plus className="size-4" />
            Nueva Factura
          </Button>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm overflow-hidden max-h-[70vh] overflow-y-auto">
        <Table className="border-collapse">
          <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm border-b-2 border-black">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 py-0 px-4 w-[110px]">
                <TableFilter
                  label="FACT. #"
                  options={getFilterOptions('FC_NUMERO_FACTURA')}
                  selectedValues={activeFilters['FC_NUMERO_FACTURA'] || []}
                  onFilterChange={(vals) => handleFilterChange('FC_NUMERO_FACTURA', vals)}
                />
              </TableHead>
              <TableHead className="h-10 py-0 px-4 w-[130px]">
                <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">HORA</span>
              </TableHead>
              <TableHead className="h-10 py-0 px-4">
                <TableFilter
                  label="SUCURSAL"
                  options={getFilterOptions('sucursal_nombre')}
                  selectedValues={activeFilters['sucursal_nombre'] || []}
                  onFilterChange={(vals) => handleFilterChange('sucursal_nombre', vals)}
                />
              </TableHead>
              <TableHead className="h-10 py-0 px-4">
                <TableFilter
                  label="CLIENTE"
                  options={getFilterOptions('cliente_display')}
                  selectedValues={activeFilters['cliente_display'] || []}
                  onFilterChange={(vals) => handleFilterChange('cliente_display', vals)}
                />
              </TableHead>
              <TableHead className="h-10 py-0 px-4">
                <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">SERVICIOS</span>
              </TableHead>
              <TableHead className="h-10 py-0 px-4 text-right w-[110px]">
                <span className="font-black uppercase tracking-widest text-[10px] text-slate-500 pr-2">TOTAL</span>
              </TableHead>
              <TableHead className="h-10 py-0 px-4 text-center w-[100px]">
                <TableFilter
                  label="ESTADO"
                  align="center"
                  options={['PENDIENTE', 'PAGADO', 'CANCELADO']}
                  selectedValues={activeFilters['FC_ESTADO'] || []}
                  onFilterChange={(vals) => handleFilterChange('FC_ESTADO', vals)}
                />
              </TableHead>
              <TableHead className="h-10 py-0 px-4 text-right w-[60px]">
                <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">ACCIÓN</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.FC_IDFACTURA_PK}
                  className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50"
                >
                  <TableCell className="py-2 px-4 font-bold text-slate-900 dark:text-white text-xs">
                    {invoice.FC_NUMERO_FACTURA}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-[10px] font-medium text-slate-500">
                    {format(new Date(invoice.FC_FECHA), "HH:mm 'hs'", { locale: es })}
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <span className="text-[10px] font-black uppercase text-slate-500 italic bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                      {invoice.sucursal_nombre}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px] block">
                      {invoice.cliente_display || 'Cliente General'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-4 text-[11px] text-slate-500 italic truncate max-w-[200px]">
                    {invoice.servicios || '--'}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <span className={cn(
                      "text-sm font-black tracking-tight",
                      invoice.FC_ESTADO === 'CANCELADO' ? "text-slate-300 line-through" : "text-slate-900 dark:text-white"
                    )}>
                      $ {Number(invoice.FC_TOTAL).toLocaleString('es-CO')}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-4 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border",
                      invoice.FC_ESTADO === 'PAGADO' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                        invoice.FC_ESTADO === 'PENDIENTE' ? "bg-orange-50 text-orange-600 border-orange-200" :
                          "bg-red-50 text-red-600 border-red-200"
                    )}>
                      {invoice.FC_ESTADO}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenInvoice(invoice)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                        title="Ver detalles"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      {invoice.FC_ESTADO === 'PENDIENTE' && (
                        <button
                          onClick={() => handleOpenInvoice(invoice)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                          title="Editar factura"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setInvoiceToDelete(invoice)
                          setIsAdminDeleteAuthOpen(true)
                        }}
                        className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all"
                        title="Eliminar factura"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500 italic">
                  No hay ventas registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BillingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        technicians={technicians}
        services={services}
        products={products}
        paymentMethods={paymentMethods}
        invoice={selectedInvoice}
        sucursales={sucursales}
        sessionUser={sessionUser}
      />

      {/* Modal Autenticación Admin para Eliminar */}
      {isAdminDeleteAuthOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-800 p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
            <h3 className="text-sm font-black uppercase mb-4 tracking-tighter text-red-600 flex items-center gap-2">
              <Trash2 className="size-4" /> REQUERIDO ADMIN
            </h3>
            <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase italic">Para eliminar definitivamente una factura debe autorizar como administrador.</p>
            <Input
              type="password"
              placeholder="CONTRASEÑA ADMINISTRADOR"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="rounded-none border-black mb-4 font-black bg-white text-black"
              autoFocus
              autoComplete="new-password"
              onKeyDown={(e) => e.key === 'Enter' && confirmDeleteInvoice()}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-none border-black uppercase font-bold text-xs"
                onClick={() => {
                  setIsAdminDeleteAuthOpen(false)
                  setAdminPassword('')
                  setInvoiceToDelete(null)
                }}
              >
                CANCELAR
              </Button>
              <Button
                className="flex-1 rounded-none bg-red-600 text-white hover:bg-red-700 uppercase font-black text-xs gap-2"
                onClick={confirmDeleteInvoice}
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="size-3 animate-spin" />}
                CONFIRMAR ELIMINACIÓN
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </LoadingGate>
  )
}
