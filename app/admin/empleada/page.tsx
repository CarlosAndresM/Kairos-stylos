"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storage } from '@/lib/storage'
import { filterByUser } from '@/lib/permissions'
import { formatearMoneda, formatearFechaCorta } from '@/lib/calculations'
import type { Cobro, PagoEmpleada, Servicio } from '@/types'
import { DollarSign, CreditCard, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function EmpleadaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | '6dias' | '10dias' | 'personalizado'>('hoy')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [pagos, setPagos] = useState<PagoEmpleada[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [stats, setStats] = useState({
    totalCobros: 0,
    totalComisiones: 0,
    totalPagado: 0,
    pendiente: 0,
  })
  const [datosMensuales, setDatosMensuales] = useState<Array<{ mes: string; comisiones: number }>>([])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, filtroFecha, fechaInicio, fechaFin])

  const loadData = () => {
    if (!user) return

    const todosCobros = storage.getCobros()
    const todosPagos = storage.getPagosEmpleadas()
    let cobrosFiltrados = filterByUser(todosCobros, user)
    let pagosFiltrados = filterByUser(todosPagos, user)

    // Filtrar por fecha
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

    cobrosFiltrados = cobrosFiltrados.filter(c => {
      const fechaCobro = new Date(c.fecha)
      return fechaCobro >= inicio && fechaCobro <= fin
    })
    pagosFiltrados = pagosFiltrados.filter(p => {
      const fechaPago = new Date(p.fecha_pago)
      return fechaPago >= inicio && fechaPago <= fin
    })

    setCobros(cobrosFiltrados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()))
    setPagos(pagosFiltrados.sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()))
    setServicios(storage.getServicios())

    // Calcular estadísticas
    const totalComisiones = cobrosFiltrados.reduce((sum, c) => sum + c.comision_calculada, 0)
    const totalPagado = pagosFiltrados
      .filter(p => p.estado === 'confirmado')
      .reduce((sum, p) => sum + p.monto, 0)
    const pendiente = totalComisiones - totalPagado

    setStats({
      totalCobros: cobrosFiltrados.length,
      totalComisiones,
      totalPagado,
      pendiente,
    })

    // Datos mensuales (últimos 6 meses)
    const mesesMap = new Map<string, number>()
    const hoy = new Date()
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const mesKey = fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })
      mesesMap.set(mesKey, 0)
    }

    cobrosFiltrados.forEach(cobro => {
      const fecha = new Date(cobro.fecha)
      const mesKey = fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })
      const actual = mesesMap.get(mesKey) || 0
      mesesMap.set(mesKey, actual + cobro.comision_calculada)
    })

    setDatosMensuales(
      Array.from(mesesMap.entries()).map(([mes, comisiones]) => ({ mes, comisiones }))
    )
  }

  const handleConfirmarPago = (pagoId: string) => {
    if (confirm('¿Confirmas que recibiste este pago?')) {
      storage.updatePagoEmpleada(pagoId, {
        estado: 'confirmado',
        confirmado_por_empleada_at: new Date().toISOString(),
      })
      loadData()
    }
  }

  const getServicioNombre = (servicioId: string) => {
    return servicios.find(s => s.id === servicioId)?.nombre || 'N/A'
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mi Panel</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Resumen de mis servicios y pagos</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
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

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <DollarSign className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Total Cobros</h3>
          <p className="text-2xl font-bold text-foreground">{stats.totalCobros}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
              <TrendingUp className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Total Comisiones</h3>
          <p className="text-2xl font-bold text-primary">{formatearMoneda(stats.totalComisiones)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <CheckCircle className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Total Pagado</h3>
          <p className="text-2xl font-bold text-green-600">{formatearMoneda(stats.totalPagado)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Clock className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-sm text-muted-foreground mb-1">Pendiente</h3>
          <p className="text-2xl font-bold text-yellow-600">{formatearMoneda(stats.pendiente)}</p>
        </div>
      </div>

      {/* Gráfico mensual */}
      <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Comisiones por Mes (Últimos 6 meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datosMensuales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatearMoneda(value)} />
            <Bar dataKey="comisiones" fill="oklch(0.75 0.13 29)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mis Cobros - Vista móvil */}
      <div className="md:hidden space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Mis Cobros</h2>
        {cobros.map((cobro) => (
          <div key={cobro.id} className="bg-white rounded-xl p-4 border border-primary/10 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{formatearFechaCorta(cobro.fecha)}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    cobro.pagado
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {cobro.pagado ? 'Pagado' : 'Pendiente'}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">{getServicioNombre(cobro.servicio_id)}</h3>
              <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="font-medium text-foreground">{formatearMoneda(cobro.monto_cobrado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comisión ({cobro.comision_porcentaje_aplicado}%)</p>
                  <p className="font-medium text-accent">{formatearMoneda(cobro.comision_calculada)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mis Cobros - Vista desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-primary/10">
          <h2 className="text-xl font-semibold text-foreground">Mis Cobros</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Servicio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Comisión</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {cobros.map((cobro) => (
                <tr key={cobro.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {formatearFechaCorta(cobro.fecha)}
                  </td>
                  <td className="px-6 py-4 text-foreground">{getServicioNombre(cobro.servicio_id)}</td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {formatearMoneda(cobro.monto_cobrado)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-accent">{formatearMoneda(cobro.comision_calculada)}</p>
                      <p className="text-xs text-muted-foreground">{cobro.comision_porcentaje_aplicado}%</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        cobro.pagado
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {cobro.pagado ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mis Pagos - Vista móvil */}
      <div className="md:hidden space-y-4 mt-6">
        <h2 className="text-xl font-semibold text-foreground">Mis Pagos</h2>
        {pagos.map((pago) => (
          <div key={pago.id} className="bg-white rounded-xl p-4 border border-primary/10 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{formatearFechaCorta(pago.fecha_pago)}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    pago.estado === 'confirmado'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {pago.estado === 'confirmado' ? (
                    <CheckCircle size={12} />
                  ) : (
                    <Clock size={12} />
                  )}
                  {pago.estado === 'confirmado' ? 'Confirmado' : 'Pendiente'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="font-bold text-primary text-lg">{formatearMoneda(pago.monto)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cobros</p>
                  <p className="font-medium text-foreground">{pago.cobros_ids.length} cobros</p>
                </div>
              </div>
              {pago.estado === 'pendiente' && (
                <button
                  onClick={() => handleConfirmarPago(pago.id)}
                  className="w-full mt-3 px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Confirmar Recibido
                </button>
              )}
              {pago.estado === 'confirmado' && pago.confirmado_por_empleada_at && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Confirmado el {formatearFechaCorta(pago.confirmado_por_empleada_at)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mis Pagos - Vista desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-primary/10">
          <h2 className="text-xl font-semibold text-foreground">Mis Pagos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cobros</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {pagos.map((pago) => (
                <tr key={pago.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {formatearFechaCorta(pago.fecha_pago)}
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">{formatearMoneda(pago.monto)}</td>
                  <td className="px-6 py-4 text-muted-foreground">{pago.cobros_ids.length} cobros</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                        pago.estado === 'confirmado'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {pago.estado === 'confirmado' ? (
                        <CheckCircle size={14} />
                      ) : (
                        <Clock size={14} />
                      )}
                      {pago.estado === 'confirmado' ? 'Confirmado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {pago.estado === 'pendiente' && (
                      <button
                        onClick={() => handleConfirmarPago(pago.id)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all text-sm flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Confirmar Recibido
                      </button>
                    )}
                    {pago.estado === 'confirmado' && pago.confirmado_por_empleada_at && (
                      <span className="text-xs text-muted-foreground">
                        Confirmado el {formatearFechaCorta(pago.confirmado_por_empleada_at)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

