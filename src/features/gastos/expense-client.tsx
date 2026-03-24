'use client'

import * as React from 'react'
import {
  Plus,
  LayoutList,
  CircleDollarSign,
  TrendingDown,
  Loader2,
  Search
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { TableFilter } from '@/components/ui/table-filter'
import { toast } from '@/lib/toast-helper'
import { UnifiedGasto, GastoData } from './schema'
import { createExpense } from './services'
import { getSedes } from '@/features/trabajadores/services'

interface ExpenseClientProps {
  initialData: UnifiedGasto[]
  user: any
}

export function ExpenseClient({ initialData, user }: ExpenseClientProps) {
  const [data, setData] = React.useState<UnifiedGasto[]>(initialData)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [sedes, setSedes] = React.useState<any[]>([])

  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  // Form State
  const [formData, setFormData] = React.useState<GastoData>({
    GS_CONCEPTO: '',
    GS_DESCRIPCION: '',
    GS_VALOR: 0,
    GS_FECHA: new Date(),
    SC_IDSUCURSAL_FK: user?.sucursalId || null
  })

  React.useEffect(() => {
    const fetchSedes = async () => {
      const res = await getSedes()
      if (res.success) setSedes(res.data)
    }
    fetchSedes()
  }, [])

  const filteredData = React.useMemo(() => {
    return data.filter(item => {
      // Búsqueda general
      const searchMatch = !searchTerm ||
        item.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.descripcion || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sucursal || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tipo.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      // Filtros por columna
      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;
        const val = (item[col as keyof UnifiedGasto] as string)?.toString() || 'GENERAL';
        if (!values.includes(val)) return false;
      }

      return true;
    })
  }, [data, searchTerm, activeFilters])

  const getFilterOptions = (col: keyof UnifiedGasto) => {
    return Array.from(new Set(data.map(item => (item[col] as string)?.toString() || 'GENERAL'))).filter(Boolean).sort()
  }

  const handleFilterChange = (col: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [col]: values }))
  }

  const handleOpenModal = () => {
    setFormData({
      GS_CONCEPTO: '',
      GS_DESCRIPCION: '',
      GS_VALOR: 0,
      GS_FECHA: new Date(),
      SC_IDSUCURSAL_FK: user?.role === 'ADMINISTRADOR_PUNTO' ? user?.sucursalId : null
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.GS_CONCEPTO || formData.GS_VALOR <= 0) {
      toast.error("Datos inválidos", "Por favor completa el concepto y valor.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createExpense(formData)
      if (res.success) {
        toast.success("Gasto registrado")
        setIsModalOpen(false)
        window.location.reload()
      } else {
        toast.error("Error", res.error || "No se pudo registrar el gasto")
      }
    } catch (error) {
      toast.error("Error de sistema")
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalGastos = data.reduce((acc, curr) => acc + Number(curr.valor), 0)

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header compact section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 shadow-sm">
              <TrendingDown className="size-6 text-[#FF7E5F]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B]">Gastos</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium italic">Historial unificado de egresos y nómina confirmada.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="h-14 flex items-center bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl px-4 shadow-sm group transition-all hover:border-[#FF7E5F]">
            <div className="border-r border-slate-100 pr-4 mr-4 hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">TOTAL EGRESOS</p>
              <p className="text-xl font-black text-slate-900 dark:text-white leading-none tabular-nums">
                $ {totalGastos.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="sm:hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">TOTAL:</p>
              <p className="text-base font-black text-slate-900">$ {totalGastos.toLocaleString('es-CO')}</p>
            </div>
            <CircleDollarSign className="size-5 text-[#FF7E5F] group-hover:scale-110 transition-transform" />
          </div>

          <Button
            onClick={handleOpenModal}
            className="bg-[#FF7E5F] text-white hover:bg-[#FF7E5F]/90 rounded-2xl border-none font-bold h-14 px-8 shadow-lg shadow-coral-500/20 transition-all active:scale-95"
          >
            <Plus className="size-4 mr-2" /> Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar por concepto, descripción o sucursal..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-slate-200 rounded-xl font-medium focus-visible:ring-1 focus-visible:ring-[#FF7E5F] transition-all bg-white"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
            <LayoutList className="size-4" /> Historial de Salidas
          </h3>
          <span className="text-[10px] font-bold uppercase text-slate-400 italic bg-white px-2 py-0.5 rounded-full border border-slate-100">
            {filteredData.length} registros encontrados
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent border-b border-slate-100">
                <TableHead className="px-6 py-4">
                  <TableFilter
                    label="Concepto / Detalle"
                    options={getFilterOptions('concepto')}
                    selectedValues={activeFilters['concepto'] || []}
                    onFilterChange={(vals: string[]) => handleFilterChange('concepto', vals)}
                  />
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-widest text-center">Fecha</TableHead>
                <TableHead className="px-6 py-4">
                  <TableFilter
                    label="Sucursal"
                    align="center"
                    options={getFilterOptions('sucursal')}
                    selectedValues={activeFilters['sucursal'] || []}
                    onFilterChange={(vals: string[]) => handleFilterChange('sucursal', vals)}
                  />
                </TableHead>
                <TableHead className="px-6 py-4">
                  <TableFilter
                    label="Tipo"
                    align="center"
                    options={getFilterOptions('tipo')}
                    selectedValues={activeFilters['tipo'] || []}
                    onFilterChange={(vals: string[]) => handleFilterChange('tipo', vals)}
                  />
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-widest text-right px-6">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic text-sm">
                    No se encontraron registros que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item, i) => (
                  <TableRow key={`${item.tipo}-${item.id}-${i}`} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/50">
                    <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-900">{item.concepto}</span>
                            {item.descripcion && (
                                <span className="text-[10px] font-medium text-slate-400 italic truncate max-w-[300px]">{item.descripcion}</span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-slate-500 tabular-nums px-4 whitespace-nowrap text-center">
                      {item.fecha ? format(new Date(item.fecha), "dd MMM, yyyy '∙' HH:mm", { locale: es }) : '--'}
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                        {item.sucursal || 'GENERAL'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight border",
                        item.tipo === 'NOMINA'
                          ? "bg-orange-50 text-orange-600 border-orange-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {item.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900 text-base tabular-nums px-6">
                      <span className="text-xs text-slate-400 mr-1 font-bold italic">$</span>
                      {Number(item.valor).toLocaleString('es-CO')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Registration Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-2xl border-none sm:max-w-[450px] p-0 overflow-hidden bg-white shadow-2xl">
          <DialogHeader className="p-8 pb-6">
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Registrar Nuevo Gasto</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium italic">Ingresa los detalles de la salida de dinero.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="concepto" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concepto (Categoría)</Label>
              <Input
                id="concepto"
                placeholder="Ej. Arriendo, Servicios, Insumos..."
                className="rounded-xl border-slate-200 font-bold focus:border-[#FF7E5F] h-11 transition-all"
                value={formData.GS_CONCEPTO}
                onChange={e => setFormData({ ...formData, GS_CONCEPTO: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción / Detalle</Label>
              <Input
                id="descripcion"
                placeholder="Ej. Pago Luz Marzo, Compra de Tintes..."
                className="rounded-xl border-slate-200 font-medium h-11 focus:border-[#FF7E5F] transition-all"
                value={formData.GS_DESCRIPCION}
                onChange={e => setFormData({ ...formData, GS_DESCRIPCION: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor ($)</Label>
              <Input
                id="valor"
                type="number"
                placeholder="0"
                className="rounded-xl border-slate-200 font-black text-2xl text-[#FF7E5F] focus:border-[#FF7E5F] h-14 transition-all"
                value={formData.GS_VALOR || ''}
                onChange={e => setFormData({ ...formData, GS_VALOR: Number(e.target.value) })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sucursal</Label>
                <Select
                  value={formData.SC_IDSUCURSAL_FK?.toString() || 'general'}
                  onValueChange={val => setFormData({ ...formData, SC_IDSUCURSAL_FK: val === 'general' ? null : Number(val) })}
                  disabled={user?.role === 'ADMINISTRADOR_PUNTO'}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 font-bold h-11 focus:ring-0 focus:border-[#FF7E5F]">
                    <SelectValue placeholder="General" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="general" className="text-[11px] font-bold uppercase">Negocio General</SelectItem>
                    {sedes.map(s => (
                      <SelectItem key={s.SC_IDSUCURSAL_PK} value={s.SC_IDSUCURSAL_PK.toString()} className="text-[11px] font-bold uppercase">
                        {s.SC_NOMBRE}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</Label>
                <Input
                  type="date"
                  className="rounded-xl border-slate-200 font-bold h-11 focus:border-[#FF7E5F]"
                  value={formData.GS_FECHA ? format(new Date(formData.GS_FECHA), "yyyy-MM-dd") : ''}
                  onChange={e => setFormData({ ...formData, GS_FECHA: new Date(e.target.value) })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-xl border-slate-200 font-bold h-12 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white font-bold h-12 shadow-lg shadow-coral-500/10 active:scale-95 transition-all"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4 mr-1" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
