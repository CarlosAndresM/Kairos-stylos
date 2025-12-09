"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storage } from '@/lib/storage'
import type { Servicio, ComisionEspecial, User } from '@/types'
import { Plus, Edit, Trash2, Scissors, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ServiciosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [comisionesEspeciales, setComisionesEspeciales] = useState<ComisionEspecial[]>([])
  const [empleadas, setEmpleadas] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Servicio | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    precio_base: 0,
    comision_porcentaje_default: 40,
    activo: true,
  })
  const [comisionesForm, setComisionesForm] = useState<Array<{
    empleada_id: string | null
    porcentaje: number
    fecha_inicio: string
    fecha_fin: string
    activo: boolean
  }>>([])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = () => {
    setServicios(storage.getServicios())
    setComisionesEspeciales(storage.getComisionesEspeciales())
    setEmpleadas(storage.getUsers().filter(u => u.role === 'empleada' && u.activo))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      storage.updateServicio(editing.id, formData)
    } else {
      const nuevoServicio: Servicio = {
        id: `serv-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
      }
      storage.addServicio(nuevoServicio)
      
      // Agregar comisiones
      comisionesForm.forEach((comision) => {
        if (comision.porcentaje > 0) {
          const nuevaComision: ComisionEspecial = {
            id: `com-${Date.now()}-${Math.random()}`,
            servicio_id: nuevoServicio.id,
            user_id: comision.empleada_id || null, // null para comisión general
            porcentaje: comision.porcentaje,
            fecha_inicio: comision.fecha_inicio,
            fecha_fin: comision.fecha_fin || null,
            activo: comision.activo,
            createdAt: new Date().toISOString(),
          }
          storage.addComisionEspecial(nuevaComision)
        }
      })
    }
    loadData()
    setShowForm(false)
    setEditing(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      precio_base: 0,
      comision_porcentaje_default: 40,
      activo: true,
    })
    setComisionesForm([])
  }

  const handleEdit = (servicio: Servicio) => {
    setEditing(servicio)
    setFormData({
      nombre: servicio.nombre,
      precio_base: servicio.precio_base,
      comision_porcentaje_default: servicio.comision_porcentaje_default,
      activo: servicio.activo,
    })
    // Cargar comisiones de este servicio
    const comisiones = storage.getComisionesEspeciales().filter(c => c.servicio_id === servicio.id)
    setComisionesForm(
      comisiones.map(c => ({
        empleada_id: c.user_id || null,
        porcentaje: c.porcentaje,
        fecha_inicio: c.fecha_inicio,
        fecha_fin: c.fecha_fin || '',
        activo: c.activo,
      }))
    )
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
      const nuevas = servicios.filter(s => s.id !== id)
      storage.setServicios(nuevas)
      // Eliminar comisiones especiales relacionadas
      const comisiones = storage.getComisionesEspeciales().filter(c => c.servicio_id !== id)
      storage.setComisionesEspeciales(comisiones)
      loadData()
    }
  }

  const addComisionForm = () => {
    setComisionesForm([
      ...comisionesForm,
      {
        empleada_id: null,
        porcentaje: 0,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        activo: true,
      },
    ])
  }

  const removeComisionForm = (index: number) => {
    setComisionesForm(comisionesForm.filter((_, i) => i !== index))
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Servicios</h1>
          <p className="text-muted-foreground mt-1">Gestiona los servicios del salón</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditing(null)
            resetForm()
          }}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo Servicio
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {editing ? 'Editar Servicio' : 'Nuevo Servicio'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Precio Base</label>
                <input
                  type="number"
                  value={formData.precio_base}
                  onChange={(e) => setFormData({ ...formData, precio_base: Number(e.target.value) })}
                  required
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Comisión Porcentaje Default (%)
              </label>
              <input
                type="number"
                value={formData.comision_porcentaje_default}
                onChange={(e) => setFormData({ ...formData, comision_porcentaje_default: Number(e.target.value) })}
                required
                min="0"
                max="100"
                className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="activo" className="text-sm text-foreground">
                Servicio activo
              </label>
            </div>

            {/* Comisiones Especiales */}
            <div className="border-t border-primary/10 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Comisiones Especiales</h3>
                <button
                  type="button"
                  onClick={addComisionForm}
                  className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
                >
                  + Agregar Comisión Especial
                </button>
              </div>
              <div className="space-y-4">
                {comisionesForm.map((comision, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">Comisión {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeComisionForm(index)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Tipo de Comisión</label>
                        <select
                          value={comision.empleada_id || 'general'}
                          onChange={(e) => {
                            const nuevas = [...comisionesForm]
                            nuevas[index].empleada_id = e.target.value === 'general' ? null : e.target.value
                            setComisionesForm(nuevas)
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="general">General (para todas las empleadas)</option>
                          {empleadas.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              Especial: {emp.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Porcentaje (%)</label>
                        <input
                          type="number"
                          value={comision.porcentaje}
                          onChange={(e) => {
                            const nuevas = [...comisionesForm]
                            nuevas[index].porcentaje = Number(e.target.value)
                            setComisionesForm(nuevas)
                          }}
                          required
                          min="0"
                          max="100"
                          className="w-full px-3 py-2 rounded-lg border border-input bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Fecha Inicio</label>
                        <input
                          type="date"
                          value={comision.fecha_inicio}
                          onChange={(e) => {
                            const nuevas = [...comisionesForm]
                            nuevas[index].fecha_inicio = e.target.value
                            setComisionesForm(nuevas)
                          }}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-input bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Fecha Fin (opcional)</label>
                        <input
                          type="date"
                          value={comision.fecha_fin}
                          onChange={(e) => {
                            const nuevas = [...comisionesForm]
                            nuevas[index].fecha_fin = e.target.value
                            setComisionesForm(nuevas)
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`activo-${index}`}
                            checked={comision.activo}
                            onChange={(e) => {
                              const nuevas = [...comisionesForm]
                              nuevas[index].activo = e.target.checked
                              setComisionesForm(nuevas)
                            }}
                            className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                          />
                          <label htmlFor={`activo-${index}`} className="text-xs text-foreground">
                            Comisión activa
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all"
              >
                {editing ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditing(null)
                  resetForm()
                }}
                className="px-6 py-2 rounded-lg border border-input text-foreground hover:bg-muted transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Precio Base</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Comisión Default</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {servicios.map((servicio) => (
                <tr key={servicio.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Scissors size={20} className="text-primary" />
                      <span className="font-medium text-foreground">{servicio.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    ${servicio.precio_base.toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{servicio.comision_porcentaje_default}%</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        servicio.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {servicio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(servicio)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(servicio.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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

