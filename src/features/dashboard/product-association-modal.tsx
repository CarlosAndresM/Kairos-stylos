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
        if ((mode === 'db' && !selectedInvoiceId) || !selectedProductId || !technicianId || value < 0) {
            toast.error("Datos incompletos", "Por favor llene todos los campos obligatorios.")
            return
        }

        if (mode === 'manual') {
            onSuccess({
                PR_IDPRODUCTO_FK: Number(selectedProductId),
                TR_IDTECNICO_FK: Number(technicianId),
                FP_VALOR: value,
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
                    selectedServiceId ? Number(selectedServiceId) : undefined
                )
                : await addProductToInvoice(
                    Number(selectedInvoiceId),
                    Number(selectedProductId),
                    Number(technicianId),
                    value,
                    selectedServiceId ? Number(selectedServiceId) : undefined
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
            <DialogContent className="max-w-md border-none rounded-3xl shadow-2xl p-0 bg-white overflow-hidden">
                <DialogHeader className="bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] p-8">
                    <DialogTitle className="text-white font-black uppercase text-xl italic tracking-tight">
                        {editData ? "EDITAR ASOCIACIÓN" : "AGREGAR PRODUCTO"}
                    </DialogTitle>
                    <DialogDescription className="text-white/90 text-xs uppercase font-bold tracking-wider">
                        {editData ? "Modifique los detalles de este producto." : "Asocie un producto con un servicio realizado."}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">1. SELECCIONAR FACTURA:</label>
                        <ComboboxSearch
                            options={mode === 'manual' ? [
                                { label: initialInvoiceId ? `#FACTURA: ${initialInvoiceId}` : 'FACTURA NUEVA (EN PROCESO)', value: selectedInvoiceId || 'NUEVA' }
                            ] : pendingInvoices.map((f: any) => ({
                                label: `#${f.FC_NUMERO_FACTURA} - ${f.cliente_display || 'Sin nombre'}`,
                                value: f.FC_IDFACTURA_PK.toString()
                            }))}
                            value={selectedInvoiceId || 'NUEVA'}
                            onValueChange={(val) => mode !== 'manual' && fetchInvoiceDetails(val.toString())}
                            disabled={mode === 'manual'}
                            placeholder="BUSQUE LA FACTURA..."
                            className="w-full h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase focus:border-[#FF7E5F] disabled:bg-slate-50 disabled:opacity-100"
                        />
                    </div>

                    {(mode !== 'manual' && pendingInvoices.length === 0 && !selectedInvoiceId) && (
                        <div className="mx-6 p-3 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase rounded-lg italic">
                            No hay facturas PENDIENTES. Si desea agregar productos a una factura PAGADA, cámbiela primero a PENDIENTE.
                        </div>
                    )}

                    {isLoadingInvoice && (
                        <div className="flex items-center justify-center py-4 gap-2 text-[10px] font-bold text-[#FF7E5F] italic animate-pulse">
                            <Loader2 className="size-4 animate-spin" /> CARGANDO SERVICIOS...
                        </div>
                    )}

                    {(invoiceDetails || mode === 'manual') && (
                        <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">2. PRODUCTO A CONSUMIR:</label>
                                <ComboboxSearch
                                    options={catalogData.products.map((p: any) => ({
                                        label: p.PR_NOMBRE,
                                        value: p.PR_IDPRODUCTO_PK.toString()
                                    }))}
                                    value={selectedProductId}
                                    onValueChange={(val) => handleProductChange(val.toString())}
                                    placeholder="BUSCAR PRODUCTO..."
                                    className="w-full h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase focus:border-[#FF7E5F]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">3. SERVICIO DONDE SE USÓ:</label>
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
                                    placeholder="SELECCIONAR SERVICIO..."
                                    className="w-full h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase bg-slate-50 focus:border-[#FF7E5F]"
                                    emptyText={((mode === 'db' && (!invoiceDetails?.services || invoiceDetails.services.length === 0)) || (mode === 'manual' && manualServices.length === 0)) ? "SIN SERVICIOS EN FACTURA" : "NO SE ENCONTRÓ"}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">VALOR:</label>
                                    <NumericFormat
                                        value={value}
                                        onValueChange={(vals) => setValue(vals.floatValue || 0)}
                                        thousandSeparator="."
                                        decimalSeparator=","
                                        prefix="$ "
                                        className="w-full h-12 border border-slate-200 rounded-xl px-4 font-black text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#FF7E5F] transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">TÉCNICO:</label>
                                    <ComboboxSearch
                                        options={catalogData.technicians.map((t: any) => ({
                                            label: t.TR_NOMBRE,
                                            value: t.TR_IDTRABAJADOR_PK.toString()
                                        }))}
                                        value={technicianId}
                                        onValueChange={(val) => setTechnicianId(val.toString())}
                                        placeholder="TÉCNICO..."
                                        className="w-full h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase focus:border-[#FF7E5F] hover:border-[#FF7E5F]/30 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                    <Button
                        className="w-full h-14 rounded-2xl bg-[#FF7E5F] text-white font-black uppercase text-xs tracking-tight shadow-xl shadow-coral-500/20 active:scale-95 hover:bg-[#FF7E5F]/90 border-none transition-all"
                        onClick={handleSave}
                        disabled={isSubmitting || (mode === 'db' && !selectedInvoiceId) || !selectedProductId}
                    >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Package2 className="size-4 mr-2" />}
                        {editData ? "ACTUALIZAR PRODUCTO" : "ASOCIAR PRODUCTO"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
