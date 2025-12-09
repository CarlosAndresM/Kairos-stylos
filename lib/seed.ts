import { storage } from './storage'
import { hashPassword } from './auth'
import type { Sucursal, User, Servicio, Cobro, PagoEmpleada } from '@/types'

export function seedData() {
  // Verificar si ya hay datos
  if (storage.getUsers().length > 0) {
    return // Ya hay datos, no hacer seed
  }

  // Crear Sucursales
  const sucursal1: Sucursal = {
    id: 'suc-1',
    nombre: 'Sucursal Centro',
    direccion: 'Calle Principal 123, Centro',
    telefono: '3001234567',
    estado: 'activa',
    createdAt: new Date().toISOString(),
  }

  const sucursal2: Sucursal = {
    id: 'suc-2',
    nombre: 'Sucursal Norte',
    direccion: 'Avenida Norte 456, Zona Norte',
    telefono: '3007654321',
    estado: 'activa',
    createdAt: new Date().toISOString(),
  }

  storage.setSucursales([sucursal1, sucursal2])

  // Crear Usuarios
  const users: User[] = [
    // Super Admin
    {
      id: 'user-1',
      nombre: 'Administrador General',
      email: 'admin@kyroy.com',
      password: hashPassword('admin123'),
      sucursal_id: null,
      role: 'super_admin',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    // Admin Sucursal 1
    {
      id: 'user-2',
      nombre: 'María González',
      email: 'admin1@kyroy.com',
      password: hashPassword('admin123'),
      sucursal_id: 'suc-1',
      role: 'admin_sucursal',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    // Admin Sucursal 2
    {
      id: 'user-3',
      nombre: 'Carlos Rodríguez',
      email: 'admin2@kyroy.com',
      password: hashPassword('admin123'),
      sucursal_id: 'suc-2',
      role: 'admin_sucursal',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    // Cajeras Sucursal 1
    {
      id: 'user-4',
      nombre: 'Ana Martínez',
      email: 'cajera1@kyroy.com',
      password: hashPassword('cajera123'),
      sucursal_id: 'suc-1',
      role: 'cajera',
      puede_pagar_empleadas: true,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-5',
      nombre: 'Laura Sánchez',
      email: 'cajera2@kyroy.com',
      password: hashPassword('cajera123'),
      sucursal_id: 'suc-1',
      role: 'cajera',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    // Cajeras Sucursal 2
    {
      id: 'user-6',
      nombre: 'Patricia López',
      email: 'cajera3@kyroy.com',
      password: hashPassword('cajera123'),
      sucursal_id: 'suc-2',
      role: 'cajera',
      puede_pagar_empleadas: true,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-7',
      nombre: 'Sofía Ramírez',
      email: 'cajera4@kyroy.com',
      password: hashPassword('cajera123'),
      sucursal_id: 'suc-2',
      role: 'cajera',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    // Empleadas Sucursal 1
    {
      id: 'user-8',
      nombre: 'Carmen Díaz',
      email: 'empleada1@kyroy.com',
      password: hashPassword('empleada123'),
      sucursal_id: 'suc-1',
      role: 'empleada',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-9',
      nombre: 'Isabel Torres',
      email: 'empleada2@kyroy.com',
      password: hashPassword('empleada123'),
      sucursal_id: 'suc-1',
      role: 'empleada',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-10',
      nombre: 'Rosa Morales',
      email: 'empleada3@kyroy.com',
      password: hashPassword('empleada123'),
      sucursal_id: 'suc-1',
      role: 'empleada',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    // Empleadas Sucursal 2
    {
      id: 'user-11',
      nombre: 'Elena Vargas',
      email: 'empleada4@kyroy.com',
      password: hashPassword('empleada123'),
      sucursal_id: 'suc-2',
      role: 'empleada',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-12',
      nombre: 'Mónica Herrera',
      email: 'empleada5@kyroy.com',
      password: hashPassword('empleada123'),
      sucursal_id: 'suc-2',
      role: 'empleada',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-13',
      nombre: 'Andrea Jiménez',
      email: 'empleada6@kyroy.com',
      password: hashPassword('empleada123'),
      sucursal_id: 'suc-2',
      role: 'empleada',
      puede_pagar_empleadas: false,
      activo: true,
      createdAt: new Date().toISOString(),
    },
  ]

  storage.setUsers(users)

  // Crear Servicios
  const servicios: Servicio[] = [
    {
      id: 'serv-1',
      nombre: 'Manicura Clásica',
      precio_base: 35000,
      comision_porcentaje_default: 40,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'serv-2',
      nombre: 'Pedicura',
      precio_base: 40000,
      comision_porcentaje_default: 40,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'serv-3',
      nombre: 'Corte de Cabello',
      precio_base: 50000,
      comision_porcentaje_default: 35,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'serv-4',
      nombre: 'Coloración',
      precio_base: 120000,
      comision_porcentaje_default: 30,
      activo: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'serv-5',
      nombre: 'Diseño de Cejas',
      precio_base: 30000,
      comision_porcentaje_default: 45,
      activo: true,
      createdAt: new Date().toISOString(),
    },
  ]

  storage.setServicios(servicios)

  // Crear algunos cobros de ejemplo del mes actual
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const cobros: Cobro[] = []

  // Cobros para empleada 1 (sucursal 1)
  for (let i = 0; i < 5; i++) {
    const fecha = new Date(inicioMes)
    fecha.setDate(fecha.getDate() + i * 2)
    const servicio = servicios[i % servicios.length]
    const monto = servicio.precio_base
    const comision = (monto * servicio.comision_porcentaje_default) / 100

    cobros.push({
      id: `cobro-${i + 1}`,
      sucursal_id: 'suc-1',
      fecha: fecha.toISOString(),
      servicio_id: servicio.id,
      empleada_id: 'user-8',
      monto_cobrado: monto,
      forma_pago: i % 2 === 0 ? 'efectivo' : 'transferencia',
      foto_comprobante: null,
      registrado_por: 'user-4',
      comision_calculada: comision,
      comision_porcentaje_aplicado: servicio.comision_porcentaje_default,
      pagado: i < 3, // Los primeros 3 están pagados
      pago_id: i < 3 ? `pago-${Math.floor(i / 2) + 1}` : null,
      createdAt: fecha.toISOString(),
    })
  }

  // Cobros para empleada 2 (sucursal 1)
  for (let i = 0; i < 4; i++) {
    const fecha = new Date(inicioMes)
    fecha.setDate(fecha.getDate() + i * 3)
    const servicio = servicios[i % servicios.length]
    const monto = servicio.precio_base
    const comision = (monto * servicio.comision_porcentaje_default) / 100

    cobros.push({
      id: `cobro-${i + 6}`,
      sucursal_id: 'suc-1',
      fecha: fecha.toISOString(),
      servicio_id: servicio.id,
      empleada_id: 'user-9',
      monto_cobrado: monto,
      forma_pago: 'efectivo',
      foto_comprobante: null,
      registrado_por: 'user-4',
      comision_calculada: comision,
      comision_porcentaje_aplicado: servicio.comision_porcentaje_default,
      pagado: false,
      pago_id: null,
      createdAt: fecha.toISOString(),
    })
  }

  storage.setCobros(cobros)

  // Crear algunos pagos de ejemplo
  const pagos: PagoEmpleada[] = [
    {
      id: 'pago-1',
      sucursal_id: 'suc-1',
      empleada_id: 'user-8',
      fecha_pago: new Date(inicioMes.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      monto: cobros.filter(c => c.pago_id === 'pago-1').reduce((sum, c) => sum + c.comision_calculada, 0),
      evidencia_pago: null,
      estado: 'confirmado',
      confirmado_por_empleada_at: new Date(inicioMes.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      observaciones: 'Pago del primer período',
      cobros_ids: cobros.filter(c => c.pago_id === 'pago-1').map(c => c.id),
      creado_por: 'user-4',
      createdAt: new Date(inicioMes.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pago-2',
      sucursal_id: 'suc-1',
      empleada_id: 'user-8',
      fecha_pago: new Date(inicioMes.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      monto: cobros.filter(c => c.pago_id === 'pago-2').reduce((sum, c) => sum + c.comision_calculada, 0),
      evidencia_pago: null,
      estado: 'pendiente',
      confirmado_por_empleada_at: null,
      observaciones: 'Pago del segundo período',
      cobros_ids: cobros.filter(c => c.pago_id === 'pago-2').map(c => c.id),
      creado_por: 'user-4',
      createdAt: new Date(inicioMes.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  storage.setPagosEmpleadas(pagos)
}

