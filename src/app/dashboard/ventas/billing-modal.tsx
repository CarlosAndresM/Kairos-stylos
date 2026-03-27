'use client'

import * as React from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Trash2,
  Receipt,
  User,
  Phone,
  PlusCircle,
  X,
  Camera,
  Check,
  Calendar as CalendarIcon,
  Loader2,
  Eye,
  Pencil
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, isSameWeek, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { v4 as uuidv4 } from 'uuid'
import { getPeriodRange, formatPeriodRange } from '@/lib/date-utils'
import { ProductAssociationModal } from '@/features/dashboard/product-association-modal'
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
import { getRecentInvoices, getPaymentMethods, saveInvoice } from "@/features/billing/services";
import { getClients } from "@/features/clients/services";
import { toast } from '@/lib/toast-helper'
import { cn } from '@/lib/utils'
import { ComboboxSearch } from '@/components/ui/combobox-search'
import { compressImage } from '@/lib/image-utils'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { ClientAutocomplete } from '@/components/ui/client-autocomplete'


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
  const [uploadingIndexes, setUploadingIndexes] = React.useState<number[]>([])
  const fileInputRefs = React.useRef<{ [key: string]: HTMLInputElement | null }>({})
  const uploadedTempFiles = React.useRef<string[]>([])
  const [isAdminAuthOpen, setIsAdminAuthOpen] = React.useState(false)
  const [adminPassword, setAdminPassword] = React.useState('')
  const [isVerifyingAdmin, setIsVerifyingAdmin] = React.useState(false)
  const [pendingStatusChange, setPendingStatusChange] = React.useState<string | null>(null)
  const [uploadingPhysical, setUploadingPhysical] = React.useState(false)
  const physicalInvoiceInputRef = React.useRef<HTMLInputElement>(null)
  const [allClients, setAllClients] = React.useState<any[]>([])
  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false)
  const [pendingInvoices, setPendingInvoices] = React.useState<any[]>([])
  const [manualEditData, setManualEditData] = React.useState<any>(null)


  const isEditing = !!invoice


  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      FC_CLIENTE_NOMBRE: '',
      FC_CLIENTE_TELEFONO: '',
      FC_TIPO_CLIENTE: 'CLIENTE',
      TR_IDCLIENTE_FK: null,
      esServicioTrabajador: false,
      VL_NUMERO_CUOTAS: 1,
      VL_FECHA_INICIO_COBRO: new Date(),
      FC_FECHA: new Date(),
      SC_IDSUCURSAL_FK: sessionUser?.branchId || 1,
      TR_IDCAJERO_FK: sessionUser?.id || 1,
      services: [{ tempId: uuidv4(), SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0, FD_CANTIDAD: 1, products: [] }],
      products: [],
      payments: [],
      FC_ESTADO: 'PENDIENTE',
      FC_TOTAL: 0,
      FC_EVIDENCIA_FISICA_URL: null
    }
  })

  const currentStatus = useWatch({ control: form.control, name: "FC_ESTADO" })
  const isLockedByStatus = (invoice?.FC_ESTADO === 'PAGADO' || invoice?.FC_ESTADO === 'CANCELADO') && sessionUser?.role !== 'ADMINISTRADOR_TOTAL'
  const isPaid = isViewOnly || isLockedByStatus

  const cleanupTempFiles = React.useCallback(async (urls?: string[]) => {
    const filesToDelete = urls || uploadedTempFiles.current
    for (const url of filesToDelete) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
      } catch (error) {
        console.error('Error al limpiar archivo temporal:', error)
      }
    }
    if (!urls) uploadedTempFiles.current = []
  }, [])

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



  // Mapping logic extracted for reuse
  const mapInvoiceToForm = React.useCallback((inv: any) => {
    const mappedServices = (inv.services || []).map((s: any) => {
      const serviceProds = (inv.products || []).filter((p: any) =>
        p.FD_IDDETALLE_FK && String(p.FD_IDDETALLE_FK) === String(s.FD_IDDETALLE_PK)
      ).map((p: any) => ({
        FP_IDFACTURA_PRODUCTO_PK: p.FP_IDFACTURA_PRODUCTO_PK,
        PR_IDPRODUCTO_FK: p.PR_IDPRODUCTO_FK,
        TR_IDTECNICO_FK: p.TR_IDTECNICO_FK,
        FP_VALOR: Number(p.FP_VALOR),
        FP_CANTIDAD: p.FP_CANTIDAD || 1,
        FP_PORCENTAJE_APLICADO: p.FP_PORCENTAJE_APLICADO || 0,
        FP_COMISION_VALOR: p.FP_COMISION_VALOR || 0,
        FD_IDDETALLE_FK: p.FD_IDDETALLE_FK,
        tr_tecnico_nombre: p.tr_tecnico_nombre
      }))

      return {
        ...s,
        tempId: s.tempId || uuidv4(),
        FD_CANTIDAD: s.FD_CANTIDAD || 1,
        products: serviceProds
      }
    })

    const standaloneProducts = (inv.products || []).filter((p: any) => !p.FD_IDDETALLE_FK).map((p: any) => ({
      FP_IDFACTURA_PRODUCTO_PK: p.FP_IDFACTURA_PRODUCTO_PK,
      PR_IDPRODUCTO_FK: p.PR_IDPRODUCTO_FK,
      TR_IDTECNICO_FK: p.TR_IDTECNICO_FK,
      FP_VALOR: Number(p.FP_VALOR),
      FP_CANTIDAD: p.FP_CANTIDAD || 1,
      FP_PORCENTAJE_APLICADO: p.FP_PORCENTAJE_APLICADO || 0,
      FP_COMISION_VALOR: p.FP_COMISION_VALOR || 0,
      FD_IDDETALLE_FK: null,
      tr_tecnico_nombre: p.tr_tecnico_nombre
    }))

    return {
      FC_IDFACTURA_PK: inv.FC_IDFACTURA_PK,
      FC_NUMERO_FACTURA: inv.FC_NUMERO_FACTURA,
      FC_FECHA: new Date(inv.FC_FECHA),
      FC_TIPO_CLIENTE: inv.FC_TIPO_CLIENTE,
      TR_IDCLIENTE_FK: inv.TR_IDCLIENTE_FK,
      esServicioTrabajador: inv.esServicioTrabajador,
      VL_NUMERO_CUOTAS: inv.VL_NUMERO_CUOTAS || 1,
      VL_FECHA_INICIO_COBRO: inv.VL_FECHA_INICIO_COBRO ? new Date(inv.VL_FECHA_INICIO_COBRO) : (inv.FC_FECHA ? new Date(inv.FC_FECHA) : new Date()),
      FC_CLIENTE_NOMBRE: inv.FC_CLIENTE_NOMBRE,
      FC_CLIENTE_TELEFONO: inv.FC_CLIENTE_TELEFONO,
      SC_IDSUCURSAL_FK: inv.SC_IDSUCURSAL_FK,
      TR_IDCAJERO_FK: inv.TR_IDCAJERO_FK,
      services: mappedServices,
      products: standaloneProducts,
      payments: inv.payments || [],
      FC_ESTADO: inv.FC_ESTADO,
      FC_TOTAL: Number(inv.FC_TOTAL),
      FC_EVIDENCIA_FISICA_URL: inv.FC_EVIDENCIA_FISICA_URL
    }
  }, [])

  const handleAddProductManual = (productData: any) => {
    if (!productData) return

    const currentServices = form.getValues('services')

    // If it's an update, we might need to remove from old service if changed
    if (manualEditData !== null && manualEditData.sourceServiceIndex !== undefined) {
      const oldSIdx = manualEditData.sourceServiceIndex
      const oldProds = currentServices[oldSIdx].products || []
      const filtered = oldProds.filter((_: any, i: number) => i !== manualEditData.manualIndex)
      form.setValue(`services.${oldSIdx}.products`, filtered)
    }

    const serviceIndex = currentServices.findIndex((s: any) =>
      (s.FD_IDDETALLE_PK && String(s.FD_IDDETALLE_PK) === String(productData.FD_IDDETALLE_FK)) ||
      (s.tempId && String(s.tempId) === String(productData.FD_IDDETALLE_FK))
    )

    if (serviceIndex !== -1) {
      // Fetch latest prods because we might have just updated them in the removal step above
      const updatedServices = form.getValues('services')
      const existingProducts = updatedServices[serviceIndex].products || []

      form.setValue(`services.${serviceIndex}.products`, [
        ...existingProducts,
        {
          PR_IDPRODUCTO_FK: productData.PR_IDPRODUCTO_FK,
          TR_IDTECNICO_FK: productData.TR_IDTECNICO_FK,
          FP_VALOR: productData.FP_VALOR,
          FP_CANTIDAD: productData.FP_CANTIDAD || 1,
          FP_PORCENTAJE_APLICADO: productData.FP_PORCENTAJE_APLICADO || 0,
          FP_COMISION_VALOR: productData.FP_COMISION_VALOR || 0,
          FD_IDDETALLE_FK: productData.FD_IDDETALLE_FK
        }
      ])
      toast.success(manualEditData ? "Producto actualizado" : "Producto añadido")
    } else {
      toast.error("No se pudo asociar el producto al servicio seleccionado")
    }
    setManualEditData(null)
  }

  const handleEditProductManual = (sIdx: number, pIdx: number, product: any) => {
    setManualEditData({
      productId: product.PR_IDPRODUCTO_FK.toString(),
      serviceId: product.FD_IDDETALLE_FK ? product.FD_IDDETALLE_FK.toString() : (watchedServices[sIdx].FD_IDDETALLE_PK?.toString() || watchedServices[sIdx].tempId),
      technicianId: product.TR_IDTECNICO_FK.toString(),
      value: Number(product.FP_VALOR),
      quantity: Number(product.FP_CANTIDAD || 1),
      manualIndex: pIdx,
      sourceServiceIndex: sIdx
    })
    setIsProductModalOpen(true)
  }

  const handleRemoveProductManual = (sIdx: number, pIdx: number) => {
    const currentProds = form.getValues(`services.${sIdx}.products`) || []
    const updated = currentProds.filter((_: any, i: number) => i !== pIdx)
    form.setValue(`services.${sIdx}.products`, updated)
    toast.success("Producto quitado")
  }

  // Cargar clientes del historial al abrir el modal para búsqueda instantánea
  React.useEffect(() => {
    if (isOpen) {
      const loadClients = async () => {
        const [clientsRes, invoicesRes] = await Promise.all([
          getClients(),
          getRecentInvoices()
        ])
        if (clientsRes.success) setAllClients(clientsRes.data)
        if (invoicesRes.success) {
          setPendingInvoices(invoicesRes.data.filter((f: any) => f.FC_ESTADO === 'PENDIENTE'))
        }
      }
      loadClients()
    }
  }, [isOpen])

  // Cargar datos si estamos editando
  React.useEffect(() => {
    if (isOpen && invoice) {
      form.reset(mapInvoiceToForm(invoice))
    } else if (isOpen && !invoice) {
      form.reset({
        FC_CLIENTE_NOMBRE: '',
        FC_CLIENTE_TELEFONO: '',
        FC_TIPO_CLIENTE: 'CLIENTE',
        TR_IDCLIENTE_FK: null,
        esServicioTrabajador: false,
        VL_NUMERO_CUOTAS: 1,
        VL_FECHA_INICIO_COBRO: new Date(),
        FC_FECHA: new Date(),
        SC_IDSUCURSAL_FK: sessionUser?.branchId || 1,
        TR_IDCAJERO_FK: sessionUser?.id || 1,
        services: [{ tempId: uuidv4(), SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0, products: [] }],
        products: [],
        payments: [],
        FC_ESTADO: 'PENDIENTE',
        FC_TOTAL: 0,
        FC_EVIDENCIA_FISICA_URL: null
      })
    }
  }, [isOpen, invoice, form, sessionUser])

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control: form.control,
    name: "services"
  })

  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control: form.control,
    name: "products"
  })

  // Watchers con useWatch para mÃƒÂ¡xima reactividad
  const watchedServices = useWatch({ control: form.control, name: "services" }) || []
  const watchedProducts = useWatch({ control: form.control, name: "products" }) || []
  const watchedPayments = useWatch({ control: form.control, name: "payments" }) || []
  const clientType = useWatch({ control: form.control, name: "FC_TIPO_CLIENTE" })
  const selectedWorkerId = useWatch({ control: form.control, name: "TR_IDCLIENTE_FK" })
  const workerRole = React.useMemo(() => {
    if (clientType !== 'TECNICO' || !selectedWorkerId) return 'TECNICO';
    return technicians.find(t => t.TR_IDTRABAJADOR_PK === Number(selectedWorkerId))?.RL_NOMBRE || 'TECNICO';
  }, [clientType, selectedWorkerId, technicians]);

  // El total se calcula dinÃƒÂ¡micamente para la UI, ya no se sincroniza al estado del form para evitar bucles de renderizado
  const total = React.useMemo(() => {
    const sTotal = (watchedServices || []).reduce((sum, s) => sum + ((Number(s.FD_VALOR) || 0) * (Number(s.FD_CANTIDAD) || 1)), 0)
    return sTotal
  }, [watchedServices])

  const totalPaid = React.useMemo(() => {
    return (watchedPayments || []).reduce((sum, p) => sum + (Number(p.PF_VALOR) || 0), 0)
  }, [watchedPayments])

  const balance = total - totalPaid

  // Auto-balancear si hay un solo mÃƒÂ©todo de pago y es de tipo deuda (o si el usuario lo solicita)
  const handleBalance = React.useCallback(() => {
    if (watchedPayments.length > 0) {
      const idx = watchedPayments.length - 1
      const currentVal = Number(watchedPayments[idx].PF_VALOR) || 0
      form.setValue(`payments.${idx}.PF_VALOR`, currentVal + balance)
    }
  }, [balance, watchedPayments, form])

  // Auto-balancing removed as per user request to allow manual payment adjustment
  /*
  React.useEffect(() => {
    if (watchedPayments.length === 1) {
      const methodId = watchedPayments[0].MP_IDMETODO_FK
      const methodName = paymentMethods.find(m => m.MP_IDMETODO_PK === methodId)?.MP_NOMBRE.toUpperCase()
      if (methodName === 'CREDITO' || methodName === 'VALE') {
         form.setValue('payments.0.PF_VALOR', total)
      }
    }
  }, [total, paymentMethods, form])
  */

  // Mapeo para comboboxes
  const technicianOptions = technicians
    .filter(t => t.RL_NOMBRE === 'TECNICO')
    .map(t => ({ label: `${t.TR_NOMBRE} (${t.RL_NOMBRE})`, value: t.TR_IDTRABAJADOR_PK }))

  const workerOptions = technicians.map(t => ({ label: `${t.TR_NOMBRE} (${t.RL_NOMBRE})`, value: t.TR_IDTRABAJADOR_PK }))

  const serviceOptions = services.map(s => ({ label: s.SV_NOMBRE, value: s.SV_IDSERVICIO_PK }))
  const productOptions = products.map(p => ({ label: p.PR_NOMBRE, value: p.PR_IDPRODUCTO_PK }))

  const getPeriodLabel = React.useCallback((date: Date | null) => {
    if (!date) return null;
    const range = getPeriodRange(date, workerRole);
    return formatPeriodRange(range);
  }, [workerRole]);

  // Manejo de pagos
  const handlePaymentToggle = (method: any, checked: boolean) => {
    const currentPayments = form.getValues("payments") || []
    const isValeMethod = method.MP_NOMBRE?.toUpperCase() === 'VALE' || method.MP_NOMBRE?.toUpperCase() === 'SERVICIO DE TRABAJADOR'

    if (checked) {
      const currentPayments = form.getValues("payments") || []
      const newPayments = [...currentPayments, { MP_IDMETODO_FK: method.MP_IDMETODO_PK, PF_VALOR: 0, PF_EVIDENCIA_URL: '' }]

      if (newPayments.length === 1) {
        newPayments[0].PF_VALOR = total
      }

      form.setValue("payments", newPayments)
      if (isValeMethod) form.setValue("esServicioTrabajador", true)
    } else {
      const paymentToRemove = currentPayments.find(p => p.MP_IDMETODO_FK === method.MP_IDMETODO_PK)
      if (paymentToRemove?.PF_EVIDENCIA_URL && paymentToRemove.PF_EVIDENCIA_URL.includes('/temp/')) {
        cleanupTempFiles([paymentToRemove.PF_EVIDENCIA_URL])
      }

      const filteredPayments = currentPayments.filter(p => p.MP_IDMETODO_FK !== method.MP_IDMETODO_PK)

      form.setValue("payments", filteredPayments)

      // Check if any other vale-related method remains
      const anyOtherVale = filteredPayments.some(p => {
        const m = paymentMethods.find(pm => pm.MP_IDMETODO_PK === p.MP_IDMETODO_FK)
        const n = m?.MP_NOMBRE?.toUpperCase()
        return n === 'VALE' || n === 'SERVICIO DE TRABAJADOR'
      })
      if (isValeMethod && !anyOtherVale) form.setValue("esServicioTrabajador", false)
    }
  }

  // Auto-distribución removed for manual control
  /*
  React.useEffect(() => {
    if (watchedPayments.length === 1) {
      form.setValue(`payments.0.PF_VALOR`, total)
    }
  }, [total, watchedPayments.length, form])
  */

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

  // Sync esServicioTrabajador checkbox with VALE payment method
  React.useEffect(() => {
    const esServicioTrabajadorValue = form.watch("esServicioTrabajador")
    const valeMethod = paymentMethods.find(m => m.MP_NOMBRE?.toUpperCase() === 'VALE')
    const serviceMethod = paymentMethods.find(m => m.MP_NOMBRE?.toUpperCase() === 'SERVICIO DE TRABAJADOR' || m.MP_NOMBRE?.toUpperCase() === 'SERVICIO TRABAJADOR')

    if (clientType === 'TECNICO' && esServicioTrabajadorValue) {
      const currentPayments = form.getValues("payments") || []
      const hasVale = currentPayments.some(p => {
        const mId = p.MP_IDMETODO_FK;
        return mId === valeMethod?.MP_IDMETODO_PK || mId === serviceMethod?.MP_IDMETODO_PK;
      });

      if (!hasVale && (valeMethod || serviceMethod)) {
        // Default to VALE if none selected but isVale is true
        const methodToUse = serviceMethod || valeMethod;
        if (methodToUse) {
          form.setValue("payments", [...currentPayments, { MP_IDMETODO_FK: methodToUse.MP_IDMETODO_PK, PF_VALOR: 0, PF_EVIDENCIA_URL: '' }])
        }
      }
    } else if (!esServicioTrabajadorValue && clientType === 'TECNICO') {
      const currentPayments = form.getValues("payments") || []
      const filtered = currentPayments.filter(p => {
        const m = paymentMethods.find(pm => pm.MP_IDMETODO_PK === p.MP_IDMETODO_FK)
        const name = m?.MP_NOMBRE?.toUpperCase()
        return name !== 'VALE' && name !== 'SERVICIO DE TRABAJADOR' && name !== 'SERVICIO TRABAJADOR'
      })
      if (filtered.length !== currentPayments.length) {
        form.setValue("payments", filtered)
      }
    }
  }, [form.watch("esServicioTrabajador"), clientType, total, paymentMethods, form])

  // Auto-fill field values when esServicioTrabajador is enabled
  React.useEffect(() => {
    const isVale = form.watch("esServicioTrabajador")
    if (isVale) {
      if (!form.getValues("VL_FECHA_INICIO_COBRO")) {
        form.setValue("VL_FECHA_INICIO_COBRO", form.getValues("FC_FECHA") || new Date())
      }
      if (!form.getValues("VL_NUMERO_CUOTAS")) {
        form.setValue("VL_NUMERO_CUOTAS", 1)
      }
    }
  }, [form.watch("esServicioTrabajador"), form])

  const onInvalid = (errors: any) => {
    console.error("Form Validation Errors (RAW):", JSON.stringify(errors, null, 2));
    console.log("Current Form Values:", form.getValues());
    toast.error('Datos incompletos', 'Por favor revise los campos marcados en rojo.');

    // FunciÃ³n para encontrar el primer mensaje de error recursivamente en objetos anidados
    const findFirstErrorMessage = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.message && typeof obj.message === 'string') return obj.message;

      for (const key in obj) {
        const result = findFirstErrorMessage(obj[key]);
        if (result) return result;
      }
      return null;
    }

    const errorMessage = findFirstErrorMessage(errors);
    if (errorMessage) {
      toast.error('Error detallado', errorMessage);
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
      <DialogContent className="max-w-[98vw] lg:max-w-[1100px] h-[95vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? 'Editar Factura' : 'Nueva Venta'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? `Editando factura #${form.watch('FC_NUMERO_FACTURA')}` : 'Complete los datos para registrar una nueva venta.'}
          </DialogDescription>
        </DialogHeader>

        {/* Modal Admin Auth */}
        {isAdminAuthOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Autorización requerida</h3>
              <p className="text-xs text-slate-500 mb-4">Para modificar una factura PAGADA se requiere contraseña de administrador.</p>
              <Input type="password" placeholder="Contraseña administrador" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="mb-4" autoFocus autoComplete="new-password" onKeyDown={(e) => e.key === 'Enter' && verifyAdminAndChangeStatus()} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setIsAdminAuthOpen(false); setAdminPassword(''); setPendingStatusChange(null) }}>Cancelar</Button>
                <Button className="flex-1 bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white" onClick={verifyAdminAndChangeStatus} disabled={isVerifyingAdmin}>
                  {isVerifyingAdmin && <Loader2 className="size-3 animate-spin mr-1" />}Autorizar
                </Button>
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* ── SECCIÓN CLIENTE ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Información del cliente</h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</label>
                    <Select value={clientType} disabled={isPaid} onValueChange={(val) => form.setValue("FC_TIPO_CLIENTE", val as any)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLIENTE">Cliente externo</SelectItem>
                        <SelectItem value="TECNICO">Personal / Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {clientType === 'CLIENTE' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="FC_CLIENTE_TELEFONO" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Teléfono *</FormLabel>
                            <ClientAutocomplete
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              clients={allClients}
                              onClientSelect={(client) => {
                                form.setValue('FC_CLIENTE_NOMBRE', client.CL_NOMBRE)
                                form.setValue('FC_CLIENTE_TELEFONO', client.CL_TELEFONO)
                              }}
                              disabled={isPaid}
                              placeholder="Celular..."
                              icon="phone"
                            />
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="FC_CLIENTE_NOMBRE" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-slate-400">Nombre del Cliente *</FormLabel>
                            <ClientAutocomplete
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              clients={allClients}
                              onClientSelect={(client) => {
                                form.setValue('FC_CLIENTE_NOMBRE', client.CL_NOMBRE)
                                form.setValue('FC_CLIENTE_TELEFONO', client.CL_TELEFONO)
                              }}
                              disabled={isPaid}
                              placeholder="Escribe para buscar o agregar..."
                              icon="user"
                            />
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {clientType === 'TECNICO' && (
                    <FormField control={form.control} name="TR_IDCLIENTE_FK" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trabajador *</FormLabel>
                        <ComboboxSearch options={workerOptions} value={field.value || ''} disabled={isPaid} onValueChange={(val) => field.onChange(val)} placeholder="Buscar trabajador..." className="w-full" />
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                  )}


                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Evidencia física</label>
                    <div className="flex items-center gap-2">
                      <input type="file" accept="image/*" capture="environment" className="hidden" ref={physicalInvoiceInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhysicalInvoiceUpload(f) }} />
                      <Button type="button" variant="outline" size="sm" disabled={uploadingPhysical || isPaid} onClick={() => physicalInvoiceInputRef.current?.click()} className={cn("gap-2", form.watch("FC_EVIDENCIA_FISICA_URL") && "border-green-300 text-green-700 bg-green-50")}>
                        {uploadingPhysical ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                        {form.watch("FC_EVIDENCIA_FISICA_URL") ? 'Foto adjunta' : 'Subir foto'}
                      </Button>
                      {form.watch("FC_EVIDENCIA_FISICA_URL") && (
                        <a href={form.watch("FC_EVIDENCIA_FISICA_URL")!} target="_blank" rel="noreferrer" className="text-xs text-[#FF7E5F] hover:underline flex items-center gap-1">
                          <Eye className="size-3.5" /> Ver
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* META / FECHA / NÚMERO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Datos de la factura</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="SC_IDSUCURSAL_FK" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sucursal</FormLabel>
                        <Select value={field.value?.toString()} onValueChange={(val) => field.onChange(Number(val))} disabled={sessionUser?.role !== 'ADMINISTRADOR_TOTAL'}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {sucursales.map(s => <SelectItem key={s.SC_IDSUCURSAL_PK} value={s.SC_IDSUCURSAL_PK.toString()}>{s.SC_NOMBRE}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="FC_ESTADO" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select value={field.value} onValueChange={handleStatusChange}>
                          <SelectTrigger className={cn(
                            field.value === 'PAGADO' ? "border-green-300 bg-green-50 text-green-700" :
                              field.value === 'CANCELADO' ? "border-red-300 bg-red-50 text-red-600" :
                                "border-amber-300 bg-amber-50 text-amber-700"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                            <SelectItem value="PAGADO">Pagado</SelectItem>
                            <SelectItem value="CANCELADO">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="FC_FECHA" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de emisión</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" disabled={isPaid}
                              className={cn("w-full justify-start font-bold gap-2 bg-white border-slate-200 hover:border-[#FF7E5F]/50", isPaid && "bg-slate-50")}>
                              <CalendarIcon className="size-4 text-slate-400" />
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus
                              modifiers={{
                                week: (date) => field.value ? isSameWeek(date, field.value, { weekStartsOn: 0 }) : false
                              }}
                              modifiersClassNames={{
                                week: "bg-[#FF7E5F]/15 font-bold rounded-none"
                              }}
                            />
                            <div className="p-3 border-t border-slate-100 bg-slate-50">
                              <p className="text-[10px] font-black uppercase text-slate-500 italic tracking-tight">
                                {getPeriodLabel(field.value)}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="FC_NUMERO_FACTURA" render={({ field }) => (
                      <FormItem>
                        <FormLabel>N° Factura</FormLabel>
                        <Input {...field} value={field.value || ''} disabled={isPaid}
                          className={cn("bg-white font-bold border-slate-200 focus:border-[#FF7E5F] focus:ring-[#FF7E5F]/20", isPaid && "bg-slate-50")}
                          placeholder="" />
                      </FormItem>
                    )} />
                  </div>

                  {/* Opción Servicio Trabajador */}
                  {form.watch("esServicioTrabajador") && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="size-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700 uppercase">Configuración de Servicio de Trabajador</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="VL_FECHA_INICIO_COBRO" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Inicio de cobro</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full justify-start font-normal gap-2" disabled={isPaid}>
                                  <CalendarIcon className="size-3.5 text-slate-400" />
                                  {field.value ? format(field.value, "dd/MM/yyyy") : "Seleccionar"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus
                                  modifiers={{
                                    period: (date) => field.value ? isWithinInterval(date, getPeriodRange(field.value, workerRole)) : false
                                  }}
                                  modifiersClassNames={{
                                    period: "bg-[#FF7E5F]/15 font-bold rounded-none"
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                            {field.value && (
                              <p className="text-[9px] font-bold text-amber-600 uppercase mt-1">
                                {getPeriodLabel(field.value)}
                              </p>
                            )}
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="VL_NUMERO_CUOTAS" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">N° cuotas</FormLabel>
                            <Input {...field} type="number" min={1} disabled={isPaid} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} placeholder="1" />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECCIÓN SERVICIOS ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Servicios</h3>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={isPaid}
                      onClick={() => setIsProductModalOpen(true)}
                      className="gap-2 text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
                      <PlusCircle className="size-3.5" /> Agregar producto
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={isPaid}
                      onClick={() => appendService({ tempId: uuidv4(), SV_IDSERVICIO_FK: undefined as any, TR_IDTECNICO_FK: undefined as any, FD_VALOR: 0, FD_CANTIDAD: 1, products: [] })}
                      className="gap-2 text-xs">
                      <PlusCircle className="size-3.5" /> Agregar servicio
                    </Button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider px-4 py-3 w-[30%]">Servicio</th>
                          <th className="text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider px-4 py-3 w-[25%]">Tecnico</th>
                          <th className="text-center text-[11px] font-bold uppercase text-slate-500 tracking-wider px-2 py-3 w-[60px]">Cant</th>
                          <th className="text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider px-4 py-3">Productos</th>
                          <th className="text-right text-[11px] font-bold uppercase text-slate-500 tracking-wider px-4 py-3 w-[130px]">V. Unit</th>
                          <th className="w-10 px-2 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {serviceFields.map((sField, index) => (
                          <tr key={sField.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-4 py-3">
                              <FormField control={form.control} name={`services.${index}.SV_IDSERVICIO_FK`} render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <ComboboxSearch options={serviceOptions} value={field.value} disabled={isPaid}
                                      onValueChange={(val) => { field.onChange(val); const sel = services.find(s => s.SV_IDSERVICIO_PK === val); if (sel) form.setValue(`services.${index}.FD_VALOR`, sel.SV_VALOR || 0) }}
                                      placeholder="Elegir servicio..." className="h-9 text-xs" />
                                  </FormControl>
                                  <FormMessage className="text-[10px]" />
                                </FormItem>
                              )} />
                            </td>
                            <td className="px-4 py-3">
                              {isPaid ? (
                                <div className="h-9 flex items-center px-3 bg-slate-50 border border-slate-100 rounded-md text-xs font-bold text-indigo-600 uppercase">
                                  {watchedServices[index]?.tr_tecnico_nombre || 'No asignado'}
                                </div>
                              ) : (
                                <FormField control={form.control} name={`services.${index}.TR_IDTECNICO_FK`} render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <ComboboxSearch options={technicianOptions} value={field.value} disabled={isPaid}
                                        onValueChange={(val) => field.onChange(val)}
                                        placeholder="Tecnico..." className="h-9 text-xs" />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                  </FormItem>
                                )} />
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <FormField control={form.control} name={`services.${index}.FD_CANTIDAD`} render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      disabled={isPaid}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                      className="w-16 h-9 text-center text-xs font-bold border-slate-200 focus:border-[#FF7E5F]"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-[10px]" />
                                </FormItem>
                              )} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5 min-h-[2.5rem]">
                                {watchedServices[index]?.products && watchedServices[index].products.length > 0 ? (
                                  watchedServices[index].products.map((p: any, pIdx: number) => {
                                    const pName = products.find(cp => cp.PR_IDPRODUCTO_PK === p.PR_IDPRODUCTO_FK)?.PR_NOMBRE || 'Prod'
                                    return (
                                      <div key={pIdx} className="bg-blue-50/70 border border-blue-100 rounded-lg px-2 py-1 flex items-center gap-2 group/prod">
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-black text-blue-900 uppercase leading-none">{pName}</span>
                                            <span className="text-[8px] font-bold text-indigo-400 uppercase">({p.tr_tecnico_nombre || 'Téc'})</span>
                                          </div>
                                          <span className="text-[8px] font-bold text-blue-500 tabular-nums">${Number(p.FP_VALOR).toLocaleString('es-CO')}</span>
                                        </div>
                                        <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/prod:opacity-100 transition-opacity">
                                          <button type="button" onClick={() => handleEditProductManual(index, pIdx, p)} className="p-0.5 hover:bg-blue-200 rounded transition-colors text-blue-600">
                                            <Pencil className="size-2.5" />
                                          </button>
                                          <button type="button" onClick={() => handleRemoveProductManual(index, pIdx)} className="p-0.5 hover:bg-red-100 rounded transition-colors text-red-500">
                                            <Trash2 className="size-2.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })
                                ) : (
                                  <span className="text-[10px] text-slate-300 italic uppercase font-bold">Sin productos</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <FormField control={form.control} name={`services.${index}.FD_VALOR`} render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <NumericFormat value={field.value} disabled={isPaid} onValueChange={(values) => { const v = values.floatValue ?? 0; if (v !== field.value) field.onChange(v) }}
                                      thousandSeparator="." decimalSeparator="," prefix="$ " allowNegative={false}
                                      className="w-28 h-9 bg-white border border-slate-200 rounded-md text-right text-sm text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-[#FF7E5F]/30 focus:border-[#FF7E5F] disabled:bg-slate-50 disabled:text-slate-400 transition-colors" />
                                  </FormControl>
                                  <FormMessage className="text-[10px]" />
                                </FormItem>
                              )} />
                            </td>
                            <td className="px-2 py-3">
                              {!isPaid && (
                                <button type="button" onClick={() => removeService(index)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600 rounded">
                                  <Trash2 className="size-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-slate-500 uppercase tracking-wider">Total</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-lg font-black text-slate-900">$ {(total || 0).toLocaleString('es-CO')}</span>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* ── SECCIÓN PAGOS ── */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Métodos de pago</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Selección de métodos */}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Seleccione uno o varios métodos:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods
                        .filter(method => {
                          const nameMatch = method.MP_NOMBRE?.toUpperCase();
                          if (clientType === 'CLIENTE') {
                            return nameMatch !== 'VALE' && nameMatch !== 'SERVICIO DE TRABAJADOR' && nameMatch !== 'SERVICIO TRABAJADOR';
                          }
                          if (clientType === 'TECNICO') {
                            return nameMatch !== 'CREDITO';
                          }
                          return true;
                        })
                        .map(method => {
                          const isSelected = !!watchedPayments.find(p => p.MP_IDMETODO_FK === method.MP_IDMETODO_PK)
                          return (
                            <div key={method.MP_IDMETODO_PK}
                              onClick={() => !isPaid && handlePaymentToggle(method, !isSelected)}
                              className={cn("flex items-center gap-2.5 p-3 border rounded-lg cursor-pointer select-none transition-all",
                                isPaid ? "cursor-not-allowed opacity-60" : "",
                                isSelected ? "border-[#FF7E5F] bg-[#FF7E5F]/5" : "border-slate-200 bg-white hover:border-slate-300")}>
                              <div className={cn("size-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
                                isSelected ? "border-[#FF7E5F] bg-[#FF7E5F]" : "border-slate-300 bg-white")}>
                                {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                {method.MP_NOMBRE?.toUpperCase() === 'VALE' ? 'Servicio de Trabajador' : method.MP_NOMBRE}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </div>

                  {/* Distribución y balance */}
                  <div className="space-y-3">
                    {watchedPayments.length > 0 && (
                      <div className="space-y-2">
                        {watchedPayments.map((payment, idx) => {
                          const method = paymentMethods.find(m => m.MP_IDMETODO_PK === payment.MP_IDMETODO_FK)
                          return (
                            <div key={`${payment.MP_IDMETODO_FK}-${idx}`} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                              <span className="text-xs font-semibold text-slate-600 flex-1 min-w-0 truncate">
                                {method?.MP_NOMBRE?.toUpperCase() === 'VALE' ? 'Serv. Trabajador' : method?.MP_NOMBRE}
                              </span>
                              <FormField control={form.control} name={`payments.${idx}.PF_VALOR`} render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <NumericFormat value={field.value} disabled={isPaid} onValueChange={(values) => { const v = values.floatValue ?? 0; if (v !== field.value) field.onChange(v) }}
                                      thousandSeparator="." decimalSeparator="," prefix="$ " allowNegative={false}
                                      className="w-32 h-8 bg-white border border-slate-200 rounded-md text-right text-xs text-slate-900 px-2 focus:outline-none focus:ring-2 focus:ring-[#FF7E5F]/30 focus:border-[#FF7E5F] disabled:text-slate-400 transition-colors" />
                                  </FormControl>
                                  <FormMessage className="text-[10px]" />
                                </FormItem>
                              )} />
                              <div className="flex items-center gap-1">
                                <input type="file" accept="image/*" capture="environment" className="hidden" ref={el => { fileInputRefs.current[`${idx}`] = el }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(idx, f) }} />
                                <button type="button" disabled={uploadingIndexes.includes(idx) || isPaid} onClick={(e) => { e.stopPropagation(); fileInputRefs.current[`${idx}`]?.click() }}
                                  className={cn("p-1.5 rounded border text-xs transition-all",
                                    uploadingIndexes.includes(idx) ? "border-slate-200 text-slate-300" :
                                      payment.PF_EVIDENCIA_URL ? "border-green-300 bg-green-50 text-green-600" : "border-slate-200 hover:border-slate-300 text-slate-400")}>
                                  {uploadingIndexes.includes(idx) ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                                </button>
                                {payment.PF_EVIDENCIA_URL && (
                                  <a href={payment.PF_EVIDENCIA_URL} target="_blank" rel="noreferrer" className="p-1.5 rounded border border-slate-200 text-slate-400 hover:text-[#FF7E5F]">
                                    <Eye className="size-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Balance */}
                    <div className={cn("p-3 rounded-lg border",
                      Math.abs(totalPaid - total) < 0.01 && total > 0 ? "bg-green-50 border-green-200" :
                        totalPaid > total ? "bg-amber-50 border-amber-200" :
                          "bg-slate-50 border-slate-200")}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">Total venta</span>
                        <span className="font-black text-slate-900">$ {(total || 0).toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="font-semibold text-slate-500">Pagado</span>
                        <span className="font-bold text-slate-700">$ {(totalPaid || 0).toLocaleString('es-CO')}</span>
                      </div>
                      {Math.abs(totalPaid - total) > 0.01 && (
                        <div className="flex justify-between items-center text-xs mt-1 pt-1 border-t border-slate-200">
                          <span className="font-bold text-amber-600">{totalPaid > total ? 'Exceso' : 'Pendiente'}</span>
                          <span className="font-black text-amber-600">$ {Math.abs((totalPaid || 0) - (total || 0)).toLocaleString('es-CO')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── FOOTER ── */}
            <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4 flex gap-3 bg-white">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                {isViewOnly ? 'Cerrar' : 'Cancelar'}
              </Button>
              {!isPaid && (
                <Button type="submit"
                  disabled={isLoading || uploadingPhysical || uploadingIndexes.length > 0 || Math.abs(totalPaid - total) > 0.01 || total <= 0}
                  className="flex-[2] bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white shadow-lg shadow-[#FF7E5F]/20">
                  {isLoading ? <><Loader2 className="size-4 animate-spin mr-2" />Guardando...</> :
                    (uploadingPhysical || uploadingIndexes.length > 0) ? 'Subiendo imagen...' :
                      isEditing ? 'Guardar cambios' : 'Registrar venta'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>

      <ProductAssociationModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false)
          setManualEditData(null)
        }}
        onSuccess={handleAddProductManual}
        catalogData={{ services, technicians, products }}
        pendingInvoices={pendingInvoices}
        mode="manual"
        manualServices={form.watch('services')}
        initialInvoiceId={invoice?.FC_NUMERO_FACTURA?.toString()}
        editData={manualEditData}
      />
    </Dialog>
  )
}
