'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    TrendingUp,
    Users,
    Wallet,
    CreditCard,
    History,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    MapPin,
    BarChart3,
    LayoutList,
    Plus,
    Zap,
    ChevronDown,
    Search,
    Eye,
    Pencil,
    Trash2,
    Check,
    Loader2,
    Package2,
    ShoppingBag,
    Landmark,
    HandCoins,
    Ticket,
    UserPlus,
    DollarSign,
    Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableFilter } from '@/components/ui/table-filter'
import { ComboboxSearch } from '@/components/ui/combobox-search'
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    getDashboardStats,
    getDashboardCharts,
    getPayrollPeriods,
    getCurrentUserSession,
    getDashboardSpecificData
} from '@/features/dashboard/services'
import { getSedes } from '@/features/trabajadores/services'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts'
import { LoadingGate } from '@/components/ui/loading-gate'
import { toast } from '@/lib/toast-helper'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { BillingModal } from '@/app/dashboard/ventas/billing-modal'
import { getPaymentMethods, getWorkers, getInvoiceById, deleteInvoice, verifyAdminPassword, addProductToInvoice, updateProductInInvoice, deleteProductFromInvoice } from '@/features/billing/services'
import { getServices, getProducts } from '@/features/catalog/services'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { NumericFormat } from 'react-number-format'
import { TechnicianView } from './technician-view'

const COLORS = ['#FF7E5F', '#FEB47B', '#FFD200', '#F7971E', '#FFDF00'];

export function DashboardClient() {
    const [mounted, setMounted] = React.useState(false)
    const [user, setUser] = React.useState<any>(null)
    const [sedes, setSedes] = React.useState<any[]>([])
    const [selectedSede, setSelectedSede] = React.useState<number>(-1) // -1 for GLOBAL
    const [currentDate, setCurrentDate] = React.useState<Date>(new Date())
    const [viewMode, setViewMode] = React.useState<'GENERAL' | 'ESPECIFICO'>('GENERAL')
    const [periods, setPeriods] = React.useState<any[]>([])
    const [periodPopoverOpen, setPeriodPopoverOpen] = React.useState(false)
    const [selectedPeriod, setSelectedPeriod] = React.useState<string>('')
    const [filterType, setFilterType] = React.useState<'DIA' | 'PERIODO'>('DIA')

    // Custom Table States
    const [searchTerm, setSearchTerm] = React.useState('')
    const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})
    const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null)
    const [isViewOnly, setIsViewOnly] = React.useState(false)
    const [isAdminDeleteAuthOpen, setIsAdminDeleteAuthOpen] = React.useState(false)
    const [invoiceToDelete, setInvoiceToDelete] = React.useState<any>(null)
    const [adminPassword, setAdminPassword] = React.useState('')
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [isFetchingInfo, setIsFetchingInfo] = React.useState(false)

    const [stats, setStats] = React.useState<any>(null)
    const [chartsData, setChartsData] = React.useState<any>(null)
    const [specificData, setSpecificData] = React.useState<any>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    // Billing Modal Data
    const [isBillingModalOpen, setIsBillingModalOpen] = React.useState(false)
    const [catalogData, setCatalogData] = React.useState<any>({
        technicians: [],
        services: [],
        products: [],
        paymentMethods: []
    })

    // Estados para Agregar Producto a Factura (AP)
    const [isAddProductModalOpen, setIsAddProductModalOpen] = React.useState(false)
    const [apSelectedInvoiceId, setApSelectedInvoiceId] = React.useState<string>('')
    const [apInvoiceDetails, setApInvoiceDetails] = React.useState<any>(null)
    const [apSelectedProductId, setApSelectedProductId] = React.useState<string>('')
    const [apSelectedServiceId, setApSelectedServiceId] = React.useState<string>('')
    const [apTechnicianId, setApTechnicianId] = React.useState<string>('')
    const [apValue, setApValue] = React.useState<number>(0)
    const [apLoadingInvoice, setApLoadingInvoice] = React.useState(false)
    const [apIsSubmitting, setApIsSubmitting] = React.useState(false)
    const [apIsEdit, setApIsEdit] = React.useState(false)
    const [apProductInvoiceId, setApProductInvoiceId] = React.useState<number | null>(null)

    // Metric Details Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
    const [detailType, setDetailType] = React.useState<string>('')
    const [detailTitle, setDetailTitle] = React.useState<string>('')

    React.useEffect(() => {
        setMounted(true)
        const init = async () => {
            const [userRes, sedesRes, periodsRes] = await Promise.all([
                getCurrentUserSession(),
                getSedes(),
                getPayrollPeriods()
            ])

            if (userRes.success) {
                setUser(userRes.data)
                // Restricción: Si es administrador de punto, forzar su sede
                if (userRes.data.role === 'ADMINISTRADOR_PUNTO' && userRes.data.branchId) {
                    setSelectedSede(userRes.data.branchId)
                }
            }
            if (sedesRes.success) setSedes(sedesRes.data)
            if (periodsRes.success) {
                setPeriods(periodsRes.data)
                if (periodsRes.data.length > 0 && !selectedPeriod) {
                    setSelectedPeriod(periodsRes.data[0].NM_IDNOMINA_PK.toString())
                }
            }

            // Fetch catalog for billing modal
            const [techs, servs, prods, payments] = await Promise.all([
                getWorkers(),
                getServices(),
                getProducts(),
                getPaymentMethods()
            ])
            setCatalogData({
                technicians: techs.success ? techs.data : [],
                services: servs.success ? servs.data : [],
                products: prods.success ? prods.data : [],
                paymentMethods: payments.success ? payments.data : []
            })
        }
        init()
    }, [])

    const fetchData = React.useCallback(async () => {
        setIsLoading(true)
        try {
            let from = format(currentDate, 'yyyy-MM-dd')
            let to = format(currentDate, 'yyyy-MM-dd')

            if (filterType === 'PERIODO') {
                if (selectedPeriod === '7dias') {
                    from = format(subDays(new Date(), 7), 'yyyy-MM-dd')
                    to = format(new Date(), 'yyyy-MM-dd')
                } else {
                    const period = periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod)
                    if (period) {
                        from = format(new Date(period.NM_FECHA_INICIO), 'yyyy-MM-dd')
                        to = format(new Date(period.NM_FECHA_FIN), 'yyyy-MM-dd')
                    }
                }
            }

            const [statsRes, chartsRes] = await Promise.all([
                getDashboardStats(selectedSede, from, to),
                getDashboardCharts(selectedSede, from, to)
            ])

            if (statsRes.success) setStats(statsRes.data)
            if (chartsRes.success) setChartsData(chartsRes.data)

            const specificRes = await getDashboardSpecificData(selectedSede, from, to)
            if (specificRes.success) setSpecificData(specificRes.data)
        } catch (error) {
            toast.error("Error al cargar datos")
        } finally {
            setIsLoading(false)
        }
    }, [selectedSede, currentDate, selectedPeriod, viewMode, periods])

    React.useEffect(() => {
        if (mounted) fetchData()
    }, [fetchData, mounted])

    if (!mounted) return null

    const navigateDay = (dir: 'prev' | 'next') => {
        setCurrentDate(prev => dir === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
    }

    const handleProductChange = (productId: string) => {
        setApSelectedProductId(productId)
        const product = catalogData.products.find((p: any) => p.PR_IDPRODUCTO_PK.toString() === productId)
        if (product && product.PR_PRECIO) {
            setApValue(Number(product.PR_PRECIO))
        }
    }

    const fetchInvoiceForAssociation = async (invoiceId: string) => {
        setApSelectedInvoiceId(invoiceId)
        if (!invoiceId) return

        setApLoadingInvoice(true)
        try {
            const res = await getInvoiceById(Number(invoiceId))
            if (res.success) {
                setApInvoiceDetails(res.data)
                // Default values if possible
                if (res.data.services?.length > 0) {
                    setApSelectedServiceId(res.data.services[0].FD_IDDETALLE_PK.toString())
                }
            }
        } catch (err) {
            toast.error("Error al cargar servicios de la factura")
        } finally {
            setApLoadingInvoice(false)
        }
    }

    const handleAddProduct = async () => {
        if (!apSelectedInvoiceId || !apSelectedProductId || !apTechnicianId || apValue <= 0) {
            toast.error("Datos incompletos", "Por favor llene todos los campos obligatorios.")
            return
        }

        setApIsSubmitting(true)
        try {
            const res = apIsEdit && apProductInvoiceId
                ? await updateProductInInvoice(
                    apProductInvoiceId,
                    Number(apSelectedProductId),
                    Number(apTechnicianId),
                    apValue,
                    apSelectedServiceId ? Number(apSelectedServiceId) : undefined
                )
                : await addProductToInvoice(
                    Number(apSelectedInvoiceId),
                    Number(apSelectedProductId),
                    Number(apTechnicianId),
                    apValue,
                    apSelectedServiceId ? Number(apSelectedServiceId) : undefined
                )

            if (res.success) {
                toast.success(apIsEdit ? "Producto actualizado" : "Producto agregado", "Se ha procesado la asociación correctamente.")
                setIsAddProductModalOpen(false)
                fetchData()
            } else {
                toast.error("Ups", res.error || "No se pudo procesar la solicitud.")
            }
        } catch (err) {
            toast.error("Error de sistema")
        } finally {
            setApIsSubmitting(false)
        }
    }

    const handleOpenAddProduct = (invoice: any) => {
        setApIsEdit(false)
        setApProductInvoiceId(null)
        setApSelectedInvoiceId(invoice.FC_IDFACTURA_PK.toString())
        fetchInvoiceForAssociation(invoice.FC_IDFACTURA_PK.toString())
        setApSelectedProductId('')
        setApSelectedServiceId('')
        setApTechnicianId('')
        setApValue(0)
        setIsAddProductModalOpen(true)
    }

    const handleEditProductAction = (productRow: any) => {
        setApIsEdit(true)
        setApProductInvoiceId(productRow.FP_IDFACTURA_PRODUCTO_PK)
        setApSelectedInvoiceId(productRow.FC_IDFACTURA_FK.toString())
        fetchInvoiceForAssociation(productRow.FC_IDFACTURA_FK.toString())
        setApSelectedProductId(productRow.PR_IDPRODUCTO_FK.toString())
        setApSelectedServiceId(productRow.FD_IDDETALLE_FK ? productRow.FD_IDDETALLE_FK.toString() : '')
        setApTechnicianId(productRow.TR_IDTECNICO_FK.toString())
        setApValue(Number(productRow.FP_VALOR))
        setIsAddProductModalOpen(true)
    }

    const handleDeleteProductAction = async (productRow: any) => {
        if (!confirm("¿Desea eliminar este producto de la factura? El total se ajustará automáticamente.")) return

        try {
            const res = await deleteProductFromInvoice(productRow.FP_IDFACTURA_PRODUCTO_PK)
            if (res.success) {
                toast.success("Producto eliminado")
                fetchData()
            } else {
                toast.error(res.error || "Error al eliminar")
            }
        } catch (e) {
            toast.error("Error de sistema")
        }
    }

    const handleOpenInvoice = async (invoice: any, isView: boolean = false) => {
        setIsFetchingInfo(true)
        try {
            const res = await getInvoiceById(invoice.FC_IDFACTURA_PK)
            if (res.success) {
                setSelectedInvoice(res.data)
                setIsViewOnly(isView)
                setIsBillingModalOpen(true)
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
                fetchData() // Refresh data list
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
        setIsBillingModalOpen(true)
    }

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
            {/* Header / Welcome */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                    {/* H1 adaptado a móvil */}
                    <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        ¡Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B]">{user?.username || 'Admin'}</span>! 👋
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Resumen de {filterType === 'DIA' ? `el día ${format(currentDate, 'd MMM', { locale: es })}` : 'el periodo seleccionado'} en <span className="text-[#FF7E5F] font-bold">Kyroy Stilos</span>.
                    </p>
                </div>

                {/* Branch Selector - Solo para Admin Total o si no tiene sede asignada */}
                {!(user?.role === 'ADMINISTRADOR_PUNTO' && user?.branchId) ? (
                    <div className="flex items-center gap-2 p-1.5 bg-white/50 dark:bg-slate-900 border border-slate-200 shadow-sm rounded-2xl self-start w-full sm:w-auto backdrop-blur-sm">
                        <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                            <MapPin className="size-3.5 text-[#FF7E5F]" />
                            Sucursal:
                        </div>
                        <select
                            className="bg-transparent font-bold text-xs uppercase pr-8 outline-none cursor-pointer text-slate-700 h-8"
                            value={selectedSede}
                            onChange={(e) => setSelectedSede(Number(e.target.value))}
                        >
                            <option value="-1">GENERAL (TODAS)</option>
                            {sedes.map(s => (
                                <option key={s.SC_IDSUCURSAL_PK} value={s.SC_IDSUCURSAL_PK}>{s.SC_NOMBRE}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-1.5 bg-white/50 dark:bg-slate-900 border border-slate-200 shadow-sm rounded-2xl self-start w-full sm:w-auto backdrop-blur-sm">
                         <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                            <MapPin className="size-3.5 text-[#FF7E5F]" />
                            Sucursal Asignada:
                        </div>
                        <div className="px-3 py-1.5 h-8 flex items-center">
                            <span className="font-bold text-xs uppercase text-[#FF7E5F] truncate max-w-[150px]">
                                {sedes.find(s => s.SC_IDSUCURSAL_PK === user.branchId)?.SC_NOMBRE || 'Cargando...'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between bg-white/50 dark:bg-slate-900 p-4 border border-slate-200 shadow-sm rounded-2xl backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    {/* Selector de Tipo de Filtro */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setFilterType('DIA')}
                            className={cn(
                                "px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                                filterType === 'DIA' ? "bg-[#FF7E5F] text-white shadow-md shadow-coral-500/20" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            POR DÍA
                        </button>
                        {periods.length > 0 && (
                            <button
                                onClick={() => setFilterType('PERIODO')}
                                className={cn(
                                    "px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                                    filterType === 'PERIODO' ? "bg-[#FF7E5F] text-white shadow-md shadow-coral-500/20" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                POR PERIODO
                            </button>
                        )}
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden md:block" />

                    {/* Mostramos el filtro correspondiente */}
                    {filterType === 'DIA' ? (
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')} className="h-9 w-9 rounded-none hover:bg-slate-50 text-slate-400">
                                <ChevronLeft className="size-4" />
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="h-9 px-4 rounded-none font-bold text-[11px] uppercase tracking-tight flex gap-2 border-x border-slate-100 text-slate-700 hover:bg-slate-50">
                                        <CalendarIcon className="size-4 text-[#FF7E5F]" />
                                        {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border border-slate-200 rounded-2xl shadow-xl" align="start">
                                    <Calendar mode="single" selected={currentDate} onSelect={(d) => d && setCurrentDate(d)} />
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" onClick={() => navigateDay('next')} className="h-9 w-9 rounded-none hover:bg-slate-50 text-slate-400">
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    ) : periods.length > 0 ? (
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl shadow-sm w-[280px] max-w-full overflow-hidden">
                            <div className="px-3 text-[10px] font-bold text-slate-400 border-r border-slate-100 mr-2 shrink-0 uppercase tracking-wider">VER:</div>
                            <div className="flex-1 min-w-0 pr-2">
                                <ComboboxSearch
                                    options={periods.map(p => ({
                                        label: `${format(new Date(p.NM_FECHA_INICIO), 'dd MMM', { locale: es }).toUpperCase()} - ${format(new Date(p.NM_FECHA_FIN), 'dd MMM', { locale: es }).toUpperCase()}`,
                                        value: p.NM_IDNOMINA_PK.toString()
                                    }))}
                                    value={selectedPeriod}
                                    onValueChange={(val) => val && setSelectedPeriod(val.toString())}
                                    placeholder="BUSCAR..."
                                    className="bg-transparent border-none shadow-none h-9 font-bold text-[11px] w-full px-0 hover:bg-transparent justify-start text-slate-700"
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* View Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-sm">
                    <button
                        onClick={() => setViewMode('GENERAL')}
                        className={cn(
                            "px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg flex items-center gap-2",
                            viewMode === 'GENERAL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <BarChart3 className="size-4 text-[#FF7E5F]" /> GENERAL
                    </button>
                    <button
                        onClick={() => setViewMode('ESPECIFICO')}
                        className={cn(
                            "px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg flex items-center gap-2",
                            viewMode === 'ESPECIFICO' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <LayoutList className="size-4 text-[#FF7E5F]" /> ESPECÍFICO
                    </button>
                </div>
            </div>

            {/* Technician View specific branch */}
            {user?.role === 'TECNICO' ? (
                <TechnicianView
                    user={user}
                    dateFrom={filterType === 'DIA' ? format(currentDate, 'yyyy-MM-dd') : (periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod)?.NM_FECHA_INICIO ? format(new Date(periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod).NM_FECHA_INICIO), 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd'))}
                    dateTo={filterType === 'DIA' ? format(currentDate, 'yyyy-MM-dd') : (periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod)?.NM_FECHA_FIN ? format(new Date(periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod).NM_FECHA_FIN), 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd'))}
                />
            ) : (
                <>
                    {/* Main Content Area */}
                    {viewMode === 'GENERAL' ? (
                        <div className="space-y-8 font-black">
                            {/* Row 1: Core Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                                {[
                                    {
                                        title: `Ventas Hoy`,
                                        value: `$${(stats?.ventas_total || 0).toLocaleString('es-CO')}`,
                                        sub: 'Facturas Pagadas Hoy',
                                        icon: TrendingUp,
                                        color: 'from-[#FF7E5F] to-[#FEB47B]'
                                    },
                                    {
                                        title: 'Recibido en Caja',
                                        value: `$${(stats?.total_caja || 0).toLocaleString('es-CO')}`,
                                        sub: 'Directo + Abonos de Deuda',
                                        icon: Wallet,
                                        color: 'from-emerald-600 to-teal-500'
                                    },
                                    {
                                        title: 'Abonos de Deuda',
                                        value: `$${(stats?.total_abonos || 0).toLocaleString('es-CO')}`,
                                        sub: 'Pagos a deudas de clientes',
                                        icon: History,
                                        color: 'from-purple-600 to-indigo-500'
                                    },
                                    {
                                        title: 'Por Cobrar',
                                        value: `$${(stats?.por_cobrar_total || 0).toLocaleString('es-CO')}`,
                                        sub: 'Ventas Pendientes Hoy',
                                        icon: HandCoins,
                                        color: 'from-red-500 to-rose-400'
                                    },
                                ].map((stat, i) => (
                                    <Card
                                        key={i}
                                        className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative group bg-white dark:bg-slate-900 transition-all hover:shadow-md cursor-pointer hover:ring-2 hover:ring-[#FF7E5F]/50"
                                        onClick={() => {
                                            setDetailType(stat.title)
                                            setDetailTitle(stat.title)
                                            setIsDetailModalOpen(true)
                                        }}
                                    >
                                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full -mr-12 -mt-12 transition-all duration-500 blur-xl group-hover:scale-150`} />
                                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</CardTitle>
                                            <div className={cn("p-2.5 rounded-xl shadow-lg shadow-coral-500/10 bg-gradient-to-br", stat.color)}>
                                                <stat.icon className="size-4 text-white" />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="relative z-10">
                                            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{stat.value}</div>
                                            <div className="text-[10px] font-medium text-slate-400 mt-2 uppercase italic leading-tight">{stat.sub}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Row 2: Payment Methods Breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 mt-4 md:mt-8">
                                {[
                                    {
                                        title: 'Efectivo',
                                        value: `$${(stats?.metodos_pago?.['EFECTIVO'] || 0).toLocaleString('es-CO')}`,
                                        sub: 'Suma de Ventas Pagadas',
                                        icon: DollarSign,
                                        color: 'from-green-600 to-emerald-500'
                                    },
                                    {
                                        title: 'Transferencia',
                                        value: `$${(stats?.metodos_pago?.['TRANSFERENCIA'] || 0).toLocaleString('es-CO')}`,
                                        sub: 'Nequi / Daviplata / Bancos',
                                        icon: Landmark,
                                        color: 'from-blue-600 to-cyan-500'
                                    },
                                    {
                                        title: 'Datáfono',
                                        value: `$${(stats?.metodos_pago?.['DATAFONO'] || 0).toLocaleString('es-CO')}`,
                                        sub: 'Tarjetas Débito / Crédito',
                                        icon: CreditCard,
                                        color: 'from-indigo-600 to-violet-500'
                                    },
                                    {
                                        title: 'Crédito',
                                        value: `$${(stats?.metodos_pago?.['CREDITO'] || 0).toLocaleString('es-CO')}`,
                                        sub: 'Deuda generada hoy',
                                        icon: History,
                                        color: 'from-amber-600 to-orange-400'
                                    },
                                    {
                                        title: 'Servicio Trabajador',
                                        value: `$${(stats?.metodos_pago?.['SERVICIO DE TRABAJADOR'] || 0).toLocaleString('es-CO')}`,
                                        sub: 'Servicios entre técnicos',
                                        icon: Ticket,
                                        color: 'from-slate-600 to-slate-450'
                                    },
                                ].map((stat, i) => (
                                    <Card
                                        key={i}
                                        className="border border-orange-100 rounded-xl shadow-sm overflow-hidden relative group bg-white dark:bg-slate-900 cursor-pointer hover:ring-2 hover:ring-[#FF7E5F]/50 transition-all"
                                        onClick={() => {
                                            setDetailType(stat.title)
                                            setDetailTitle(stat.title)
                                            setIsDetailModalOpen(true)
                                        }}
                                    >
                                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.05] group-hover:opacity-[0.1] rounded-full -mr-12 -mt-12 transition-all duration-500 blur-xl group-hover:scale-150`} />
                                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                                            <CardTitle className="text-[10px] font-black text-orange-300 uppercase tracking-[0.2em]">{stat.title}</CardTitle>
                                            <div className={cn("p-2 border border-orange-100 shadow-sm bg-gradient-to-br", stat.color)}>
                                                <stat.icon className="size-4 text-white" />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="relative z-10">
                                            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{stat.value}</div>
                                            <div className="text-[9px] font-bold text-slate-400 mt-2 uppercase italic leading-tight">{stat.sub}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Row 3: Additional Financial Metrics */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4">
                                {[
                                    {
                                        title: 'Vales (Adelantos)',
                                        value: `$${(stats?.adelantos_total || 0).toLocaleString('es-CO')}`,
                                        sub: 'Adelantos de nómina hoy',
                                        icon: Zap,
                                        color: 'from-orange-500 to-yellow-500'
                                    },
                                ].map((stat, i) => (
                                    <Card
                                        key={i}
                                        className="border border-orange-100 rounded-xl shadow-sm overflow-hidden relative group bg-white dark:bg-slate-900 cursor-pointer hover:ring-2 hover:ring-[#FF7E5F]/50 transition-all"
                                        onClick={() => {
                                            setDetailType(stat.title)
                                            setDetailTitle(stat.title)
                                            setIsDetailModalOpen(true)
                                        }}
                                    >
                                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.05] group-hover:opacity-[0.1] rounded-full -mr-12 -mt-12 transition-all duration-500 blur-xl group-hover:scale-150`} />
                                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                                            <CardTitle className="text-[10px] font-black text-orange-300 uppercase tracking-[0.2em]">{stat.title}</CardTitle>
                                            <div className={cn("p-2 border border-orange-100 shadow-sm bg-gradient-to-br", stat.color)}>
                                                <stat.icon className="size-4 text-white" />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="relative z-10">
                                            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{stat.value}</div>
                                            <div className="text-[9px] font-bold text-slate-400 mt-2 uppercase italic leading-tight">{stat.sub}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mt-4">
                                {/* Top Technicians Ranking */}
                                <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Trophy className="size-4 text-[#FF7E5F]" />
                                            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Servicios por Técnico</h3>
                                        </div>
                                    </div>
                                    <div className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {isLoading ? (
                                            <div className="p-4 space-y-4">
                                                {[1, 2, 3].map(i => (
                                                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                                                ))}
                                            </div>
                                        ) : (chartsData?.topTechs || []).length > 0 ? (
                                            <div className="divide-y divide-slate-100">
                                                {(chartsData?.topTechs || []).map((tech: any, index: number) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors cursor-pointer group/tech"
                                                        onClick={() => {
                                                            setDetailType('Técnico')
                                                            setDetailTitle(`Servicios de ${tech.name}`)
                                                            setIsDetailModalOpen(true)
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "size-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm transition-transform group-hover/tech:scale-110",
                                                                index === 0 ? "bg-amber-100 text-amber-600 border border-amber-200 shadow-inner" :
                                                                    index === 1 ? "bg-slate-100 text-slate-600 border border-slate-200 shadow-inner" :
                                                                        index === 2 ? "bg-orange-100 text-orange-600 border border-orange-200 shadow-inner" :
                                                                            "bg-slate-50 text-slate-400 border border-slate-100"
                                                            )}>
                                                                {index + 1}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover/tech:text-[#FF7E5F] transition-colors">{tech.name}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase italic leading-none mt-1">{tech.count} servicios</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="bg-[#FF7E5F]/10 text-[#FF7E5F] px-4 py-1.5 rounded-full text-[11px] font-black shadow-sm shadow-coral-500/5 group-hover/tech:bg-[#FF7E5F] group-hover/tech:text-white transition-all">
                                                                $ {Number(tech.total).toLocaleString('es-CO')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center text-slate-300 font-bold italic text-[10px] uppercase tracking-widest">Sin técnica registrada en este periodo</div>
                                        )}
                                    </div>
                                </Card>


                                {/* Top Services Pie */}
                                <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                                        <Users className="size-4 text-emerald-500" />
                                        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Servicios</h3>
                                    </div>
                                    <div className="p-0 h-[350px] w-full flex flex-col items-center justify-center">
                                        <div className="h-[220px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartsData?.topServices || []}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={8}
                                                        dataKey="count"
                                                        stroke="none"
                                                    >
                                                        {(chartsData?.topServices || []).map((entry: any, index: number) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={COLORS[index % COLORS.length]}
                                                                className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="p-6 pt-0 w-full grid grid-cols-2 gap-x-4 gap-y-2">
                                            {(chartsData?.topServices || []).map((s: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100/50">
                                                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                    <span className="text-[9px] font-black text-slate-600 uppercase truncate flex-1 tracking-tight">{s.name}</span>
                                                    <span className="text-[10px] font-black text-[#FF7E5F] tabular-nums">{s.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>

                                {/* Top Products */}
                                <Card className="lg:col-span-2 border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                                        <Wallet className="size-4 text-blue-500" />
                                        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Productos Utilizados</h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {(chartsData?.topProducts || []).map((p: any, i: number) => (
                                            <div key={i} className="border border-slate-100 p-4 bg-slate-50/50 rounded-xl relative overflow-hidden group hover:border-[#FF7E5F]/30 transition-all">
                                                <div className="absolute top-0 right-0 p-1 bg-slate-200/50 text-slate-500 text-[8px] font-black rounded-bl-lg">#{i + 1}</div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 truncate pr-4">{p.name}</p>
                                                <p className="text-2xl font-black text-slate-900 group-hover:text-[#FF7E5F] transition-colors">{p.count}</p>
                                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none">Unidades</p>
                                            </div>
                                        ))}
                                        {(chartsData?.topProducts || []).length === 0 && (
                                            <p className="col-span-full text-center text-slate-400 italic text-sm py-10 font-medium tracking-wide">Sin productos registrados en este periodo</p>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                            {/* Facturas Table */}
                            <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between backdrop-blur-sm">
                                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                        <LayoutList className="size-4" /> Registro de Ventas
                                    </h3>
                                    <Button
                                        onClick={handleNewInvoice}
                                        className="h-9 px-4 bg-[#FF7E5F] text-white hover:bg-[#FF7E5F]/90 rounded-xl border-none font-bold text-xs shadow-md shadow-coral-500/10 active:scale-95 transition-all"
                                    >
                                        <Plus className="size-4 mr-2" /> Nueva Factura
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/30">
                                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                                <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-[120px]">Factura</TableHead>
                                                <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-[100px] text-center">Fecha</TableHead>
                                                <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Sucursal</TableHead>
                                                <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Cliente</TableHead>
                                                <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Teléfono</TableHead>
                                                <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Detalle Servicios</TableHead>
                                                <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right w-[120px]">Total</TableHead>
                                                <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center w-[120px]">Estado</TableHead>
                                                <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right w-[100px]">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <TableRow key={`ventas-skeleton-${i}`} className="animate-in fade-in zoom-in-95 duration-500">
                                                        <TableCell colSpan={10} className="px-6 py-4">
                                                            <Skeleton className="h-8 w-full rounded-lg" />
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <>
                                                    {(specificData?.facturas || []).map((f: any) => (
                                                        <TableRow key={f.FC_IDFACTURA_PK} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/50 group">
                                                            <TableCell className="px-6 py-4 text-xs font-bold text-slate-900">{f.FC_NUMERO_FACTURA}</TableCell>
                                                            <TableCell className="px-4 py-4 text-[10px] font-medium text-slate-500 text-center tabular-nums">
                                                                {format(new Date(f.FC_FECHA), "dd/MM/yyyy", { locale: es })}
                                                            </TableCell>
                                                            <TableCell className="px-4 py-4">
                                                                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                                                    {f.sucursal_nombre}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="px-4 py-4 text-xs font-bold text-slate-700 uppercase">{f.cliente_display || 'GENERAL'}</TableCell>
                                                            <TableCell className="px-4 py-4 text-[10px] font-medium text-slate-400 text-center tabular-nums">{f.FC_CLIENTE_TELEFONO || '--'}</TableCell>
                                                            <TableCell className="px-4 py-4 text-[11px] font-medium text-slate-500 max-w-[300px] truncate italic group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                                                                {f.servicios || '--'}
                                                                {f.productos && (
                                                                    <span className="text-[#FF7E5F] font-bold"> + {f.productos}</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 text-center">
                                                                <div className={cn(
                                                                    "text-sm font-black tabular-nums text-right",
                                                                    f.FC_ESTADO === 'CANCELADO' ? "text-slate-300 line-through" : "text-slate-900"
                                                                )}>
                                                                    $ {Number(f.FC_TOTAL).toLocaleString('es-CO')}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-4 py-4 text-center">
                                                                <span className={cn(
                                                                    "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight border",
                                                                    f.FC_ESTADO === 'PAGADO' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                        f.FC_ESTADO === 'PENDIENTE' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                            "bg-red-50 text-red-600 border-red-100"
                                                                )}>
                                                                    {f.FC_ESTADO}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleOpenInvoice(f, true)}
                                                                        className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                                                        title="Ver detalles"
                                                                    >
                                                                        <Eye className="size-4" />
                                                                    </button>
                                                                    {(f.FC_ESTADO === 'PENDIENTE' || user?.role === 'ADMINISTRADOR_TOTAL') && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleOpenInvoice(f, false)}
                                                                                className="p-2 hover:bg-amber-50 text-amber-400 hover:text-amber-600 rounded-xl transition-all"
                                                                                title="Editar factura"
                                                                            >
                                                                                <Pencil className="size-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setInvoiceToDelete(f)
                                                                                    setIsAdminDeleteAuthOpen(true)
                                                                                }}
                                                                                className="p-2 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-xl transition-all"
                                                                                title="Eliminar factura"
                                                                            >
                                                                                <Trash2 className="size-4" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                        {/* Créditos Table */}
                        <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100 mb-0">
                                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                    <CreditCard className="size-4" /> Créditos Pendientes
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/30 font-bold">
                                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 w-[100px]">Fecha</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Factura</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Cliente</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 text-right">Pendiente</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <TableRow key={`creditos-skeleton-${i}`}>
                                                    <TableCell colSpan={4} className="p-4">
                                                        <Skeleton className="h-8 w-full rounded-lg" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <>
                                                {(specificData?.creditos || []).map((c: any) => (
                                                    <TableRow key={c.CR_IDCREDITO_PK} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                        <TableCell className="px-4 py-3 text-[10px] font-medium text-slate-500 tabular-nums">
                                                            {format(new Date(c.CR_FECHA), "dd/MM/yyyy", { locale: es })}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-900">{c.FC_NUMERO_FACTURA}</TableCell>
                                                        <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase">{c.cliente_display}</TableCell>
                                                        <TableCell className="px-4 py-3 text-[12px] font-black text-right text-orange-500 tabular-nums">$ {Number(c.CR_VALOR_PENDIENTE).toLocaleString('es-CO')}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {(specificData?.creditos || []).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-10 text-slate-400 font-medium italic text-xs">Sin créditos pendientes</TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>

                        {/* Vales Table */}
                        <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                    <Wallet className="size-4" /> Servicios de Trabajador
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/30">
                                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 w-[100px]">Fecha</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Trabajador</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Valor</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 text-center">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <TableRow key={`vales-skeleton-${i}`}>
                                                    <TableCell colSpan={4} className="p-4">
                                                        <Skeleton className="h-8 w-full rounded-lg" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <>
                                                {(specificData?.vales || []).map((v: any) => (
                                                    <TableRow key={v.VL_IDVALE_PK} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                        <TableCell className="px-4 py-3 text-[10px] font-medium text-slate-500 tabular-nums">
                                                            {format(new Date(v.VL_FECHA), "dd/MM/yyyy", { locale: es })}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-900 uppercase">{v.trabajador_nombre}</TableCell>
                                                        <TableCell className="px-4 py-3 text-[12px] font-black text-slate-900 tabular-nums">$ {Number(v.VL_VALOR_TOTAL).toLocaleString('es-CO')}</TableCell>
                                                        <TableCell className="px-4 py-3 text-center">
                                                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase border border-slate-200 bg-slate-50 text-slate-500 rounded-full">
                                                                {v.VL_ESTADO}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {(specificData?.vales || []).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-10 text-slate-400 font-medium italic text-xs">Sin vales registrados</TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>

                        {/* Adelantos Table */}
                        <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                    <Zap className="size-4 text-orange-500" /> Vales (Adelantos)
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/30">
                                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 w-[100px]">Fecha</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Trabajador</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Valor</TableHead>
                                            <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 text-center">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <TableRow key={`adelantos-skeleton-${i}`}>
                                                    <TableCell colSpan={4} className="p-4">
                                                        <Skeleton className="h-8 w-full rounded-lg" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <>
                                                {(specificData?.adelantos || []).map((v: any) => (
                                                    <TableRow key={v.AD_IDADELANTO_PK} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                        <TableCell className="px-4 py-3 text-[10px] font-medium text-slate-500 tabular-nums">
                                                            {format(new Date(v.AD_FECHA), "dd/MM/yyyy", { locale: es })}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-900 uppercase">{v.trabajador_nombre}</TableCell>
                                                        <TableCell className="px-4 py-3 text-[12px] font-black text-slate-900 tabular-nums">$ {Number(v.AD_MONTO).toLocaleString('es-CO')}</TableCell>
                                                        <TableCell className="px-4 py-3 text-center">
                                                            <span className={cn(
                                                                "px-2 py-0.5 text-[9px] font-bold uppercase border rounded-full",
                                                                v.AD_ESTADO === 'PENDIENTE' ? "bg-amber-50 text-amber-500 border-amber-200" :
                                                                    v.AD_ESTADO === 'DESCONTADO' ? "bg-emerald-50 text-emerald-500 border-emerald-200" :
                                                                        "bg-slate-50 text-slate-500 border-slate-200"
                                                            )}>
                                                                {v.AD_ESTADO}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {(specificData?.adelantos || []).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-10 text-slate-400 font-medium italic text-xs">Sin adelantos registrados</TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>

                        {/* PRODUCTOS Table */}
                        <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden lg:col-span-2">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                    <Package2 className="size-4" /> Productos en Facturas
                                </h3>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setApSelectedInvoiceId('')
                                        setApInvoiceDetails(null)
                                        setApSelectedProductId('')
                                        setApSelectedServiceId('')
                                        setApValue(0)
                                        setIsAddProductModalOpen(true)
                                    }}
                                    className="h-9 px-4 bg-[#FF7E5F] text-white hover:bg-[#FF7E5F]/90 rounded-xl border-none font-bold text-xs shadow-md shadow-coral-500/10 active:scale-95 transition-all"
                                >
                                    <Plus className="size-4 mr-2" /> Asociar Producto
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/30">
                                        <TableRow className="hover:bg-transparent border-b border-slate-100 text-center">
                                            <TableHead className="px-6 py-3 font-bold text-slate-500 text-[10px] uppercase w-[120px]">Factura</TableHead>
                                            <TableHead className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase w-[100px] text-center">Fecha</TableHead>
                                            <TableHead className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase">Producto</TableHead>
                                            <TableHead className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase text-right">Valor</TableHead>
                                            <TableHead className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase">Técnico</TableHead>
                                            <TableHead className="px-4 py-3 font-bold text-slate-500 text-[10px] uppercase">Servicio Asociado</TableHead>
                                            <TableHead className="px-6 py-3 font-bold text-slate-500 text-[10px] uppercase text-right w-[100px]">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRow key={`skeleton-${i}`}>
                                                    <TableCell colSpan={7} className="p-4">
                                                        <Skeleton className="h-8 w-full rounded-lg" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <>
                                                {(specificData?.productos || []).map((p: any) => (
                                                    <TableRow key={p.FP_IDFACTURA_PRODUCTO_PK} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
                                                        <TableCell className="px-6 py-3 text-xs font-bold text-slate-900 group-hover:text-[#FF7E5F]">#{p.FC_NUMERO_FACTURA}</TableCell>
                                                        <TableCell className="px-4 py-3 text-[10px] font-medium text-slate-500 text-center tabular-nums">
                                                            {format(new Date(p.FC_FECHA), 'dd/MM/yyyy', { locale: es })}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">{p.producto_nombre}</TableCell>
                                                        <TableCell className="px-4 py-3 text-xs font-black text-right text-slate-900 tabular-nums">
                                                            $ {Number(p.FP_VALOR).toLocaleString('es-CO')}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-[11px] font-bold uppercase text-slate-500 italic">{p.tecnico_nombre}</TableCell>
                                                        <TableCell className="px-4 py-3">
                                                            {p.servicio_nombre ? (
                                                                <span className="bg-slate-100 text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200">
                                                                    {p.servicio_nombre}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 italic text-[10px]">SIN ASOCIACIÓN</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-3 text-right">
                                                            <div className="flex justify-end gap-1 font-black opacity-40 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleOpenInvoice({ ...p, FC_IDFACTURA_PK: p.FC_IDFACTURA_FK }, true)}
                                                                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                                                    title="Ver detalles"
                                                                >
                                                                    <Eye className="size-4" />
                                                                </button>
                                                                {(p.FC_ESTADO === 'PENDIENTE' || user?.role === 'ADMINISTRADOR_TOTAL') && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleEditProductAction(p)}
                                                                            className="p-1.5 hover:bg-amber-50 text-amber-500 hover:text-amber-600 rounded-xl transition-all"
                                                                            title="Editar este producto"
                                                                        >
                                                                            <Pencil className="size-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteProductAction(p)}
                                                                            className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-xl transition-all"
                                                                            title="Eliminar este producto"
                                                                        >
                                                                            <Trash2 className="size-4" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {(specificData?.productos || []).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center py-20 text-slate-400 font-medium italic text-sm">Sin productos registrados en este periodo</TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* Metric Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl">
                    <DialogHeader className="p-6 pb-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#FF7E5F]/10 rounded-xl">
                                <BarChart3 className="size-5 text-[#FF7E5F]" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalle de {detailTitle}</DialogTitle>
                                <DialogDescription className="text-xs font-medium text-slate-500 uppercase italic">Desglose detallado de la métrica seleccionada</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-6">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b-2 border-slate-200 dark:border-slate-800">
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400">Concepto / ID</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400">Fecha</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400">Cliente / Info</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detailType === 'Ventas Hoy' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').map((f: any) => (
                                    <TableRow key={f.FC_IDFACTURA_PK} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                        <TableCell className="font-bold text-xs">Factura {f.FC_NUMERO_FACTURA}</TableCell>
                                        <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell className="text-[10px] font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                        <TableCell className="text-right font-black text-xs text-[#FF7E5F]">$ {Number(f.FC_TOTAL).toLocaleString('es-CO')}</TableCell>
                                    </TableRow>
                                ))}

                                {detailType === 'Recibido en Caja' && (
                                    <>
                                        {(specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').map((f: any) => (
                                            <TableRow key={`caja-f-${f.FC_IDFACTURA_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                <TableCell className="font-bold text-xs uppercase">Venta: {f.FC_NUMERO_FACTURA}</TableCell>
                                                <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                <TableCell className="text-[10px] font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                                <TableCell className="text-right font-black text-xs text-emerald-600">$ {Number(f.FC_TOTAL).toLocaleString('es-CO')}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(specificData?.abonos || []).map((ab: any) => (
                                            <TableRow key={`caja-ab-${ab.AB_IDABONO_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                <TableCell className="font-bold text-xs uppercase">Abono Deuda ({ab.FC_NUMERO_FACTURA})</TableCell>
                                                <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(ab.AB_FECHA), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                <TableCell className="text-[10px] font-bold uppercase text-slate-700">{ab.cliente_display}</TableCell>
                                                <TableCell className="text-right font-black text-xs text-blue-600">$ {Number(ab.AB_VALOR).toLocaleString('es-CO')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                )}

                                {detailType === 'Abonos de Deuda' && (specificData?.abonos || []).map((ab: any) => (
                                    <TableRow key={ab.AB_IDABONO_PK} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                        <TableCell className="font-bold text-xs uppercase">Abono {ab.AB_IDABONO_PK}</TableCell>
                                        <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(ab.AB_FECHA), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell className="text-[10px] font-bold uppercase text-slate-700">{ab.cliente_display} ({ab.FC_NUMERO_FACTURA})</TableCell>
                                        <TableCell className="text-right font-black text-xs text-indigo-600">$ {Number(ab.AB_VALOR).toLocaleString('es-CO')}</TableCell>
                                    </TableRow>
                                ))}

                                {detailType === 'Por Cobrar' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE').map((f: any) => (
                                    <TableRow key={f.FC_IDFACTURA_PK} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                        <TableCell className="font-bold text-xs">Factura {f.FC_NUMERO_FACTURA}</TableCell>
                                        <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell className="text-[10px] font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                        <TableCell className="text-right font-black text-xs text-red-500">$ {Number(f.FC_TOTAL).toLocaleString('es-CO')}</TableCell>
                                    </TableRow>
                                ))}

                                {['Efectivo', 'Transferencia', 'Datáfono', 'Crédito', 'Servicio Trabajador'].includes(detailType) && (specificData?.facturas || []).filter((f: any) => {
                                    return true;
                                }).map((f: any) => (
                                    <TableRow key={f.FC_IDFACTURA_PK} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                        <TableCell className="font-bold text-xs">Factura {f.FC_NUMERO_FACTURA}</TableCell>
                                        <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell className="text-[10px] font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                        <TableCell className="text-right font-black text-xs">$ {Number(f.FC_TOTAL).toLocaleString('es-CO')}</TableCell>
                                    </TableRow>
                                ))}

                                {detailType === 'Vales (Adelantos)' && (specificData?.adelantos || []).map((v: any) => (
                                    <TableRow key={v.AD_IDADELANTO_PK} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                        <TableCell className="font-bold text-xs">Adelanto {v.AD_IDADELANTO_PK}</TableCell>
                                        <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(v.AD_FECHA), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="text-[10px] font-bold uppercase text-slate-700">{v.trabajador_nombre}</TableCell>
                                        <TableCell className="text-right font-black text-xs text-orange-600">$ {Number(v.AD_MONTO).toLocaleString('es-CO')}</TableCell>
                                    </TableRow>
                                ))}

                                {detailType === 'Técnico' && (specificData?.facturas || []).flatMap((f: any) => {
                                    // This is a bit complex as we need to find the specific services for the technician
                                    // But specificData doesn't have the details of services per technician directly in a flat way
                                    // I'll assume for now we show invoices where the technician worked
                                    if (detailTitle.includes(f.cliente_display)) return []; // avoid showing cliente as tech if name overlaps
                                    // In a real scenario, we'd filter the FD_IDTECNICO_FK. 
                                    // Since we don't have the full details here (only summary strings), 
                                    // I'll show invoices where they appear.
                                    return f.servicios?.includes(detailTitle.replace('Servicios de ', '')) ? [f] : [];
                                }).map((f: any, i: number) => (
                                    <TableRow key={`tech-${f.FC_IDFACTURA_PK}-${i}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                        <TableCell className="font-bold text-xs">Factura {f.FC_NUMERO_FACTURA}</TableCell>
                                        <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell className="text-[10px] font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                        <TableCell className="text-right font-black text-xs text-[#FF7E5F]">$ {Number(f.FC_TOTAL).toLocaleString('es-CO')}</TableCell>
                                    </TableRow>
                                ))}

                                {((detailType === 'Ventas Hoy' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').length === 0) ||
                                    (detailType === 'Recibido en Caja' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').length === 0 && (specificData?.abonos || []).length === 0) ||
                                    (detailType === 'Abonos de Deuda' && (specificData?.abonos || []).length === 0) ||
                                    (detailType === 'Por Cobrar' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE').length === 0)) && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-20 text-center text-slate-300 font-bold italic text-[10px] uppercase tracking-widest">No se encontraron registros</TableCell>
                                        </TableRow>
                                    )}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <Button onClick={() => setIsDetailModalOpen(false)} className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-bold uppercase text-[10px] tracking-widest h-12 shadow-lg active:scale-95 transition-all">
                            Cerrar Detalle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BillingModal
                isOpen={isBillingModalOpen}
                onClose={() => {
                    setIsBillingModalOpen(false)
                    fetchData() // Refresh data after closing
                }}
                technicians={catalogData.technicians}
                services={catalogData.services}
                products={catalogData.products}
                paymentMethods={catalogData.paymentMethods}
                sucursales={sedes}
                sessionUser={user}
                invoice={selectedInvoice}
                isViewOnly={isViewOnly}
            />

            {/* Modal Autenticación Admin para Eliminar */}
            {isAdminDeleteAuthOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 w-full max-w-sm rounded-3xl shadow-2xl">
                        <h3 className="text-sm font-black uppercase mb-4 tracking-tighter text-red-600 flex items-center gap-2">
                            <Trash2 className="size-4" /> REQUERIDO ADMIN
                        </h3>
                        <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase italic">Para eliminar definitivamente una factura debe autorizar como administrador.</p>
                        <Input
                            type="password"
                            placeholder="CONTRASEÑA ADMINISTRADOR"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="rounded-xl border-slate-200 focus:border-[#FF7E5F] mb-4 font-bold bg-slate-50 text-slate-900 h-12 transition-all"
                            autoFocus
                            autoComplete="new-password"
                            onKeyDown={(e) => e.key === 'Enter' && confirmDeleteInvoice()}
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl border-slate-200 uppercase font-bold text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-50 h-12"
                                onClick={() => {
                                    setIsAdminDeleteAuthOpen(false)
                                    setAdminPassword('')
                                    setInvoiceToDelete(null)
                                }}
                            >
                                CANCELAR
                            </Button>
                            <Button
                                className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 uppercase font-bold text-[10px] gap-2 shadow-lg shadow-red-500/20 h-12 border-none"
                                onClick={confirmDeleteInvoice}
                                disabled={isDeleting}
                            >
                                {isDeleting && <Loader2 className="size-3 animate-spin" />}
                                CONFIRMAR
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARA AGREGAR PRODUCTO A FACTURA EXISTENTE */}
            <Dialog open={isAddProductModalOpen} onOpenChange={setIsAddProductModalOpen}>
                <DialogContent className="max-w-md border-none rounded-3xl shadow-2xl p-0 bg-white overflow-hidden">
                    <DialogHeader className="bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] p-8">
                        <DialogTitle className="text-white font-black uppercase text-xl italic tracking-tight">{apIsEdit ? "EDITAR ASOCIACIÓN" : "AGREGAR PRODUCTO"}</DialogTitle>
                        <DialogDescription className="text-white/90 text-xs uppercase font-bold tracking-wider">{apIsEdit ? "Modifique los detalles de este producto." : "Asocie un producto con un servicio realizado."}</DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">1. SELECCIONAR FACTURA:</label>
                            <ComboboxSearch
                                options={(specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE').map((f: any) => ({
                                    label: `#${f.FC_NUMERO_FACTURA} - ${f.cliente_display}`,
                                    value: f.FC_IDFACTURA_PK.toString()
                                }))}
                                value={apSelectedInvoiceId}
                                onValueChange={(val) => fetchInvoiceForAssociation(val.toString())}
                                placeholder="BUSQUE LA FACTURA..."
                                className="w-full h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase focus:border-[#FF7E5F]"
                            />
                        </div>

                        {(specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE').length === 0 && (
                            <div className="mx-6 p-3 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase rounded-lg italic">
                                No hay facturas PENDIENTES. Si desea agregar productos a una factura PAGADA, cámbiela primero a PENDIENTE (desde el Registro de Ventas).
                            </div>
                        )}

                        {apLoadingInvoice && (
                            <div className="flex items-center justify-center py-4 gap-2 text-[10px] font-bold text-[#FF7E5F] italic animate-pulse">
                                <Loader2 className="size-4 animate-spin" /> CARGANDO SERVICIOS...
                            </div>
                        )}

                        {apInvoiceDetails && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">2. PRODUCTO A CONSUMIR:</label>
                                    <ComboboxSearch
                                        options={catalogData.products.map((p: any) => ({
                                            label: p.PR_NOMBRE,
                                            value: p.PR_IDPRODUCTO_PK.toString()
                                        }))}
                                        value={apSelectedProductId}
                                        onValueChange={(val) => handleProductChange(val.toString())}
                                        placeholder="BUSCAR PRODUCTO..."
                                        className="w-full h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase focus:border-[#FF7E5F]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">3. SERVICIO DONDE SE USÓ:</label>
                                    <ComboboxSearch
                                        options={(apInvoiceDetails?.services || []).map((s: any) => ({
                                            label: `${catalogData.services.find((cs: any) => cs.SV_IDSERVICIO_PK === s.SV_IDSERVICIO_FK)?.SV_NOMBRE || 'Servicio'} - $${Number(s.FD_VALOR).toLocaleString()}`,
                                            value: s.FD_IDDETALLE_PK.toString()
                                        }))}
                                        value={apSelectedServiceId}
                                        onValueChange={(val) => setApSelectedServiceId(val.toString())}
                                        placeholder="SELECCIONAR SERVICIO..."
                                        className="w-full h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase bg-slate-50 focus:border-[#FF7E5F]"
                                        emptyText={(!apInvoiceDetails.services || apInvoiceDetails.services.length === 0) ? "SIN SERVICIOS EN FACTURA" : "NO SE ENCONTRÓ"}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">VALOR:</label>
                                        <NumericFormat
                                            value={apValue}
                                            onValueChange={(vals) => setApValue(vals.floatValue || 0)}
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
                                            value={apTechnicianId}
                                            onValueChange={(val) => setApTechnicianId(val.toString())}
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
                            onClick={handleAddProduct}
                            disabled={apIsSubmitting || !apSelectedInvoiceId || !apSelectedProductId}
                        >
                            {apIsSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Package2 className="size-4 mr-2" />}
                            {apIsEdit ? "ACTUALIZAR PRODUCTO" : "ASOCIAR PRODUCTO"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
