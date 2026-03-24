'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    TrendingUp,
    Briefcase,
    Package2,
    Calendar as CalendarIcon,
    History,
    ChevronLeft,
    ChevronRight,
    Search,
    DollarSign,
    Zap,
    Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    getTechnicianStats,
    getTechnicianCharts,
    getTechnicianServices,
    getTechnicianPayrollHistory
} from '@/features/dashboard/services'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/toast-helper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TechnicianViewProps {
    user: any
    dateFrom: string
    dateTo: string
}

const COLORS = ['#FF7E5F', '#FEB47B', '#FFD200', '#F7971E', '#FFDF00'];

export function TechnicianView({ user, dateFrom, dateTo }: TechnicianViewProps) {
    const [stats, setStats] = React.useState<any>(null)
    const [chartsData, setChartsData] = React.useState<any[]>([])
    const [services, setServices] = React.useState<any[]>([])
    const [payrollHistory, setPayrollHistory] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState('resumen')

    const fetchData = React.useCallback(async () => {
        if (!user?.id) return
        setIsLoading(true)
        try {
            const [statsRes, chartsRes, servicesRes, payrollRes] = await Promise.all([
                getTechnicianStats(user.id, dateFrom, dateTo),
                getTechnicianCharts(user.id, dateFrom, dateTo),
                getTechnicianServices(user.id, dateFrom, dateTo),
                getTechnicianPayrollHistory(user.id)
            ])

            if (statsRes.success) setStats(statsRes.data)
            if (chartsRes.success) setChartsData(chartsRes.data)
            if (servicesRes.success) setServices(servicesRes.data)
            if (payrollRes.success) setPayrollHistory(payrollRes.data)
        } catch (error) {
            toast.error("Error al cargar datos del técnico")
        } finally {
            setIsLoading(false)
        }
    }, [user?.id, dateFrom, dateTo])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
                <Skeleton className="h-[400px] rounded-2xl" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        title: 'Total Servicios',
                        value: `$${(stats?.services_total || 0).toLocaleString('es-CO')}`,
                        sub: `${stats?.services_count || 0} realizados`,
                        icon: Briefcase,
                        color: 'from-[#FF7E5F] to-[#FEB47B]'
                    },
                    {
                        title: 'Productos Usados',
                        value: `$${(stats?.products_total || 0).toLocaleString('es-CO')}`,
                        sub: `${stats?.products_count || 0} unidades`,
                        icon: Package2,
                        color: 'from-blue-600 to-cyan-500'
                    },
                    {
                        title: 'Diferencia (Neto)',
                        value: `$${((stats?.services_total || 0) - (stats?.products_total || 0)).toLocaleString('es-CO')}`,
                        sub: 'Servicios - Productos',
                        icon: Zap,
                        color: 'from-emerald-600 to-teal-500'
                    },
                    {
                        title: 'Prod. Realizados',
                        value: stats?.services_count || 0,
                        sub: 'En el periodo',
                        icon: TrendingUp,
                        color: 'from-purple-600 to-indigo-500'
                    }
                ].map((stat, i) => (
                    <Card key={i} className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative group bg-white dark:bg-slate-900">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full -mr-12 -mt-12 transition-all duration-500 blur-xl group-hover:scale-150`} />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</CardTitle>
                            <div className={cn("p-2 rounded-xl bg-gradient-to-br", stat.color)}>
                                <stat.icon className="size-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{stat.value}</div>
                            <div className="text-[10px] font-medium text-slate-400 mt-2 uppercase italic leading-tight">{stat.sub}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="resumen" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                    <TabsTrigger value="resumen" className="rounded-lg text-[10px] font-black uppercase px-6">Mi Desempeño</TabsTrigger>
                    <TabsTrigger value="servicios" className="rounded-lg text-[10px] font-black uppercase px-6">Detalle Servicios</TabsTrigger>
                    <TabsTrigger value="pagos" className="rounded-lg text-[10px] font-black uppercase px-6">Volantes de Pago</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="space-y-6 mt-0">
                    <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-wider">Servicios Realizados ($ por día)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartsData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                            tickFormatter={(val) => format(new Date(val), 'dd MMM', { locale: es })}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                            tickFormatter={(val) => `$${val.toLocaleString('es-CO')}`}
                                        />
                                        <RechartsTooltip 
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                            labelFormatter={(label) => format(new Date(label), 'EEEE, d MMMM', { locale: es })}
                                            formatter={(value: any) => [`$${value.toLocaleString('es-CO')}`, 'Valor']}
                                        />
                                        <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                                            {chartsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="servicios" className="space-y-6 mt-0">
                    <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 h-12">Fecha</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Factura</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Concepto</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Tipo</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-6 h-12">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {services.length > 0 ? (
                                        services.map((item, idx) => (
                                            <TableRow key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="px-6 py-4">
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                                        {format(new Date(item.FC_FECHA), 'dd MMM', { locale: es })}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <span className="text-xs font-black text-slate-900">{item.FC_NUMERO_FACTURA}</span>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{item.nombre}</span>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <span className={cn(
                                                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                                        item.tipo === 'SERVICIO' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                                    )}>
                                                        {item.tipo}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <span className="text-sm font-black text-slate-900">$ {Number(item.valor).toLocaleString('es-CO')}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic text-xs uppercase tracking-widest">
                                                Sin actividad registrada en este periodo
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="pagos" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 gap-6">
                        {payrollHistory.length > 0 ? (
                            payrollHistory.map((payroll, idx) => (
                                <Card key={idx} className="border border-slate-200 rounded-2xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:border-[#FF7E5F]/30 transition-all">
                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                <CalendarIcon className="size-4 text-[#FF7E5F]" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Periodo de Pago</p>
                                                <h4 className="text-sm font-black text-slate-900 uppercase">
                                                    {format(new Date(payroll.NM_FECHA_INICIO), 'dd MMM', { locale: es })} - {format(new Date(payroll.NM_FECHA_FIN), 'dd MMM yyyy', { locale: es })}
                                                </h4>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-slate-400">
                                            <Download className="size-4" />
                                        </Button>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sueldo Base</span>
                                                <span className="text-sm font-bold text-slate-900">$ {Number(payroll.ND_BASE).toLocaleString('es-CO')}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Comisiones</span>
                                                <span className="text-sm font-bold text-emerald-600">$ {Number(payroll.ND_COMISIONES).toLocaleString('es-CO')}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Deducciones</span>
                                                <span className="text-sm font-bold text-red-500">
                                                    - $ {(Number(payroll.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0) + Number(payroll.ND_DEDUCCIONES_ADELANTOS || 0)).toLocaleString('es-CO')}
                                                </span>
                                            </div>
                                            <div className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Neto</span>
                                                <span className="text-lg font-black text-slate-900">$ {Number(payroll.ND_TOTAL_NETO).toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <Card className="border border-slate-200 border-dashed rounded-2xl p-20 text-center">
                                <History className="size-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold italic text-sm uppercase tracking-widest">
                                    No tienes volantes de pago confirmados aún
                                </p>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
