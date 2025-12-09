"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storage } from '@/lib/storage'
import { filterBySucursal, getSucursalIdForUser } from '@/lib/permissions'
import { formatearMoneda, formatearFechaCorta } from '@/lib/calculations'
import type { Cobro, PagoEmpleada, Servicio, User, Sucursal } from '@/types'
import {
  DollarSign,
  TrendingUp,
  Users,
  Scissors,
  ArrowUp,
  ArrowDown,
  Calendar,
  Filter,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function DashboardPage() {
  const { user } = useAuth()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [filtroSucursal, setFiltroSucursal] = useState<string>('')
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | '6dias' | '10dias' | 'personalizado'>('hoy')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  
  const [stats, setStats] = useState({
    ingresos: 0,
    egresos: 0,
    saldo: 0,
    totalCobros: 0,
    totalPagos: 0,
  })
  const [topServicios, setTopServicios] = useState<Array<{ nombre: string; cantidad: number; total: number }>>([])
  const [topEmpleadas, setTopEmpleadas] = useState<Array<{ nombre: string; total: number }>>([])
  const [datosDiarios, setDatosDiarios] = useState<Array<{ fecha: string; ingresos: number }>>([])
  const [datosFormaPago, setDatosFormaPago] = useState<Array<{ name: string; value: number }>>([])

  useEffect(() => {
    if (!user) return
    if (user.role === 'super_admin') {
      setSucursales(storage.getSucursales())
    }
    calcularDatos()
  }, [user, filtroSucursal, filtroFecha, fechaInicio, fechaFin])

  const calcularDatos = () => {
    if (!user) return

    let cobros = storage.getCobros()
    let pagos = storage.getPagosEmpleadas()

    // Filtrar por sucursal si aplica
    if (user.role === 'super_admin' && filtroSucursal) {
      cobros = cobros.filter(c => c.sucursal_id === filtroSucursal)
      pagos = pagos.filter(p => p.sucursal_id === filtroSucursal)
    } else if (user.role !== 'super_admin') {
      cobros = filterBySucursal(cobros, user)
      pagos = filterBySucursal(pagos, user)
    }

    const servicios = storage.getServicios()
    const usuarios = storage.getUsers()

    // Calcular rango de fechas
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    let inicio: Date
    let fin: Date = new Date(hoy)
    fin.setHours(23, 59, 59, 999)

    switch (filtroFecha) {
      case 'hoy':
        inicio = new Date(hoy)
        break
      case '6dias':
        inicio = new Date(hoy)
        inicio.setDate(inicio.getDate() - 6)
        break
      case '10dias':
        inicio = new Date(hoy)
        inicio.setDate(inicio.getDate() - 10)
        break
      case 'personalizado':
        if (fechaInicio && fechaFin) {
          inicio = new Date(fechaInicio)
          fin = new Date(fechaFin)
          fin.setHours(23, 59, 59, 999)
        } else {
          inicio = new Date(hoy)
        }
        break
      default:
        inicio = new Date(hoy)
    }

    const cobrosFiltrados = cobros.filter(
      c => {
        const fechaCobro = new Date(c.fecha)
        return fechaCobro >= inicio && fechaCobro <= fin
      }
    )
    const pagosFiltrados = pagos.filter(
      p => {
        const fechaPago = new Date(p.fecha_pago)
        return fechaPago >= inicio && fechaPago <= fin
      }
    )

    // Calcular estadísticas
    const ingresos = cobrosFiltrados.reduce((sum, c) => sum + c.monto_cobrado, 0)
    const egresos = pagosFiltrados.reduce((sum, p) => sum + p.monto, 0)
    const saldo = ingresos - egresos

    setStats({
      ingresos,
      egresos,
      saldo,
      totalCobros: cobrosFiltrados.length,
      totalPagos: pagosFiltrados.length,
    })

    // Top servicios
    const serviciosMap = new Map<string, { nombre: string; cantidad: number; total: number }>()
    cobrosFiltrados.forEach(cobro => {
      const servicio = servicios.find(s => s.id === cobro.servicio_id)
      if (servicio) {
        const existente = serviciosMap.get(servicio.id) || { nombre: servicio.nombre, cantidad: 0, total: 0 }
        existente.cantidad += 1
        existente.total += cobro.monto_cobrado
        serviciosMap.set(servicio.id, existente)
      }
    })
    setTopServicios(Array.from(serviciosMap.values()).sort((a, b) => b.total - a.total).slice(0, 5))

    // Top empleadas
    const empleadasMap = new Map<string, { nombre: string; total: number }>()
    cobrosFiltrados.forEach(cobro => {
      const empleada = usuarios.find(u => u.id === cobro.empleada_id)
      if (empleada) {
        const existente = empleadasMap.get(empleada.id) || { nombre: empleada.nombre, total: 0 }
        existente.total += cobro.comision_calculada
        empleadasMap.set(empleada.id, existente)
      }
    })
    setTopEmpleadas(Array.from(empleadasMap.values()).sort((a, b) => b.total - a.total).slice(0, 5))

    // Datos diarios
    const datosDiariosMap = new Map<string, number>()
    const dias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    for (let i = 0; i <= dias; i++) {
      const fecha = new Date(inicio)
      fecha.setDate(fecha.getDate() + i)
      const fechaStr = formatearFechaCorta(fecha.toISOString())
      datosDiariosMap.set(fechaStr, 0)
    }
    cobrosFiltrados.forEach(cobro => {
      const fechaStr = formatearFechaCorta(cobro.fecha)
      const existente = datosDiariosMap.get(fechaStr) || 0
      datosDiariosMap.set(fechaStr, existente + cobro.monto_cobrado)
    })
    setDatosDiarios(
      Array.from(datosDiariosMap.entries()).map(([fecha, ingresos]) => ({ fecha, ingresos }))
    )

    // Datos por forma de pago
    const efectivo = cobrosFiltrados.filter(c => c.forma_pago === 'efectivo').reduce((sum, c) => sum + c.monto_cobrado, 0)
    const transferencia = cobrosFiltrados.filter(c => c.forma_pago === 'transferencia').reduce((sum, c) => sum + c.monto_cobrado, 0)
    setDatosFormaPago([
      { name: 'Efectivo', value: efectivo },
      { name: 'Transferencia', value: transferencia },
    ])
  }

  const COLORS = ['oklch(0.75 0.13 29)', 'oklch(0.65 0.18 55)']

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {user.role === 'super_admin' ? 'Vista general de todas las sucursales' : 'Resumen de tu sucursal'}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          {user.role === 'super_admin' && (
            <select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              className="px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          )}
          
          <select
            value={filtroFecha}
            onChange={(e) => {
              setFiltroFecha(e.target.value as 'hoy' | '6dias' | '10dias' | 'personalizado')
              if (e.target.value !== 'personalizado') {
                setFechaInicio('')
                setFechaFin('')
              }
            }}
            className="px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="hoy">Hoy</option>
            <option value="6dias">Últimos 6 días</option>
            <option value="10dias">Últimos 10 días</option>
            <option value="personalizado">Personalizado</option>
          </select>

          {filtroFecha === 'personalizado' && (
            <>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Desde"
              />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Hasta"
              />
            </>
          )}
        </div>
      </div>

      {/* Widgets principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <DollarSign className="text-white" size={24} />
            </div>
            <ArrowUp className="text-green-500" size={20} />
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Ingresos</h3>
          <p className="text-2xl font-bold text-foreground">{formatearMoneda(stats.ingresos)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
              <TrendingUp className="text-white" size={24} />
            </div>
            <ArrowDown className="text-red-500" size={20} />
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Egresos</h3>
          <p className="text-2xl font-bold text-foreground">{formatearMoneda(stats.egresos)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
              <DollarSign className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Saldo</h3>
          <p className={`text-2xl font-bold ${stats.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatearMoneda(stats.saldo)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
              <Scissors className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Total Cobros</h3>
          <p className="text-2xl font-bold text-foreground">{stats.totalCobros}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Gráfico diario */}
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Ingresos por Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosDiarios}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatearMoneda(value)} />
              <Bar dataKey="ingresos" fill="oklch(0.75 0.13 29)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico por forma de pago */}
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Ingresos por Forma de Pago</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={datosFormaPago}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {datosFormaPago.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatearMoneda(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top servicios y empleadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top Servicios */}
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Servicios</h3>
          <div className="space-y-3">
            {topServicios.length > 0 ? (
              topServicios.map((servicio, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{servicio.nombre}</p>
                    <p className="text-sm text-muted-foreground">{servicio.cantidad} servicios</p>
                  </div>
                  <p className="font-bold text-primary">{formatearMoneda(servicio.total)}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
            )}
          </div>
        </div>

        {/* Top Empleadas */}
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Empleadas</h3>
          <div className="space-y-3">
            {topEmpleadas.length > 0 ? (
              topEmpleadas.map((empleada, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{empleada.nombre}</p>
                    <p className="text-sm text-muted-foreground">Comisiones</p>
                  </div>
                  <p className="font-bold text-accent">{formatearMoneda(empleada.total)}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
