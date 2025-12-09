"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storage } from '@/lib/storage'
import { canAccessSucursales } from '@/lib/permissions'
import type { Sucursal } from '@/types'
import { Plus, Edit, Trash2, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SucursalesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Sucursal | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    estado: 'activa' as 'activa' | 'inactiva',
  })

  useEffect(() => {
    if (user) {
      loadSucursales()
    }
  }, [user])

  const loadSucursales = () => {
    setSucursales(storage.getSucursales())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      storage.updateSucursal(editing.id, formData)
    } else {
      const nuevaSucursal: Sucursal = {
        id: `suc-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
      }
      storage.addSucursal(nuevaSucursal)
    }
    loadSucursales()
    setShowForm(false)
    setEditing(null)
    setFormData({ nombre: '', direccion: '', telefono: '', estado: 'activa' })
  }

  const handleEdit = (sucursal: Sucursal) => {
    setEditing(sucursal)
    setFormData({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      telefono: sucursal.telefono,
      estado: sucursal.estado,
    })
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta sucursal?')) {
      const nuevas = sucursales.filter(s => s.id !== id)
      storage.setSucursales(nuevas)
      loadSucursales()
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sucursales</h1>
          <p className="text-muted-foreground mt-1">Gestiona las sucursales del salón</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditing(null)
            setFormData({ nombre: '', direccion: '', telefono: '', estado: 'activa' })
          }}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Sucursal
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {editing ? 'Editar Sucursal' : 'Nueva Sucursal'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-foreground mb-2">Dirección</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'activa' | 'inactiva' })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Dirección</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {sucursales.map((sucursal) => (
                <tr key={sucursal.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Building2 size={20} className="text-primary" />
                      <span className="font-medium text-foreground">{sucursal.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{sucursal.direccion}</td>
                  <td className="px-6 py-4 text-muted-foreground">{sucursal.telefono}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        sucursal.estado === 'activa'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {sucursal.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(sucursal)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(sucursal.id)}
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

