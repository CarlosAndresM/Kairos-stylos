"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storage } from '@/lib/storage'
import { getCobrosPendientesPorEmpleada, calcularTotalPago, formatearMoneda, formatearFechaCorta } from '@/lib/calculations'
import { canPagarEmpleadas, getEmpleadasBySucursal, getSucursalIdForUser, filterBySucursal } from '@/lib/permissions'
import type { PagoEmpleada, Cobro, User } from '@/types'
import { Plus, CreditCard, CheckCircle, Clock, Upload, CheckSquare, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function PagosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [pagos, setPagos] = useState<PagoEmpleada[]>([])
  const [empleadas, setEmpleadas] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    empleada_id: '',
    fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    observaciones: '',
    evidencia_pago: null as string | null,
  })
  const [cobrosSeleccionados, setCobrosSeleccionados] = useState<string[]>([])
  const [cobrosDisponibles, setCobrosDisponibles] = useState<Cobro[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = () => {
    setPagos(
      filterBySucursal(storage.getPagosEmpleadas(), user).sort(
        (a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()
      )
    )
    const sucursalId = getSucursalIdForUser(user)
    setEmpleadas(getEmpleadasBySucursal(sucursalId))
  }

  const handleEmpleadaChange = (empleadaId: string) => {
    setFormData({ ...formData, empleada_id: empleadaId })
    if (empleadaId) {
      const cobros = getCobrosPendientesPorEmpleada(
        empleadaId,
        formData.fecha_inicio,
        formData.fecha_fin
      )
      setCobrosDisponibles(cobros)
      setCobrosSeleccionados([])
    } else {
      setCobrosDisponibles([])
      setCobrosSeleccionados([])
    }
  }

  const handleFechaChange = () => {
    if (formData.empleada_id) {
      const cobros = getCobrosPendientesPorEmpleada(
        formData.empleada_id,
        formData.fecha_inicio,
        formData.fecha_fin
      )
      setCobrosDisponibles(cobros)
      setCobrosSeleccionados([])
    }
  }

  const toggleCobro = (cobroId: string) => {
    if (cobrosSeleccionados.includes(cobroId)) {
      setCobrosSeleccionados(cobrosSeleccionados.filter(id => id !== cobroId))
    } else {
      setCobrosSeleccionados([...cobrosSeleccionados, cobroId])
    }
  }

  const seleccionarTodos = () => {
    if (cobrosSeleccionados.length === cobrosDisponibles.length) {
      setCobrosSeleccionados([])
    } else {
      setCobrosSeleccionados(cobrosDisponibles.map(c => c.id))
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setFormData({ ...formData, evidencia_pago: base64 })
        setPreviewImage(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || cobrosSeleccionados.length === 0) return

    const cobrosSeleccionadosData = cobrosDisponibles.filter(c => cobrosSeleccionados.includes(c.id))
    const montoTotal = calcularTotalPago(cobrosSeleccionadosData)

    const nuevoPago: PagoEmpleada = {
      id: `pago-${Date.now()}`,
      sucursal_id: user.sucursal_id || '',
      empleada_id: formData.empleada_id,
      fecha_pago: new Date().toISOString().split('T')[0],
      monto: montoTotal,
      evidencia_pago: formData.evidencia_pago,
      estado: 'pendiente',
      confirmado_por_empleada_at: null,
      observaciones: formData.observaciones || null,
      cobros_ids: cobrosSeleccionados,
      creado_por: user.id,
      createdAt: new Date().toISOString(),
    }

    storage.addPagoEmpleada(nuevoPago)

    // Marcar cobros como pagados
    cobrosSeleccionados.forEach(cobroId => {
      storage.updateCobro(cobroId, {
        pagado: true,
        pago_id: nuevoPago.id,
      })
    })

    loadData()
    setShowForm(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      empleada_id: '',
      fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      fecha_fin: new Date().toISOString().split('T')[0],
      observaciones: '',
      evidencia_pago: null,
    })
    setCobrosSeleccionados([])
    setCobrosDisponibles([])
    setPreviewImage(null)
  }

  const getEmpleadaNombre = (empleadaId: string) => {
    return empleadas.find(e => e.id === empleadaId)?.nombre || 'N/A'
  }

  if (!user) return null

  const totalSeleccionado = calcularTotalPago(
    cobrosDisponibles.filter(c => cobrosSeleccionados.includes(c.id))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pagos a Empleadas</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestiona los pagos de nómina</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            resetForm()
          }}
          className="w-full md:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Pagar Nómina
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Pagar Nómina</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Empleada</label>
                <select
                  value={formData.empleada_id}
                  onChange={(e) => handleEmpleadaChange(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccionar empleada</option>
                  {empleadas.map((empleada) => (
                    <option key={empleada.id} value={empleada.id}>
                      {empleada.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => {
                    setFormData({ ...formData, fecha_inicio: e.target.value })
                    setTimeout(handleFechaChange, 0)
                  }}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fecha Fin</label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => {
                    setFormData({ ...formData, fecha_fin: e.target.value })
                    setTimeout(handleFechaChange, 0)
                  }}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {cobrosDisponibles.length > 0 && (
              <div className="border-t border-primary/10 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Cobros Pendientes ({cobrosDisponibles.length})
                  </h3>
                  <button
                    type="button"
                    onClick={seleccionarTodos}
                    className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm flex items-center gap-2"
                  >
                    {cobrosSeleccionados.length === cobrosDisponibles.length ? (
                      <>
                        <Square size={16} />
                        Deseleccionar Todos
                      </>
                    ) : (
                      <>
                        <CheckSquare size={16} />
                        Seleccionar Todos
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
                  {cobrosDisponibles.map((cobro) => {
                    const servicio = storage.getServicios().find(s => s.id === cobro.servicio_id)
                    const selected = cobrosSeleccionados.includes(cobro.id)
                    return (
                      <div
                        key={cobro.id}
                        onClick={() => toggleCobro(cobro.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-input hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {selected ? (
                              <CheckSquare className="text-primary" size={20} />
                            ) : (
                              <Square className="text-muted-foreground" size={20} />
                            )}
                            <div>
                              <p className="font-medium text-foreground">
                                {servicio?.nombre || 'N/A'} - {formatearFechaCorta(cobro.fecha)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Monto: {formatearMoneda(cobro.monto_cobrado)} | Comisión: {formatearMoneda(cobro.comision_calculada)}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-primary">
                            {formatearMoneda(cobro.comision_calculada)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {cobrosSeleccionados.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Total seleccionado ({cobrosSeleccionados.length} cobros):
                    </p>
                    <p className="text-2xl font-bold text-primary">{formatearMoneda(totalSeleccionado)}</p>
                  </div>
                )}
              </div>
            )}

            {cobrosDisponibles.length === 0 && formData.empleada_id && (
              <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                No hay cobros pendientes en el rango de fechas seleccionado
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Observaciones</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Notas adicionales sobre el pago..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Evidencia de Pago (foto/PDF)
              </label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {previewImage && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-primary/20">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={cobrosSeleccionados.length === 0}
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registrar Pago
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="flex-1 px-6 py-3 rounded-lg border border-input text-foreground hover:bg-muted transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista móvil - Cards */}
      <div className="md:hidden space-y-4">
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
              <h3 className="font-semibold text-foreground">{getEmpleadaNombre(pago.empleada_id)}</h3>
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
            </div>
          </div>
        ))}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden md:block bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Empleada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cobros</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {pagos.map((pago) => (
                <tr key={pago.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {formatearFechaCorta(pago.fecha_pago)}
                  </td>
                  <td className="px-6 py-4 text-foreground">{getEmpleadaNombre(pago.empleada_id)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

