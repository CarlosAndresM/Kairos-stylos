'use client'

import * as React from 'react'
import {
  Plus,
  Search,
  Package,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Check,
  X,
  Loader2,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SolicitudModal } from './solicitud-modal'
import { updateSolicitudStatus, deleteSolicitud } from '@/features/solicitudes/services'
import { toast } from '@/lib/toast-helper'
import { cn } from '@/lib/utils'

interface SolicitudesClientProps {
  initialSolicitudes: any[]
  products: any[]
  sedes: any[]
  sessionUser: any
}

export function SolicitudesClient({
  initialSolicitudes,
  products,
  sedes,
  sessionUser
}: SolicitudesClientProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [solicitudes, setSolicitudes] = React.useState<any[]>(initialSolicitudes)
  const [isUpdating, setIsUpdating] = React.useState<number | null>(null)

  // Sincronizar con props iniciales cuando cambien (por revalidatePath)
  React.useEffect(() => {
    setSolicitudes(initialSolicitudes)
  }, [initialSolicitudes])

  const filteredSolicitudes = React.useMemo(() => {
    return solicitudes.filter(sol => 
      (sol.producto_nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sol.sucursal_nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sol.SP_ESTADO || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [solicitudes, searchTerm])

  const handleStatusChange = async (id: number, status: 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO') => {
    setIsUpdating(id)
    try {
      const res = await updateSolicitudStatus(id, status)
      if (res.success) {
        toast.success(`Estado actualizado a ${status}`)
        // Actualización local para feedback inmediato (aunque el server revalida)
        setSolicitudes(prev => prev.map(s => 
          s.SP_IDSOLICITUD_PK === id ? { ...s, SP_ESTADO: status, SP_FECHA_ENTREGA: status === 'ENTREGADO' ? new Date() : null } : s
        ))
      } else {
        toast.error('Error', res.error || 'No se pudo actualizar el estado.')
      }
    } catch (error) {
      toast.error('Error', 'Ocurrió un error al actualizar.')
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta solicitud?')) return

    try {
      const res = await deleteSolicitud(id)
      if (res.success) {
        toast.success('Solicitud eliminada')
        setSolicitudes(prev => prev.filter(s => s.SP_IDSOLICITUD_PK !== id))
      } else {
        toast.error('Error', res.error || 'No se pudo eliminar.')
      }
    } catch (error) {
      toast.error('Error de sistema')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENTREGADO':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none transition-colors"><CheckCircle2 className="size-3 mr-1" /> Entregado</Badge>
      case 'CANCELADO':
        return <Badge variant="destructive" className="border-none transition-colors"><XCircle className="size-3 mr-1" /> Cancelado</Badge>
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 border-none transition-colors"><Clock className="size-3 mr-1" /> Pendiente</Badge>
    }
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar por producto o sucursal..."
            className="pl-9 bg-slate-50 border-none focus-visible:ring-[#FF7E5F]/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white shadow-lg shadow-[#FF7E5F]/20 rounded-xl gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Nueva Solicitud
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">Producto & Cantidad</TableHead>
              <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">Sucursal Destino</TableHead>
              <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">Solicitado Por</TableHead>
              <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">Fecha Solicitud</TableHead>
              <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Estado</TableHead>
              <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSolicitudes.length > 0 ? (
              filteredSolicitudes.map((sol) => (
                <TableRow key={sol.SP_IDSOLICITUD_PK} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-4 px-6 font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{sol.producto_nombre}</span>
                      <span className="text-xs text-[#FF7E5F] font-black uppercase tracking-tighter">Cantidad: {sol.SP_CANTIDAD}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="size-3.5 text-slate-400" />
                      <span className="text-sm font-medium">{sol.sucursal_nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span className="text-xs font-bold text-slate-500">{sol.trabajador_solicita || 'Sistema / Anonimo'}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="size-3.5" />
                      <span className="text-xs">{format(new Date(sol.SP_FECHA_SOLICITUD), "d 'de' MMMM", { locale: es })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-center">
                    {getStatusBadge(sol.SP_ESTADO)}
                    {sol.SP_ESTADO === 'ENTREGADO' && sol.SP_FECHA_ENTREGA && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-medium italic">
                        Entregado el {format(new Date(sol.SP_FECHA_ENTREGA), "dd/MM/yy")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isUpdating === sol.SP_IDSOLICITUD_PK ? (
                        <Loader2 className="size-4 animate-spin text-slate-400" />
                      ) : (
                        <>
                          {sessionUser?.role === 'ADMINISTRADOR_TOTAL' && sol.SP_ESTADO === 'PENDIENTE' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-[10px] uppercase gap-1"
                                onClick={() => handleStatusChange(sol.SP_IDSOLICITUD_PK, 'ENTREGADO')}
                              >
                                <Check className="size-3" /> Entregar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold text-[10px] uppercase gap-1"
                                onClick={() => handleStatusChange(sol.SP_IDSOLICITUD_PK, 'CANCELADO')}
                              >
                                <X className="size-3" /> Cancelar
                              </Button>
                            </div>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="size-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 border-slate-200 shadow-xl rounded-xl">
                              <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={() => {
                                if (sol.SP_COMENTARIOS) alert(`Comentarios: ${sol.SP_COMENTARIOS}`)
                                else toast.info('No hay comentarios adicionales')
                              }}>
                                Ver detalles
                              </DropdownMenuItem>
                              {sol.SP_ESTADO === 'PENDIENTE' && (
                                <DropdownMenuItem 
                                  className="text-xs font-medium text-red-600 cursor-pointer focus:text-red-700 focus:bg-red-50"
                                  onClick={() => handleDelete(sol.SP_IDSOLICITUD_PK)}
                                >
                                  Eliminar solicitud
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Package className="size-8 opacity-20 mb-2" />
                    <p className="text-sm">No hay solicitudes para mostrar</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SolicitudModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        sedes={sedes}
        sessionUser={sessionUser}
      />
    </div>
  )
}
