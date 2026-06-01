'use client'

import * as React from 'react'
import { Plus, Search, User, Phone, MapPin, Shield, Star, DollarSign, Wallet, Edit2, Power, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { TableFilter } from '@/components/ui/table-filter'
import { WorkerWithStats, WorkerFormData } from '@/features/trabajadores/schema'
import { saveTrabajador, toggleWorkerStatus, deleteWorker } from '@/features/trabajadores/services'
import { WorkerModal } from '@/app/dashboard/trabajadores/worker-modal'
import { DeleteConfirmModal } from '@/app/dashboard/trabajadores/delete-confirm-modal'
import { RetirementModal } from '@/app/dashboard/trabajadores/retirement-modal'
import { toast } from '@/lib/toast-helper'
import { LoadingGate } from '@/components/ui/loading-gate'
import { NumericFormat } from 'react-number-format'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface WorkerClientProps {
  initialWorkers: WorkerWithStats[]
  roles: any[]
  sedes: any[]
  currentRole?: string
  sucursalId?: number
}

export function WorkerClient({ initialWorkers, roles, sedes, currentRole, sucursalId }: WorkerClientProps) {
  const isTotalAdmin = currentRole === 'ADMINISTRADOR_TOTAL'
  const canManageWorkers = currentRole === 'ADMINISTRADOR_TOTAL' || currentRole === 'ADMINISTRADOR_PUNTO'

  const [searchTerm, setSearchTerm] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [editingWorker, setEditingWorker] = React.useState<WorkerWithStats | null>(null)
  const [workerToDelete, setWorkerToDelete] = React.useState<WorkerWithStats | null>(null)
  const [isRetireModalOpen, setIsRetireModalOpen] = React.useState(false)
  const [workerToRetire, setWorkerToRetire] = React.useState<WorkerWithStats | null>(null)

  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  const filteredWorkers = React.useMemo(() => {
    return initialWorkers.filter(w => {
      // Búsqueda general
      const searchMatch = !searchTerm ||
        (w.TR_NOMBRE || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.TR_TELEFONO && w.TR_TELEFONO.includes(searchTerm)) ||
        (w.RL_NOMBRE || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.SC_NOMBRE || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      // Filtros por columna
      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;

        let val = '';
        if (col === 'TR_ACTIVO') {
          val = w.TR_ACTIVO ? 'ACTIVO' : 'INACTIVO';
        } else {
          val = (w[col as keyof WorkerWithStats] as string)?.toString() || '';
        }

        if (!values.includes(val)) return false;
      }

      return true;
    })
  }, [initialWorkers, searchTerm, activeFilters])

  const getFilterOptions = (col: string) => {
    if (col === 'TR_ACTIVO') return ['ACTIVO', 'INACTIVO'];
    return Array.from(new Set(initialWorkers.map(w => (w[col as keyof WorkerWithStats] as string)?.toString() || ''))).filter(Boolean).sort()
  }

  const handleFilterChange = (col: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [col]: values }))
  }

  const handleOpenModal = (worker?: WorkerWithStats) => {
    setEditingWorker(worker || null)
    setIsModalOpen(true)
  }

  const handleOpenDeleteModal = (worker: WorkerWithStats) => {
    setWorkerToDelete(worker)
    setIsDeleteModalOpen(true)
  }

  const handleSave = async (data: WorkerFormData) => {
    const res = await saveTrabajador(data)
    if (res.success) {
      toast.success(
        data.TR_IDTRABAJADOR_PK ? 'TRABAJADOR ACTUALIZADO' : 'TRABAJADOR CREADO',
        'La información del trabajador ha sido procesada correctamente.'
      )
      setIsModalOpen(false)
    } else {
      toast.error(
        'ERROR AL GUARDAR',
        res.error || 'Ocurrió un error al intentar guardar el trabajador.'
      )
    }
  }

  const handleToggleStatus = async (worker: WorkerWithStats) => {
    const newStatus = !worker.TR_ACTIVO
    const res = await toggleWorkerStatus(worker.TR_IDTRABAJADOR_PK, newStatus)
    if (res.success) {
      toast.success(
        newStatus ? 'TRABAJADOR ACTIVADO' : 'TRABAJADOR DESACTIVADO',
        `El estado del trabajador se ha actualizado correctamente.`
      )
    } else {
      toast.error(
        'ERROR AL CAMBIAR ESTADO',
        res.error || 'No se pudo actualizar el estado del trabajador.'
      )
    }
  }

  const handleDelete = async (password: string) => {
    if (!workerToDelete) return

    const res = await deleteWorker(workerToDelete.TR_IDTRABAJADOR_PK, password)
    if (res.success) {
      toast.success(
        'TRABAJADOR ELIMINADO',
        'El trabajador ha sido eliminado correctamente.'
      )
      setIsDeleteModalOpen(false)
      setWorkerToDelete(null)
    } else {
      if (res.error?.includes('facturas') || res.error?.includes('servicios') || res.error?.includes('productos')) {
        toast.error(
          'TRABAJADOR EN USO LABORAL',
          res.error
        )
      } else {
        toast.error(
          'ERROR AL ELIMINAR',
          res.error || 'Ocurrió un error inesperado al intentar eliminar.'
        )
      }
    }
  }

  return (
    <LoadingGate>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, teléfono, rol..."
              className="pl-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>

          <Button
            onClick={() => handleOpenModal()}
            disabled={!canManageWorkers}
            className="w-full sm:w-auto bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white font-bold gap-2 rounded-xl shadow-lg shadow-[#FF7E5F]/20 h-10 px-6 border-none"
          >
            <Plus className="size-4" />
            Nuevo Trabajador
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 py-0 px-4 border border-slate-200">
                    <TableFilter
                      label="Nombre"
                      options={getFilterOptions('TR_NOMBRE')}
                      selectedValues={activeFilters['TR_NOMBRE'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_NOMBRE', vals)}
                    />
                  </TableHead>
                  <TableHead className="h-10 py-0 px-4 border border-slate-200">
                    <TableFilter
                      label="Teléfono"
                      options={getFilterOptions('TR_TELEFONO')}
                      selectedValues={activeFilters['TR_TELEFONO'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_TELEFONO', vals)}
                    />
                  </TableHead>
                  <TableHead className="h-10 py-0 px-4 border border-slate-200">
                    <TableFilter
                      label="Rol"
                      options={getFilterOptions('RL_NOMBRE')}
                      selectedValues={activeFilters['RL_NOMBRE'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('RL_NOMBRE', vals)}
                    />
                  </TableHead>
                  {isTotalAdmin && (
                    <TableHead className="h-10 py-0 px-4 border border-slate-200">
                      <TableFilter
                        label="Sucursal"
                        options={getFilterOptions('SC_NOMBRE')}
                        selectedValues={activeFilters['SC_NOMBRE'] || []}
                        onFilterChange={(vals: string[]) => handleFilterChange('SC_NOMBRE', vals)}
                      />
                    </TableHead>
                  )}
                  <TableHead className="h-10 py-0 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center border border-slate-200">Servicios</TableHead>
                  <TableHead className="h-10 py-0 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center border border-slate-200">Vales</TableHead>
                  <TableHead className="h-10 py-0 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center border border-slate-200">Deuda</TableHead>
                  <TableHead className="h-10 py-0 px-4 text-center border border-slate-200">
                    <TableFilter
                      label="Estado"
                      align="center"
                      options={getFilterOptions('TR_ACTIVO')}
                      selectedValues={activeFilters['TR_ACTIVO'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_ACTIVO', vals)}
                    />
                  </TableHead>
                  <TableHead className="h-10 py-0 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right border border-slate-200">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.TR_IDTRABAJADOR_PK} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
                    <TableCell className="py-2 px-4 border border-slate-200">
                      <span className="font-black text-[#00CED1] text-xs uppercase tracking-tight">
                        {worker.TR_NOMBRE}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-600">
                        {worker.TR_TELEFONO || '---'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 italic bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                        {worker.RL_NOMBRE.replace('_', ' ')}
                      </span>
                    </TableCell>
                    {isTotalAdmin && (
                      <TableCell className="py-2 px-4 border border-slate-200">
                        <span className="text-[10px] font-medium text-slate-400">
                          {worker.SC_NOMBRE || 'GLOBAL'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="py-2 px-4 text-center border border-slate-200">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{worker.servicios_count || 0}</span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-center border border-slate-200">
                      <NumericFormat
                        value={worker.total_vales || 0}
                        displayType="text"
                        thousandSeparator="."
                        decimalSeparator=","
                        prefix="$"
                        decimalScale={0}
                        fixedDecimalScale
                        renderText={(value) => (
                          <span className="text-xs font-black text-emerald-600">
                            {value}
                          </span>
                        )}
                      />
                    </TableCell>
                    <TableCell className="py-2 px-4 text-center border border-slate-200">
                      <span className={cn(
                        "text-xs font-black",
                        (worker.vales_pendientes || 0) > 0 ? "text-red-600" : "text-slate-400"
                      )}>
                        {worker.vales_pendientes || 0}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-center border border-slate-200">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border shadow-sm",
                        worker.TR_ACTIVO ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20" : "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20"
                      )}>
                        {worker.TR_ACTIVO ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-right border border-slate-200">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <span className="sr-only">Abrir menú</span>
                            <MoreVertical className="size-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-1 bg-white dark:bg-slate-900 z-50">
                          <DropdownMenuItem
                            onClick={() => handleOpenModal(worker)}
                            disabled={!canManageWorkers}
                            className="gap-2 rounded-lg font-medium text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <Edit2 className="size-3.5 text-slate-400" />
                            Editar Trabajador
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(worker)}
                            disabled={!canManageWorkers}
                            className="gap-2 rounded-lg font-medium text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <Power className="size-3.5 text-slate-400" />
                            {worker.TR_ACTIVO ? 'Desactivar Acceso' : 'Activar Acceso'}
                          </DropdownMenuItem>

                          {worker.TR_ACTIVO && (
                            <DropdownMenuItem
                              onClick={() => {
                                setWorkerToRetire(worker)
                                setIsRetireModalOpen(true)
                              }}
                              disabled={!canManageWorkers}
                              className="gap-2 rounded-lg font-medium text-xs text-orange-600 dark:text-orange-400 cursor-pointer"
                            >
                              <Wallet className="size-3.5" />
                              Liquidar por Retiro
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />

                          <DropdownMenuItem
                            onClick={() => handleOpenDeleteModal(worker)}
                            disabled={!isTotalAdmin}
                            className="gap-2 rounded-lg font-medium text-xs text-red-600 dark:text-red-400 focus:bg-red-50 focus:text-red-750 dark:focus:bg-red-950/30 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            Eliminar Trabajador
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredWorkers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-slate-500 italic text-xs">
                      No se encontraron trabajadores
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <WorkerModal
          key={editingWorker?.TR_IDTRABAJADOR_PK || 'new'}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          editingWorker={editingWorker}
          roles={roles}
          sedes={sedes}
          isTotalAdmin={isTotalAdmin}
          sucursalId={sucursalId}
        />

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          workerName={workerToDelete?.TR_NOMBRE || ''}
        />

        {workerToRetire && (
          <RetirementModal
            isOpen={isRetireModalOpen}
            onClose={() => {
              setIsRetireModalOpen(false)
              setWorkerToRetire(null)
            }}
            onSuccess={() => {
              window.location.reload()
            }}
            workerId={workerToRetire.TR_IDTRABAJADOR_PK}
            workerName={workerToRetire.TR_NOMBRE}
            workerRole={workerToRetire.RL_NOMBRE}
          />
        )}
      </div>
    </LoadingGate>
  )
}

