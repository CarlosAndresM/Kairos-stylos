export interface Sucursal {
  id: string
  nombre: string
  direccion: string
  telefono: string
  estado: 'activa' | 'inactiva'
  createdAt: string
}

export interface User {
  id: string
  nombre: string
  email: string
  password: string // hasheado simple para demo
  sucursal_id: string | null
  role: 'super_admin' | 'admin_sucursal' | 'cajera' | 'empleada'
  puede_pagar_empleadas: boolean // solo para cajera
  activo: boolean
  createdAt: string
}

export interface Servicio {
  id: string
  nombre: string
  precio_base: number
  comision_porcentaje_default: number
  activo: boolean
  createdAt: string
}

export interface ComisionEspecial {
  id: string
  servicio_id: string
  user_id: string | null // null para comisión general del servicio
  porcentaje: number
  fecha_inicio: string
  fecha_fin: string | null
  activo: boolean
  
  createdAt: string
}

export interface Cobro {
  id: string
  sucursal_id: string
  fecha: string
  servicio_id: string
  empleada_id: string
  monto_cobrado: number
  forma_pago: 'efectivo' | 'transferencia'
  foto_comprobante: string | null // base64
  registrado_por: string // user_id
  comision_calculada: number
  comision_porcentaje_aplicado: number // Porcentaje que se aplicó
  pagado: boolean
  pago_id: string | null
  createdAt: string
}

export interface PagoEmpleada {
  id: string
  sucursal_id: string
  empleada_id: string
  fecha_pago: string
  monto: number
  evidencia_pago: string | null // base64
  estado: 'pendiente' | 'confirmado'
  confirmado_por_empleada_at: string | null
  observaciones: string | null
  cobros_ids: string[] // IDs de cobros incluidos en este pago
  creado_por: string // user_id
  createdAt: string
}

