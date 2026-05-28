'use client'

import * as React from 'react'
import { v4 as uuidv4 } from 'uuid'
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
import { Loader2, Package2 } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import { ComboboxSearch } from '@/components/ui/combobox-search'
import { toast } from '@/lib/toast-helper'
import {
    getInvoiceById,
    addProductToInvoice,
    updateProductInInvoice
} from '@/features/billing/services'

interface ProductAssociationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (data?: any) => void
    catalogData: {
        services: any[]
        technicians: any[]
        products: any[]
    }
    pendingInvoices: any[]
    initialInvoiceId?: string
    mode?: 'db' | 'manual'
    manualServices?: any[]
    editData?: {
        id?: number
        invoiceId?: string
        productId: string
        serviceId: string
        technicianId: string
        value: number
        quantity?: number
        manualIndex?: number
    } | null
}

export function ProductAssociationModal({
    isOpen,
    onClose,
    onSuccess,
    catalogData,
    pendingInvoices,
    initialInvoiceId = '',
    mode = 'db',
    manualServices = [],
    editData = null
}: ProductAssociationModalProps) {
    const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string>(initialInvoiceId || '')
    const [invoiceDetails, setInvoiceDetails] = React.useState<any>(null)
    const [selectedProductId, setSelectedProductId] = React.useState<string>('')
    const [selectedServiceId, setSelectedServiceId] = React.useState<string>('')
    const [technicianId, setTechnicianId] = React.useState<string>('')
    const [value, setValue] = React.useState<number>(0)
    const [quantity, setQuantity] = React.useState<number>(1)
    const [isLoadingInvoice, setIsLoadingInvoice] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Reset state when modal opens or editData changes
    React.useEffect(() => {
        if (isOpen) {
            if (editData) {
                setSelectedInvoiceId(editData.invoiceId || '')
                setSelectedProductId(editData.productId || '')
                setSelectedServiceId(editData.serviceId || '')
                setTechnicianId(editData.technicianId || '')
                setValue(editData.value)
                setQuantity(editData.quantity || 1)
                if (mode === 'db') {
                    fetchInvoiceDetails(editData.invoiceId || '', editData.serviceId)
                } else {
                    setSelectedInvoiceId(editData.invoiceId || 'NUEVA_FACTURA')
                }
            } else {
                setSelectedInvoiceId(initialInvoiceId)
                setSelectedProductId('')
                setSelectedServiceId('')
                setTechnicianId('')
                setValue(0)
                setQuantity(1)
                setInvoiceDetails(null)
                if (initialInvoiceId && mode === 'db') {
                    fetchInvoiceDetails(initialInvoiceId || '')
                } else if (mode === 'manual') {
                    // Pre-select first service if available in manual mode
                    if (manualServices.length > 0) {
                        setSelectedServiceId(manualServices[0].FD_IDDETALLE_PK?.toString() || manualServices[0].tempId)
                    }
                }
            }
        }
    }, [isOpen, editData, initialInvoiceId, mode, manualServices])

    const fetchInvoiceDetails = async (invoiceId: string, preSelectServiceId?: string) => {
        if (!invoiceId || mode === 'manual') return
        setSelectedInvoiceId(invoiceId)
        setIsLoadingInvoice(true)
        try {
            const res = await getInvoiceById(Number(invoiceId))
            if (res.success) {
                setInvoiceDetails(res.data)
                if (!preSelectServiceId && res.data.services?.length > 0) {
                    setSelectedServiceId(res.data.services[0].FD_IDDETALLE_PK.toString())
                } else if (preSelectServiceId) {
                    setSelectedServiceId(preSelectServiceId)
                }
            }
        } catch (err) {
            toast.error("Error al cargar servicios de la factura")
        } finally {
            setIsLoadingInvoice(false)
        }
    }

    const handleProductChange = (productId: string) => {
        setSelectedProductId(productId)
        // Auto-fill value from catalog if available
        const product = catalogData.products.find(p => p.PR_IDPRODUCTO_PK.toString() === productId)
        if (product && !editData) {
            setValue(product.PR_VALOR_VENTA || 0)
        }
    }

    const handleSave = async () => {
        if ((mode === 'db' && !selectedInvoiceId) || !selectedProductId || !technicianId || !selectedServiceId || value < 0) {
            toast.error("Datos incompletos", "Por favor llene todos los campos obligatorios, incluyendo el servicio.")
            return
        }

        const product = catalogData.products.find(p => p.PR_IDPRODUCTO_PK.toString() === selectedProductId)
        const appliesComm = !!product?.PR_APLICA_COMISION
        const commPercent = Number(product?.PR_PORCENTAJE_COMISION || 0)
        const commValue = appliesComm ? (value * quantity * (commPercent / 100)) : 0

        if (mode === 'manual') {
            onSuccess({
                PR_IDPRODUCTO_FK: Number(selectedProductId),
                TR_IDTECNICO_FK: Number(technicianId),
                FP_VALOR: value,
                FP_CANTIDAD: quantity,
                FP_PORCENTAJE_APLICADO: commPercent,
                FP_COMISION_VALOR: commValue,
                FD_IDDETALLE_FK: selectedServiceId, // can be PK or tempId
                manualIndex: editData?.manualIndex
            })
            onClose()
            return
        }

        setIsSubmitting(true)
        try {
            const res = editData
                ? await updateProductInInvoice(
                    editData.id!,
                    Number(selectedProductId),
                    Number(technicianId),
                    value,
                    Number(selectedServiceId)
                )
                : await addProductToInvoice(
                    Number(selectedInvoiceId),
                    Number(selectedProductId),
                    Number(technicianId),
                    value,
                    Number(selectedServiceId)
                )

            if (res.success) {
                toast.success(editData ? "Producto actualizado" : "Producto agregado")
                onSuccess()
                onClose()
            } else {
                toast.error("Ups", res.error || "No se pudo procesar la solicitud.")
            }
        } catch (err) {
            toast.error("Error de sistema")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[520px] rounded-3xl border border-slate-200 p-0 bg-white overflow-hidden shadow-xl">
                <DialogHeader className="px-6 pt-6 pb-3">
                    <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                        {editData ? 'Editar producto' : 'Asociar producto'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 leading-relaxed">
                        {editData ? 'Ajusta los datos del producto y su servicio asociado.' : 'Elige el producto, servicio y técnico para completar la factura.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 pb-6 pt-2">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Factura</label>
                            <ComboboxSearch
                                options={mode === 'manual' ? [
                                    { label: initialInvoiceId ? `#${initialInvoiceId}` : 'Factura nueva', value: selectedInvoiceId || 'NUEVA' }
                                ] : pendingInvoices.map((f: any) => ({
                                    label: `#${f.FC_NUMERO_FACTURA} · ${f.cliente_display || 'Sin nombre'}`,
                                    value: f.FC_IDFACTURA_PK.toString()
                                }))}
                                value={selectedInvoiceId || 'NUEVA'}
                                onValueChange={(val) => mode !== 'manual' && fetchInvoiceDetails(val.toString())}
                                disabled={mode === 'manual'}
                                placeholder="Buscar factura"
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#FF7E5F] disabled:bg-slate-50 disabled:opacity-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Producto</label>
                            <ComboboxSearch
                                options={catalogData.products.map((p: any) => ({
                                    label: p.PR_NOMBRE,
                                    value: p.PR_IDPRODUCTO_PK.toString()
                                }))}
                                value={selectedProductId}
                                onValueChange={(val) => handleProductChange(val.toString())}
                                placeholder="Buscar producto"
                                className="w-full h-10 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#FF7E5F]"
                            />
                        </div>
                    </div>

                    {(mode !== 'manual' && pendingInvoices.length === 0 && !selectedInvoiceId) && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                            No hay facturas pendientes. Si desea agregar productos a una factura pagada, cámbiela primero a pendiente.
                        </div>
                    )}

                    {isLoadingInvoice && (
                        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#FF7E5F]/20 bg-[#FF7E5F]/5 p-3 text-sm text-[#FF7E5F]">
                            <Loader2 className="size-4 animate-spin" /> Cargando servicios...
                        </div>
                    )}

                    {(invoiceDetails || mode === 'manual') && (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Servicio</label>
                                    <ComboboxSearch
                                        options={mode === 'manual' ? manualServices.map((s: any) => ({
                                            label: `${catalogData.services.find((cs: any) => cs.SV_IDSERVICIO_PK === s.SV_IDSERVICIO_FK)?.SV_NOMBRE || 'Servicio'} - $${(Number(s.FD_VALOR) || 0).toLocaleString('es-CO')}`,
                                            value: s.FD_IDDETALLE_PK?.toString() || s.tempId
                                        })) : (invoiceDetails?.services || []).map((s: any) => ({
                                            label: `${catalogData.services.find((cs: any) => cs.SV_IDSERVICIO_PK === s.SV_IDSERVICIO_FK)?.SV_NOMBRE || 'Servicio'} - $${(Number(s.FD_VALOR) || 0).toLocaleString('es-CO')}`,
                                            value: s.FD_IDDETALLE_PK.toString()
                                        }))}
                                        value={selectedServiceId}
                                        onValueChange={(val) => setSelectedServiceId(val.toString())}
                                        placeholder="Seleccionar servicio"
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-[#FF7E5F]"
                                        emptyText={((mode === 'db' && (!invoiceDetails?.services || invoiceDetails.services.length === 0)) || (mode === 'manual' && manualServices.length === 0)) ? 'Sin servicios en factura' : 'No se encontró'}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Técnico</label>
                                    <ComboboxSearch
                                        options={catalogData.technicians.map((t: any) => ({
                                            label: t.TR_NOMBRE,
                                            value: t.TR_IDTRABAJADOR_PK.toString()
                                        }))}
                                        value={technicianId}
                                        onValueChange={(val) => setTechnicianId(val.toString())}
                                        placeholder="Seleccionar técnico"
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#FF7E5F]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Valor unitario</label>
                                    <NumericFormat
                                        value={value}
                                        onValueChange={(vals) => setValue(vals.floatValue || 0)}
                                        thousandSeparator="."
                                        decimalSeparator="," 
                                        prefix="$ "
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:bg-white focus:border-[#FF7E5F]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Cantidad</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={quantity}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:bg-white focus:border-[#FF7E5F]"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 px-6 pb-6 flex items-center justify-between gap-3">
                    <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl px-4 font-semibold text-sm">
                        Cancelar
                    </Button>
                    <Button
                        className="h-10 rounded-xl bg-[#FF7E5F] text-white font-semibold text-sm shadow-sm shadow-[#FF7E5F]/20 hover:bg-[#FF7E5F]/90 transition-all px-4"
                        onClick={handleSave}
                        disabled={isSubmitting || (mode === 'db' && !selectedInvoiceId) || !selectedProductId || !selectedServiceId || !technicianId}
                    >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Package2 className="size-4 mr-2" />}
                        {editData ? 'Actualizar producto' : 'Asociar producto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
