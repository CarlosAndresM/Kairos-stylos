import { storage } from './storage'
import type { Cobro, ComisionEspecial, Servicio } from '@/types'

export function calcularComision(
  servicioId: string,
  empleadaId: string,
  montoCobrado: number,
  fecha: string
): { monto: number; porcentaje: number } {
  const servicio = storage.getServicios().find(s => s.id === servicioId)
  if (!servicio) return { monto: 0, porcentaje: 0 }

  // Buscar comisiones especiales vigentes y activas
  const comisionesEspeciales = storage.getComisionesEspeciales()
    .filter(c => 
      c.servicio_id === servicioId &&
      c.activo &&
      new Date(c.fecha_inicio) <= new Date(fecha) &&
      (c.fecha_fin === null || new Date(c.fecha_fin) >= new Date(fecha))
    )
    .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()) // Más reciente primero

  // Buscar primero comisión específica para la empleada
  let comisionEspecial = comisionesEspeciales.find(c => c.user_id === empleadaId)
  
  // Si no hay específica, buscar comisión general (user_id null)
  if (!comisionEspecial) {
    comisionEspecial = comisionesEspeciales.find(c => c.user_id === null)
  }

  const porcentaje = comisionEspecial
    ? comisionEspecial.porcentaje
    : servicio.comision_porcentaje_default

  return {
    monto: (montoCobrado * porcentaje) / 100,
    porcentaje
  }
}

export function getCobrosPendientesPorEmpleada(
  empleadaId: string,
  fechaInicio: string,
  fechaFin: string
): Cobro[] {
  const cobros = storage.getCobros()
  return cobros.filter(
    c =>
      c.empleada_id === empleadaId &&
      !c.pagado &&
      new Date(c.fecha) >= new Date(fechaInicio) &&
      new Date(c.fecha) <= new Date(fechaFin)
  )
}

export function calcularTotalPago(cobros: Cobro[]): number {
  return cobros.reduce((total, cobro) => total + cobro.comision_calculada, 0)
}

export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(monto)
}

export function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatearFechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

