'use client'

import * as React from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Trash2,
  Receipt,
  User,
  Phone,
  Scissors,
  Package,
  DollarSign,
  PlusCircle,
  X,
  Camera,
  FileText,
  Save,
  Check,
  Calendar as CalendarIcon,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { v4 as uuidv4 } from 'uuid'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { NumericFormat } from 'react-number-format'
import { invoiceSchema, type InvoiceFormData } from '@/features/billing/schema'
import { saveInvoice, getNextInvoiceNumber } from '@/features/billing/services'
import { toast } from '@/lib/toast-helper'
import { cn } from '@/lib/utils'
import { ComboboxSearch } from '@/components/ui/combobox-search'
import { compressImage } from '@/lib/image-utils'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface BillingModalProps {
  isOpen: boolean
  onClose: () => void
  technicians: any[]
  services: any[]
  products: any[]
  paymentMethods: any[]
  sucursales: any[]
  sessionUser: any
  invoice?: any // Factura para editar
  isViewOnly?: boolean // Modo solo lectura
}

export function BillingModal({
  isOpen,
  onClose,
  technicians,
  services,
  products,
  paymentMethods,
  sucursales,
  sessionUser,
  invoice,
  isViewOnly = false
}: BillingModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [nextInvoiceNum, setNextInvoiceNum] = React.useState<string>('')
  const [uploadingIndexes, setUploadingIndexes] = React.useState<number[]>([])
  const fileInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({})
  const uploadedTempFiles = React.useRef<string[]>([])
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false)
  const [adminPassword, setAdminPassword] = React.useState('')
  const [isVerifyingAdmin, setIsVerifyingAdmin] = React.useState(false)
  const [pendingStatusChange, setPendingStatusChange] = React.useState<string | null>(null)

  const isEditing = !!invoice
  const isPaid = isViewOnly || invoice?.FC_ESTADO === 'PAGADO' || invoice?.FC_ESTADO === 'CANCELADO'

  const cleanupTempFiles = async (urls?: string[]) => {
    const filesToDelete = urls || uploadedTempFiles.current
    for (const url of filesToDelete) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
      } catch (error) {
        console.error('Error al limpiar archivo temporal:', error)
      }
    }
    if (!urls) uploadedTempFiles.current = []
  }

  const [uploadingPhysical, setUploadingPhysical] = React.useState(false)
  const physicalInvoiceInputRef = React.useRef<HTMLInputElement>(null)

  const handlePhysicalInvoiceUpload = async (file: File) => {
    setUploadingPhysical(true)
    try {
      const compressedFile = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressedFile, file.name)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        const prevUrl = form.getValues(`FC_EVIDENCIA_FISICA_URL`)
        if (prevUrl && prevUrl.includes('/temp/')) {
          cleanupTempFiles([prevUrl])
        }
        form.setValue(`FC_EVIDENCIA_FISICA_URL`, data.url)
        uploadedTempFiles.current.push(data.url)
      } else {
        toast.error(data.error || 'Error al subir imagen')
      }
    } catch (error) {
      console.error('Error en upload factura:', error)
      toast.error('Error al procesar la imagen')
    } finally {
      setUploadingPhysical(false)
    }
  }

  const handleFileUpload = async (index: number, file: File) => {
    setUploadingIndexes(prev => [...prev, index])
    try {
      const compressedFile = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressedFile, file.name)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        const prevUrl = form.getValues(`payments.${index}.PF_EVIDENCIA_URL`)
        if (prevUrl && prevUrl.includes('/temp/')) {
          cleanupTempFiles([prevUrl])
        }

        form.setValue(`payments.${index}.PF_EVIDENCIA_URL`, data.url)
        uploadedTempFiles.current.push(data.url)
      } else {
        toast.error(data.error || 'Error al subir imagen')
      }
    } catch (error) {
      console.error('Error en upload:', error)
      toast.error('Error al procesar o subir la imagen')
    } finally {
      setUploadingIndexes(prev => prev.filter(i => i !== index))
    }
  }

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      FC_CLIENTE_NOMBRE: '',
      FC_CLIENTE_TELEFONO: '',
      FC_TIPO_CLIENTE: 'CLIENTE',
      TR_IDCLIENTE_FK: null,
      isVale: false,
      FC_FECHA: new Date(),
      SC_IDSUCURSAL_FK: sessionUser?.sucursal_id || 1,
      TR_IDCAJERO_FK: sessionUser?.id || 1,
      services: [{ SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0 }],
      products: [],
      payments: [],
      FC_ESTADO: 'PENDIENTE',
      FC_TOTAL: 0,
      FC_EVIDENCIA_FISICA_URL: null
    }
  })

  // Cargar datos si estamos editando
  React.useEffect(() => {
    if (isOpen && invoice) {
      form.reset({
        FC_IDFACTURA_PK: invoice.FC_IDFACTURA_PK,
        FC_NUMERO_FACTURA: invoice.FC_NUMERO_FACTURA,
        FC_FECHA: new Date(invoice.FC_FECHA),
        FC_TIPO_CLIENTE: invoice.FC_TIPO_CLIENTE,
        TR_IDCLIENTE_FK: invoice.TR_IDCLIENTE_FK,
        isVale: invoice.isVale,
        FC_CLIENTE_NOMBRE: invoice.FC_CLIENTE_NOMBRE,
        FC_CLIENTE_TELEFONO: invoice.FC_CLIENTE_TELEFONO,
        SC_IDSUCURSAL_FK: invoice.SC_IDSUCURSAL_FK,
        TR_IDCAJERO_FK: invoice.TR_IDCAJERO_FK,
        services: invoice.services || [],
        products: invoice.products || [],
        payments: invoice.payments || [],
        FC_ESTADO: invoice.FC_ESTADO,
        FC_TOTAL: Number(invoice.FC_TOTAL),
        FC_EVIDENCIA_FISICA_URL: invoice.FC_EVIDENCIA_FISICA_URL
      })
    } else if (isOpen && !invoice) {
      form.reset({
        FC_CLIENTE_NOMBRE: '',
        FC_CLIENTE_TELEFONO: '',
        FC_TIPO_CLIENTE: 'CLIENTE',
        TR_IDCLIENTE_FK: null,
        isVale: false,
        FC_FECHA: new Date(),
        SC_IDSUCURSAL_FK: sessionUser?.sucursal_id || 1,
        TR_IDCAJERO_FK: sessionUser?.id || 1,
        services: [{ SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0 }],
        products: [],
        payments: [],
        FC_ESTADO: 'PENDIENTE',
        FC_TOTAL: 0,
        FC_EVIDENCIA_FISICA_URL: null
      })
      getNextInvoiceNumber().then(res => {
        if (res.success) {
          const num = String(res.data)
          setNextInvoiceNum(num)
          form.setValue("FC_NUMERO_FACTURA", num)
        }
      })
    }
  }, [isOpen, invoice, form])

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control: form.control,
    name: "services"
  })

  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control: form.control,
    name: "products"
  })

  // Watchers con useWatch para máxima reactividad
  const watchedServices = useWatch({ control: form.control, name: "services" }) || []
  const watchedProducts = useWatch({ control: form.control, name: "products" }) || []
  const watchedPayments = useWatch({ control: form.control, name: "payments" }) || []
  const clientType = useWatch({ control: form.control, name: "FC_TIPO_CLIENTE" })

  // Totales
  const total = React.useMemo(() => {
    const sTotal = watchedServices.reduce((sum, s) => sum + (Number(s.FD_VALOR) || 0), 0)
    const pTotal = watchedProducts.reduce((sum, p) => sum + (Number(p.FP_VALOR) || 0), 0)
    return sTotal + pTotal
  }, [watchedServices, watchedProducts])

  const totalPaid = React.useMemo(() => {
    return (watchedPayments || []).reduce((sum, p) => sum + (Number(p.PF_VALOR) || 0), 0)
  }, [watchedPayments])

  // Sincronizar total
  React.useEffect(() => {
    form.setValue("FC_TOTAL", total)
  }, [total, form])

  // Mapeo para comboboxes
  const technicianOptions = technicians.map(t => ({ label: t.TR_NOMBRE, value: t.TR_IDTRABAJADOR_PK }))
  const serviceOptions = services.map(s => ({ label: s.SV_NOMBRE, value: s.SV_IDSERVICIO_PK }))
  const productOptions = products.map(p => ({ label: p.PR_NOMBRE, value: p.PR_IDPRODUCTO_PK }))

  // Manejo de pagos
  const handlePaymentToggle = (method: any, checked: boolean) => {
    const currentPayments = form.getValues("payments") || []
    const isValeMethod = method.MP_NOMBRE?.toUpperCase() === 'VALE'

    if (checked) {
      const currentPayments = form.getValues("payments") || []
      const newPayments = [...currentPayments, { MP_IDMETODO_FK: method.MP_IDMETODO_PK, PF_VALOR: 0, PF_EVIDENCIA_URL: '' }]

      if (newPayments.length === 1) {
        newPayments[0].PF_VALOR = total
      }

      form.setValue("payments", newPayments)
      if (isValeMethod) form.setValue("isVale", true)
    } else {
      const paymentToRemove = currentPayments.find(p => p.MP_IDMETODO_FK === method.MP_IDMETODO_PK)
      if (paymentToRemove?.PF_EVIDENCIA_URL && paymentToRemove.PF_EVIDENCIA_URL.includes('/temp/')) {
        cleanupTempFiles([paymentToRemove.PF_EVIDENCIA_URL])
      }

      const filteredPayments = currentPayments.filter(p => p.MP_IDMETODO_FK !== method.MP_IDMETODO_PK)

      form.setValue("payments", filteredPayments)
      if (isValeMethod) form.setValue("isVale", false)
    }
  }

  // Auto-distribución si solo hay uno seleccionado
  React.useEffect(() => {
    if (watchedPayments.length === 1 && !isEditing) {
      form.setValue(`payments.0.PF_VALOR`, total)
    }
  }, [total, watchedPayments.length, form, isEditing])

  // Limpiar VALE si cambia a CLIENTE
  React.useEffect(() => {
    if (clientType === 'CLIENTE') {
      const valeMethod = paymentMethods.find(m => m.MP_NOMBRE?.toUpperCase() === 'VALE')
      if (valeMethod) {
        const currentPayments = form.getValues("payments") || []
        const hasVale = currentPayments.some(p => p.MP_IDMETODO_FK === valeMethod.MP_IDMETODO_PK)
        if (hasVale) {
          form.setValue("payments", currentPayments.filter(p => p.MP_IDMETODO_FK !== valeMethod.MP_IDMETODO_PK))
        }
      }
    }
  }, [clientType, paymentMethods, form])

  // Sync isVale checkbox with VALE payment method
  React.useEffect(() => {
    const isValeValue = form.watch("isVale")
    const valeMethod = paymentMethods.find(m => m.MP_NOMBRE?.toUpperCase() === 'VALE')

    if (clientType === 'TECNICO' && isValeValue && valeMethod) {
      const currentPayments = form.getValues("payments") || []
      const alreadyHasVale = currentPayments.find(p => p.MP_IDMETODO_FK === valeMethod.MP_IDMETODO_PK)

      if (!alreadyHasVale) {
        form.setValue("payments", [{ MP_IDMETODO_FK: valeMethod.MP_IDMETODO_PK, PF_VALOR: total, PF_EVIDENCIA_URL: '' }])
      }
    } else if (!isValeValue && clientType === 'TECNICO') {
      const valeMethod = paymentMethods.find(m => m.MP_NOMBRE?.toUpperCase() === 'VALE')
      if (valeMethod) {
        const currentPayments = form.getValues("payments") || []
        form.setValue("payments", currentPayments.filter(p => p.MP_IDMETODO_FK !== valeMethod.MP_IDMETODO_PK))
      }
    }
  }, [form.watch("isVale"), clientType, total, paymentMethods, form])

  const onSubmit = async (data: InvoiceFormData) => {
    setIsLoading(true)
    try {
      const res = await saveInvoice(data)
      if (res.success) {
        toast.success(isEditing ? 'Factura actualizada' : 'Factura guardada')
        uploadedTempFiles.current = []
        form.reset()
        onClose()
      } else {
        toast.error(res.error || 'Error al procesar factura')
      }
    } catch (error) {
      toast.error('Error de sistema')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    cleanupTempFiles()
    onClose()
  }

  // Lógica de cambio de estado con seguridad
  const handleStatusChange = async (newStatus: string) => {
    const currentStatus = form.getValues("FC_ESTADO")

    if (currentStatus === 'PAGADO' && newStatus !== 'PAGADO') {
      // Pedir contraseña de admin
      setPendingStatusChange(newStatus)
      setIsAdminAuthOpen(true)
      return
    }

    form.setValue("FC_ESTADO", newStatus as any)
  }

  const verifyAdminAndChangeStatus = async () => {
    if (!adminPassword) {
      toast.error('Ingrese la contraseña')
      return
    }

    setIsVerifyingAdmin(true)
    try {
      const { verifyAdminPassword } = await import('@/features/billing/services')
      const res = await verifyAdminPassword(adminPassword)
      if (res.success) {
        form.setValue("FC_ESTADO", pendingStatusChange as any)
        setIsAdminAuthOpen(false)
        setAdminPassword('')
        setPendingStatusChange(null)
        toast.success('Estado actualizado correctamente')
      } else {
        toast.error(res.error || 'Contraseña incorrecta')
      }
    } catch (error) {
      toast.error('Error de verificación')
    } finally {
      setIsVerifyingAdmin(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[1000px] max-h-[95vh] overflow-y-auto rounded-none p-0 border-2 border-black bg-white dark:bg-slate-950">
        <DialogHeader className="sr-only">
          <DialogTitle>Hoja de Venta</DialogTitle>
          <DialogDescription>{isEditing ? 'Edición' : 'Creación'} de factura de servicio</DialogDescription>
        </DialogHeader>

        {/* Modal de Autenticación Admin */}
        {isAdminAuthOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border-2 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-sm font-black uppercase mb-4 tracking-tighter">SEGURIDAD: REQUERIDO ADMIN</h3>
              <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase italic">Para cambiar una factura PAGADA debe autorizar como administrador.</p>
              <Input
                type="password"
                placeholder="CONTRASEÑA ADMINISTRADOR"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="rounded-none border-black mb-4 font-black"
                autoFocus
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && verifyAdminAndChangeStatus()}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-none border-black uppercase font-bold text-xs"
                  onClick={() => {
                    setIsAdminAuthOpen(false)
                    setAdminPassword('')
                    setPendingStatusChange(null)
                  }}
                >
                  CANCELAR
                </Button>
                <Button
                  className="flex-1 rounded-none bg-black text-white hover:bg-slate-800 uppercase font-black text-xs gap-2"
                  onClick={verifyAdminAndChangeStatus}
                  disabled={isVerifyingAdmin}
                >
                  {isVerifyingAdmin && <Loader2 className="size-3 animate-spin" />}
                  AUTORIZAR
                </Button>
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-full font-mono text-black dark:text-white">
            {/* Header / Brand - Minimal like image */}
            <div className="p-4 pb-2 flex justify-between items-start relative">
              <div className="flex items-center gap-4">
                <div className="border border-slate-400 rounded-none p-3 bg-slate-50 min-w-[450px]">
                  <div className="space-y-2">
                    {clientType === 'CLIENTE' ? (
                      <>
                        <FormField
                          control={form.control}
                          name="FC_CLIENTE_NOMBRE"
                          render={({ field }) => (
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold uppercase text-slate-500 w-20 italic">NOMBRE:</label>
                              <Input {...field} value={field.value || ''} disabled={isPaid} placeholder="NOMBRE DEL CLIENTE" className="border-0 border-b border-slate-900 p-0 h-auto focus-visible:ring-0 text-sm font-bold uppercase rounded-none placeholder:text-slate-400 flex-1 bg-transparent text-black disabled:opacity-50" />
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="FC_CLIENTE_TELEFONO"
                          render={({ field }) => (
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold uppercase text-slate-500 w-20 italic">TELÉFONO:</label>
                              <Input {...field} value={field.value || ''} disabled={isPaid} placeholder="300 000 0000" className="border-0 border-b border-slate-900 p-0 h-auto focus-visible:ring-0 text-xs font-bold uppercase rounded-none placeholder:text-slate-400 flex-1 bg-transparent text-black disabled:opacity-50" />
                            </div>
                          )}
                        />
                      </>
                    ) : (
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="TR_IDCLIENTE_FK"
                          render={({ field }) => (
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold uppercase text-slate-500 w-20 italic">TÉCNICO:</label>
                              <ComboboxSearch
                                options={technicianOptions}
                                value={field.value || ''}
                                disabled={isPaid}
                                onValueChange={(val) => field.onChange(val)}
                                placeholder="BUSCAR TÉCNICO..."
                                className="h-7 rounded-none border-slate-400 bg-transparent text-xs flex-1 text-black font-bold uppercase disabled:opacity-50"
                              />
                            </div>
                          )}
                        />
                        <div className="flex items-center gap-1.5 pl-1.5">
                          <Checkbox
                            id="isVale"
                            checked={form.watch("isVale")}
                            onCheckedChange={(checked) => form.setValue("isVale", !!checked)}
                            className="w-4 h-4 rounded-none border-slate-400 data-[state=checked]:bg-black data-[state=checked]:text-white"
                          />
                          <label htmlFor="isVale" className="text-[10px] font-bold uppercase cursor-pointer text-black italic">RECIBO DE VALE</label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Select
                    value={clientType}
                    disabled={isPaid}
                    onValueChange={(val) => form.setValue("FC_TIPO_CLIENTE", val as any)}
                  >
                    <SelectTrigger className="w-[120px] h-8 rounded-none border-slate-400 bg-white text-[10px] font-black uppercase text-black disabled:opacity-50">
                      <SelectValue placeholder="TIPO" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-slate-400">
                      <SelectItem value="CLIENTE" className="text-[10px] font-bold uppercase">CLIENTE</SelectItem>
                      <SelectItem value="TECNICO" className="text-[10px] font-bold uppercase">TÉCNICO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-right pr-8 flex flex-col items-end">
                <FormField
                  control={form.control}
                  name="FC_FECHA"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-widest hover:text-black transition-colors flex items-center gap-2 border-b border-transparent hover:border-black py-0.5",
                            !field.value ? "text-slate-400" : "text-slate-900"
                          )}
                        >
                          <CalendarIcon className="size-3" />
                          {field.value ? (
                            format(field.value, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                          ) : (
                            "SELECCIONAR FECHA"
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-none border-2 border-black" align="end">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="rounded-none shadow-none"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                <div className="flex flex-col gap-1 items-end mr-4 border-r border-slate-300 pr-4">
                  <FormField
                    control={form.control}
                    name="SC_IDSUCURSAL_FK"
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(val) => field.onChange(Number(val))}
                        disabled={sessionUser?.role !== 'ADMINISTRADOR_TOTAL'}
                      >
                        <SelectTrigger className="w-[120px] h-6 rounded-none border-slate-400 text-[9px] font-black uppercase mb-1">
                          <SelectValue placeholder="SUCURSAL" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2 border-black">
                          {sucursales.map(s => (
                            <SelectItem key={s.SC_IDSUCURSAL_PK} value={s.SC_IDSUCURSAL_PK.toString()} className="text-[10px] font-black uppercase">
                              {s.SC_NOMBRE}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="FC_ESTADO"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger className={cn(
                          "w-[120px] h-6 rounded-none border-slate-400 text-[9px] font-black uppercase",
                          field.value === 'PAGADO' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            field.value === 'CANCELADO' ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-orange-50 text-orange-700 border-orange-200"
                        )}>
                          <SelectValue placeholder="ESTADO" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2 border-black">
                          <SelectItem value="PENDIENTE" className="text-[10px] font-black uppercase">PENDIENTE</SelectItem>
                          <SelectItem value="PAGADO" className="text-[10px] font-black uppercase">PAGADO</SelectItem>
                          {!!invoice && <SelectItem value="CANCELADO" className="text-[10px] font-black uppercase">CANCELADO</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={physicalInvoiceInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhysicalInvoiceUpload(file)
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingPhysical || (isPaid && !isAdminAuthOpen)}
                      onClick={() => physicalInvoiceInputRef.current?.click()}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[9px] font-bold transition-all border shadow-sm cursor-pointer uppercase",
                        uploadingPhysical ? "bg-slate-50 border-slate-300 text-slate-400" :
                          form.watch("FC_EVIDENCIA_FISICA_URL")
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-slate-400 hover:border-black text-slate-500 hover:text-black bg-white"
                      )}
                    >
                      {uploadingPhysical ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
                      {form.watch("FC_EVIDENCIA_FISICA_URL") ? 'FÍSICA OK' : 'ADJ. FÍSICA'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">REF:</span>
                    <FormField
                      control={form.control}
                      name="FC_NUMERO_FACTURA"
                      render={({ field }) => (
                        <input
                          {...field}
                          value={field.value || ''}
                          disabled={isEditing}
                          className="text-[11px] font-black uppercase text-slate-900 bg-white border border-slate-400 px-2 py-0.5 w-24 text-right rounded-none shadow-sm focus:outline-none focus:border-black disabled:bg-slate-50 disabled:text-slate-500"
                          placeholder="NRO"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-0">
              {/* Table Top Actions */}
              <div className="flex justify-between items-center bg-white border border-slate-400 border-b-0 p-2 px-4">
                <span className="text-[10px] font-bold uppercase text-slate-400 italic">DETALLE DE VENTA</span>
                <div className="flex gap-4">
                  <button
                    type="button"
                    disabled={isPaid}
                    onClick={() => appendService({ SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0 })}
                    className={cn(
                      "text-[12px] font-black flex items-center gap-1.5 hover:bg-slate-900 hover:text-white text-slate-900 bg-white border-2 border-slate-900 px-4 py-1.5 transition-all uppercase tracking-tighter cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]",
                      isPaid && "opacity-50 cursor-not-allowed shadow-none active:translate-x-0 active:translate-y-0"
                    )}
                  >
                    <PlusCircle className="size-4" /> SERVICIO
                  </button>
                  <button
                    type="button"
                    disabled={isPaid}
                    onClick={() => appendProduct({ PR_IDPRODUCTO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FP_VALOR: 0 })}
                    className={cn(
                      "text-[12px] font-black flex items-center gap-1.5 hover:bg-slate-900 hover:text-white text-slate-900 bg-white border-2 border-slate-900 px-4 py-1.5 transition-all uppercase tracking-tighter cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]",
                      isPaid && "opacity-50 cursor-not-allowed shadow-none active:translate-x-0 active:translate-y-0"
                    )}
                  >
                    <PlusCircle className="size-4" /> PRODUCTO
                  </button>
                </div>
              </div>
              {/* Main Detail Table - Zebra Styled */}
              <div className="border border-slate-400 rounded-none shadow-sm overflow-hidden translate-y-[0px]">
                <div className="grid grid-cols-12 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest py-3 px-0 divide-x divide-white/20">
                  <div className="col-span-6 px-4">SERVICIO / PRODUCTO</div>
                  <div className="col-span-4 px-4">ENCARGADO / TÉCNICO</div>
                  <div className="col-span-2 text-right px-4">TOTAL VALOR</div>
                </div>

                <div className="divide-y divide-slate-200 bg-white">
                  {/* Row Structure Polished */}
                  {serviceFields.map((field, index) => (
                    <div key={field.id} className={cn("grid grid-cols-12 min-h-[48px] items-center px-0 hover:bg-slate-50 transition-colors group border-b border-slate-400 divide-x divide-slate-200", index % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                      <div className="col-span-6 px-4 py-1">
                        <FormField
                          control={form.control}
                          name={`services.${index}.SV_IDSERVICIO_FK`}
                          render={({ field }) => (
                            <ComboboxSearch
                              options={serviceOptions}
                              value={field.value}
                              disabled={isPaid}
                              onValueChange={(val) => {
                                field.onChange(val)
                                const selectedService = services.find(s => s.SV_IDSERVICIO_PK === val)
                                if (selectedService) {
                                  form.setValue(`services.${index}.FD_VALOR`, selectedService.SV_VALOR || 0)
                                }
                              }}
                              placeholder="ELIJA SERVICIO..."
                              className="h-9 border-none bg-transparent font-bold uppercase focus-visible:ring-0 p-0 text-[13px] shadow-none placeholder:text-slate-400 disabled:opacity-50"
                            />
                          )}
                        />
                      </div>
                      <div className="col-span-4 px-4 py-1">
                        <FormField
                          control={form.control}
                          name={`services.${index}.TR_IDTECNICO_FK`}
                          render={({ field }) => (
                            <ComboboxSearch
                              options={technicianOptions}
                              value={field.value}
                              onValueChange={(val) => field.onChange(val)}
                              placeholder="ENCARGADO..."
                              className="h-9 border-none bg-transparent font-semibold uppercase focus-visible:ring-0 p-0 text-[11px] shadow-none italic placeholder:text-slate-400"
                            />
                          )}
                        />
                      </div>
                      <div className="col-span-2 text-right px-4 py-1 flex items-center justify-end gap-2">
                        <FormField
                          control={form.control}
                          name={`services.${index}.FD_VALOR`}
                          render={({ field }) => (
                            <NumericFormat
                              value={field.value}
                              disabled={isPaid}
                              onValueChange={(values) => field.onChange(values.floatValue || 0)}
                              thousandSeparator="."
                              decimalSeparator=","
                              prefix="$ "
                              className="w-28 h-8 bg-white border border-slate-400 rounded-none text-right font-bold focus:outline-none text-sm text-black px-2 shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                            />
                          )}
                        />
                        <button type="button" disabled={isPaid} onClick={() => removeService(index)} className="opacity-0 group-hover:opacity-100 disabled:group-hover:opacity-0 transition-opacity p-1.5 hover:text-red-600 cursor-pointer">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Products Row Polished */}
                  {productFields.map((field, index) => (
                    <div key={field.id} className={cn("grid grid-cols-12 min-h-[48px] items-center px-0 hover:bg-slate-50 transition-colors group border-b border-slate-400 divide-x divide-slate-200", (serviceFields.length + index) % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                      <div className="col-span-6 px-4 py-1">
                        <FormField
                          control={form.control}
                          name={`products.${index}.PR_IDPRODUCTO_FK`}
                          render={({ field }) => (
                            <ComboboxSearch
                              options={productOptions}
                              value={field.value}
                              disabled={isPaid}
                              onValueChange={(val) => {
                                field.onChange(val)
                                const selectedProduct = products.find(p => p.PR_IDPRODUCTO_PK === val)
                                if (selectedProduct) {
                                  form.setValue(`products.${index}.FP_VALOR`, selectedProduct.PR_PRECIO_VENTA || 0)
                                }
                              }}
                              placeholder="ELIJA PRODUCTO..."
                              className="h-9 border-none bg-transparent font-bold uppercase focus-visible:ring-0 p-0 text-[13px] shadow-none italic placeholder:text-slate-400 disabled:opacity-50"
                            />
                          )}
                        />
                      </div>
                      <div className="col-span-4 px-4 py-1">
                        <FormField
                          control={form.control}
                          name={`products.${index}.TR_IDTECNICO_FK`}
                          render={({ field }) => (
                            <ComboboxSearch
                              options={technicianOptions}
                              value={field.value}
                              onValueChange={(val) => field.onChange(val)}
                              placeholder="ENCARGADO..."
                              className="h-9 border-none bg-transparent font-semibold uppercase focus-visible:ring-0 p-0 text-[11px] shadow-none italic placeholder:text-slate-400"
                            />
                          )}
                        />
                      </div>
                      <div className="col-span-2 text-right px-4 py-1 flex items-center justify-end gap-2">
                        <FormField
                          control={form.control}
                          name={`products.${index}.FP_VALOR`}
                          render={({ field }) => (
                            <NumericFormat
                              value={field.value}
                              disabled={isPaid}
                              onValueChange={(values) => field.onChange(values.floatValue || 0)}
                              thousandSeparator="."
                              decimalSeparator=","
                              prefix="$ "
                              className="w-28 h-8 bg-white border border-slate-400 rounded-none text-right font-bold focus:outline-none text-sm text-black px-2 shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                            />
                          )}
                        />
                        <button type="button" disabled={isPaid} onClick={() => removeProduct(index)} className="opacity-0 group-hover:opacity-100 disabled:group-hover:opacity-0 transition-opacity p-1.5 hover:text-red-600 cursor-pointer">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Total Venta Table Footer Row */}
                  <div className="grid grid-cols-12 min-h-[48px] items-center px-4 bg-slate-900 border-t border-slate-400">
                    <div className="col-span-10 text-right pr-6">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 italic">SUBTOTAL DE VENTA</span>
                    </div>
                    <div className="col-span-2 text-right px-4 border-l border-white/10">
                      <span className="text-lg font-black text-white leading-none tracking-tighter">
                        $ {total.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payments and Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 border border-slate-400 rounded-none divide-x divide-slate-100 bg-slate-50/30">
              {/* FORMA DE PAGO - Polished */}
              <div className="lg:col-span-7 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-none italic">MÉTODOS DE PAGO</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods
                    .filter(method => {
                      const isValeActive = form.watch("isVale")
                      const isValeMethod = method.MP_NOMBRE?.toUpperCase() === 'VALE'

                      // Si es cliente, nunca mostrar VALE
                      if (clientType === 'CLIENTE' && isValeMethod) return false

                      // Si es técnico, mostrar VALE solo si el RECIBO DE VALE está activo en el header
                      if (clientType === 'TECNICO' && isValeMethod && !isValeActive) return false

                      return true
                    })
                    .map(method => {
                      const isSelected = !!watchedPayments.find(p => p.MP_IDMETODO_FK === method.MP_IDMETODO_PK)
                      return (
                        <div
                          key={method.MP_IDMETODO_PK}
                          onClick={() => !isPaid && handlePaymentToggle(method, !isSelected)}
                          className={cn(
                            "group flex items-center gap-3 p-3 border transition-all rounded-none",
                            isPaid ? "cursor-not-allowed opacity-80" : "cursor-pointer",
                            isSelected ? "border-slate-900 bg-white text-black shadow-sm" : "border-slate-300 bg-white/50 text-black hover:border-slate-300 hover:bg-white"
                          )}
                        >
                          <div className={cn("w-5 h-5 border border-slate-300 flex items-center justify-center transition-all bg-white rounded-none")}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-black" />}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight text-inherit">{method.MP_NOMBRE}</span>
                        </div>
                      )
                    })}
                </div>

                {/* Payment Distribution Details and Upload */}
                {watchedPayments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">DISTRIBUCIÓN DE PAGO</p>
                    {watchedPayments.map((payment, idx) => {
                      const method = paymentMethods.find(m => m.MP_IDMETODO_PK === payment.MP_IDMETODO_FK)
                      return (
                        <div key={`${payment.MP_IDMETODO_FK}-${idx}`} className="flex flex-col gap-2 bg-white border border-slate-300 rounded-none p-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase text-slate-600">{method?.MP_NOMBRE}</span>
                            <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-300 px-3">
                              <FormField
                                control={form.control}
                                name={`payments.${idx}.PF_VALOR`}
                                render={({ field }) => (
                                  <NumericFormat
                                    value={field.value}
                                    disabled={isPaid}
                                    onValueChange={(values) => field.onChange(values.floatValue || 0)}
                                    thousandSeparator="."
                                    decimalSeparator=","
                                    prefix="$ "
                                    className="w-32 bg-white border border-slate-400 rounded-none px-2 focus:outline-none font-bold text-right text-black text-base shadow-sm h-9 disabled:bg-slate-50 disabled:text-slate-500"
                                  />
                                )}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={el => { fileInputRefs.current[`${idx}`] = el }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleFileUpload(idx, file)
                                }}
                              />
                              <button
                                type="button"
                                disabled={uploadingIndexes.includes(idx) || isPaid}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  fileInputRefs.current[`${idx}`]?.click()
                                }}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-none text-[10px] font-bold transition-all border shadow-sm cursor-pointer",
                                  uploadingIndexes.includes(idx) ? "bg-slate-50 border-slate-300 text-slate-400 cursor-not-allowed" :
                                    payment.PF_EVIDENCIA_URL
                                      ? "border-green-500 bg-green-50 text-green-700"
                                      : "border-slate-400 hover:border-black text-slate-400 hover:text-black bg-white"
                                )}
                              >
                                {uploadingIndexes.includes(idx) ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Camera className="size-3.5" />
                                )}
                                {uploadingIndexes.includes(idx) ? 'PROCESANDO...' : (payment.PF_EVIDENCIA_URL ? 'REGISTRO OK' : 'ADJUNTAR FOTO')}
                              </button>
                              {payment.PF_EVIDENCIA_URL && (
                                <HoverCard openDelay={1000}>
                                  <HoverCardTrigger asChild>
                                    <a href={payment.PF_EVIDENCIA_URL} target="_blank" rel="noreferrer" className="text-[10px] font-bold underline text-slate-400 hover:text-black cursor-pointer">
                                      VER PDF/IMG
                                    </a>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80 p-0 border-2 border-black rounded-none shadow-xl overflow-hidden" side="top">
                                    <div className="bg-slate-900 text-white text-[9px] font-bold p-1 px-2 uppercase italic">VISTA PREVIA</div>
                                    <img
                                      src={payment.PF_EVIDENCIA_URL}
                                      alt="Evidencia"
                                      className="w-full h-auto object-contain max-h-96"
                                    />
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* STATUS & ACTIONS - Compact and clean */}
              <div className="lg:col-span-5 flex flex-col justify-between p-8 bg-white h-full min-h-[300px]">
                <div className="w-full space-y-4">
                  <FormField
                    control={form.control}
                    name="FC_ESTADO"
                    render={({ field }) => (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 italic">ESTADO DE FACTURA</label>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className={cn(
                            "w-full h-10 rounded-none border-slate-400 font-black uppercase text-xs",
                            field.value === 'PAGADO' ? "bg-green-50 text-green-700 border-green-200" :
                              field.value === 'CANCELADO' ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-700"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-slate-400">
                            <SelectItem value="PENDIENTE" className="text-xs font-bold uppercase">PENDIENTE</SelectItem>
                            <SelectItem value="PAGADO" className="text-xs font-bold uppercase text-green-700">PAGADO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  {totalPaid < total ? (
                    <div className="pt-4 border-t border-slate-300">
                      <span className="text-[10px] font-bold uppercase text-slate-400 mb-1 italic">PENDIENTE POR DISTRIBUIR</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl font-bold text-red-400">$</span>
                        <span className="text-4xl font-black text-red-600 tracking-tighter animate-pulse">
                          {(total - totalPaid).toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  ) : totalPaid > total ? (
                    <div className="pt-4 border-t border-slate-300">
                      <span className="text-[10px] font-bold uppercase text-amber-500 mb-1 italic">SOBREPAGO / EXCESO</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl font-bold text-amber-400">$</span>
                        <span className="text-4xl font-black text-amber-600 tracking-tighter">
                          {(totalPaid - total).toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  ) : total > 0 ? (
                    <div className="pt-4 border-t border-slate-300 flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-green-600 italic">BALANCE COMPLETADO</span>
                        <span className="text-xs font-black text-black">TOTAL RECIBIDO: $ {totalPaid.toLocaleString('es-CO')}</span>
                      </div>
                      <Check className="size-5 text-green-500 ml-auto" />
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-2 justify-end items-center mt-auto">
                  {Math.abs(totalPaid - total) < 0.01 && total > 0 ? (
                    <div className="flex gap-2 items-center text-green-600 transition-all scale-110">
                      <Check className="size-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">LISTA PARA PROCESAR</span>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center text-red-400 transition-all opacity-70">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">{totalPaid > total ? 'EXCESO DE DINERO' : 'PAGO INCOMPLETO'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Final Actions - Minimal */}
            <div className="p-4 pt-0 flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-12 rounded-none border border-slate-200 font-bold text-sm hover:bg-slate-50 uppercase tracking-tighter text-slate-500"
              >
                {isViewOnly ? 'CERRAR VISTA' : 'DESCARTAR'}
              </Button>
              {!isViewOnly && (
                <Button
                  type="submit"
                  disabled={isLoading || uploadingPhysical || uploadingIndexes.length > 0 || totalPaid !== total || total <= 0}
                  className={cn(
                    "flex-[2] h-12 rounded-none font-black text-lg uppercase tracking-tighter transition-all shadow-lg",
                    !isLoading && !uploadingPhysical && uploadingIndexes.length === 0 && totalPaid === total && total > 0
                      ? "bg-slate-900 hover:bg-black text-white"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200 shadow-none"
                  )}
                >
                  {isLoading
                    ? 'GUARDANDO...'
                    : (uploadingPhysical || uploadingIndexes.length > 0)
                      ? 'SUBIENDO IMAGEN...'
                      : 'PROCESAR FACTURA'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
