'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    TrendingUp,
    TrendingDown,
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
    Trophy,
    Receipt,
    FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableFilter } from '@/components/ui/table-filter'
import { ComboboxSearch } from '@/components/ui/combobox-search'
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, addDays, subDays, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const COLORS = ['#FF7E5F', '#FEB47B', '#FFD200', '#F7971E', '#FFDF00'];

export function DashboardClient() {
    const [mounted, setMounted] = React.useState(false)
    const [user, setUser] = React.useState<any>(null)
    const [sedes, setSedes] = React.useState<any[]>([])
    const [selectedSede, setSelectedSede] = React.useState<number>(-1) // -1 for GLOBAL
    const [currentDate, setCurrentDate] = React.useState<Date>(new Date())
    const [viewMode, setViewMode] = React.useState<'GENERAL' | 'ESPECIFICO'>('ESPECIFICO')
    const [filterType, setFilterType] = React.useState<'DIA' | 'RANGO' | 'MES'>('DIA')
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
    const [confirmState, setConfirmState] = React.useState<{
        isOpen: boolean;
        title: string;
        description: string;
        confirmText?: string;
        variant?: 'default' | 'destructive' | 'warning';
        onConfirm: () => void | Promise<void>;
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => {},
    })

    const [stats, setStats] = React.useState<any>(null)
    const [chartsData, setChartsData] = React.useState<any>(null)
    const [specificData, setSpecificData] = React.useState<any>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false)

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

                if (catalog) setCatalogData(catalog)
            }
        }
        init()
    }, [])

    const fetchCounter = React.useRef(0)

    const fetchData = React.useCallback(async () => {
        setIsLoading(true)
        const currentReq = ++fetchCounter.current
        try {
            let from = format(currentDate, 'yyyy-MM-dd')
            let to = format(currentDate, 'yyyy-MM-dd')

            if (filterType === 'RANGO') {
                from = format(dateRange.from, 'yyyy-MM-dd')
                to = format(dateRange.to || dateRange.from, 'yyyy-MM-dd')
            } else if (filterType === 'MES') {
                from = format(startOfMonth(currentDate), 'yyyy-MM-dd')
                to = format(endOfMonth(currentDate), 'yyyy-MM-dd')
            }

            const res = await getDashboardFullData(selectedSede, from, to)

            if (currentReq !== fetchCounter.current) return

            if (res.success && res.data) {
                if (res.data.stats) setStats(res.data.stats)
                if (res.data.charts) setChartsData(res.data.charts)
                if (res.data.specific) setSpecificData(res.data.specific)
            }
        } catch (error) {
            if (currentReq === fetchCounter.current) toast.error("Error al cargar datos")
        } finally {
            if (currentReq === fetchCounter.current) setIsLoading(false)
        }
    }, [selectedSede, currentDate, dateRange, filterType, viewMode])

    React.useEffect(() => {
        if (!mounted) return
        
        const timer = setTimeout(() => {
            fetchData()
        }, 300)
        
        return () => clearTimeout(timer)
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

    const navigateMonthly = (dir: 'prev' | 'next') => {
        setCurrentDate(prev => dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
    }

    const handleDownloadReport = async () => {
        setIsGeneratingPDF(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { DailyReportDocument } = await import('./daily-report-pdf');
            const sucursalName = selectedSede === -1 ? 'TODAS LAS SUCURSALES' : (sedes.find(s => s.SC_IDSUCURSAL_PK === selectedSede)?.SC_NOMBRE || 'SUCURSAL');
            const dateStr = format(currentDate, "dd/MM/yyyy");
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const blob = await pdf(<DailyReportDocument 
                sucursalName={sucursalName}
                dateStr={dateStr}
                stats={stats}
                chartsData={chartsData}
                specificData={specificData}
                origin={origin}
            />).toBlob();
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sucursalName} CIERRE ${format(currentDate, "dd-MM-yyyy")}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Informe descargado correctamente");
        } catch (err) {
            console.error(err);
            toast.error("Error al generar el PDF");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

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

    const handleDeleteProductAction = (productRow: any) => {
        setConfirmState({
            isOpen: true,
            title: '¿Eliminar Producto?',
            description: `¿Estás seguro de que deseas eliminar "${productRow.PR_NOMBRE || 'este producto'}" de la factura? El total se ajustará automáticamente.`,
            confirmText: 'Eliminar',
            variant: 'destructive',
            onConfirm: async () => {
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
        })
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
                            : filterType === 'MES'
                                ? format(currentDate, "MMMM yyyy", { locale: es })
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
                                    <option value="-1" className="bg-slate-900">(TODAS LAS SUCURSALES)</option>
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
                            <button
                                onClick={() => setFilterType('RANGO')}
                                className={cn(
                                    "px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                                    filterType === 'RANGO' ? "bg-[#FF7E5F] text-white shadow-md shadow-coral-500/20" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                SEMANAL
                            </button>
                            <button
                                onClick={() => setFilterType('MES')}
                                className={cn(
                                    "px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                                    filterType === 'MES' ? "bg-[#FF7E5F] text-white shadow-md shadow-coral-500/20" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                POR MES
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
                        ) : filterType === 'MES' ? (
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <Button variant="ghost" size="icon" onClick={() => navigateMonthly('prev')} className="h-9 w-9 rounded-none hover:bg-slate-50 text-slate-400">
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" className="h-9 px-4 rounded-none font-bold text-[11px] uppercase tracking-tight flex gap-2 border-x border-slate-100 text-slate-700 hover:bg-slate-50">
                                            <CalendarIcon className="size-4 text-[#FF7E5F]" />
                                            {format(currentDate, "MMMM yyyy", { locale: es })}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border border-slate-200 rounded-2xl shadow-xl" align="start">
                                        <Calendar mode="single" selected={currentDate} onSelect={(d) => d && setCurrentDate(d)} />
                                    </PopoverContent>
                                </Popover>
                                <Button variant="ghost" size="icon" onClick={() => navigateMonthly('next')} className="h-9 w-9 rounded-none hover:bg-slate-50 text-slate-400">
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        ) : null}

                        {filterType === 'DIA' && selectedSede !== -1 && (
                            <Button 
                                onClick={handleDownloadReport}
                                disabled={isGeneratingPDF}
                                className="bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2 h-9 px-4 shadow-sm"
                            >
                                {isGeneratingPDF ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                                Descargar Informe
                            </Button>
                        )}
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
                                    : format(currentDate, 'yyyy-MM-dd')
                        }
                        dateTo={
                            filterType === 'DIA'
                                ? format(currentDate, 'yyyy-MM-dd')
                                : filterType === 'RANGO'
                                    ? format(dateRange.to || dateRange.from, 'yyyy-MM-dd')
                                    : format(currentDate, 'yyyy-MM-dd')
                        }
                    />
                ) : (
                    <>
                        {/* Main Content Area */}
                        {viewMode === 'GENERAL' ? (
                            <div className="space-y-8 font-black">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mt-4">
                                    {/* Panel 1: Resumen Operativo */}
                                    <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
                                            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Resumen Operativo</h3>
                                        </div>
                                        <div className="flex-1 p-3 flex flex-col gap-2">
                                            {[
                                                { title: 'VENTAS', value: stats?.ventas_total || 0, count: stats?.ventas_count || 0, color: 'text-slate-900 dark:text-white', isNeto: false },
                                                { title: 'VENTAS NETO', value: stats?.ventas_neto || 0, count: 0, color: 'text-emerald-600 dark:text-emerald-500', isNeto: true },
                                                { title: 'SERVICIOS EN CURSO', value: stats?.por_cobrar_total || 0, count: stats?.por_cobrar_count || 0, color: 'text-slate-900 dark:text-white', isNeto: false },
                                            ].map((item, idx) => (
                                                <div key={idx} 
                                                    className="group cursor-pointer rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between"
                                                    onClick={() => { 
                                                        setDetailType(item.title); 
                                                        setDetailTitle(item.title); 
                                                        setIsDetailModalOpen(true); 
                                                    }}
                                                >
                                                    <div className="flex flex-col">
                                                        <div className={`text-[11px] font-black uppercase ${item.isNeto ? item.color : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'} transition-colors`}>
                                                            {item.title}
                                                        </div>
                                                        {!item.isNeto && (
                                                            <div className="flex items-center justify-center w-fit min-w-[18px] h-[18px] px-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded font-black text-[10px] mt-0.5">
                                                                {item.count}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`text-[13px] font-black ${item.color}`}>$ {item.value.toLocaleString('es-CO')}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>

                                    {/* Panel 2: Pagos Recibidos */}
                                    <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
                                            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Pagos Recibidos</h3>
                                        </div>
                                        <div className="flex-1 p-3 flex flex-col gap-2">
                                            {[
                                                { title: 'EFECTIVO', value: stats?.metodos_pago?.['EFECTIVO'] || 0, count: stats?.metodos_count?.['EFECTIVO'] || 0 },
                                                { title: 'TRANSFERENCIA', value: stats?.metodos_pago?.['TRANSFERENCIA'] || 0, count: stats?.metodos_count?.['TRANSFERENCIA'] || 0 },
                                                { title: 'CREDITO', value: stats?.metodos_pago?.['CREDITO'] || 0, count: stats?.metodos_count?.['CREDITO'] || 0 },
                                                { title: 'SERVICIO TRABAJADOR', value: stats?.servicios_trabajador_total || 0, count: stats?.servicios_trabajador_count || 0 }
                                            ].map((item, idx) => (
                                                <div key={idx} 
                                                    className="group cursor-pointer rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between"
                                                    onClick={() => { setDetailType(item.title); setDetailTitle(item.title); setIsDetailModalOpen(true); }}
                                                >
                                                    <div className="flex flex-col">
                                                        <div className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.title}</div>
                                                        <div className="flex items-center justify-center w-fit min-w-[18px] h-[18px] px-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded font-black text-[10px] mt-0.5">
                                                            {item.count}
                                                        </div>
                                                    </div>
                                                    <div className="text-[13px] font-black text-slate-900 dark:text-white">$ {item.value.toLocaleString('es-CO')}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>

                                    {/* Panel 3: Salidas y Egresos */}
                                    <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
                                            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Salidas y Egresos</h3>
                                        </div>
                                        <div className="flex-1 p-3 flex flex-col gap-2">
                                            {[
                                                { title: 'VALES', value: stats?.vales_total || 0, count: stats?.vales_count || 0 },
                                                { title: 'ABONO A DEUDAS', value: stats?.total_abonos || 0, count: stats?.abonos_count || 0 },
                                                { title: 'GARANTÍAS', value: stats?.garantias_total || 0, count: stats?.garantias_count || 0 },
                                                { title: 'GASTOS', value: stats?.total_gastos || 0, count: stats?.gastos_count || 0 },
                                                { title: 'PROPINAS', value: stats?.propinas_total || 0, count: stats?.propinas_count || 0 },
                                            ].map((item, idx) => (
                                                <div key={idx} 
                                                    className="group cursor-pointer rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between"
                                                    onClick={() => { setDetailType(item.title); setDetailTitle(item.title); setIsDetailModalOpen(true); }}
                                                >
                                                    <div className="flex flex-col">
                                                        <div className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.title}</div>
                                                        <div className="flex items-center justify-center w-fit min-w-[18px] h-[18px] px-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded font-black text-[10px] mt-0.5">
                                                            {item.count}
                                                        </div>
                                                    </div>
                                                    <div className="text-[13px] font-black text-slate-900 dark:text-white">$ {item.value.toLocaleString('es-CO')}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>

                                    {/* Panel 4: Flujo de Caja */}
                                    <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col bg-white dark:bg-slate-900 hover:shadow-md transition-all">
                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
                                            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Flujo de Caja</h3>
                                        </div>
                                        <div className="flex-1 p-3 flex flex-col justify-between">
                                            <div className="flex flex-col gap-1.5">
                                                {[
                                                    { label: 'Venta Total', value: stats?.ventas_total || 0, sign: '' },
                                                    { label: 'Transferencia', value: stats?.metodos_pago?.['TRANSFERENCIA'] || 0, sign: '' },
                                                    { label: 'Efectivo', value: (stats?.metodos_pago?.['EFECTIVO'] || 0) + (stats?.total_abonos || 0), sign: '+' },
                                                    { label: 'Crédito', value: stats?.metodos_pago?.['CREDITO'] || 0, sign: '' },
                                                    { label: 'Propina', value: stats?.propinas_total || 0, sign: '+' },
                                                    { label: 'Gastos', value: stats?.total_gastos || 0, sign: '-' },
                                                    { label: 'Vales', value: stats?.vales_total || 0, sign: '-' }
                                                ].map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-slate-500">{item.label}</span>
                                                        <span className={`text-[12px] font-black ${item.sign === '-' ? 'text-rose-500' : item.sign === '+' ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {item.sign && `${item.sign} `}$ {item.value.toLocaleString('es-CO')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <div className="text-[10px] font-bold text-slate-400 mb-0.5">Total Efectivo en Caja</div>
                                                <div className="text-2xl font-black text-emerald-600 tracking-tighter">
                                                    $ {(stats?.total_efectivo_en_caja || 0).toLocaleString('es-CO')}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mt-4">
                                    {/* Top Services Pie */}
                                    <Card className="lg:col-span-2 border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex flex-col h-[400px]">
                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-2">
                                                <Users className="size-4 text-emerald-500" />
                                                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Total Servicios</h3>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-4 min-h-0">
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

                                    {/* Nuevas métricas globales (Lado derecho de Total Servicios) */}
                                    <div className="flex flex-col gap-4 h-full justify-between min-h-[400px]">
                                        <Card 
                                            className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex-1 cursor-pointer hover:border-[#00CED1]/50 transition-colors group flex flex-col justify-center relative"
                                            onClick={() => {
                                                setDetailType('PRODUCTOS_VENDIDOS')
                                                setDetailTitle('Productos y Consumos')
                                                setIsDetailModalOpen(true)
                                                if (!specificData) fetchSpecificData()
                                            }}
                                            title="Ver detalles"
                                        >
                                            <div className="absolute top-4 right-4 text-[#00CED1] opacity-70 group-hover:opacity-100 transition-opacity">
                                                <Package2 className="size-4" />
                                            </div>
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-center">
                                                    <div className="space-y-1">
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-[#00CED1] transition-colors">Productos</p>
                                                        <div className="flex items-baseline gap-2 mt-1 min-w-0">
                                                            <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white whitespace-nowrap truncate">$ {(chartsData?.globalMetrics?.productos_total || 0).toLocaleString('es-CO')}</h3>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Card 
                                            className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex-1 cursor-pointer hover:border-[#FF7E5F]/50 transition-colors group flex flex-col justify-center relative"
                                            onClick={() => {
                                                setDetailType('COMISION_PRODUCTO')
                                                setDetailTitle('Comisión por Productos')
                                                setIsDetailModalOpen(true)
                                                if (!specificData) fetchSpecificData()
                                            }}
                                            title="Ver detalles"
                                        >
                                            <div className="absolute top-4 right-4 text-[#FF7E5F] opacity-70 group-hover:opacity-100 transition-opacity">
                                                <Users className="size-4" />
                                            </div>
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-center">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-[#FF7E5F] transition-colors">Comisión Producto Técnico</p>
                                                        <div className="flex items-baseline gap-2 mt-1 min-w-0">
                                                            <h3 className="text-lg xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap truncate">$ {(chartsData?.globalMetrics?.pago_tecnicos_productos || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</h3>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card 
                                            className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex-1 cursor-pointer hover:border-[#FF7E5F]/50 transition-colors group flex flex-col justify-center relative"
                                            onClick={() => {
                                                setDetailType('COMISION_SERVICIO')
                                                setDetailTitle('Comisión por Servicios')
                                                setIsDetailModalOpen(true)
                                                if (!specificData) fetchSpecificData()
                                            }}
                                            title="Ver detalles"
                                        >
                                            <div className="absolute top-4 right-4 text-[#FF7E5F] opacity-70 group-hover:opacity-100 transition-opacity">
                                                <Users className="size-4" />
                                            </div>
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-center">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-[#FF7E5F] transition-colors">Comisión Servicio Técnico</p>
                                                        <div className="flex items-baseline gap-2 mt-1 min-w-0">
                                                            <h3 className="text-lg xl:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap truncate">$ {(chartsData?.globalMetrics?.pago_tecnicos_servicios || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</h3>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        </div>

                                        <Card 
                                            className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex-1 cursor-pointer hover:border-emerald-500/50 transition-colors group flex flex-col justify-center relative"
                                            onClick={() => {
                                                setDetailType('INGRESOS_LOCAL')
                                                setDetailTitle('Ingresos Netos al Local')
                                                setIsDetailModalOpen(true)
                                                if (!specificData) fetchSpecificData()
                                            }}
                                            title="Ver detalles"
                                        >
                                            <div className="absolute top-4 right-4 text-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity">
                                                <Wallet className="size-4" />
                                            </div>
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-center">
                                                    <div className="space-y-1">
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-500 transition-colors">Ingresos al Local</p>
                                                        <div className="flex items-baseline gap-2 mt-1 min-w-0">
                                                            <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white whitespace-nowrap truncate">$ {(chartsData?.globalMetrics?.ingreso_local || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</h3>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

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
                                                    <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-[120px] border border-slate-200 sticky left-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm">Factura</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-[100px] text-center border border-slate-200">Fecha</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider border border-slate-200">Sucursal</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider border border-slate-200">Técnicos</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider border border-slate-200">Cliente</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center border border-slate-200">Teléfono</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider border border-slate-200">Detalle Servicios</TableHead>
                                                    <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right w-[120px] border border-slate-200">Total</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center w-[120px] border border-slate-200">Estado</TableHead>
                                                    <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right w-[100px] border border-slate-200">Acciones</TableHead>
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
                                                                <TableCell className="px-6 py-4 text-xs font-bold text-slate-900 border border-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50">{f.FC_NUMERO_FACTURA}</TableCell>
                                                                <TableCell className="px-4 py-4 text-[10px] font-medium text-slate-500 text-center tabular-nums border border-slate-200">
                                                                    {format(new Date(f.FC_FECHA), "dd/MM/yyyy", { locale: es })}
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 border border-slate-200">
                                                                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                                                        {f.sucursal_nombre}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 border border-slate-200">
                                                                    <span className="text-[10px] font-black text-[#00CED1] uppercase italic">
                                                                        {f.tecnicos || '--'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 text-xs font-bold text-slate-700 uppercase border border-slate-200">{f.cliente_display || 'GENERAL'}</TableCell>
                                                                <TableCell className="px-4 py-4 text-[10px] font-medium text-slate-400 text-center tabular-nums border border-slate-200">{f.FC_CLIENTE_TELEFONO || '--'}</TableCell>
                                                                <TableCell className="px-4 py-4 text-[11px] font-medium text-slate-500 italic transition-all border border-slate-200">
                                                                    {f.servicios || '--'}
                                                                    {f.productos && (
                                                                        <span className="text-[#FF7E5F] font-bold"> + {f.productos}</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="px-6 py-4 text-center border border-slate-200">
                                                                    <div className={cn(
                                                                        "text-sm font-black tabular-nums text-right",
                                                                        f.FC_ESTADO === 'CANCELADO' ? "text-slate-300 line-through" : "text-slate-900"
                                                                    )}>
                                                                        $ {(Number(f.FC_TOTAL) || 0).toLocaleString('es-CO')}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 text-center border border-slate-200">
                                                                    <span className={cn(
                                                                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight border",
                                                                        f.FC_ESTADO === 'PAGADO' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                            f.FC_ESTADO === 'PENDIENTE' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                                "bg-red-50 text-red-600 border-red-100"
                                                                    )}>
                                                                        {f.FC_ESTADO}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="px-6 py-4 text-right border border-slate-200">
                                                                    <div className="flex justify-end gap-1.5 transition-opacity opacity-100">
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


                                {/* Ranking de Técnicos (RELOCADO AQUÍ) */}
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
                                                    <div className="w-[35%] flex gap-4 pl-12">Técnico</div>
                                                    <div className="w-[15%] text-center">Servicios</div>
                                                    <div className="w-[25%] text-right">Productos</div>
                                                    <div className="w-[25%] text-right pr-4">A Pagar</div>
                                                </div>
                                                {(chartsData?.topTechs || []).map((tech: any, index: number) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer group/tech border-l-4 border-transparent hover:border-[#FF7E5F]"
                                                        onClick={() => {
                                                            setDetailType('Técnico')
                                                            setDetailTitle(`Servicios de ${tech.name}`)
                                                            setIsDetailModalOpen(true)
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4 w-[35%]">
                                                            <div className={cn(
                                                                "size-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm transition-transform group-hover/tech:scale-110",
                                                                index === 0 ? "bg-amber-100 text-amber-600 shadow-inner" :
                                                                    "bg-slate-50 text-slate-400"
                                                            )}>
                                                                {index + 1}
                                                            </div>
                                                            <div className="flex flex-col truncate">
                                                                <span className="text-[11px] font-black text-[#00CED1] uppercase tracking-tight truncate">
                                                                    {tech.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="w-[15%] text-center">
                                                            <span className="text-xs font-black text-slate-900 tabular-nums">{tech.count}</span>
                                                        </div>
                                                        <div className="w-[25%] text-right">
                                                            <div className="text-[#00CED1] text-[11px] font-black">
                                                                $ {(Number(tech.total_productos) || 0).toLocaleString('es-CO')}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 w-[25%]">
                                                            <div className="text-[#FF7E5F] text-[11px] font-black">
                                                                $ {(Number(tech.total_pagar) || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
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

                                {/* PRODUCTOS Table */}
                                <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
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
                                                <TableRow className="hover:bg-transparent border-b border-slate-100/50">
                                                    <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase w-[120px] border border-slate-200">Factura</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase w-[100px] text-center border border-slate-200">Fecha</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase border border-slate-200">Producto</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase text-right border border-slate-200">Valor</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase border border-slate-200">Técnico</TableHead>
                                                    <TableHead className="px-4 py-4 font-bold text-slate-500 text-[10px] uppercase border border-slate-200">Servicio Asociado</TableHead>
                                                    <TableHead className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase text-right w-[100px] border border-slate-200">Acción</TableHead>
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
                                                                <TableCell className="px-6 py-4 text-xs font-bold text-slate-900 border border-slate-200">#{p.FC_NUMERO_FACTURA}</TableCell>
                                                                <TableCell className="px-4 py-4 text-[10px] font-medium text-slate-500 text-center tabular-nums border border-slate-200">
                                                                    {format(new Date(p.FC_FECHA), 'dd/MM/yyyy', { locale: es })}
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 text-xs font-bold text-slate-700 uppercase border border-slate-200">{p.producto_nombre}</TableCell>
                                                                <TableCell className="px-4 py-4 text-xs font-black text-right text-slate-900 tabular-nums border border-slate-200">
                                                                    $ {(Number(p.FP_VALOR) || 0).toLocaleString('es-CO')}
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 text-[11px] font-bold uppercase text-slate-500 italic border border-slate-200">{p.tecnico_nombre}</TableCell>
                                                                <TableCell className="px-4 py-4 border border-slate-200">
                                                                    {p.servicio_nombre ? (
                                                                        <span className="bg-slate-100 text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200">
                                                                            {p.servicio_nombre}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300 italic text-[10px]">SIN ASOCIACIÓN</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="px-6 py-4 text-right border border-slate-200">
                                                                    <div className="flex justify-end gap-1 font-black transition-opacity opacity-100">
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
                                                        <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Factura</TableHead>
                                                        <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Trabajador</TableHead>
                                                        <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">Valor</TableHead>
                                                        <TableHead className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400 text-center">Cuotas</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {isLoading ? (
                                                        Array.from({ length: 3 }).map((_, i) => (
                                                            <TableRow key={`vales-skeleton-${i}`}>
                                                                <TableCell colSpan={5} className="p-4">
                                                                    <Skeleton className="h-8 w-full rounded-lg" />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <>
                                                            {(specificData?.serviciosReal || []).map((v: any) => (
                                                                <TableRow key={v.ST_IDSERVICIO_TRABAJADOR_PK} className="transition-colors border-b border-slate-50">
                                                                    <TableCell className="px-4 py-3 text-[10px] font-medium text-slate-500 tabular-nums">
                                                                        {format(new Date(v.ST_FECHA), "dd/MM/yyyy", { locale: es })}
                                                                    </TableCell>
                                                                    <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-900 border-l border-slate-50 pl-6 uppercase">
                                                                        {v.FC_NUMERO_FACTURA ? `#${v.FC_NUMERO_FACTURA}` : 'INTERNO'}
                                                                    </TableCell>
                                                                    <TableCell className="px-4 py-3 text-[11px] font-bold text-slate-900 uppercase">
                                                                        {v.trabajador_nombre}
                                                                    </TableCell>
                                                                    <TableCell className="px-4 py-3 text-[12px] font-black text-slate-900 tabular-nums">$ {(Number(v.ST_VALOR_TOTAL) || 0).toLocaleString('es-CO')}</TableCell>
                                                                    <TableCell className="px-4 py-3 text-center">
                                                                        <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                                                                            {v.ST_NUMERO_CUOTAS}
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {(specificData?.serviciosReal || []).length === 0 && (
                                                                <TableRow>
                                                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-medium italic text-xs">Sin servicios de trabajador registrados</TableCell>
                                                                </TableRow>
                                                            )}
                                                        </>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* Metric Detail Modal */}
                        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                            <DialogContent className="max-w-[95vw] lg:max-w-[1280px] max-h-[95vh] overflow-hidden flex flex-col p-0 border border-slate-200 bg-white rounded-3xl shadow-2xl">
                                <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-200 shrink-0">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 rounded-2xl bg-[#FF7E5F]/10">
                                                <BarChart3 className="size-5 text-[#FF7E5F]" />
                                            </div>
                                            <div>
                                                <DialogTitle className="text-xl font-semibold text-slate-900 tracking-tight">Detalle de {detailTitle}</DialogTitle>
                                                <DialogDescription className="text-sm text-slate-500 leading-relaxed">Visualiza el desglose completo de servicios, productos y comisiones.</DialogDescription>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setIsDetailModalOpen(false)} className="bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50">
                                            <span className="sr-only">Cerrar</span>
                                            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                        </Button>
                                    </div>
                                </DialogHeader>

                                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                                    {detailType === 'VENTAS NETO' ? (
                                        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                                            <div className="max-w-2xl mx-auto space-y-6">
                                                <div className="text-center">
                                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Cálculo de Ventas Neto</h3>
                                                    <p className="text-slate-500 text-sm mt-1">Este valor representa el dinero real generado por el local. Es el resultado de sumar todo el dinero que entró (físico o por bancos) y restarle las salidas de caja (gastos y vales).</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                                                    <div className="flex justify-between items-center text-sm font-medium">
                                                        <span className="text-slate-600 dark:text-slate-400">Efectivo Recibido (+ Abonos y Datáfono)</span>
                                                        <span className="text-emerald-600 dark:text-emerald-500">+ $ {((stats?.metodos_pago?.['EFECTIVO'] || 0) + (stats?.total_abonos || 0) + (stats?.metodos_pago?.['DATAFONO'] || 0)).toLocaleString('es-CO')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-medium">
                                                        <span className="text-slate-600 dark:text-slate-400">Transferencias Bancarias</span>
                                                        <span className="text-emerald-600 dark:text-emerald-500">+ $ {(stats?.metodos_pago?.['TRANSFERENCIA'] || 0).toLocaleString('es-CO')}</span>
                                                    </div>
                                                    <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-1"></div>
                                                    <div className="flex justify-between items-center text-sm font-medium">
                                                        <span className="text-slate-600 dark:text-slate-400">Gastos del Local</span>
                                                        <span className="text-rose-500 dark:text-rose-400">- $ {(stats?.total_gastos || 0).toLocaleString('es-CO')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-medium">
                                                        <span className="text-slate-600 dark:text-slate-400">Vales (Adelantos)</span>
                                                        <span className="text-rose-500 dark:text-rose-400">- $ {(stats?.vales_total || 0).toLocaleString('es-CO')}</span>
                                                    </div>
                                                    <div className="h-px w-full bg-slate-200 dark:bg-slate-700 my-2"></div>
                                                    <div className="flex justify-between items-center text-base font-black">
                                                        <span className="text-slate-800 dark:text-slate-100 uppercase tracking-widest">Total Ventas Neto</span>
                                                        <span className="text-emerald-600 dark:text-emerald-500 text-lg">$ {(stats?.ventas_neto || 0).toLocaleString('es-CO')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-2xl max-h-[60vh] shadow-sm">
                                            <Table className="relative">
                                        <TableHeader>
                                            {['Técnico', 'GLOBAL_SERVICIOS', 'PRODUCTOS_VENDIDOS', 'COMISION_PRODUCTO', 'COMISION_SERVICIO', 'INGRESOS_LOCAL'].includes(detailType) ? (
                                                <TableRow className="hover:bg-transparent border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50/50">
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Factura</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Fecha</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Cliente</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Técnico</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Concepto</TableHead>
                                                    {detailType === 'GLOBAL_SERVICIOS' || detailType === 'INGRESOS_LOCAL' ? (
                                                        <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Tipo</TableHead>
                                                    ) : null}
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Sucursal</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 text-right border border-slate-200">Total ($)</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 text-right border border-slate-200">Comisión ($)</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 text-right border border-slate-200">Local ($)</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 text-right w-[60px] border border-slate-200">Ver</TableHead>
                                                </TableRow>
                                            ) : (
                                                <TableRow className="hover:bg-transparent border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50/50">
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Factura / Ref.</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Fecha</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">{detailType === 'VALES' ? 'Nombre' : 'Cliente'}</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Técnicos</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Detalle</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Servicios</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 border border-slate-200">Productos</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 text-right border border-slate-200">Total</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-slate-500 py-4 text-right w-[60px] border border-slate-200">Ver</TableHead>
                                                </TableRow>
                                            )}
                                        </TableHeader>
                                        <TableBody>
                                            {detailType === 'VENTAS' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').map((f: any) => (
                                                <TableRow key={`ventas-${f.FC_IDFACTURA_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                    <TableCell className="font-bold text-sm py-4">{f.FC_NUMERO_FACTURA}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-xs font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                                    <TableCell className="text-[11px] font-black text-emerald-600 uppercase italic max-w-[150px] truncate" title={f.tecnicos}>{f.tecnicos || 'SIN TÉCNICO'}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-400 italic max-w-[200px] truncate" title={f.FC_OBSERVACIONES}>{f.FC_OBSERVACIONES || '-'}</TableCell>
                                                    <TableCell className="text-xs font-bold text-slate-700 max-w-[250px] truncate" title={f.servicios}>{f.servicios || 'Servicios Varios'}</TableCell>
                                                    <TableCell className="text-[11px] font-bold text-[#FF7E5F] max-w-[200px] truncate" title={f.productos}>{f.productos || '-'}</TableCell>
                                                    <TableCell className="text-right font-black text-sm text-[#FF7E5F]">$ {(Number(f.FC_TOTAL) || 0).toLocaleString('es-CO')}</TableCell>
                                                    <TableCell className="text-right p-0">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice(f, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                            <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {detailType === 'TOTAL EN CAJA' && (() => {
                                                const cajaMethods = ['EFECTIVO', 'TRANSFERENCIA', 'DATAFONO', 'TARJETA'];
                                                const matchingPagos = (specificData?.pagos || []).filter((p: any) =>
                                                    cajaMethods.includes(p.metodo?.toUpperCase())
                                                );
                                                return (
                                                    <>
                                                        {matchingPagos.map((p: any, idx: number) => (
                                                            <TableRow key={`caja-p-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                                <TableCell className="font-bold text-sm py-4 uppercase">{p.FC_NUMERO_FACTURA || 'S/N'}</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-500 tabular-nums">
                                                                    {p.FC_FECHA ? format(new Date(p.FC_FECHA), 'dd/MM/yyyy') : '---'}
                                                                </TableCell>
                                                                <TableCell className="text-xs font-bold uppercase text-slate-700">{p.cliente_display || 'GENERAL'}</TableCell>
                                                                <TableCell className="text-[11px] font-black text-emerald-600 uppercase italic max-w-[150px] truncate" title={p.tecnicos}>{p.tecnicos || '-'}</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-500 italic">Método: {p.metodo}</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                                <TableCell className="text-right font-black text-sm text-emerald-600">$ {(Number(p.PF_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                                <TableCell className="text-right p-0">
                                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice({ FC_IDFACTURA_PK: p.FC_IDFACTURA_FK }, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                                        <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {(specificData?.abonos || []).map((ab: any) => (
                                                            <TableRow key={`caja-ab-${ab.AB_IDABONO_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                                <TableCell className="font-bold text-sm py-4 uppercase">{ab.FC_NUMERO_FACTURA}</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-500 tabular-nums">{format(new Date(ab.AB_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                                <TableCell className="text-xs font-bold uppercase text-slate-700">{ab.cliente_display}</TableCell>
                                                                <TableCell className="text-[11px] font-black text-blue-600 uppercase italic max-w-[150px] truncate" title={ab.tecnicos}>{ab.tecnicos || '-'}</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-500 italic">Pago de saldo pendiente</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                                <TableCell className="text-right font-black text-sm text-blue-600">$ {(Number(ab.AB_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                                <TableCell className="text-right p-0">
                                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice({ FC_IDFACTURA_PK: ab.FC_IDFACTURA_PK }, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                                        <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </>
                                                )
                                            })()}

                                            {detailType === 'VALES' && (
                                                <>
                                                    {(specificData?.adelantos || []).map((v: any) => (
                                                        <TableRow key={`val-nom-${v.VL_IDVALE_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                            <TableCell className="font-bold text-sm py-4 uppercase text-orange-600">Vale de Nómina/Adelanto</TableCell>
                                                            <TableCell className="text-xs font-medium text-slate-500 tabular-nums">{format(new Date(v.VL_FECHA_CREACION), 'dd/MM/yyyy')}</TableCell>
                                                            <TableCell className="text-xs font-bold uppercase text-slate-700">{v.trabajador_nombre}</TableCell>
                                                            <TableCell className="text-xs font-black text-orange-600 uppercase"> - </TableCell>
                                                            <TableCell className="text-xs font-medium text-slate-500">{v.VL_OBSERVACIONES || 'Adelanto de efectivo'}</TableCell>
                                                            <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                            <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                            <TableCell className="text-right font-black text-sm text-orange-600">$ {(Number(v.VL_MONTO) || 0).toLocaleString('es-CO')}</TableCell>
                                                            <TableCell className="text-right p-0">
                                                                <span className="text-slate-200">-</span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </>
                                            )}

                                            {detailType === 'PROPINAS' && (specificData?.propinas || []).map((p: any, idx: number) => (
                                                <TableRow key={`propina-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                    <TableCell className="font-bold text-sm py-4 uppercase text-emerald-600">{p.FC_NUMERO_FACTURA || 'S/N'}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500 tabular-nums">{format(new Date(p.FC_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-xs font-bold uppercase text-slate-700">{p.cliente_display}</TableCell>
                                                    <TableCell className="text-[11px] font-black text-emerald-600 uppercase italic max-w-[150px] truncate">{p.tecnico_nombre}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500">Propina por: {p.servicio_nombre}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                    <TableCell className="text-right font-black text-sm text-emerald-600">$ {(Number(p.FD_PROPINA) || 0).toLocaleString('es-CO')}</TableCell>
                                                    <TableCell className="text-right p-0">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice({ FC_IDFACTURA_PK: p.FC_IDFACTURA_PK }, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                            <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {detailType === 'GASTOS' && (specificData?.gastos || []).map((g: any, idx: number) => (
                                                <TableRow key={`gasto-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                    <TableCell className="font-bold text-sm py-4">{g.GS_CONCEPTO}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500 tabular-nums">{format(new Date(g.GS_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-xs font-bold uppercase text-slate-700">{g.sucursal_nombre || 'GENERAL'}</TableCell>
                                                    <TableCell className="text-[11px] font-black text-rose-600 uppercase italic max-w-[150px] truncate">-</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-400 italic max-w-[200px] truncate" title={g.GS_DESCRIPCION}>{g.GS_DESCRIPCION || '-'}</TableCell>
                                                    <TableCell className="text-[11px] font-bold text-rose-600 max-w-[200px] truncate">-</TableCell>
                                                    <TableCell className="text-[11px] font-bold text-rose-600 max-w-[200px] truncate">-</TableCell>
                                                    <TableCell className="text-right font-black text-sm text-rose-600">$ {(Number(g.GS_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                    <TableCell className="text-right p-0">
                                                        <span className="text-slate-200">-</span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {detailType === 'ABONO A DEUDAS' && (specificData?.abonos || []).map((ab: any) => (
                                                <TableRow key={`abono-${ab.AB_IDABONO_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                    <TableCell className="font-bold text-sm py-4 uppercase">{ab.FC_NUMERO_FACTURA}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500 tabular-nums">{format(new Date(ab.AB_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-xs font-bold uppercase text-slate-700">{ab.cliente_display}</TableCell>
                                                    <TableCell className="text-[11px] font-black text-indigo-600 uppercase italic max-w-[150px] truncate" title={ab.tecnicos}>{ab.tecnicos || '-'}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500 italic">Abono a crédito pendiente</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                    <TableCell className="text-right font-black text-sm text-indigo-600">$ {(Number(ab.AB_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                    <TableCell className="text-right p-0">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice({ FC_IDFACTURA_PK: ab.FC_IDFACTURA_PK }, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                            <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {detailType === 'SERVICIOS EN CURSO' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE').map((f: any) => (
                                                <TableRow key={`pendiente-${f.FC_IDFACTURA_PK}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                    <TableCell className="font-bold text-sm py-4">{f.FC_NUMERO_FACTURA}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500 tabular-nums">{format(new Date(f.FC_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-xs font-bold uppercase text-slate-700">{f.cliente_display || 'GENERAL'}</TableCell>
                                                    <TableCell className="text-[11px] font-black text-amber-600 uppercase italic max-w-[150px] truncate" title={f.tecnicos}>{f.tecnicos || 'SIN TÉCNICO'}</TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-400 italic max-w-[200px] truncate" title={f.FC_OBSERVACIONES}>{f.FC_OBSERVACIONES || '-'}</TableCell>
                                                    <TableCell className="text-xs font-bold text-slate-700 max-w-[250px] truncate" title={f.servicios}>{f.servicios || '---'}</TableCell>
                                                    <TableCell className="text-[11px] font-bold text-[#FF7E5F] max-w-[200px] truncate" title={f.productos}>{f.productos || '-'}</TableCell>
                                                    <TableCell className="text-right font-black text-sm text-[#FF7E5F]">
                                                        <div className="flex flex-col items-end">
                                                            <span>$ {(Number(f.FC_TOTAL) || 0).toLocaleString('es-CO')}</span>
                                                            {Number(f.productos_total) > 0 && (
                                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">(Prod: $ {(Number(f.productos_total) || 0).toLocaleString('es-CO')})</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right p-0">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice(f, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                            <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {['EFECTIVO', 'TRANSFERENCIA', 'DATAFONO', 'CREDITO', 'SERVICIO TRABAJADOR'].includes(detailType) && (() => {
                                                const methodMap: Record<string, string[]> = {
                                                    'EFECTIVO': ['EFECTIVO'],
                                                    'TRANSFERENCIA': ['TRANSFERENCIA'],
                                                    'DATAFONO': ['DATAFONO', 'TARJETA'],
                                                    'CREDITO': ['CREDITO'],
                                                    'SERVICIO TRABAJADOR': ['SERVICIO DE TRABAJADOR', 'SERVICIO TRABAJADOR'],
                                                }
                                                const dbMethods = methodMap[detailType] || [detailType.toUpperCase()]
                                                const matchingPayments = (specificData?.pagos || []).filter(
                                                    (p: any) => dbMethods.includes(p.metodo?.toUpperCase())
                                                )

                                                return (
                                                    <>
                                                        {detailType === 'SERVICIO TRABAJADOR' && (specificData?.serviciosReal || []).map((s: any, idx: number) => (
                                                            <TableRow key={`st-real-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                                <TableCell className="font-bold text-sm py-4 uppercase text-[#FF7E5F]">Voucher Servicio</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-500 tabular-nums">
                                                                    {s.ST_FECHA ? format(new Date(s.ST_FECHA), 'dd/MM/yyyy') : '---'}
                                                                </TableCell>
                                                                <TableCell className="text-xs font-bold uppercase text-slate-700">
                                                                    {s.trabajador_nombre} {s.FC_NUMERO_FACTURA ? `(Fact. ${s.FC_NUMERO_FACTURA})` : ''}
                                                                </TableCell>
                                                                <TableCell className="text-[11px] font-black text-[#FF7E5F] uppercase italic max-w-[150px] truncate" title={s.tecnicos}>{s.tecnicos || '-'}</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-500 italic">Deuda generada por servicio interno {s.FC_ESTADO === 'PENDIENTE' && <span className="text-amber-500 font-bold ml-1">(PENDIENTE)</span>}</TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                                <TableCell className="text-xs font-medium text-slate-400 italic"> - </TableCell>
                                                                <TableCell className="text-right font-black text-sm text-slate-900">$ {(Number(s.ST_VALOR_TOTAL) || 0).toLocaleString('es-CO')}</TableCell>
                                                                <TableCell className="text-right p-0">
                                                                    {(s.FC_IDFACTURA_FK || s.FC_IDFACTURA_PK) ? (
                                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice({ FC_IDFACTURA_PK: s.FC_IDFACTURA_FK || s.FC_IDFACTURA_PK }, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                                            <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                                        </Button>
                                                                    ) : <span className="text-slate-200">-</span>}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {matchingPayments
                                                            .filter((p: any) => detailType !== 'SERVICIO TRABAJADOR' || !(specificData?.serviciosReal || []).some((s: any) => s.FC_IDFACTURA_FK === p.FC_IDFACTURA_FK))
                                                            .map((pago: any, idx: number) => {
                                                                const factura = (specificData?.facturas || []).find((f: any) => f.FC_IDFACTURA_PK === pago.FC_IDFACTURA_FK)
                                                                return (
                                                                    <TableRow key={`pago-m-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                                        <TableCell className="font-bold text-sm py-4">{factura?.FC_NUMERO_FACTURA || pago.FC_IDFACTURA_FK}</TableCell>
                                                                        <TableCell className="text-xs font-medium text-slate-500 tabular-nums">
                                                                            {factura ? format(new Date(factura.FC_FECHA), 'dd/MM/yyyy') : '---'}
                                                                        </TableCell>
                                                                        <TableCell className="text-xs font-bold uppercase text-slate-700">
                                                                            {factura?.cliente_display || 'GENERAL'}
                                                                        </TableCell>
                                                                        <TableCell className="text-[11px] font-black text-blue-600 uppercase italic max-w-[150px] truncate" title={factura?.tecnicos}>{factura?.tecnicos || '-'}</TableCell>
                                                                        <TableCell className="text-xs font-medium text-slate-400 italic max-w-[200px] truncate" title={factura?.FC_OBSERVACIONES}>{factura?.FC_OBSERVACIONES || '-'}</TableCell>
                                                                        <TableCell className="text-xs font-bold text-slate-700 max-w-[250px] truncate" title={factura?.servicios}>{factura?.servicios || 'Servicios Varios'}</TableCell>
                                                                        <TableCell className="text-[11px] font-bold text-[#FF7E5F] max-w-[200px] truncate" title={factura?.productos}>{factura?.productos || '-'}</TableCell>
                                                                        <TableCell className="text-right font-black text-sm text-[#FF7E5F]">$ {(Number(pago.PF_VALOR) || 0).toLocaleString('es-CO')}</TableCell>
                                                                        <TableCell className="text-right p-0">
                                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice({ FC_IDFACTURA_PK: pago.FC_IDFACTURA_FK }, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                                                <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                    </>
                                                )
                                            })()}

                                            {['Técnico', 'GLOBAL_SERVICIOS', 'PRODUCTOS_VENDIDOS', 'COMISION_PRODUCTO', 'COMISION_SERVICIO', 'INGRESOS_LOCAL'].includes(detailType) && (specificData?.serviciosDetalle || [])
                                                .filter((s: any) => {
                                                    if (detailType === 'GLOBAL_SERVICIOS' || detailType === 'INGRESOS_LOCAL') return true;
                                                    if (detailType === 'Técnico') return s.tecnico_nombre === detailTitle.replace('Servicios de ', '');
                                                    if (detailType === 'PRODUCTOS_VENDIDOS' || detailType === 'COMISION_PRODUCTO') return s.tipo_item === 'PRODUCTO';
                                                    if (detailType === 'COMISION_SERVICIO') return s.tipo_item === 'SERVICIO';
                                                    return false;
                                                })
                                                .map((s: any, idx: number) => (
                                                    <TableRow key={`tech-d-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-950/50 transition-colors">
                                                        <TableCell className="font-bold text-sm py-4 uppercase border border-slate-100">{s.FC_NUMERO_FACTURA}</TableCell>
                                                        <TableCell className="text-xs font-medium text-slate-500 tabular-nums border border-slate-100">{format(new Date(s.FC_FECHA), 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell className="text-xs font-bold uppercase text-slate-700 border border-slate-100">{s.cliente_display || 'GENERAL'}</TableCell>
                                                        <TableCell className="text-xs font-black text-[#FF7E5F] uppercase border border-slate-100">{s.tecnico_nombre}</TableCell>
                                                        <TableCell className="text-xs font-bold text-slate-800 max-w-[200px] truncate border border-slate-100" title={s.item_nombre}>{s.item_nombre}</TableCell>
                                                        {detailType === 'GLOBAL_SERVICIOS' || detailType === 'INGRESOS_LOCAL' ? (
                                                            <TableCell className="text-[10px] font-bold text-slate-500 tracking-wider border border-slate-100">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full border",
                                                                    s.tipo_item === 'SERVICIO' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                )}>
                                                                    {s.tipo_item}
                                                                </span>
                                                            </TableCell>
                                                        ) : null}
                                                        <TableCell className="text-xs font-medium text-slate-500 uppercase border border-slate-100">{s.sucursal_nombre || '-'}</TableCell>
                                                        <TableCell className="text-right font-black text-sm text-slate-900 tabular-nums border border-slate-100">$ {(Number(s.valor_total) || 0).toLocaleString('es-CO')}</TableCell>
                                                        <TableCell className="text-right font-black text-sm text-[#FF7E5F] tabular-nums border border-slate-100">$ {(Number(s.comision) || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</TableCell>
                                                        <TableCell className="text-right font-bold text-xs text-slate-400 tabular-nums border border-slate-100">$ {(Number(s.local_share) || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</TableCell>
                                                        <TableCell className="text-right p-0 border border-slate-100">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenInvoice({ FC_IDFACTURA_PK: s.FC_IDFACTURA_PK }, true)} className="size-10 hover:bg-slate-100 rounded-lg">
                                                                <Eye className="size-5 text-slate-400 hover:text-slate-900" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            }

                                            {((detailType === 'VENTAS' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').length === 0) ||
                                                (detailType === 'TOTAL EN CAJA' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PAGADO').length === 0 && (specificData?.abonos || []).length === 0) ||
                                                (detailType === 'ABONO A DEUDAS' && (specificData?.abonos || []).length === 0) ||
                                                (detailType === 'SERVICIOS EN CURSO' && (specificData?.facturas || []).filter((f: any) => f.FC_ESTADO === 'PENDIENTE').length === 0)) && (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="py-20 text-center text-slate-300 font-bold italic text-sm uppercase tracking-widest">No se encontraron registros</TableCell>
                                                    </TableRow>
                                                )}
                                        </TableBody>
                                        </Table>
                                    </div>
                                    )}
                                </div>

                                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex justify-end">
                                    <Button onClick={() => setIsDetailModalOpen(false)} className="h-11 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-semibold uppercase text-[10px] tracking-widest px-6 shadow-sm transition-all">
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

                        <ConfirmDialog
                            isOpen={confirmState.isOpen}
                            onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                            onConfirm={confirmState.onConfirm}
                            title={confirmState.title}
                            description={confirmState.description}
                            confirmText={confirmState.confirmText}
                            variant={confirmState.variant}
                        />

                    </>
                )}
            </div>
        </div>
    )
}
