import type { User } from '@/types'
import { storage } from './storage'

export function canAccessSucursales(user: User | null): boolean {
  if (!user) return false
  return user.role === 'super_admin'
}

export function canManageUsers(user: User | null): boolean {
  if (!user) return false
  return user.role === 'super_admin' || user.role === 'admin_sucursal'
}

export function canPagarEmpleadas(user: User | null): boolean {
  if (!user) return false
  if (user.role === 'super_admin' || user.role === 'admin_sucursal') return true
  if (user.role === 'cajera' && user.puede_pagar_empleadas) return true
  return false
}

export function canRegistrarCobros(user: User | null): boolean {
  if (!user) return false
  return ['super_admin', 'admin_sucursal', 'cajera'].includes(user.role)
}

export function getSucursalIdForUser(user: User | null): string | null {
  if (!user) return null
  if (user.role === 'super_admin') return null // Puede ver todas
  return user.sucursal_id
}

export function filterBySucursal<T extends { sucursal_id: string }>(
  items: T[],
  user: User | null
): T[] {
  if (!user) return []
  if (user.role === 'super_admin') return items
  return items.filter(item => item.sucursal_id === user.sucursal_id)
}

export function filterByUser<T extends { empleada_id?: string; user_id?: string }>(
  items: T[],
  user: User | null
): T[] {
  if (!user) return []
  if (user.role === 'empleada') {
    return items.filter(item => 
      item.empleada_id === user.id || item.user_id === user.id
    )
  }
  return items
}

export function getUsersBySucursal(sucursalId: string | null): User[] {
  const users = storage.getUsers()
  if (!sucursalId) return users.filter(u => u.role === 'super_admin')
  return users.filter(u => u.sucursal_id === sucursalId || u.role === 'super_admin')
}

export function getEmpleadasBySucursal(sucursalId: string | null): User[] {
  const users = storage.getUsers()
  if (!sucursalId) return []
  return users.filter(u => u.sucursal_id === sucursalId && u.role === 'empleada' && u.activo)
}

