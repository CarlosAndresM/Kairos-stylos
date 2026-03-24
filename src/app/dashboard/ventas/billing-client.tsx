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
  const [isViewOnly, setIsViewOnly] = React.useState(false)
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

      // Filtros por columna (Exact match for most, partial match for services)
      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;

        if (col === 'servicios') {
          // If invoice has ANY of the selected services
          const invServices = (inv.servicios || "").split(", ").map((s: string) => s.trim().toUpperCase());
          const hasMatch = values.some(val => invServices.includes(val.toUpperCase()));
          if (!hasMatch) return false;
        } else {
          const val = inv[col]?.toString();
          if (!values.includes(val)) return false;
        }
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

  const handleOpenInvoice = async (invoice: any, isView: boolean = false) => {
    setIsFetchingInfo(true)
    try {
      const res = await getInvoiceById(invoice.FC_IDFACTURA_PK)
      if (res.success) {
        setSelectedInvoice(res.data)
        setIsViewOnly(isView)
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
    setIsViewOnly(false)
    setIsModalOpen(true)
  }

  return (
    <LoadingGate>
      <div className="space-y-4 md:space-y-6">
        {/* Date Navigation & Actions Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDay('prev')}
              className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <ChevronLeft className="size-5" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 px-4 rounded-lg font-semibold text-xs flex gap-2 text-slate-700"
                >
                  <CalendarIcon className="size-4 text-[#FF7E5F]" />
                  {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl border border-slate-200 shadow-xl" align="start">
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
              className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <ChevronRightIcon className="size-5" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center flex-1 sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Buscar factura..."
                className="pl-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
              />
            </div>

            <Button
              onClick={handleNewInvoice}
              className="w-full sm:w-auto bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white shadow-lg shadow-[#FF7E5F]/20 rounded-xl gap-2"
            >
              <Plus className="size-4" />
              Nueva Venta
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 py-0 px-4 w-[110px]">
                    <TableFilter
                      label="FACT. #"
                      options={getFilterOptions('FC_NUMERO_FACTURA')}
                      selectedValues={activeFilters['FC_NUMERO_FACTURA'] || []}
                      onFilterChange={(vals) => handleFilterChange('FC_NUMERO_FACTURA', vals)}
                    />
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
                    <TableFilter
                      label="SERVICIOS"
                      options={services.map(s => s.SV_NOMBRE).sort()}
                      selectedValues={activeFilters['servicios'] || []}
                      onFilterChange={(vals) => handleFilterChange('servicios', vals)}
                    />
                  </TableHead>
                  <TableHead className="h-10 py-0 px-4 text-right w-[110px]">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 pr-2">Total</span>
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
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Acción</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.FC_IDFACTURA_PK}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <TableCell className="py-2 px-4 font-bold text-slate-700 text-xs">
                        {invoice.FC_NUMERO_FACTURA}
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {invoice.sucursal_nombre}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[180px] block">
                          {invoice.cliente_display || 'Cliente General'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-4 text-[11px] text-slate-400 italic truncate max-w-[200px]">
                        {invoice.servicios || '--'}
                      </TableCell>
                      <TableCell className="py-2 px-4 text-right">
                        <span className={cn(
                          "text-sm font-black tracking-tight",
                          invoice.FC_ESTADO === 'CANCELADO' ? "text-slate-200 line-through" : "text-slate-800"
                        )}>
                          $ {Number(invoice.FC_TOTAL).toLocaleString('es-CO')}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-4 text-center">
                        <Badge className={cn(
                          "text-[10px] border-none",
                          invoice.FC_ESTADO === 'PAGADO' ? "bg-green-500 hover:bg-green-600 text-white" :
                            invoice.FC_ESTADO === 'PENDIENTE' ? "bg-amber-500 hover:bg-amber-600 text-white" :
                              "bg-red-500 hover:bg-red-600 text-white"
                        )}>
                          {invoice.FC_ESTADO}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenInvoice(invoice, true)}
                            title="Ver detalles"
                          >
                            <Eye className="size-4 text-slate-500" />
                          </Button>
                          {(invoice.FC_ESTADO === 'PENDIENTE' || sessionUser?.role === 'ADMINISTRADOR_TOTAL') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenInvoice(invoice, false)}
                              title="Editar factura"
                            >
                              <Pencil className="size-4 text-slate-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setInvoiceToDelete(invoice); setIsAdminDeleteAuthOpen(true) }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                            title="Eliminar factura"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Receipt className="size-8 mb-2 opacity-20" />
                        <p>No hay ventas registradas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <BillingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          technicians={technicians}
          services={services}
          products={products}
          paymentMethods={paymentMethods}
          invoice={selectedInvoice}
          isViewOnly={isViewOnly}
          sucursales={sucursales}
          sessionUser={sessionUser}
        />

        {/* Modal Autenticación Admin para Eliminar */}
        {isAdminDeleteAuthOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Trash2 className="size-4 text-red-500" /> Eliminar factura
              </h3>
              <p className="text-xs text-slate-500 mb-4">Esta acción es permanente. Ingrese la contraseña de administrador para confirmar.</p>
              <Input
                type="password"
                placeholder="Contraseña administrador"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mb-4"
                autoFocus
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && confirmDeleteInvoice()}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsAdminDeleteAuthOpen(false)
                    setAdminPassword('')
                    setInvoiceToDelete(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={confirmDeleteInvoice}
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 className="size-3 animate-spin" />}
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LoadingGate>
  )
}
