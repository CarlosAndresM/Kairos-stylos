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
    Loader2
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
import { getPaymentMethods, getTechnicians, getInvoiceById, deleteInvoice, verifyAdminPassword } from '@/features/billing/services'
import { getServices, getProducts } from '@/features/catalog/services'

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
                // If cajero and has sucursal, set it
                if (userRes.data.role === 'CAJERO' && userRes.data.sucursalId) {
                    setSelectedSede(userRes.data.sucursalId)
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
                getTechnicians(),
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

            if (viewMode === 'ESPECIFICO') {
                const specificRes = await getDashboardSpecificData(selectedSede, from, to)
                if (specificRes.success) setSpecificData(specificRes.data)
            }
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

    const handleOpenInvoice = async (invoice: any) => {
        setIsFetchingInfo(true)
        try {
            const res = await getInvoiceById(invoice.FC_IDFACTURA_PK)
            if (res.success) {
                setSelectedInvoice(res.data)
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
        setIsBillingModalOpen(true)
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Welcome */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        ¡Bienvenido de nuevo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B]">{user?.username || 'Admin'}</span>! 👋
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Resumen de {filterType === 'DIA' ? `el día ${format(currentDate, 'd MMM', { locale: es })}` : 'el periodo seleccionado'} en <span className="text-[#FF7E5F] font-bold">Kyroy Stilos</span>.
                    </p>
                </div>

                {/* Branch Selector */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none self-start">
                    <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 italic">
                        <MapPin className="size-3 text-[#FF7E5F]" />
                        Sucursal:
                    </div>
                    <select 
                        className="bg-transparent font-black text-xs uppercase pr-8 outline-none cursor-pointer"
                        value={selectedSede}
                        onChange={(e) => setSelectedSede(Number(e.target.value))}
                        disabled={user?.role === 'CAJERO' && user?.sucursalId}
                    >
                        <option value="-1">GENERAL (TODAS)</option>
                        {sedes.map(s => (
                            <option key={s.SC_IDSUCURSAL_PK} value={s.SC_IDSUCURSAL_PK}>{s.SC_NOMBRE}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-white dark:bg-slate-900 p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Selector de Tipo de Filtro */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 border-2 border-black">
                        <button
                            onClick={() => setFilterType('DIA')}
                            className={cn(
                                "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all italic",
                                filterType === 'DIA' ? "bg-black text-white" : "text-slate-500 hover:text-black"
                            )}
                        >
                            POR DÍA
                        </button>
                        {periods.length > 0 && (
                            <button
                                onClick={() => setFilterType('PERIODO')}
                                className={cn(
                                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all italic",
                                    filterType === 'PERIODO' ? "bg-black text-white" : "text-slate-500 hover:text-black"
                                )}
                            >
                                POR PERIODO
                            </button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-300 hidden md:block" />

                    {/* Mostramos el filtro correspondiente */}
                    {filterType === 'DIA' ? (
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')} className="h-8 w-8 rounded-none">
                                <ChevronLeft className="size-4" />
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="h-8 px-4 rounded-none font-black text-[10px] uppercase tracking-tighter flex gap-2 border-x border-slate-200">
                                        <CalendarIcon className="size-3.5 text-[#FF7E5F]" />
                                        {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" align="start">
                                    <Calendar mode="single" selected={currentDate} onSelect={(d) => d && setCurrentDate(d)} />
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" onClick={() => navigateDay('next')} className="h-8 w-8 rounded-none">
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    ) : periods.length > 0 ? (
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-[260px] max-w-full">
                            <div className="px-3 text-[10px] font-black text-slate-400 border-r border-slate-200 mr-2 shrink-0">VER:</div>
                            <div className="flex-1 min-w-0">
                                <ComboboxSearch
                                    options={periods.map(p => ({
                                        label: `${format(new Date(p.NM_FECHA_INICIO), 'dd MMM', { locale: es }).toUpperCase()} - ${format(new Date(p.NM_FECHA_FIN), 'dd MMM', { locale: es }).toUpperCase()}`,
                                        value: p.NM_IDNOMINA_PK.toString()
                                    }))}
                                    value={selectedPeriod}
                                    onValueChange={(val) => val && setSelectedPeriod(val)}
                                    placeholder="BUSCAR..."
                                    className="bg-transparent border-none shadow-none h-6 font-black text-[10px] w-full px-0 hover:bg-transparent justify-start"
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* View Switcher */}
                <div className="flex items-center bg-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <button 
                        onClick={() => setViewMode('GENERAL')}
                        className={cn(
                            "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center gap-2",
                            viewMode === 'GENERAL' ? "bg-white text-black" : "text-white hover:text-slate-300"
                        )}
                    >
                        <BarChart3 className="size-3.5" /> GENERAL
                    </button>
                    <button 
                        onClick={() => setViewMode('ESPECIFICO')}
                        className={cn(
                            "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center gap-2",
                            viewMode === 'ESPECIFICO' ? "bg-white text-black" : "text-white hover:text-slate-300"
                        )}
                    >
                        <LayoutList className="size-3.5" /> ESPECÍFICO
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {viewMode === 'GENERAL' ? (
                <div className="space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {[
                          { title: `Ventas ${selectedPeriod === 'hoy' ? 'Hoy' : 'Periodo'}`, value: `$${(stats?.ventas_total || 0).toLocaleString('es-CO')}`, icon: TrendingUp, color: 'from-[#FF7E5F] to-[#FEB47B]' },
                          { title: 'Clientes Nuevos', value: stats?.clientes_nuevos || 0, icon: Users, color: 'from-blue-500 to-cyan-400' },
                          { title: 'Créditos', value: `$${(stats?.creditos_total || 0).toLocaleString('es-CO')}`, sub: `${stats?.creditos_count || 0} pndte`, icon: CreditCard, color: 'from-red-500 to-rose-400' },
                          { title: 'Deudas Activas', value: stats?.deudas_count || 0, sub: 'Clientes con deuda', icon: LayoutList, color: 'from-amber-500 to-yellow-400' },
                          { title: 'Vales', value: `$${(stats?.vales_total || 0).toLocaleString('es-CO')}`, sub: `${stats?.vales_count || 0} activos`, icon: Wallet, color: 'from-emerald-500 to-teal-400' },
                        ].map((stat, i) => (
                          <Card key={i} className="border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative group bg-white dark:bg-slate-900">
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.05] group-hover:opacity-[0.1] rounded-full -mr-12 -mt-12 transition-all duration-500 blur-xl group-hover:scale-150`} />
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                                <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.title}</CardTitle>
                                <div className={cn("p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-gradient-to-br", stat.color)}>
                                    <stat.icon className="size-4 text-white" />
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{stat.value}</div>
                                {stat.sub && <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase italic">{stat.sub}</p>}
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 p-4 flex flex-col items-center justify-center text-center">
                            <div className="size-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-[#FF7E5F] flex items-center justify-center mb-3">
                                <TrendingUp className="size-5 text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total en Caja (Estimado)</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">$ {(stats?.total_pagos || 0).toLocaleString('es-CO')}</span>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Sin contar créditos ni vales</p>
                        </Card>
                        <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 p-4 flex flex-col items-center justify-center text-center">
                            <div className="size-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-emerald-500 flex items-center justify-center mb-3">
                                <Zap className="size-5 text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Servicios</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats?.servicios_count || 0}</span>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Servicios realizados en periodo</p>
                        </Card>
                        <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 p-4 flex flex-col items-center justify-center text-center">
                           <div className="size-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-slate-900 flex items-center justify-center mb-3">
                                <Users className="size-5 text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnicos Activos</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{(chartsData?.topTechs?.length || 0)}</span>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Con servicios registrados</p>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Technicians Chart */}
                    <Card className="border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 p-6">
                        <h3 className="text-sm font-black uppercase mb-6 flex items-center gap-2 tracking-tighter">
                            <Zap className="size-4 text-[#FF7E5F]" /> Técnicos con mayor servicios
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartsData?.topTechs || []} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748B' }} 
                                        width={100} 
                                    />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: 0, padding: 8 }}
                                        itemStyle={{ color: '#fff', fontSize: 10, fontWeight: 900 }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {(chartsData?.topTechs || []).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Top Services Pie */}
                    <Card className="border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 p-6">
                        <h3 className="text-sm font-black uppercase mb-6 flex items-center gap-2 tracking-tighter">
                            <Users className="size-4 text-emerald-500" /> Top Servicios
                        </h3>
                         <div className="h-[300px] w-full flex items-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartsData?.topServices || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="count"
                                    >
                                        {(chartsData?.topServices || []).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="black" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="w-1/3 space-y-2">
                                {(chartsData?.topServices || []).map((s: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="size-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-[9px] font-black uppercase truncate">{s.name}</span>
                                        <span className="text-[9px] font-black ml-auto">{s.count}</span>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </Card>

                    {/* Top Products */}
                    <Card className="lg:col-span-2 border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 p-6">
                         <h3 className="text-sm font-black uppercase mb-6 flex items-center gap-2 tracking-tighter">
                            <Wallet className="size-4 text-blue-500" /> Top Productos Vendidos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {(chartsData?.topProducts || []).map((p: any, i: number) => (
                                <div key={i} className="border-2 border-black p-3 bg-slate-50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-1 bg-black text-white text-[8px] font-black">#{i+1}</div>
                                    <p className="text-[10px] font-black uppercase mb-1 truncate pr-4">{p.name}</p>
                                    <p className="text-xl font-black text-[#FF7E5F]">{p.count}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Unidades</p>
                                </div>
                            ))}
                            {(chartsData?.topProducts || []).length === 0 && (
                                <p className="col-span-1 md:col-span-5 text-center text-slate-400 italic text-xs py-8 uppercase font-bold">Sin productos registrados en este periodo</p>
                            )}
                        </div>
                    </Card>
                </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                     {/* Facturas Table */}
                     <Card className="border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="bg-black p-3 flex items-center justify-between">
                             <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                                <LayoutList className="size-4" /> Detalle de Ventas
                             </h3>
                             <Button 
                                onClick={handleNewInvoice}
                                className="h-7 px-3 bg-white text-black hover:bg-slate-200 rounded-none border-2 border-black font-black text-[9px] uppercase italic gap-1"
                             >
                                <Plus className="size-3" /> Agregar Factura
                             </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 border-b-2 border-black">
                                        <TableHead className="font-black text-[10px] uppercase w-[110px]">Factura</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase w-[100px]">Hora</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Sucursal</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Cliente</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Servicios</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase text-right w-[110px]">Total</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase text-center w-[100px]">Estado</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase text-right w-[60px]">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(specificData?.facturas || []).map((f: any) => (
                                        <TableRow key={f.FC_IDFACTURA_PK} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <TableCell className="text-[11px] font-bold">{f.FC_NUMERO_FACTURA}</TableCell>
                                            <TableCell className="text-[10px] font-medium text-slate-500">
                                                {format(new Date(f.FC_FECHA), "HH:mm 'hs'", { locale: es })}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-[10px] font-black uppercase text-slate-500 italic bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                                                    {f.sucursal_nombre}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-[11px] font-black uppercase">{f.cliente_display || 'GENERAL'}</TableCell>
                                            <TableCell className="text-[11px] italic text-slate-500 max-w-[200px] truncate">{f.servicios || '--'}</TableCell>
                                            <TableCell className="text-[11px] font-black text-right">
                                                <span className={cn(
                                                    "text-sm font-black tracking-tight",
                                                    f.FC_ESTADO === 'CANCELADO' ? "text-slate-300 line-through" : "text-slate-900 dark:text-white"
                                                )}>
                                                    $ {Number(f.FC_TOTAL).toLocaleString('es-CO')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border",
                                                    f.FC_ESTADO === 'PAGADO' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                    f.FC_ESTADO === 'PENDIENTE' ? "bg-orange-50 text-orange-600 border-orange-200" :
                                                    "bg-red-50 text-red-600 border-red-200"
                                                )}>
                                                    {f.FC_ESTADO}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenInvoice(f)}
                                                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                                                        title="Ver detalles"
                                                    >
                                                        <Eye className="size-3.5" />
                                                    </button>
                                                    {f.FC_ESTADO === 'PENDIENTE' && (
                                                        <button
                                                            onClick={() => handleOpenInvoice(f)}
                                                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                                                            title="Editar factura"
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setInvoiceToDelete(f)
                                                            setIsAdminDeleteAuthOpen(true)
                                                        }}
                                                        className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all"
                                                        title="Eliminar factura"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(specificData?.facturas || []).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center p-8 text-slate-400 font-bold uppercase text-[10px]">Sin movimientos registrados</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                     </Card>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Créditos Table */}
                        <Card className="border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 overflow-hidden">
                            <div className="bg-[#FF7E5F] p-3">
                                <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                                    <CreditCard className="size-4" /> Créditos Pendientes
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 border-b-2 border-black">
                                            <TableHead className="font-black text-[10px] uppercase">Factura</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Cliente</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase text-right">Pendiente</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(specificData?.creditos || []).map((c: any) => (
                                            <TableRow key={c.CR_IDCREDITO_PK}>
                                                <TableCell className="text-[10px] font-bold">{c.FC_NUMERO_FACTURA}</TableCell>
                                                <TableCell className="text-[10px] font-black uppercase">{c.cliente_display}</TableCell>
                                                <TableCell className="text-[11px] font-black text-right text-red-600">$ {Number(c.CR_VALOR_PENDIENTE).toLocaleString('es-CO')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>

                         {/* Vales Table */}
                         <Card className="border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 overflow-hidden">
                            <div className="bg-emerald-500 p-3">
                                <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                                    <Wallet className="size-4" /> Vales / Anticipos
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 border-b-2 border-black">
                                            <TableHead className="font-black text-[10px] uppercase">Trabajador</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Valor</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase text-center">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                         {(specificData?.vales || []).map((v: any) => (
                                            <TableRow key={v.VL_IDVALE_PK}>
                                                <TableCell className="text-[10px] font-black uppercase">{v.trabajador_nombre}</TableCell>
                                                <TableCell className="text-[11px] font-black">$ {Number(v.VL_VALOR_TOTAL).toLocaleString('es-CO')}</TableCell>
                                                <TableCell className="text-center">
                                                     <span className="px-1.5 py-0.5 text-[8px] font-black uppercase border bg-slate-50">
                                                        {v.VL_ESTADO}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                     </div>
                </div>
            )}

            {/* Floating Add Button in Specific View */}
            {viewMode === 'ESPECIFICO' && (
                <Button 
                    onClick={handleNewInvoice}
                    className="fixed bottom-8 right-8 size-14 rounded-full bg-black text-white shadow-[8px_8px_0px_0px_rgba(255,126,95,1)] hover:scale-110 active:scale-95 transition-all z-50 p-0"
                >
                    <Plus className="size-8" />
                </Button>
            )}

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
            />

            {/* Modal Autenticación Admin para Eliminar */}
            {isAdminDeleteAuthOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-800 p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
                        <h3 className="text-sm font-black uppercase mb-4 tracking-tighter text-red-600 flex items-center gap-2">
                            <Trash2 className="size-4" /> REQUERIDO ADMIN
                        </h3>
                        <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase italic">Para eliminar definitivamente una factura debe autorizar como administrador.</p>
                        <Input
                            type="password"
                            placeholder="CONTRASEÑA ADMINISTRADOR"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="rounded-none border-black mb-4 font-black bg-white text-black"
                            autoFocus
                            autoComplete="new-password"
                            onKeyDown={(e) => e.key === 'Enter' && confirmDeleteInvoice()}
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-none border-black uppercase font-bold text-xs"
                                onClick={() => {
                                    setIsAdminDeleteAuthOpen(false)
                                    setAdminPassword('')
                                    setInvoiceToDelete(null)
                                }}
                            >
                                CANCELAR
                            </Button>
                            <Button
                                className="flex-1 rounded-none bg-red-600 text-white hover:bg-red-700 uppercase font-black text-xs gap-2"
                                onClick={confirmDeleteInvoice}
                                disabled={isDeleting}
                            >
                                {isDeleting && <Loader2 className="size-3 animate-spin" />}
                                CONFIRMAR ELIMINACIÓN
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
