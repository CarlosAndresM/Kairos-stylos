"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storage } from '@/lib/storage'
import { hashPassword } from '@/lib/auth'
import { canManageUsers, getUsersBySucursal, getSucursalIdForUser } from '@/lib/permissions'
import type { User } from '@/types'
import { Plus, Edit, Trash2, Users as UsersIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UsuariosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [sucursales, setSucursales] = useState(storage.getSucursales())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    sucursal_id: '',
    role: 'empleada' as User['role'],
    puede_pagar_empleadas: false,
    activo: true,
  })

  useEffect(() => {
    if (user) {
      loadUsuarios()
    }
  }, [user])

  const loadUsuarios = () => {
    const sucursalId = getSucursalIdForUser(user)
    setUsuarios(getUsersBySucursal(sucursalId))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      const updates: Partial<User> = {
        nombre: formData.nombre,
        email: formData.email,
        sucursal_id: formData.sucursal_id || null,
        role: formData.role,
        puede_pagar_empleadas: formData.role === 'cajera' ? formData.puede_pagar_empleadas : false,
        activo: formData.activo,
      }
      if (formData.password) {
        updates.password = hashPassword(formData.password)
      }
      storage.updateUser(editing.id, updates)
    } else {
      const nuevoUsuario: User = {
        id: `user-${Date.now()}`,
        nombre: formData.nombre,
        email: formData.email,
        password: hashPassword(formData.password),
        sucursal_id: formData.sucursal_id || null,
        role: formData.role,
        puede_pagar_empleadas: formData.role === 'cajera' ? formData.puede_pagar_empleadas : false,
        activo: formData.activo,
        createdAt: new Date().toISOString(),
      }
      storage.addUser(nuevoUsuario)
    }
    loadUsuarios()
    setShowForm(false)
    setEditing(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      password: '',
      sucursal_id: '',
      role: 'empleada',
      puede_pagar_empleadas: false,
      activo: true,
    })
  }

  const handleEdit = (usuario: User) => {
    setEditing(usuario)
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      sucursal_id: usuario.sucursal_id || '',
      role: usuario.role,
      puede_pagar_empleadas: usuario.puede_pagar_empleadas,
      activo: usuario.activo,
    })
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      storage.deleteUser(id)
      loadUsuarios()
    }
  }

  const getRoleLabel = (role: User['role']) => {
    const labels: Record<User['role'], string> = {
      super_admin: 'Super Admin',
      admin_sucursal: 'Admin Sucursal',
      cajera: 'Cajera',
      empleada: 'Empleada',
    }
    return labels[role]
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Gestiona los usuarios del sistema</p>
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
          Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-primary/10 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {editing ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {editing ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editing}
                className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Sucursal</label>
                <select
                  value={formData.sucursal_id}
                  onChange={(e) => setFormData({ ...formData, sucursal_id: e.target.value })}
                  required={formData.role !== 'super_admin'}
                  disabled={formData.role === 'super_admin'}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                >
                  <option value="">Seleccionar sucursal</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as User['role']
                    setFormData({
                      ...formData,
                      role: newRole,
                      puede_pagar_empleadas: newRole === 'cajera' ? formData.puede_pagar_empleadas : false,
                      sucursal_id: newRole === 'super_admin' ? '' : formData.sucursal_id,
                    })
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin_sucursal">Admin Sucursal</option>
                  <option value="cajera">Cajera</option>
                  <option value="empleada">Empleada</option>
                </select>
              </div>
            </div>
            {formData.role === 'cajera' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="puede_pagar"
                  checked={formData.puede_pagar_empleadas}
                  onChange={(e) => setFormData({ ...formData, puede_pagar_empleadas: e.target.checked })}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="puede_pagar" className="text-sm text-foreground">
                  Permitir pagar a empleadas
                </label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="activo" className="text-sm text-foreground">
                Usuario activo
              </label>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sucursal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <UsersIcon size={20} className="text-primary" />
                      <span className="font-medium text-foreground">{usuario.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{usuario.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {getRoleLabel(usuario.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {usuario.sucursal_id
                      ? sucursales.find((s) => s.id === usuario.sucursal_id)?.nombre || 'N/A'
                      : 'Todas'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        usuario.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(usuario)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(usuario.id)}
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

