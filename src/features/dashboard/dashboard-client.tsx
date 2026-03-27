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
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    getDashboardInitialData,
    getDashboardFullData
} from '@/features/dashboard/services'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    LabelList,
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
import { getInvoiceById, deleteInvoice, verifyAdminPassword, deleteProductFromInvoice } from '@/features/billing/services'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { NumericFormat } from 'react-number-format'
import { TechnicianView } from './technician-view'
import { DashboardBanner } from '@/components/layout/dashboard-banner'
import { UserProfileDropdown } from '@/components/layout/user-profile-dropdown'
import { ProductAssociationModal } from './product-association-modal'
import { getPeriodRange } from '@/lib/date-utils'
import { isWithinInterval } from 'date-fns'

const COLORS = ['#FF7E5F', '#FEB47B', '#FFD200', '#F7971E', '#FFDF00'];

export function DashboardClient() {
    const [mounted, setMounted] = React.useState(false)
    const [user, setUser] = React.useState<any>(null)
    const [sedes, setSedes] = React.useState<any[]>([])
    const [selectedSede, setSelectedSede] = React.useState<number>(-1) // -1 for GLOBAL
    const [currentDate, setCurrentDate] = React.useState<Date>(new Date())
    const [viewMode, setViewMode] = React.useState<'GENERAL' | 'ESPECIFICO'>('ESPECIFICO')
    const [periods, setPeriods] = React.useState<any[]>([])
    const [periodPopoverOpen, setPeriodPopoverOpen] = React.useState(false)
    const [selectedPeriod, setSelectedPeriod] = React.useState<string>('')
    const [filterType, setFilterType] = React.useState<'DIA' | 'PERIODO' | 'RANGO'>('DIA')
    const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date | undefined }>({
        from: startOfWeek(new Date(), { weekStartsOn: 0 }),
        to: endOfWeek(new Date(), { weekStartsOn: 0 })
    })
    const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear())

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
    const [apInitialInvoiceId, setApInitialInvoiceId] = React.useState<string>('')
    const [apEditData, setApEditData] = React.useState<any>(null)

    // Metric Details Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
    const [detailType, setDetailType] = React.useState<string>('')
    const [detailTitle, setDetailTitle] = React.useState<string>('')

    React.useEffect(() => {
        setMounted(true)
        const init = async () => {
            const res = await getDashboardInitialData()

            if (res.success && res.data) {
                const { user, sedes, periods, catalog } = res.data

                if (user) {
                    setUser(user)
                    if (user.role === 'ADMINISTRADOR_PUNTO' && user.branchId) {
                        setSelectedSede(user.branchId)
                    }
                }

                if (sedes) setSedes(sedes)

                if (periods) {
                    setPeriods(periods)
                    if (periods.length > 0 && !selectedPeriod) {
                        setSelectedPeriod(periods[0].NM_IDNOMINA_PK.toString())
                    }
                }

                if (catalog) setCatalogData(catalog)
            }
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
                    from = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
                    to = format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
                } else {
                    const period = periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod)
                    if (period) {
                        from = format(new Date(period.NM_FECHA_INICIO), 'yyyy-MM-dd')
                        to = format(new Date(period.NM_FECHA_FIN), 'yyyy-MM-dd')
                    }
                }
            } else if (filterType === 'RANGO') {
                from = format(dateRange.from, 'yyyy-MM-dd')
                to = format(dateRange.to || dateRange.from, 'yyyy-MM-dd')
            }

            const res = await getDashboardFullData(selectedSede, from, to)

            if (res.success && res.data) {
                if (res.data.stats) setStats(res.data.stats)
                if (res.data.charts) setChartsData(res.data.charts)
                if (res.data.specific) setSpecificData(res.data.specific)
            }
        } catch (error) {
            toast.error("Error al cargar datos")
        } finally {
            setIsLoading(false)
        }
    }, [selectedSede, currentDate, selectedPeriod, dateRange, filterType, viewMode, periods])

    React.useEffect(() => {
        if (mounted) fetchData()
    }, [fetchData, mounted])

    if (!mounted) return null

    const navigateDay = (dir: 'prev' | 'next') => {
        setCurrentDate(prev => dir === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
    }

    const navigateWeeklyRange = (dir: 'prev' | 'next') => {
        setDateRange(prev => {
            const days = dir === 'prev' ? -7 : 7;
            const newFrom = addDays(prev.from, days);
            const newTo = addDays(prev.to || prev.from, days);
            return { from: newFrom, to: newTo };
        })
    }



    const handleOpenAddProduct = (invoice: any) => {
        setApEditData(null)
        setApInitialInvoiceId(invoice.FC_IDFACTURA_PK.toString())
        setIsAddProductModalOpen(true)
    }

    const handleEditProduct = (p: any) => {
        setApEditData({
            id: p.FP_IDFACTURA_PRODUCTO_PK,
            invoiceId: p.FC_IDFACTURA_FK.toString(),
            productId: p.PR_IDPRODUCTO_FK.toString(),
            serviceId: p.FD_IDDETALLE_FK?.toString() || '',
            technicianId: p.TR_IDTECNICO_FK.toString(),
            value: Number(p.FP_VALOR)
        })
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
        <div className="animate-in fade-in duration-500 pb-10">
            <DashboardBanner
                title={
                    <>¡Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B]">{user?.username || 'Admin'}</span>! 👋</>
                }
                subtitle={
                    filterType === 'DIA'
                        ? format(currentDate, "EEEE, d 'de' MMMM", { locale: es })
                        : filterType === 'RANGO'
                            ? `${format(dateRange.from, "d 'de' MMMM", { locale: es })} - ${dateRange.to ? format(dateRange.to, "d 'de' MMMM", { locale: es }) : ''}`
                            : periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod)
                                ? `${format(new Date(periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod).NM_FECHA_INICIO), "d 'de' MMMM", { locale: es })} - ${format(new Date(periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod).NM_FECHA_FIN), "d 'de' MMMM", { locale: es })}`
                                : "Resumen"
                }
                actions={
                    <UserProfileDropdown userName={user?.username || 'Admin'} userRole={user?.role || 'ADMINISTRADOR'} />
                }
                extra={
                    <div className="flex flex-col gap-4">
                        {!(user?.role === 'ADMINISTRADOR_PUNTO' && user?.branchId) ? (
                            <div className="flex items-center gap-3 p-2 bg-black/50 border border-white/10 shadow-3xl rounded-xl self-start w-full sm:w-auto backdrop-blur-md">
                                <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#FF7E5F] tracking-widest">
                                    <MapPin className="size-4 animate-pulse" />
                                    Sucursal:
                                </div>
                                <select
                                    className="bg-transparent font-black text-xs uppercase pr-10 outline-none cursor-pointer text-white h-10 border-l border-white/20 pl-4"
                                    value={selectedSede}
                                    onChange={(e) => setSelectedSede(Number(e.target.value))}
                                >
                                    <option value="-1" className="bg-slate-900">GENERAL (TODAS)</option>
                                    {sedes.map(s => (
                                        <option key={s.SC_IDSUCURSAL_PK} value={s.SC_IDSUCURSAL_PK} className="bg-slate-900">{s.SC_NOMBRE}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-2 bg-black/50 border border-white/10 shadow-3xl rounded-xl self-start w-full sm:w-auto backdrop-blur-md">
                                <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#FF7E5F] tracking-widest">
                                    <MapPin className="size-4 animate-pulse" />
                                    Sucursal Asignada:
                                </div>
                                <div className="px-4 py-1.5 h-10 flex items-center border-l border-white/20">
                                    <span className="font-black text-xs uppercase text-[#FF7E5F] tracking-wider truncate max-w-[200px]">
                                        {sedes.find(s => s.SC_IDSUCURSAL_PK === user.branchId)?.SC_NOMBRE || 'Cargando...'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                }
            />

            <div className="px-4 md:px-10 space-y-6 md:space-y-10 -mt-6 relative z-30">
                {/* Filters Bar */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl backdrop-blur-sm">
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
                            <button
                                onClick={() => setFilterType('RANGO')}
                                className={cn(
                                    "px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                                    filterType === 'RANGO' ? "bg-[#FF7E5F] text-white shadow-md shadow-coral-500/20" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                POR RANGO
                            </button>
                        </div>

                        {/* Selector de Año */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(val) => {
                                    const year = parseInt(val);
                                    setSelectedYear(year);

                                    // Actualizar currentDate y dateRange al nuevo año
                                    const newDate = new Date(currentDate);
                                    newDate.setFullYear(year);
                                    setCurrentDate(newDate);

                                    const newFrom = new Date(dateRange.from);
                                    newFrom.setFullYear(year);
                                    const newTo = dateRange.to ? new Date(dateRange.to) : undefined;
                                    if (newTo) newTo.setFullYear(year);

                                    setDateRange({ from: newFrom, to: newTo });
                                }}
                            >
                                <SelectTrigger className="h-8 w-24 bg-transparent border-none text-[10px] font-bold uppercase shadow-none ring-0 focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <SelectItem key={y} value={y.toString()} className="text-[10px] font-bold">{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                        ) : filterType === 'RANGO' ? (
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <Button variant="ghost" size="icon" onClick={() => navigateWeeklyRange('prev')} className="h-9 w-9 rounded-none hover:bg-slate-50 text-slate-400">
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <div className="h-9 px-4 flex items-center gap-2 border-x border-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-tight">
                                    <CalendarIcon className="size-4 text-[#FF7E5F]" />
                                    {dateRange.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "d MMM", { locale: es })} - {format(dateRange.to, "d MMM", { locale: es })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "d 'de' MMMM", { locale: es })
                                        )
                                    ) : (
                                        <span>Seleccionar rango</span>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => navigateWeeklyRange('next')} className="h-9 w-9 rounded-none hover:bg-slate-50 text-slate-400">
                                    <ChevronRight className="size-4" />
                                </Button>
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
                        dateFrom={
                            filterType === 'DIA'
                                ? format(currentDate, 'yyyy-MM-dd')
                                : filterType === 'RANGO'
                                    ? format(dateRange.from, 'yyyy-MM-dd')
                                    : (periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod)?.NM_FECHA_INICIO
                                        ? format(new Date(periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod).NM_FECHA_INICIO), 'yyyy-MM-dd')
                                        : format(currentDate, 'yyyy-MM-dd'))
                        }
                        dateTo={
                            filterType === 'DIA'
                                ? format(currentDate, 'yyyy-MM-dd')
                                : filterType === 'RANGO'
                                    ? format(dateRange.to || dateRange.from, 'yyyy-MM-dd')
                                    : (periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod)?.NM_FECHA_FIN
                                        ? format(new Date(periods.find(p => p.NM_IDNOMINA_PK.toString() === selectedPeriod).NM_FECHA_FIN), 'yyyy-MM-dd')
                                        : format(currentDate, 'yyyy-MM-dd'))
                        }
                    />
                ) : (
                    <>
                        {/* Main Content Area */}
                        {viewMode === 'GENERAL' ? (
                            <div className="space-y-8 font-black">
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mt-4">
                                    {[
                                        {
                                            title: 'VENTAS',
                                            value: `$ ${(stats?.ventas_total || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'FACTURAS PAGADAS HOY',
                                            icon: TrendingUp,
                                            color: 'from-[#FF7E5F] to-[#FEB47B]',
                                            count: stats?.ventas_count || 0
                                        },
                                        {
                                            title: 'SERVICIOS EN CURSO',
                                            value: (stats?.por_cobrar_count || 0).toString(),
                                            sub: 'SERVICIOS PENDIENTES POR PAGAR',
                                            icon: History,
                                            color: 'from-amber-600 to-orange-400',
                                            count: 0
                                        },
                                        {
                                            title: 'TOTAL EN CAJA',
                                            value: `$ ${(stats?.total_caja || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'DIRECTO + ABONOS DE DEUDA',
                                            icon: Wallet,
                                            color: 'from-emerald-600 to-teal-500',
                                            count: stats?.total_caja_count || 0
                                        },
                                        {
                                            title: 'EFECTIVO',
                                            value: `$ ${(stats?.metodos_pago?.['EFECTIVO'] || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'SUMA DE VENTAS PAGADAS',
                                            icon: DollarSign,
                                            color: 'from-green-600 to-emerald-500',
                                            count: stats?.metodos_count?.['EFECTIVO'] || 0
                                        },
                                        {
                                            title: 'TRANSFERENCIA',
                                            value: `$ ${(stats?.metodos_pago?.['TRANSFERENCIA'] || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'NEQUI / DAVIPLATA / BANCOS',
                                            icon: Landmark,
                                            color: 'from-blue-600 to-cyan-500',
                                            count: stats?.metodos_count?.['TRANSFERENCIA'] || 0
                                        },
                                        {
                                            title: 'CREDITO',
                                            value: `$ ${(stats?.metodos_pago?.['CREDITO'] || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'DEUDA GENERADA HOY',
                                            icon: History,
                                            color: 'from-amber-600 to-orange-400',
                                            count: stats?.metodos_count?.['CREDITO'] || 0
                                        },
                                        {
                                            title: 'SERVICIO TRABAJADOR',
                                            value: `$ ${(stats?.servicios_trabajador_total || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'SERVICIOS ENTRE TÉCNICOS / VOUCHERS',
                                            icon: Ticket,
                                            color: 'from-slate-600 to-slate-450',
                                            count: stats?.servicios_trabajador_count || 0
                                        },
                                        {
                                            title: 'ABONO A DEUDAS',
                                            value: `$ ${(stats?.total_abonos || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'PAGOS A DEUDAS DE CLIENTES',
                                            icon: History,
                                            color: 'from-purple-600 to-indigo-500',
                                            count: stats?.abonos_count || 0
                                        },
                                        {
                                            title: 'VALES',
                                            value: `$ ${(stats?.vales_total || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'VALES DE TRABAJADOR HOY',
                                            icon: Wallet,
                                            color: 'from-orange-600 to-amber-500',
                                            count: stats?.vales_count || 0
                                        },
                                        {
                                            title: 'DATAFONO',
                                            value: `$ ${(stats?.metodos_pago?.['DATAFONO'] || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`,
                                            sub: 'TARJETAS DÉBITO / CRÉDITO',
                                            icon: CreditCard,
                                            color: 'from-indigo-600 to-violet-500',
                                            count: stats?.metodos_count?.['DATAFONO'] || 0
                                        },
                                    ].filter(stat => stat.title !== 'DATAFONO').map((stat, i) => (
                                        <Card
                                            key={i}
                                            className={cn(
                                                "border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative group bg-white dark:bg-slate-900 transition-all hover:shadow-md cursor-pointer hover:ring-2 hover:ring-[#FF7E5F]/50",
                                                stat.title === 'VENTAS' ? "col-span-2 lg:col-span-2" : ""
                                            )}
                                            onClick={() => {
                                                setDetailType(stat.title)
                                                setDetailTitle(stat.title)
                                                setIsDetailModalOpen(true)
                                            }}
                                        >
                                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full -mr-12 -mt-12 transition-all duration-500 blur-xl group-hover:scale-150`} />
                                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                                                <CardTitle className={cn(
                                                    "font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest",
                                                    stat.title === 'VENTAS' ? "text-[13px]" : "text-[11px]"
                                                )}>{stat.title}</CardTitle>
                                                <div className="relative">
                                                    <div className={cn(
                                                        "p-2.5 rounded-xl shadow-lg shadow-coral-500/10 bg-gradient-to-br",
                                                        stat.color,
                                                        stat.title === 'VENTAS' ? "p-4" : ""
                                                    )}>
                                                        <stat.icon className={cn("text-white", stat.title === 'VENTAS' ? "size-6" : "size-4")} />
                                                    </div>
                                                    {stat.count > 0 && (
                                                        <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[9px] font-black size-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-in zoom-in-50 duration-300">
                                                            {stat.count}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="relative z-10">
                                                <div className={cn(
                                                    "font-black text-slate-900 dark:text-white leading-none tracking-tight",
                                                    stat.title === 'VENTAS' ? "text-5xl" : "text-2xl"
                                                )}>
                                                    {stat.value}
                                                </div>
                                                <div className="text-[10px] font-medium text-slate-400 mt-2 uppercase italic leading-tight">{stat.sub}</div>
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
                                                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Servicios por Técnico</h3>
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
                                                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                                        <div className="w-[45%] flex gap-4 pl-12">Técnico</div>
                                                        <div className="w-[20%] text-center">Servicios</div>
                                                        <div className="w-[35%] text-right pr-4">Total</div>
                                                    </div>
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
                                                            <div className="flex items-center gap-4 w-[45%]">
                                                                <div className={cn(
                                                                    "size-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm transition-transform group-hover/tech:scale-110",
                                                                    index === 0 ? "bg-amber-100 text-amber-600 border border-amber-200 shadow-inner" :
                                                                        index === 1 ? "bg-slate-100 text-slate-600 border border-slate-200 shadow-inner" :
                                                                            index === 2 ? "bg-orange-100 text-orange-600 border border-orange-200 shadow-inner" :
                                                                                "bg-slate-50 text-slate-400 border border-slate-100"
                                                                )}>
                                                                    {index + 1}
                                                                </div>
                                                                <div className="flex flex-col truncate">
                                                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover/tech:text-[#FF7E5F] transition-colors truncate">{tech.name}</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-[20%] text-center">
                                                                <span className="text-xs font-black text-slate-600 tabular-nums bg-slate-100 px-2 py-1 rounded-lg">{tech.count}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1 w-[35%]">
                                                                <div className="bg-[#FF7E5F]/10 text-[#FF7E5F] px-4 py-1.5 rounded-full text-[11px] font-black shadow-sm shadow-coral-500/5 group-hover/tech:bg-[#FF7E5F] group-hover/tech:text-white transition-all">
                                                                    $ {(Number(tech.total) || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
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
                                            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Total Servicios</h3>
                                        </div>
                                        <div className="p-6 h-[350px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={chartsData?.topServices || []}
                                                    margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                                                >
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 8, fontWeight: 800, fill: '#64748b' }}
                                                        interval={0}
                                                    />
                                                    <YAxis hide />
                                                    <RechartsTooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                                        cursor={{ fill: 'transparent' }}
                                                    />
                                                    <Bar
                                                        dataKey="count"
                                                        radius={[8, 8, 0, 0]}
                                                        barSize={32}
                                                    >
                                                        {(chartsData?.topServices || []).map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                        <LabelList
                                                            dataKey="count"
                                                            position="top"
                                                            style={{ fill: '#ff7e5f', fontSize: 11, fontWeight: 900, fontFamily: 'inherit' }}
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>

                                    {/* Top Products */}
                                    <Card className="lg:col-span-2 border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                                            <Wallet className="size-4 text-blue-500" />
                                            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Productos Utilizados</h3>
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
                                                            <TableRow key={f.FC_IDFACTURA_PK} className="transition-colors border-b border-slate-100/50 group">
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
                                                                <TableCell className="px-4 py-4 text-[11px] font-medium text-slate-500 max-w-[300px] truncate italic transition-all">
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
                                                                        $ {(Number(f.FC_TOTAL) || 0).toLocaleString('es-CO')}
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
                                                                    <div className="flex justify-end gap-1.5 transition-opacity">
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

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mt-4">
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
                                                        <TableRow key={c.CR_IDCREDITO_PK} className="transition-colors border-b border-slate-50">
                                                            <TableCell className="px-4 py-3 text-[10px] font-medium text-slate-500 tabular-nums">
                                                                {format(new Date(c.CR_FECHA), "dd/MM/yyyy", { locale: es })}
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-900">{c.FC_NUMERO_FACTURA}</TableCell>
                                                            <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase">{c.cliente_display}</TableCell>
                                                            <TableCell className="px-4 py-3 text-[12px] font-black text-right text-orange-500 tabular-nums">$ {(Number(c.CR_VALOR_PENDIENTE) || 0).toLocaleString('es-CO')}</TableCell>
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
                                                        <TableRow key={v.ST_IDSERVICIO_TRABAJADOR_PK} className="transition-colors border-b border-slate-50">
                                                            <TableCell className="px-4 py-3 text-[10px] font-medium text-slate-500 tabular-nums">
                                                                {format(new Date(v.ST_FECHA), "dd/MM/yyyy", { locale: es })}
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-900 uppercase">{v.trabajador_nombre}</TableCell>
                                                            <TableCell className="px-4 py-3 text-[12px] font-black text-slate-900 tabular-nums">$ {(Number(v.ST_VALOR_TOTAL) || 0).toLocaleString('es-CO')}</TableCell>
                                                            <TableCell className="px-4 py-3 text-center">
                                                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase border border-slate-200 bg-slate-50 text-slate-500 rounded-full">
                                                                    {v.ST_ESTADO}
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

                            {/* PRODUCTOS Table */}
                            <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden lg:col-span-2">
                                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                        <Package2 className="size-4" /> Productos en Facturas
                                    </h3>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setApInitialInvoiceId('')
                                            setApEditData(null)
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
                                                        <TableRow key={p.FP_IDFACTURA_PRODUCTO_PK} className="transition-colors border-b border-slate-50 group">
                                                            <TableCell className="px-6 py-3 text-xs font-bold text-slate-900">#{p.FC_NUMERO_FACTURA}</TableCell>
                                                            <TableCell className="px-4 py-3 text-[10px] font-medium text-slate-500 text-center tabular-nums">
                                                                {format(new Date(p.FC_FECHA), 'dd/MM/yyyy', { locale: es })}
                                                            </TableCell>
                                                            <TableCell className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">{p.producto_nombre}</TableCell>
                                                            <TableCell className="px-4 py-3 text-xs font-black text-right text-slate-900 tabular-nums">
                                                                $ {(Number(p.FP_VALOR) || 0).toLocaleString('es-CO')}
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
                                                                <div className="flex justify-end gap-1 font-black transition-opacity">
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
                                                                                onClick={() => handleEditProduct(p)}
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

                        {/* Metric Detail Modal */}
                        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl [&>button]:top-6 [&>button]:right-6 [&>button]:size-7 [&>button]:bg-white/50 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:shadow-sm [&>button]:border [&>button]:border-slate-200 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:hover:bg-white [&>button]:transition-all">
                                <DialogHeader className="p-6 pr-12 pb-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 shrink-0">
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
                                                <TableHead className="font-bold text-[10px] uppercase text-slate-400">{detailType === 'SERVICIOS EN CURSO' ? 'Factura' : 'Concepto / ID'}</TableHead>
                                                <TableHead className="font-bold text-[10px] uppercase text-slate-400">{detailType === 'SERVICIOS EN CURSO' ? 'Cant. Servicios' : 'Fecha'}</TableHead>
                                                <TableHead className="font-bold text-[10px] uppercase text-slate-400">{detailType === 'SERVICIOS EN CURSO' ? 'Productos' : 'Cliente / Info'}</TableHead>
                                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detailType === 'VENTAS' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').map((f: any) => (
                                                <TableRow key={f.FC_IDFACTURA_PK} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                    <TableCell className="font-bold text-xs">Factura {f.FC_NUMERO_FACTURA}</TableCell>
                                                    <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-[10px] font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                                    <TableCell className="text-right font-black text-xs text-[#FF7E5F]">$ {(Number(f.FC_TOTAL) || 0).toLocaleString('es-CO')}</TableCell>
                                                </TableRow>
                                            ))}

                                            {detailType === 'TOTAL EN CAJA' && (
                                                <>
                                                    {(specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').map((f: any) => (
                                                        <TableRow key={`caja-f-${f.FC_IDFACTURA_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                            <TableCell className="font-bold text-xs uppercase">Venta: {f.FC_NUMERO_FACTURA}</TableCell>
                                                            <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                            <TableCell className="text-[10px] font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                                            <TableCell className="text-right font-black text-xs text-emerald-600">$ {(Number(f.FC_TOTAL) || 0).toLocaleString('es-CO')}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {(specificData?.abonos || []).map((ab: any) => (
                                                        <TableRow key={`caja-ab-${ab.AB_IDABONO_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                            <TableCell className="font-bold text-xs uppercase">Abono Deuda ({ab.FC_NUMERO_FACTURA})</TableCell>
                                                            <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(ab.AB_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                            <TableCell className="text-[10px] font-bold uppercase text-slate-700">{ab.cliente_display}</TableCell>
                                                            <TableCell className="text-right font-black text-xs text-blue-600">$ {(Number(ab.AB_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </>
                                            )}

                                            {detailType === 'VALES' && (
                                                <>
                                                    {(specificData?.adelantos || []).map((v: any) => (
                                                        <TableRow key={`val-nom-${v.VL_IDVALE_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                            <TableCell className="font-bold text-xs uppercase text-orange-600">Vale de Nómina</TableCell>
                                                            <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(v.VL_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                            <TableCell className="text-[10px] font-bold uppercase text-slate-700">{v.trabajador_nombre} ({v.VL_OBSERVACIONES})</TableCell>
                                                            <TableCell className="text-right font-black text-xs text-orange-600">$ {(Number(v.VL_MONTO) || 0).toLocaleString('es-CO')}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {(specificData?.pagos || []).filter((p: any) => p.metodo?.toUpperCase() === 'VALE').map((pago: any, idx: number) => {
                                                        const factura = (specificData?.facturas || []).find((f: any) => f.FC_IDFACTURA_PK === pago.FC_IDFACTURA_FK)
                                                        return (
                                                            <TableRow key={`val-pag-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                                <TableCell className="font-bold text-xs">Factura {factura?.FC_NUMERO_FACTURA || pago.FC_IDFACTURA_FK}</TableCell>
                                                                <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">
                                                                    {factura ? format(new Date(factura.FC_FECHA), 'dd/MM/yyyy') : '---'}
                                                                </TableCell>
                                                                <TableCell className="text-[10px] font-bold uppercase text-slate-700">
                                                                    {factura?.cliente_display || 'GENERAL'} (PAGO POR VALE)
                                                                </TableCell>
                                                                <TableCell className="text-right font-black text-xs text-orange-600">$ {(Number(pago.PF_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </>
                                            )}

                                            {detailType === 'ABONO A DEUDAS' && (specificData?.abonos || []).map((ab: any) => (
                                                <TableRow key={ab.AB_IDABONO_PK} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                    <TableCell className="font-bold text-xs uppercase">Abono {ab.AB_IDABONO_PK}</TableCell>
                                                    <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">{format(new Date(ab.AB_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-[10px] font-bold uppercase text-slate-700">{ab.cliente_display} ({ab.FC_NUMERO_FACTURA})</TableCell>
                                                    <TableCell className="text-right font-black text-xs text-indigo-600">$ {(Number(ab.AB_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                </TableRow>
                                            ))}

                                            {detailType === 'SERVICIOS EN CURSO' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE').map((f: any) => (
                                                <TableRow key={f.FC_IDFACTURA_PK} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                    <TableCell className="font-bold text-xs">Factura {f.FC_NUMERO_FACTURA}</TableCell>
                                                    <TableCell className="text-[10px] font-black text-slate-600 text-center">{f.servicios_count || 0}</TableCell>
                                                    <TableCell className="text-[10px] font-medium text-slate-500 max-w-[200px] truncate">{f.productos || '--'}</TableCell>
                                                    <TableCell className="text-right font-black text-xs text-orange-600">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] text-slate-400 font-medium">TOTAL: $ {(Number(f.FC_TOTAL) || 0).toLocaleString('es-CO')}</span>
                                                            <span className="text-[9px] text-[#FF7E5F]">PROD: $ {(Number(f.productos_total) || 0).toLocaleString('es-CO')}</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {['EFECTIVO', 'TRANSFERENCIA', 'DATAFONO', 'CREDITO', 'SERVICIO TRABAJADOR'].includes(detailType) && (() => {
                                                // Map the UI card names to DB method names
                                                const methodMap: Record<string, string[]> = {
                                                    'EFECTIVO': ['EFECTIVO'],
                                                    'TRANSFERENCIA': ['TRANSFERENCIA'],
                                                    'DATAFONO': ['DATAFONO', 'TARJETA'],
                                                    'CREDITO': ['CREDITO'],
                                                    'SERVICIO TRABAJADOR': ['SERVICIO DE TRABAJADOR', 'SERVICIO TRABAJADOR'],
                                                }
                                                const dbMethods = methodMap[detailType] || [detailType.toUpperCase()]

                                                // Find all payments matching this method
                                                const matchingPayments = (specificData?.pagos || []).filter(
                                                    (p: any) => dbMethods.includes(p.metodo?.toUpperCase())
                                                )

                                                return (
                                                    <>
                                                        {detailType === 'SERVICIO TRABAJADOR' && (specificData?.serviciosReal || []).map((s: any, idx: number) => (
                                                            <TableRow key={`st-real-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                                <TableCell className="font-bold text-xs uppercase text-slate-800">Servicio Trabajador</TableCell>
                                                                <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">
                                                                    {s.ST_FECHA ? format(new Date(s.ST_FECHA), 'dd/MM/yyyy') : '---'}
                                                                </TableCell>
                                                                <TableCell className="text-[10px] font-bold uppercase text-slate-700">
                                                                    {s.trabajador_nombre} {s.FC_NUMERO_FACTURA ? `(Fact. ${s.FC_NUMERO_FACTURA})` : ''}
                                                                </TableCell>
                                                                <TableCell className="text-right font-black text-xs text-slate-900">$ {(Number(s.ST_VALOR_TOTAL) || 0).toLocaleString('es-CO')}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {matchingPayments.map((pago: any, idx: number) => {
                                                            const factura = (specificData?.facturas || []).find((f: any) => f.FC_IDFACTURA_PK === pago.FC_IDFACTURA_FK)
                                                            return (
                                                                <TableRow key={`pago-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                                    <TableCell className="font-bold text-xs">Factura {factura?.FC_NUMERO_FACTURA || pago.FC_IDFACTURA_FK}</TableCell>
                                                                    <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">
                                                                        {factura ? format(new Date(factura.FC_FECHA), 'dd/MM/yyyy') : '---'}
                                                                    </TableCell>
                                                                    <TableCell className="text-[10px] font-bold uppercase text-slate-700">
                                                                        {factura?.cliente_display || 'GENERAL'}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-black text-xs text-[#FF7E5F]">$ {(Number(pago.PF_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </>
                                                )
                                            })()}



                                            {detailType === 'Técnico' && (specificData?.serviciosDetalle || [])
                                                .filter((s: any) => s.tecnico_nombre === detailTitle.replace('Servicios de ', ''))
                                                .map((s: any, idx: number) => (
                                                    <TableRow key={`tech-s-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                        <TableCell className="font-bold text-xs uppercase">
                                                            {s.servicio_nombre} (Factura {s.FC_NUMERO_FACTURA})
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-medium text-slate-500 tabular-nums">
                                                            {format(new Date(s.FC_FECHA), 'dd/MM/yyyy')}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-bold uppercase text-slate-700">
                                                            {s.cliente_display || 'GENERAL'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-xs text-[#FF7E5F]">
                                                            $ {(Number(s.FD_VALOR) || 0).toLocaleString('es-CO')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            }

                                            {((detailType === 'VENTAS' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').length === 0) ||
                                                (detailType === 'TOTAL EN CAJA' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').length === 0 && (specificData?.abonos || []).length === 0) ||
                                                (detailType === 'ABONO A DEUDAS' && (specificData?.abonos || []).length === 0) ||
                                                (detailType === 'SERVICIOS EN CURSO' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE').length === 0)) && (
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
                        {
                            isAdminDeleteAuthOpen && (
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
                            )
                        }

                        {/* MODAL PARA AGREGAR PRODUCTO A FACTURA EXISTENTE */}
                        <ProductAssociationModal
                            isOpen={isAddProductModalOpen}
                            onClose={() => setIsAddProductModalOpen(false)}
                            onSuccess={fetchData}
                            catalogData={catalogData}
                            pendingInvoices={(specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE')}
                            initialInvoiceId={apInitialInvoiceId}
                            editData={apEditData}
                        />

                    </>
                )}
            </div>
        </div>
    )
}
