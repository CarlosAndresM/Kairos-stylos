'use client'

import * as React from 'react'
import {
  Plus,
  LayoutList,
  CircleDollarSign,
  TrendingDown,
  Loader2,
  Search,
  X,
  Camera,
  ImageIcon,
  Edit2
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
import { createExpense, updateExpense } from './services'
import { getSedes } from '@/features/trabajadores/services'
import { DashboardBanner } from '@/components/layout/dashboard-banner'
import { NumericFormat } from 'react-number-format'

interface ExpenseClientProps {
  initialData: UnifiedGasto[]
  user: any
}

export function ExpenseClient({ initialData, user }: ExpenseClientProps) {
  const [data, setData] = React.useState<UnifiedGasto[]>(initialData)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [sedes, setSedes] = React.useState<any[]>([])
  const [pendingDeletions, setPendingDeletions] = React.useState<string[]>([])
  const [pendingUploadFiles, setPendingUploadFiles] = React.useState<{url: string, file: File}[]>([])

  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  // Form State
  const [formData, setFormData] = React.useState<GastoData>({
    GS_CONCEPTO: '',
    GS_DESCRIPCION: '',
    GS_VALOR: 0,
    GS_FECHA: new Date(),
    SC_IDSUCURSAL_FK: user?.branchId || null,
    GS_COMPROBANTES: []
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

  const handleOpenModal = (expense?: UnifiedGasto) => {
    setPendingDeletions([])
    pendingUploadFiles.forEach(p => URL.revokeObjectURL(p.url))
    setPendingUploadFiles([])
    if (expense) {
      setFormData({
        GS_IDGASTO_PK: expense.id,
        GS_CONCEPTO: expense.concepto,
        GS_DESCRIPCION: expense.descripcion || '',
        GS_VALOR: expense.valor,
        GS_FECHA: new Date(expense.fecha),
        SC_IDSUCURSAL_FK: (expense as any).sucursal_id || null,
        GS_COMPROBANTES: expense.comprobantes || []
      })
    } else {
      setFormData({
        GS_CONCEPTO: '',
        GS_DESCRIPCION: '',
        GS_VALOR: 0,
        GS_FECHA: new Date(),
        SC_IDSUCURSAL_FK: user?.role === 'ADMINISTRADOR_PUNTO' ? user?.branchId : null
      })
    }
    setIsModalOpen(true)
  }

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploadingImage, setIsUploadingImage] = React.useState(false)

  const handleComprobanteUpload = (file: File) => {
    const objectUrl = URL.createObjectURL(file)
    setPendingUploadFiles(prev => [...prev, { url: objectUrl, file }])
    setFormData(prev => ({
      ...prev,
      GS_COMPROBANTES: [...(prev.GS_COMPROBANTES || []), objectUrl]
    }))
  }

  const handleRemoveComprobante = (urlToRemove: string) => {
    if (urlToRemove.startsWith('blob:')) {
      setPendingUploadFiles(prev => prev.filter(p => p.url !== urlToRemove))
      URL.revokeObjectURL(urlToRemove)
    } else {
      setPendingDeletions(prev => [...prev, urlToRemove])
    }
    setFormData(prev => ({
      ...prev,
      GS_COMPROBANTES: (prev.GS_COMPROBANTES || []).filter(u => u !== urlToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.GS_CONCEPTO || formData.GS_VALOR <= 0) {
      toast.error("Datos inválidos", "Por favor completa el concepto y valor.")
      return
    }

    setIsSubmitting(true)
    try {
      if (pendingDeletions.length > 0) {
        for (const url of pendingDeletions) {
          if (url.includes('/temp/')) {
            try {
              await fetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
            } catch (e) {
              console.error("Error eliminando archivo:", e)
            }
          }
        }
      }

      let uploadedUrls: string[] = []
      if (pendingUploadFiles.length > 0) {
        for (const item of pendingUploadFiles) {
          const form = new FormData()
          form.append('file', item.file)
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: form
          })
          const data = await res.json()
          if (data.url) {
            uploadedUrls.push(data.url)
          } else {
            toast.error("Error", "No se pudo subir una imagen")
            setIsSubmitting(false)
            return
          }
        }
      }

      const finalComprobantes = (formData.GS_COMPROBANTES || [])
        .filter(url => !url.startsWith('blob:'))
        .concat(uploadedUrls)

      const dataToSave = {
        ...formData,
        GS_COMPROBANTES: finalComprobantes
      }

      const res = dataToSave.GS_IDGASTO_PK 
        ? await updateExpense(dataToSave)
        : await createExpense(dataToSave)
        
      if (res.success) {
        toast.success(formData.GS_IDGASTO_PK ? "Gasto actualizado" : "Gasto registrado")
        setIsModalOpen(false)
        window.location.reload()
      } else {
        toast.error("Error", res.error || "No se pudo guardar el gasto")
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
      <DashboardBanner 
        title={<>Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B]">Gastos</span></>}
        subtitle="Historial unificado de egresos y nómina confirmada."
        extra={
            <div className="flex flex-wrap items-center gap-4">
                <div className="h-14 flex items-center bg-black/40 border border-white/10 text-white rounded-2xl px-6 shadow-2xl backdrop-blur-md group transition-all">
                    <div className="border-r border-white/10 pr-6 mr-6 hidden sm:block">
                        <p className="text-[10px] font-black text-[#FF7E5F] uppercase tracking-widest mb-0.5">TOTAL EGRESOS</p>
                        <p className="text-xl font-black text-white leading-none tabular-nums">
                            $ {(totalGastos || 0).toLocaleString('es-CO')}
                        </p>
                    </div>
                    <CircleDollarSign className="size-6 text-[#FF7E5F] group-hover:scale-110 transition-transform" />
                </div>

                <Button
                    onClick={handleOpenModal}
                    className="bg-[#FF7E5F] text-white hover:bg-[#FF7E5F]/90 rounded-2xl border-none font-extrabold h-14 px-8 shadow-2xl shadow-[#FF7E5F]/20 transition-all active:scale-95"
                >
                    <Plus className="size-5 mr-2" /> Registrar Gasto
                </Button>
            </div>
        }
      />

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
                <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-widest text-center px-4">Recibos</TableHead>
                {user?.role?.includes('ADMINISTRADOR') && (
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 tracking-widest text-center w-[80px]">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium italic text-sm">
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
                      {item.fecha ? format(new Date(item.fecha), "dd MMM, yyyy", { locale: es }) : '--'}
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
                      {(Number(item.valor) || 0).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-center px-4">
                      {item.comprobantes && item.comprobantes.length > 0 ? (
                        <div className="flex justify-center -space-x-2">
                          {item.comprobantes.slice(0, 3).map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="size-8 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-100 hover:scale-110 transition-transform hover:z-10 relative"
                              title="Ver comprobante"
                            >
                              <img src={url} alt={`Comprobante ${idx + 1}`} className="object-cover w-full h-full" />
                            </a>
                          ))}
                          {item.comprobantes.length > 3 && (
                            <div className="size-8 rounded-full border-2 border-white shadow-sm bg-slate-100 flex items-center justify-center relative z-0">
                              <span className="text-[10px] font-bold text-slate-500">+{item.comprobantes.length - 3}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    {user?.role?.includes('ADMINISTRADOR') && (
                      <TableCell className="text-center px-4">
                        {item.tipo === 'MANUAL' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(item)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-[#FF7E5F] hover:bg-[#FF7E5F]/5"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Registration Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
            <DialogDescription>Ingresa los detalles de la salida de dinero.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="concepto">Concepto (Categoría)</Label>
              <Input
                id="concepto"
                placeholder="Ej. Arriendo, Servicios, Insumos..."
                value={formData.GS_CONCEPTO}
                onChange={e => setFormData({ ...formData, GS_CONCEPTO: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción / Detalle</Label>
              <Input
                id="descripcion"
                placeholder="Ej. Pago Luz Marzo, Compra de Tintes..."
                value={formData.GS_DESCRIPCION}
                onChange={e => setFormData({ ...formData, GS_DESCRIPCION: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valor">Valor ($)</Label>
              <NumericFormat
                thousandSeparator="."
                decimalSeparator=","
                prefix="$ "
                placeholder="$ 0"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.GS_VALOR || ''}
                onValueChange={(values) => setFormData({ ...formData, GS_VALOR: Number(values.value) })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Sucursal</Label>
                <Select
                  value={formData.SC_IDSUCURSAL_FK?.toString() || 'general'}
                  onValueChange={val => setFormData({ ...formData, SC_IDSUCURSAL_FK: val === 'general' ? null : Number(val) })}
                  disabled={user?.role === 'ADMINISTRADOR_PUNTO' || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Negocio General</SelectItem>
                    {sedes.map(s => (
                      <SelectItem key={s.SC_IDSUCURSAL_PK} value={s.SC_IDSUCURSAL_PK.toString()}>
                        {s.SC_NOMBRE}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.GS_FECHA && !isNaN(new Date(formData.GS_FECHA).getTime()) ? format(new Date(formData.GS_FECHA), "yyyy-MM-dd") : ''}
                  onChange={e => {
                    if (!e.target.value) return;
                    setFormData({ ...formData, GS_FECHA: new Date(e.target.value + 'T12:00:00') })
                  }}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Comprobantes (Fotos)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleComprobanteUpload(file)
                    }}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Adjuntar
                  </Button>
                </div>
              </div>

              {formData.GS_COMPROBANTES && formData.GS_COMPROBANTES.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.GS_COMPROBANTES.map((url, idx) => (
                    <div key={idx} className="relative group rounded-md overflow-hidden border border-slate-200 size-16 bg-slate-50 flex-shrink-0">
                      <img src={url} alt="Comprobante" className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity" />
                      <button
                        type="button"
                        onClick={() => handleRemoveComprobante(url)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
