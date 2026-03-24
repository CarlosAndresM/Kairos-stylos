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
  Loader2,
  Eye
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
  const isPaid = isViewOnly || ((invoice?.FC_ESTADO === 'PAGADO' || invoice?.FC_ESTADO === 'CANCELADO') && sessionUser?.role !== 'ADMINISTRADOR_TOTAL')

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
      VL_NUMERO_CUOTAS: 1,
      VL_FECHA_INICIO_COBRO: new Date(),
      FC_FECHA: new Date(),
      SC_IDSUCURSAL_FK: sessionUser?.sucursal_id || 1,
      TR_IDCAJERO_FK: sessionUser?.id || 1,
      services: [{ tempId: uuidv4(), SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0, products: [] }],
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
      // Re-estructurar datos: mapear productos a sus servicios correspondientes basados en FD_IDDETALLE_FK
      const mappedServices = (invoice.services || []).map((s: any) => {
        const serviceProds = (invoice.products || []).filter((p: any) =>
          p.FD_IDDETALLE_FK && String(p.FD_IDDETALLE_FK) === String(s.FD_IDDETALLE_PK)
        )
        return {
          ...s,
          tempId: s.tempId || uuidv4(),
          products: serviceProds
        }
      })

      // Productos independientes (si quedara alguno)
      const standaloneProducts = (invoice.products || []).filter((p: any) => !p.FD_IDDETALLE_FK)

      form.reset({
        FC_IDFACTURA_PK: invoice.FC_IDFACTURA_PK,
        FC_NUMERO_FACTURA: invoice.FC_NUMERO_FACTURA,
        FC_FECHA: new Date(invoice.FC_FECHA),
        FC_TIPO_CLIENTE: invoice.FC_TIPO_CLIENTE,
        TR_IDCLIENTE_FK: invoice.TR_IDCLIENTE_FK,
        isVale: invoice.isVale,
        VL_NUMERO_CUOTAS: invoice.VL_NUMERO_CUOTAS || 1,
        VL_FECHA_INICIO_COBRO: invoice.VL_FECHA_INICIO_COBRO ? new Date(invoice.VL_FECHA_INICIO_COBRO) : null,
        FC_CLIENTE_NOMBRE: invoice.FC_CLIENTE_NOMBRE,
        FC_CLIENTE_TELEFONO: invoice.FC_CLIENTE_TELEFONO,
        SC_IDSUCURSAL_FK: invoice.SC_IDSUCURSAL_FK,
        TR_IDCAJERO_FK: invoice.TR_IDCAJERO_FK,
        services: mappedServices,
        products: standaloneProducts,
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
        VL_NUMERO_CUOTAS: 1,
        VL_FECHA_INICIO_COBRO: new Date(),
        FC_FECHA: new Date(),
        SC_IDSUCURSAL_FK: sessionUser?.sucursal_id || 1,
        TR_IDCAJERO_FK: sessionUser?.id || 1,
        services: [{ tempId: uuidv4(), SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0, products: [] }],
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

  // Watchers con useWatch para mÃ¡xima reactividad
  const watchedServices = useWatch({ control: form.control, name: "services" }) || []
  const watchedProducts = useWatch({ control: form.control, name: "products" }) || []
  const watchedPayments = useWatch({ control: form.control, name: "payments" }) || []
  const clientType = useWatch({ control: form.control, name: "FC_TIPO_CLIENTE" })

  // El total se calcula dinÃ¡micamente para la UI, ya no se sincroniza al estado del form para evitar bucles de renderizado
  const total = React.useMemo(() => {
    const sTotal = (watchedServices || []).reduce((sum, s) => {
      const base = Number(s.FD_VALOR) || 0
      const prodsTotal = (s.products || []).reduce((ps, p: any) => ps + (Number(p.FP_VALOR) || 0), 0)
      return sum + base + prodsTotal
    }, 0)
    const pTotal = (watchedProducts || []).reduce((sum, p) => sum + (Number(p.FP_VALOR) || 0), 0)
    return sTotal + pTotal
  }, [watchedServices, watchedProducts])

  const totalPaid = React.useMemo(() => {
    return (watchedPayments || []).reduce((sum, p) => sum + (Number(p.PF_VALOR) || 0), 0)
  }, [watchedPayments])

  const balance = total - totalPaid

  // Auto-balancear si hay un solo mÃ©todo de pago y es de tipo deuda (o si el usuario lo solicita)
  const handleBalance = React.useCallback(() => {
    if (watchedPayments.length > 0) {
      const idx = watchedPayments.length - 1
      const currentVal = Number(watchedPayments[idx].PF_VALOR) || 0
      form.setValue(`payments.${idx}.PF_VALOR`, currentVal + balance)
    }
  }, [balance, watchedPayments, form])

  // Si cambia el total y solo hay un pago de crÃ©dito/vale, lo actualizamos automÃ¡ticamente
  React.useEffect(() => {
    if (watchedPayments.length === 1) {
      const methodId = watchedPayments[0].MP_IDMETODO_FK
      const methodName = paymentMethods.find(m => m.MP_IDMETODO_PK === methodId)?.MP_NOMBRE.toUpperCase()
      if (methodName === 'CREDITO' || methodName === 'VALE') {
         form.setValue('payments.0.PF_VALOR', total)
      }
    }
  }, [total, paymentMethods, form]) // Solo cuando cambia el total y hay un solo pago

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

  // Auto-distribuciÃ³n si solo hay uno seleccionado
  React.useEffect(() => {
    if (watchedPayments.length === 1) {
      form.setValue(`payments.0.PF_VALOR`, total)
    }
  }, [total, watchedPayments.length, form])

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

  const onInvalid = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    toast.error('Datos incompletos', 'Por favor revise los campos marcados en rojo.');

    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast.error('Error detallado', firstError.message);
    }
  }

  const onSubmit = async (data: InvoiceFormData) => {
    setIsLoading(true)
    try {
      // Inyectar el total calculado antes de enviar
      const finalData = { ...data, FC_TOTAL: total };
      console.log("Submitting Invoice Data:", finalData);
      const res = await saveInvoice(finalData)
      if (res.success) {
        toast.success(isEditing ? 'Factura actualizada' : 'Factura guardada')
        uploadedTempFiles.current = []
        form.reset()
        onClose()
      } else {
        toast.error(res.error || 'Error al procesar factura')
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error('Error de sistema')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    cleanupTempFiles()
    onClose()
  }

  const handleStatusChange = async (newStatus: string) => {
    const isRestrictedOriginalStatus = invoice?.FC_ESTADO === 'PAGADO' || invoice?.FC_ESTADO === 'CANCELADO'

    if (isRestrictedOriginalStatus && newStatus !== invoice.FC_ESTADO) {
      setPendingStatusChange(newStatus)
      setIsAdminAuthOpen(true)
      return
    }

    form.setValue("FC_ESTADO", newStatus as any)
  }

  const verifyAdminAndChangeStatus = async () => {
    if (!adminPassword) {
      toast.error('Ingrese la contraseÃ±a')
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
        toast.error(res.error || 'ContraseÃ±a incorrecta')
      }
    } catch (error) {
      toast.error('Error de verificaciÃ³n')
    } finally {
      setIsVerifyingAdmin(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <DialogContent className="max-w-[98vw] lg:max-w-[1100px] h-[95vh] rounded-none p-0 border-4 border-rose-200 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Hoja de Venta</DialogTitle>
          <DialogDescription>{isEditing ? 'EdiciÃ³n' : 'CreaciÃ³n'} de factura</DialogDescription>
        </DialogHeader>

        {/* Modal Admin Auth */}
        {isAdminAuthOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-sm font-black uppercase mb-2 tracking-widest">SEGURIDAD: REQUERIDO ADMIN</h3>
              <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase">Para cambiar una factura PAGADA debe autorizar como administrador.</p>
              <Input type="password" placeholder="CONTRASEÃ‘A ADMINISTRADOR" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="rounded-none border-2 border-black mb-4 font-black placeholder:text-black/40" autoFocus autoComplete="new-password" onKeyDown={(e) => e.key === 'Enter' && verifyAdminAndChangeStatus()} />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-none border-2 border-black uppercase font-black text-xs" onClick={() => { setIsAdminAuthOpen(false); setAdminPassword(''); setPendingStatusChange(null) }}>CANCELAR</Button>
                <Button className="flex-1 rounded-none bg-black text-white hover:bg-slate-800 uppercase font-black text-xs gap-2" onClick={verifyAdminAndChangeStatus} disabled={isVerifyingAdmin}>
                  {isVerifyingAdmin && <Loader2 className="size-3 animate-spin" />}AUTORIZAR
                </Button>
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col h-full font-mono text-black overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-10">

              {/* â”€â”€ SECCIÃ“N 01: INFORMACIÃ“N DEL CLIENTE â”€â”€ */}
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-8 border-b-2 border-slate-100 pb-8">
                  {/* IZQUIERDA */}
                  <div className="flex flex-col gap-6 w-full lg:max-w-[520px]">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#FF86A2] text-white px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">01</div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black">INFORMACIÃ“N DEL CLIENTE</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 border-l-4 border-[#FF86A2]">
                      {clientType === 'CLIENTE' ? (
                        <>
                          <FormField control={form.control} name="FC_CLIENTE_NOMBRE" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-[#FF86A2] tracking-wider">CLIENTE:*</label>
                              <Input {...field} value={field.value || ''} disabled={isPaid} placeholder="NOMBRE COMPLETO" className="border-0 border-b-2 border-slate-200 focus:border-[#FF86A2] p-0 h-9 focus-visible:ring-0 text-sm font-black uppercase rounded-none placeholder:text-black/20 bg-transparent text-black transition-colors" />
                              <FormMessage className="text-[9px] font-bold text-red-600" />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="FC_CLIENTE_TELEFONO" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-[#FF86A2] tracking-wider">CONTACTO:*</label>
                              <Input {...field} value={field.value || ''} disabled={isPaid} placeholder="300 000 0000" className="border-0 border-b-2 border-slate-200 focus:border-[#FF86A2] p-0 h-9 focus-visible:ring-0 text-sm font-black uppercase rounded-none placeholder:text-black/20 bg-transparent text-black transition-colors" />
                              <FormMessage className="text-[9px] font-bold text-red-600" />
                            </FormItem>
                          )} />
                        </>
                      ) : (
                        <FormField control={form.control} name="TR_IDCLIENTE_FK" render={({ field }) => (
                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-black uppercase text-[#FF86A2] tracking-wider">PERSONAL / TÃ‰CNICO:*</label>
                            <ComboboxSearch options={technicianOptions} value={field.value || ''} disabled={isPaid} onValueChange={(val) => field.onChange(val)} placeholder="BUSCAR TRABAJADOR..." className="h-10 rounded-none border-2 border-slate-200 bg-white text-xs text-black font-black uppercase w-full" />
                          </div>
                        )} />
                      )}
                    </div>

                    {/* Factura fÃ­sica */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">FACTURA FÃSICA:</label>
                      <div className="flex items-center gap-3">
                        <input type="file" accept="image/*" className="hidden" ref={physicalInvoiceInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhysicalInvoiceUpload(f) }} />
                        <button type="button" disabled={uploadingPhysical || (isPaid && !isAdminAuthOpen)} onClick={() => physicalInvoiceInputRef.current?.click()}
                          className={cn("flex items-center justify-center gap-2 px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[11px] font-black transition-all border-2 cursor-pointer uppercase min-h-[40px] flex-1 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                            uploadingPhysical ? "bg-slate-50 border-slate-200 text-black shadow-none" : form.watch("FC_EVIDENCIA_FISICA_URL") ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-black text-white bg-slate-900 hover:bg-black")}>
                          {uploadingPhysical ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                          {form.watch("FC_EVIDENCIA_FISICA_URL") ? 'FOTO ADJUNTA' : 'SUBIR EVIDENCIA'}
                        </button>
                        {form.watch("FC_EVIDENCIA_FISICA_URL") && (
                          <a href={form.watch("FC_EVIDENCIA_FISICA_URL")!} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] font-black text-[#FF86A2] hover:underline h-10 px-4 border-2 border-rose-100 uppercase">
                            VER <Eye className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DERECHA: META + FECHA */}
                  <div className="flex flex-col gap-6 w-full lg:w-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">CATEGORÃA:</label>
                        <Select value={clientType} disabled={isPaid} onValueChange={(val) => form.setValue("FC_TIPO_CLIENTE", val as any)}>
                          <SelectTrigger className="w-full lg:w-[200px] h-11 rounded-none border-2 border-black bg-white text-[12px] font-black uppercase text-black">
                            <SelectValue placeholder="TIPO" />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-2 border-black">
                            <SelectItem value="CLIENTE" className="text-[11px] font-black uppercase">CLIENTE NORMAL</SelectItem>
                            <SelectItem value="TECNICO" className="text-[11px] font-black uppercase">PERSONAL TÃ‰CNICO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <FormField control={form.control} name="SC_IDSUCURSAL_FK" render={({ field }) => (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">SUCURSAL:</label>
                          <Select value={field.value?.toString()} onValueChange={(val) => field.onChange(Number(val))} disabled={sessionUser?.role !== 'ADMINISTRADOR_TOTAL'}>
                            <SelectTrigger className="w-full lg:w-[200px] h-11 rounded-none border-2 border-black bg-white text-[12px] font-black uppercase text-black">
                              <SelectValue placeholder="SEDE" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2 border-black">
                              {sucursales.map(s => (
                                <SelectItem key={s.SC_IDSUCURSAL_PK} value={s.SC_IDSUCURSAL_PK.toString()} className="text-[11px] font-black uppercase">{s.SC_NOMBRE}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )} />

                      {form.watch("isVale") && (
                        <div className="space-y-3 bg-amber-50 p-4 border-l-4 border-amber-500">
                          <div className="flex items-center gap-2">
                            <Receipt className="size-3.5 text-amber-700" />
                            <span className="text-[10px] font-black uppercase text-amber-700">SERVICIO DE TRABAJADOR</span>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-amber-700">INICIO COBRO:</label>
                            <FormField control={form.control} name="VL_FECHA_INICIO_COBRO" render={({ field }) => (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" disabled={isPaid} className="w-full h-9 bg-white border-2 border-amber-300 rounded-none flex items-center px-3 text-[11px] font-black uppercase text-black">
                                    {field.value ? format(field.value, "dd/MM/yyyy") : "SELECCIONAR"}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-none border-2 border-black" align="start">
                                  <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus className="rounded-none" />
                                </PopoverContent>
                              </Popover>
                            )} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-amber-700">CUOTAS SEMANALES:</label>
                            <FormField control={form.control} name="VL_NUMERO_CUOTAS" render={({ field }) => (
                              <Input {...field} type="number" min={1} disabled={isPaid} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} className="h-9 rounded-none border-2 border-amber-300 bg-white text-[11px] font-black text-black px-3" />
                            )} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-4 lg:mt-auto">
                      <div className="flex flex-col lg:items-end gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">FECHA DE EMISIÃ“N:</label>
                        <FormField control={form.control} name="FC_FECHA" render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className={cn("text-base font-black uppercase tracking-tight hover:text-[#FF86A2] transition-colors flex items-center gap-2 border-b-4 border-rose-100 pb-1", !field.value ? "text-slate-300" : "text-black")}>
                                <CalendarIcon className="size-5 text-[#FF86A2]" />
                                {field.value ? format(field.value, "d 'DE' MMMM, yyyy", { locale: es }) : "SELECCIONAR FECHA"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-none border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" align="end">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className="rounded-none" />
                            </PopoverContent>
                          </Popover>
                        )} />
                      </div>

                      <div className="flex flex-col lg:items-end gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">NRO. FACTURA / REF:</label>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">REF#</span>
                          <FormField control={form.control} name="FC_NUMERO_FACTURA" render={({ field }) => (
                            <input {...field} value={field.value || ''} disabled={isEditing} className="text-2xl font-black uppercase text-black bg-white border-2 border-black px-4 h-12 w-36 text-right rounded-none focus:outline-none focus:border-[#FF86A2] transition-all disabled:bg-slate-50 disabled:text-slate-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" placeholder="0000" />
                          )} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* â”€â”€ SECCIÃ“N 02: DETALLE DE VENTA â”€â”€ */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#FF86A2] text-white px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">02</div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black">DETALLE DE VENTA</h3>
                  </div>
                  <button type="button" disabled={isPaid}
                    onClick={() => appendService({ tempId: uuidv4(), SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0, products: [] })}
                    className={cn("w-full sm:w-auto text-xs font-black flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white text-black bg-white border-2 border-black px-6 py-2.5 transition-all uppercase tracking-widest cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                      isPaid && "opacity-50 cursor-not-allowed shadow-none")}>
                    <PlusCircle className="size-4" /> AGREGAR SERVICIO
                  </button>
                </div>

                <div className="border-4 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  {/* Cabecera tabla */}
                  <div className="hidden lg:grid grid-cols-12 bg-[#FF86A2] text-white text-[11px] font-black uppercase tracking-[0.12em] py-4 divide-x-2 divide-white/20 border-b-4 border-black">
                    <div className="col-span-4 px-5">SERVICIO PRESTADO</div>
                    <div className="col-span-3 px-5">ENCARGADO / TÃ‰CNICO</div>
                    <div className="col-span-3 px-5">PRODUCTOS ASOCIADOS</div>
                    <div className="col-span-2 text-right px-5">VALOR TOTAL</div>
                  </div>

                  {/* Filas de servicios */}
                  <div className="divide-y-2 divide-slate-100 bg-white">
                    {serviceFields.map((sField, index) => (
                      <div key={sField.id} className={cn("grid grid-cols-1 lg:grid-cols-12 min-h-[60px] lg:items-center hover:bg-rose-50/20 transition-colors group lg:divide-x-2 lg:divide-slate-100", index % 2 === 0 ? "bg-white" : "bg-slate-50/40")}>
                        {/* Servicio */}
                        <div className="col-span-1 lg:col-span-4 px-5 py-3 lg:py-2 border-b lg:border-b-0 border-slate-100">
                          <span className="lg:hidden text-[10px] font-black text-[#FF86A2] uppercase tracking-widest block mb-1">SERVICIO:</span>
                          <FormField control={form.control} name={`services.${index}.SV_IDSERVICIO_FK`} render={({ field }) => (
                            <ComboboxSearch options={serviceOptions} value={field.value} disabled={isPaid}
                              onValueChange={(val) => { field.onChange(val); const sel = services.find(s => s.SV_IDSERVICIO_PK === val); if (sel) form.setValue(`services.${index}.FD_VALOR`, sel.SV_VALOR || 0) }}
                              placeholder="ELEGIR SERVICIO..." className="h-10 rounded-none border-2 border-slate-200 bg-white text-xs text-black font-black uppercase w-full" />
                          )} />
                        </div>

                        {/* TÃ©cnico */}
                        <div className="col-span-1 lg:col-span-3 px-5 py-3 lg:py-2 border-b lg:border-b-0 border-slate-100">
                          <span className="lg:hidden text-[10px] font-black text-[#FF86A2] uppercase tracking-widest block mb-1">ENCARGADO:</span>
                          <FormField control={form.control} name={`services.${index}.TR_IDTECNICO_FK`} render={({ field }) => (
                            <ComboboxSearch options={technicianOptions} value={field.value} disabled={isPaid}
                              onValueChange={(val) => field.onChange(val)}
                              placeholder="ENCARGADO..." className="h-10 rounded-none border-2 border-slate-200 bg-white text-xs text-black font-black uppercase w-full" />
                          )} />
                        </div>

                        {/* Productos */}
                        <div className="col-span-1 lg:col-span-3 px-5 py-3 lg:py-2 border-b lg:border-b-0 border-slate-100">
                          <span className="lg:hidden text-[10px] font-black text-[#FF86A2] uppercase tracking-widest block mb-1">PRODUCTOS:</span>
                          <span className="text-[11px] font-semibold text-black/60 uppercase italic">
                            {(watchedServices[index]?.products || []).length > 0
                              ? watchedServices[index].products.map((p: any) => {
                                const pName = products.find(cp => cp.PR_IDPRODUCTO_PK === p.PR_IDPRODUCTO_FK)?.PR_NOMBRE || 'PRODUCTO'
                                return `${pName} ($${Number(p.FP_VALOR || 0).toLocaleString('es-CO')})`
                              }).join(', ')
                              : 'SIN PRODUCTOS'}
                          </span>
                        </div>

                        {/* Valor + Eliminar */}
                        <div className="col-span-1 lg:col-span-2 px-5 py-3 lg:py-2 flex items-center justify-between lg:justify-end gap-3 bg-slate-50/50 lg:bg-transparent">
                          <span className="lg:hidden text-[10px] font-black text-[#FF86A2] uppercase tracking-widest">VALOR:</span>
                          <div className="flex items-center gap-2">
                            <FormField control={form.control} name={`services.${index}.FD_VALOR`} render={({ field }) => (
                              <NumericFormat value={field.value} disabled={isPaid} onValueChange={(values) => { const v = values.floatValue ?? 0; if (v !== field.value) field.onChange(v) }}
                                thousandSeparator="." decimalSeparator="," prefix="$ " allowNegative={false}
                                className="w-28 h-9 bg-white border-2 border-slate-200 rounded-none text-right font-black focus:outline-none focus:border-[#FF86A2] text-sm text-black px-2 disabled:bg-slate-50 disabled:text-black/30 transition-colors" />
                            )} />
                            {!isPaid && (
                              <button type="button" onClick={() => removeService(index)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-red-400 hover:text-red-600 cursor-pointer">
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtotal */}
                  <div className="grid grid-cols-12 min-h-[56px] items-center px-5 bg-slate-900 border-t-2 border-black py-3">
                    <div className="col-span-10 text-right pr-6">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">SUBTOTAL DE VENTA</span>
                    </div>
                    <div className="col-span-2 text-right border-l-2 border-white/10 pl-4">
                      <span className="text-xl font-black text-white tracking-tighter">$ {total.toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* â”€â”€ SECCIÃ“N 03: PAGO â”€â”€ */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FF86A2] text-white px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">03</div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black">MÃ‰TODOS DE PAGO Y ESTADO</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 border-4 border-black divide-y-4 lg:divide-y-0 lg:divide-x-4 divide-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  {/* Columna mÃ©todos de pago */}
                  <div className="lg:col-span-7 p-6 space-y-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SELECCIONE LOS MÃ‰TODOS:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethods
                        .filter(method => {
                          const isValeMethod = method.MP_NOMBRE?.toUpperCase() === 'VALE'
                          if (clientType === 'CLIENTE' && isValeMethod) return false
                          return true
                        })
                        .map(method => {
                          const isSelected = !!watchedPayments.find(p => p.MP_IDMETODO_FK === method.MP_IDMETODO_PK)
                          return (
                            <div key={method.MP_IDMETODO_PK}
                              onClick={() => !isPaid && handlePaymentToggle(method, !isSelected)}
                              className={cn("flex items-center gap-3 p-4 border-2 transition-all cursor-pointer select-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]",
                                isPaid ? "cursor-not-allowed opacity-70 shadow-none" : "",
                                isSelected ? "border-[#FF86A2] bg-rose-50" : "border-slate-200 bg-white hover:border-black")}>
                              <div className={cn("w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0", isSelected ? "border-[#FF86A2] bg-[#FF86A2]" : "border-slate-300 bg-white")}>
                                {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-xs font-black uppercase tracking-tight text-black leading-tight">
                                {method.MP_NOMBRE === 'VALE' ? 'SERVICIO TRABAJADOR' : method.MP_NOMBRE}
                              </span>
                            </div>
                          )
                        })}
                    </div>

                    {watchedPayments.length > 0 && (
                      <div className="mt-2 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DISTRIBUCIÃ“N DE PAGO:</p>
                        {watchedPayments.map((payment, idx) => {
                          const method = paymentMethods.find(m => m.MP_IDMETODO_PK === payment.MP_IDMETODO_FK)
                          return (
                            <div key={`${payment.MP_IDMETODO_FK}-${idx}`} className="flex flex-col sm:flex-row gap-3 bg-slate-50 border-2 border-slate-200 p-4">
                              <div className="flex items-center justify-between flex-1 gap-3">
                                <span className="text-[11px] font-black uppercase text-black">{method?.MP_NOMBRE === 'VALE' ? 'SERV. TRABAJADOR' : method?.MP_NOMBRE}</span>
                                <FormField control={form.control} name={`payments.${idx}.PF_VALOR`} render={({ field }) => (
                                  <NumericFormat value={field.value} disabled={isPaid} onValueChange={(values) => { const v = values.floatValue ?? 0; if (v !== field.value) field.onChange(v) }}
                                    thousandSeparator="." decimalSeparator="," prefix="$ " allowNegative={false}
                                    className="w-36 bg-white border-2 border-slate-200 focus:border-[#FF86A2] rounded-none px-3 font-black text-right text-black text-sm h-10 disabled:bg-slate-50 disabled:text-black/50 outline-none transition-colors" />
                                )} />
                              </div>
                              <div className="flex items-center gap-2 border-t-2 sm:border-t-0 sm:border-l-2 border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                                <input type="file" accept="image/*" className="hidden" ref={el => { fileInputRefs.current[`${idx}`] = el }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(idx, f) }} />
                                <button type="button" disabled={uploadingIndexes.includes(idx) || isPaid} onClick={(e) => { e.stopPropagation(); fileInputRefs.current[`${idx}`]?.click() }}
                                  className={cn("flex items-center gap-2 px-3 py-2 text-[10px] font-black border-2 cursor-pointer uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none",
                                    uploadingIndexes.includes(idx) ? "bg-slate-50 border-slate-200 shadow-none" : payment.PF_EVIDENCIA_URL ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-black bg-white hover:bg-slate-900 hover:text-white")}>
                                  {uploadingIndexes.includes(idx) ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                                  {uploadingIndexes.includes(idx) ? 'PROCESANDO' : payment.PF_EVIDENCIA_URL ? 'VER REGISTRO' : 'ADJUNTAR'}
                                </button>
                                {payment.PF_EVIDENCIA_URL && (
                                  <HoverCard openDelay={800}>
                                    <HoverCardTrigger asChild>
                                      <a href={payment.PF_EVIDENCIA_URL} target="_blank" rel="noreferrer" className="text-[10px] font-black underline text-black hover:text-[#FF86A2] cursor-pointer">VER</a>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72 p-0 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden" side="top">
                                      <div className="bg-slate-900 text-white text-[9px] font-black p-1 px-3 uppercase">VISTA PREVIA</div>
                                      <img src={payment.PF_EVIDENCIA_URL} alt="Evidencia" className="w-full h-auto object-contain max-h-72" />
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Columna estado y balance */}
                  <div className="lg:col-span-5 p-6 flex flex-col gap-6">
                    <FormField control={form.control} name="FC_ESTADO" render={({ field }) => (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">ESTADO DE FACTURA:</label>
                        <Select value={field.value} onValueChange={handleStatusChange}>
                          <SelectTrigger className={cn("w-full h-12 rounded-none border-2 font-black uppercase text-sm",
                            field.value === 'PAGADO' ? "border-emerald-400 bg-emerald-50 text-emerald-700" :
                            field.value === 'CANCELADO' ? "border-red-400 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-2 border-black">
                            <SelectItem value="PENDIENTE" className="text-xs font-black uppercase text-amber-700">PENDIENTE</SelectItem>
                            <SelectItem value="PAGADO" className="text-xs font-black uppercase text-emerald-700">PAGADO</SelectItem>
                            <SelectItem value="CANCELADO" className="text-xs font-black uppercase text-red-700">CANCELADO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )} />

                    <div className="flex-1 flex flex-col justify-end gap-3">
                      {totalPaid < total ? (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4">
                          <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-1">PENDIENTE POR DISTRIBUIR</p>
                          <span className="text-3xl font-black text-red-600 tracking-tighter">$ {(total - totalPaid).toLocaleString('es-CO')}</span>
                        </div>
                      ) : totalPaid > total ? (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                          <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">SOBREPAGO / EXCESO</p>
                          <span className="text-3xl font-black text-amber-600 tracking-tighter">$ {(totalPaid - total).toLocaleString('es-CO')}</span>
                        </div>
                      ) : total > 0 ? (
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 flex items-center gap-3">
                          <div className="flex flex-col">
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">BALANCE COMPLETADO</p>
                            <span className="text-sm font-black text-black">TOTAL: $ {totalPaid.toLocaleString('es-CO')}</span>
                          </div>
                          <Check className="size-6 text-emerald-500 ml-auto" />
                        </div>
                      ) : null}

                      <div className="flex items-center justify-end gap-2 pt-2">
                        {Math.abs(totalPaid - total) < 0.01 && total > 0 ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <Check className="size-4" />
                            <span className="text-[11px] font-black uppercase tracking-widest">LISTA PARA PROCESAR</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-500">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[11px] font-black uppercase tracking-widest italic">{totalPaid > total ? 'EXCESO DE DINERO' : 'PAGO INCOMPLETO'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* â”€â”€ FOOTER â”€â”€ */}
            <div className="flex-shrink-0 border-t-4 border-black flex gap-4 p-4 bg-white">
              <Button type="button" variant="outline" onClick={handleClose}
                className="flex-1 h-12 rounded-none border-2 border-black font-black text-sm hover:bg-slate-50 uppercase tracking-widest text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
                {isViewOnly ? 'CERRAR VISTA' : 'DESCARTAR'}
              </Button>
              {!isPaid && (
                <Button type="submit" disabled={isLoading || uploadingPhysical || uploadingIndexes.length > 0 || Math.abs(totalPaid - total) > 0.01 || total <= 0}
                  className={cn("flex-[2] h-12 rounded-none font-black text-sm uppercase tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                    !isLoading && !uploadingPhysical && uploadingIndexes.length === 0 && Math.abs(totalPaid - total) <= 0.01 && total > 0
                      ? "bg-[#FF86A2] hover:bg-rose-400 text-white border-2 border-[#FF86A2]"
                      : "bg-slate-100 text-black/30 cursor-not-allowed border-2 border-slate-200 shadow-none")}>
                  {isLoading ? 'GUARDANDO...' : (uploadingPhysical || uploadingIndexes.length > 0) ? 'SUBIENDO IMAGEN...' : 'PROCESAR FACTURA'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
