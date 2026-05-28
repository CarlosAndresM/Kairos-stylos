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
  Edit2,
  MoreVertical,
  Trash2,
  ExternalLink,
  AlertCircle
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
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
import { createExpense, updateExpense, deleteExpense } from './services'
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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [gastoToDelete, setGastoToDelete] = React.useState<UnifiedGasto | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  // Form State
  const [formData, setFormData] = React.useState<GastoData>({
    GS_CONCEPTO: '',
    GS_DESCRIPCION: '',
    GS_VALOR: 0,
    GS_FECHA: new Date(),
    SC_IDSUCURSAL_FK: (user?.role === 'ADMINISTRADOR_PUNTO' && user?.branchId != null && user?.branchId > 0) ? user.branchId : null,
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
        SC_IDSUCURSAL_FK: (user?.role === 'ADMINISTRADOR_PUNTO' && user?.branchId != null && user?.branchId > 0) ? user.branchId : null
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

        if (formData.GS_IDGASTO_PK) {
          const editedId = formData.GS_IDGASTO_PK;
          setData(prev => prev.map(item => {
            if (item.id === editedId && item.tipo === 'MANUAL') {
              return {
                ...item,
                concepto: formData.GS_CONCEPTO,
                descripcion: formData.GS_DESCRIPCION || '',
                fecha: new Date(formData.GS_FECHA),
                valor: formData.GS_VALOR,
                sucursal: sedes.find(s => s.SC_IDSUCURSAL_PK === formData.SC_IDSUCURSAL_FK)?.SC_NOMBRE || 'GENERAL',
                comprobantes: finalComprobantes
              }
            }
            return item;
          }));
        } else {
          const newGasto: UnifiedGasto = {
            id: res.data as number,
            concepto: formData.GS_CONCEPTO,
            descripcion: formData.GS_DESCRIPCION || '',
            fecha: new Date(formData.GS_FECHA),
            valor: formData.GS_VALOR,
            tipo: 'MANUAL',
            sucursal: sedes.find(s => s.SC_IDSUCURSAL_PK === formData.SC_IDSUCURSAL_FK)?.SC_NOMBRE || 'GENERAL',
            comprobantes: finalComprobantes
          }
          setData(prev => [newGasto, ...prev]);
        }
      } else {
        toast.error("Error", res.error || "No se pudo guardar el gasto")
      }
    } catch (error) {
      toast.error("Error de sistema")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!gastoToDelete) return
    setIsDeleting(true)
    try {
      const res = await deleteExpense(gastoToDelete.id)
      if (res.success) {
        toast.success("Gasto eliminado", "El gasto ha sido eliminado correctamente.")
        setIsDeleteModalOpen(false)

        const deletedId = gastoToDelete.id;
        setData(prev => prev.filter(item => !(item.id === deletedId && item.tipo === 'MANUAL')));

        setGastoToDelete(null)
      } else {
        toast.error("Error", res.error || "No se pudo eliminar el gasto")
      }
    } catch (e) {
      toast.error("Error de sistema al eliminar")
    } finally {
      setIsDeleting(false)
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 border border-slate-100 dark:border-slate-800 rounded-xl p-1 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-lg">
                            {item.tipo === 'MANUAL' ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenModal(item)}
                                  className="rounded-lg gap-2 font-medium cursor-pointer"
                                >
                                  <Edit2 className="size-3.5 text-slate-500" />
                                  <span>Editar Gasto</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setGastoToDelete(item)
                                    setIsDeleteModalOpen(true)
                                  }}
                                  className="rounded-lg gap-2 font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                  <span>Eliminar Gasto</span>
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => window.location.href = '/dashboard/nomina'}
                                className="rounded-lg gap-2 font-medium cursor-pointer text-slate-600 dark:text-slate-300 focus:bg-slate-50 dark:focus:bg-slate-900"
                              >
                                <ExternalLink className="size-3.5 text-slate-500" />
                                <span>Ver Nómina</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              <div className="grid gap-2 min-w-0">
                <Label>Sucursal</Label>
                <Select
                  value={formData.SC_IDSUCURSAL_FK?.toString() || 'general'}
                  onValueChange={val => setFormData({ ...formData, SC_IDSUCURSAL_FK: val === 'general' ? null : Number(val) })}
                  disabled={(user?.role === 'ADMINISTRADOR_PUNTO' && user?.branchId != null && user?.branchId > 0) || isSubmitting}
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

              <div className="grid gap-2 min-w-0">
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

      {/* Modal de Confirmación de Eliminación para Gasto */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="sm:max-w-[400px] border border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-2xl p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <DialogHeader className="p-6 pb-4 flex flex-col items-center text-center">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full w-12 h-12 flex items-center justify-center mb-3 shadow-inner">
              <AlertCircle className="size-6 animate-pulse" />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">
              ¿Eliminar Gasto?
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-400 font-medium max-w-[280px] pt-1">
              Esta acción es irreversible y removerá el registro del historial de egresos.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4">
            {gastoToDelete && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Concepto:</span>
                  <span className="font-bold text-slate-950 dark:text-slate-50">{gastoToDelete.concepto}</span>
                </div>
                {gastoToDelete.descripcion && (
                  <div className="flex justify-between items-start text-xs gap-4">
                    <span className="font-semibold text-slate-500 shrink-0">Detalle:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-right truncate max-w-[180px]">{gastoToDelete.descripcion}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Valor:</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    $ {gastoToDelete.valor.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Fecha:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {gastoToDelete.fecha ? format(new Date(gastoToDelete.fecha), "dd MMM, yyyy", { locale: es }) : '--'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30">
              <AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 tracking-tight leading-normal">
                Al confirmar, este gasto se borrará definitivamente y afectará el total general de egresos del negocio.
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 gap-2 flex flex-col sm:flex-row-reverse">
            <Button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl h-10 px-6 shadow-md shadow-rose-600/10 text-xs uppercase tracking-wider flex-1 sm:flex-none min-w-[140px] transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {isDeleting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Confirmar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl font-bold text-xs uppercase tracking-wider h-10 px-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
