"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storage } from '@/lib/storage'
import { calcularComision } from '@/lib/calculations'
import { filterBySucursal, getSucursalIdForUser, getEmpleadasBySucursal } from '@/lib/permissions'
import { canRegistrarCobros } from '@/lib/permissions'
import { formatearMoneda, formatearFechaCorta } from '@/lib/calculations'
import type { Cobro, Servicio, User } from '@/types'
import { Plus, DollarSign, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function CobrosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [empleadas, setEmpleadas] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    servicio_id: '',
    empleada_id: '',
    monto_cobrado: 0,
    forma_pago: 'efectivo' as 'efectivo' | 'transferencia',
    foto_comprobante: null as string | null,
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = () => {
    if (!user) return
    
    // Para super_admin, mostrar todas las empleadas de todas las sucursales
    if (user.role === 'super_admin') {
      setEmpleadas(storage.getUsers().filter(u => u.role === 'empleada' && u.activo))
    } else {
      const sucursalId = getSucursalIdForUser(user)
      setEmpleadas(getEmpleadasBySucursal(sucursalId))
    }
    
    setCobros(filterBySucursal(storage.getCobros(), user).sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    ))
    setServicios(storage.getServicios().filter(s => s.activo))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setFormData({ ...formData, foto_comprobante: base64 })
        setPreviewImage(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const servicio = servicios.find(s => s.id === formData.servicio_id)
    if (!servicio) return

    const comision = calcularComision(
      formData.servicio_id,
      formData.empleada_id,
      formData.monto_cobrado,
      formData.fecha
    )

    // Para super_admin, necesita seleccionar sucursal
    let sucursalId = user.sucursal_id || ''
    if (user.role === 'super_admin' && !sucursalId) {
      // Si es super_admin sin sucursal, usar la sucursal de la empleada
      const empleada = empleadas.find(e => e.id === formData.empleada_id)
      if (empleada && empleada.sucursal_id) {
        sucursalId = empleada.sucursal_id
      } else {
        alert('Por favor selecciona una empleada de una sucursal')
        return
      }
    }

    const nuevoCobro: Cobro = {
      id: `cobro-${Date.now()}`,
      sucursal_id: sucursalId,
      fecha: formData.fecha,
      servicio_id: formData.servicio_id,
      empleada_id: formData.empleada_id,
      monto_cobrado: formData.monto_cobrado,
      forma_pago: formData.forma_pago,
      foto_comprobante: formData.forma_pago === 'transferencia' ? formData.foto_comprobante : null,
      registrado_por: user.id,
      comision_calculada: comision.monto,
      comision_porcentaje_aplicado: comision.porcentaje,
      pagado: false,
      pago_id: null,
      createdAt: new Date().toISOString(),
    }

    storage.addCobro(nuevoCobro)
    loadData()
    setShowForm(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      servicio_id: '',
      empleada_id: '',
      monto_cobrado: 0,
      forma_pago: 'efectivo',
      foto_comprobante: null,
    })
    setPreviewImage(null)
  }

  const getServicioNombre = (servicioId: string) => {
    return servicios.find(s => s.id === servicioId)?.nombre || 'N/A'
  }

  const getEmpleadaNombre = (empleadaId: string) => {
    return empleadas.find(e => e.id === empleadaId)?.nombre || 'N/A'
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cobros</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Registra los cobros realizados</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            resetForm()
          }}
          className="w-full md:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Nuevo Cobro
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Registrar Nuevo Cobro</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Servicio</label>
                <select
                  value={formData.servicio_id}
                  onChange={(e) => {
                    const servicio = servicios.find(s => s.id === e.target.value)
                    setFormData({
                      ...formData,
                      servicio_id: e.target.value,
                      monto_cobrado: servicio?.precio_base || 0,
                    })
                  }}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccionar servicio</option>
                  {servicios.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      {servicio.nombre} - ${servicio.precio_base.toLocaleString('es-CO')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Empleada</label>
                <select
                  value={formData.empleada_id}
                  onChange={(e) => setFormData({ ...formData, empleada_id: e.target.value })}
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
                <label className="block text-sm font-medium text-foreground mb-2">Monto Cobrado</label>
                <input
                  type="number"
                  value={formData.monto_cobrado}
                  onChange={(e) => setFormData({ ...formData, monto_cobrado: Number(e.target.value) })}
                  required
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Forma de Pago</label>
              <select
                value={formData.forma_pago}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    forma_pago: e.target.value as 'efectivo' | 'transferencia',
                    foto_comprobante: e.target.value === 'efectivo' ? null : formData.foto_comprobante,
                  })
                  if (e.target.value === 'efectivo') {
                    setPreviewImage(null)
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            {formData.forma_pago === 'transferencia' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Foto del Comprobante (obligatorio)
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    required={formData.forma_pago === 'transferencia'}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {previewImage && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-primary/20">
                      <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
            )}
            {formData.servicio_id && formData.empleada_id && formData.monto_cobrado > 0 && (() => {
              const comision = calcularComision(
                formData.servicio_id,
                formData.empleada_id,
                formData.monto_cobrado,
                formData.fecha
              )
              return (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Comisión calculada ({comision.porcentaje}%):{' '}
                    <span className="font-bold text-primary">
                      {formatearMoneda(comision.monto)}
                    </span>
                  </p>
                </div>
              )
            })()}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all"
              >
                Registrar Cobro
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
              <p className="text-sm text-muted-foreground">Empleada: {getEmpleadaNombre(cobro.empleada_id)}</p>
              <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="font-medium text-foreground">{formatearMoneda(cobro.monto_cobrado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comisión ({cobro.comision_porcentaje_aplicado}%)</p>
                  <p className="font-medium text-accent">{formatearMoneda(cobro.comision_calculada)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                    {cobro.forma_pago}
                  </span>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Servicio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Empleada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Forma Pago</th>
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
                  <td className="px-6 py-4 text-foreground">{getEmpleadaNombre(cobro.empleada_id)}</td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {formatearMoneda(cobro.monto_cobrado)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                      {cobro.forma_pago}
                    </span>
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
    </div>
  )
}

