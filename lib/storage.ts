import type { Sucursal, User, Servicio, ComisionEspecial, Cobro, PagoEmpleada } from '@/types'

const STORAGE_KEYS = {
  USERS: 'kyroy_users',
  SUCURSALES: 'kyroy_sucursales',
  SERVICIOS: 'kyroy_servicios',
  COMISIONES_ESPECIALES: 'kyroy_comisiones_especiales',
  COBROS: 'kyroy_cobros',
  PAGOS_EMPLEADAS: 'kyroy_pagos_empleadas',
  SESSION: 'kyroy_session',
} as const

// Funciones genéricas para localStorage
export function getStorageItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Error guardando en localStorage:', error)
  }
}

export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

// Funciones específicas para cada entidad
export const storage = {
  // Usuarios
  getUsers: (): User[] => getStorageItem<User[]>(STORAGE_KEYS.USERS) || [],
  setUsers: (users: User[]) => setStorageItem(STORAGE_KEYS.USERS, users),
  addUser: (user: User) => {
    const users = storage.getUsers()
    users.push(user)
    storage.setUsers(users)
  },
  updateUser: (id: string, updates: Partial<User>) => {
    const users = storage.getUsers()
    const index = users.findIndex(u => u.id === id)
    if (index !== -1) {
      users[index] = { ...users[index], ...updates }
      storage.setUsers(users)
    }
  },
  deleteUser: (id: string) => {
    const users = storage.getUsers().filter(u => u.id !== id)
    storage.setUsers(users)
  },

  // Sucursales
  getSucursales: (): Sucursal[] => getStorageItem<Sucursal[]>(STORAGE_KEYS.SUCURSALES) || [],
  setSucursales: (sucursales: Sucursal[]) => setStorageItem(STORAGE_KEYS.SUCURSALES, sucursales),
  addSucursal: (sucursal: Sucursal) => {
    const sucursales = storage.getSucursales()
    sucursales.push(sucursal)
    storage.setSucursales(sucursales)
  },
  updateSucursal: (id: string, updates: Partial<Sucursal>) => {
    const sucursales = storage.getSucursales()
    const index = sucursales.findIndex(s => s.id === id)
    if (index !== -1) {
      sucursales[index] = { ...sucursales[index], ...updates }
      storage.setSucursales(sucursales)
    }
  },

  // Servicios
  getServicios: (): Servicio[] => getStorageItem<Servicio[]>(STORAGE_KEYS.SERVICIOS) || [],
  setServicios: (servicios: Servicio[]) => setStorageItem(STORAGE_KEYS.SERVICIOS, servicios),
  addServicio: (servicio: Servicio) => {
    const servicios = storage.getServicios()
    servicios.push(servicio)
    storage.setServicios(servicios)
  },
  updateServicio: (id: string, updates: Partial<Servicio>) => {
    const servicios = storage.getServicios()
    const index = servicios.findIndex(s => s.id === id)
    if (index !== -1) {
      servicios[index] = { ...servicios[index], ...updates }
      storage.setServicios(servicios)
    }
  },

  // Comisiones Especiales
  getComisionesEspeciales: (): ComisionEspecial[] => getStorageItem<ComisionEspecial[]>(STORAGE_KEYS.COMISIONES_ESPECIALES) || [],
  setComisionesEspeciales: (comisiones: ComisionEspecial[]) => setStorageItem(STORAGE_KEYS.COMISIONES_ESPECIALES, comisiones),
  addComisionEspecial: (comision: ComisionEspecial) => {
    const comisiones = storage.getComisionesEspeciales()
    comisiones.push(comision)
    storage.setComisionesEspeciales(comisiones)
  },
  deleteComisionEspecial: (id: string) => {
    const comisiones = storage.getComisionesEspeciales().filter(c => c.id !== id)
    storage.setComisionesEspeciales(comisiones)
  },

  // Cobros
  getCobros: (): Cobro[] => getStorageItem<Cobro[]>(STORAGE_KEYS.COBROS) || [],
  setCobros: (cobros: Cobro[]) => setStorageItem(STORAGE_KEYS.COBROS, cobros),
  addCobro: (cobro: Cobro) => {
    const cobros = storage.getCobros()
    cobros.push(cobro)
    storage.setCobros(cobros)
  },
  updateCobro: (id: string, updates: Partial<Cobro>) => {
    const cobros = storage.getCobros()
    const index = cobros.findIndex(c => c.id === id)
    if (index !== -1) {
      cobros[index] = { ...cobros[index], ...updates }
      storage.setCobros(cobros)
    }
  },

  // Pagos Empleadas
  getPagosEmpleadas: (): PagoEmpleada[] => getStorageItem<PagoEmpleada[]>(STORAGE_KEYS.PAGOS_EMPLEADAS) || [],
  setPagosEmpleadas: (pagos: PagoEmpleada[]) => setStorageItem(STORAGE_KEYS.PAGOS_EMPLEADAS, pagos),
  addPagoEmpleada: (pago: PagoEmpleada) => {
    const pagos = storage.getPagosEmpleadas()
    pagos.push(pago)
    storage.setPagosEmpleadas(pagos)
  },
  updatePagoEmpleada: (id: string, updates: Partial<PagoEmpleada>) => {
    const pagos = storage.getPagosEmpleadas()
    const index = pagos.findIndex(p => p.id === id)
    if (index !== -1) {
      pagos[index] = { ...pagos[index], ...updates }
      storage.setPagosEmpleadas(pagos)
    }
  },

  // Sesión
  getSession: (): User | null => getStorageItem<User>(STORAGE_KEYS.SESSION),
  setSession: (user: User | null) => {
    if (user) {
      setStorageItem(STORAGE_KEYS.SESSION, user)
    } else {
      removeStorageItem(STORAGE_KEYS.SESSION)
    }
  },
  clearSession: () => removeStorageItem(STORAGE_KEYS.SESSION),
}

