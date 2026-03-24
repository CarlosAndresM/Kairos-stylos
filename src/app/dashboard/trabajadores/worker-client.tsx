'use client'

import * as React from 'react'
import { Plus, Search, User, Phone, MapPin, Shield, Star, DollarSign, Wallet, Edit2, Power, Trash2 } from 'lucide-react'
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
import { toast } from '@/lib/toast-helper'
import { LoadingGate } from '@/components/ui/loading-gate'

interface WorkerClientProps {
  initialWorkers: WorkerWithStats[]
  roles: any[]
  sedes: any[]
  currentRole?: string
  sucursalId?: number
}

export function WorkerClient({ initialWorkers, roles, sedes, currentRole, sucursalId }: WorkerClientProps) {
  const isTotalAdmin = currentRole === 'ADMINISTRADOR_TOTAL'

  const [searchTerm, setSearchTerm] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [editingWorker, setEditingWorker] = React.useState<WorkerWithStats | null>(null)
  const [workerToDelete, setWorkerToDelete] = React.useState<WorkerWithStats | null>(null)

  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  const filteredWorkers = React.useMemo(() => {
    return initialWorkers.filter(w => {
      // Búsqueda general
      const searchMatch = !searchTerm ||
        w.TR_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.TR_TELEFONO && w.TR_TELEFONO.includes(searchTerm)) ||
        w.RL_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      toast.success(data.TR_IDTRABAJADOR_PK ? 'Trabajador actualizado' : 'Trabajador creado')
      setIsModalOpen(false)
    } else {
      toast.error(res.error || 'Error al guardar')
    }
  }

  const handleToggleStatus = async (worker: WorkerWithStats) => {
    const newStatus = !worker.TR_ACTIVO
    const res = await toggleWorkerStatus(worker.TR_IDTRABAJADOR_PK, newStatus)
    if (res.success) {
      toast.success(`Trabajador ${newStatus ? 'activado' : 'desactivado'}`)
    } else {
      toast.error(res.error || 'Error al cambiar estado')
    }
  }

  const handleDelete = async (password: string) => {
    if (!workerToDelete) return

    const res = await deleteWorker(workerToDelete.TR_IDTRABAJADOR_PK, password)
    if (res.success) {
      toast.success('Trabajador eliminado definitivamente')
      setIsDeleteModalOpen(false)
      setWorkerToDelete(null)
    } else {
      toast.error(res.error || 'Error al eliminar')
    }
  }

  return (
    <LoadingGate>
      <div className="space-y-6">
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
                  <TableHead className="h-10 py-0 px-4">
                    <TableFilter
                      label="Nombre"
                      options={getFilterOptions('TR_NOMBRE')}
                      selectedValues={activeFilters['TR_NOMBRE'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_NOMBRE', vals)}
                    />
                  </TableHead>
                  <TableHead className="h-10 py-0 px-4">
                    <TableFilter
                      label="Teléfono"
                      options={getFilterOptions('TR_TELEFONO')}
                      selectedValues={activeFilters['TR_TELEFONO'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_TELEFONO', vals)}
                    />
                  </TableHead>
                  <TableHead className="h-10 py-0 px-4">
                    <TableFilter
                      label="Rol"
                      options={getFilterOptions('RL_NOMBRE')}
                      selectedValues={activeFilters['RL_NOMBRE'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('RL_NOMBRE', vals)}
                    />
                  </TableHead>
                  {isTotalAdmin && (
                    <TableHead className="h-10 py-0 px-4">
                      <TableFilter
                        label="Sucursal"
                        options={getFilterOptions('SC_NOMBRE')}
                        selectedValues={activeFilters['SC_NOMBRE'] || []}
                        onFilterChange={(vals: string[]) => handleFilterChange('SC_NOMBRE', vals)}
                      />
                    </TableHead>
                  )}
                  <TableHead className="h-10 py-0 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">Servicios</TableHead>
                  <TableHead className="h-10 py-0 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">Vales</TableHead>
                  <TableHead className="h-10 py-0 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">Deuda</TableHead>
                  <TableHead className="h-10 py-0 px-4 text-center">
                    <TableFilter
                      label="Estado"
                      align="center"
                      options={getFilterOptions('TR_ACTIVO')}
                      selectedValues={activeFilters['TR_ACTIVO'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_ACTIVO', vals)}
                    />
                  </TableHead>
                  <TableHead className="h-10 py-0 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.TR_IDTRABAJADOR_PK} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
                    <TableCell className="py-2 px-4">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {worker.TR_NOMBRE}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4">
                      <span className="text-[11px] font-bold text-slate-600">
                        {worker.TR_TELEFONO || '---'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4">
                      <span className="text-[10px] font-bold uppercase text-slate-500 italic bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                        {worker.RL_NOMBRE.replace('_', ' ')}
                      </span>
                    </TableCell>
                    {isTotalAdmin && (
                      <TableCell className="py-2 px-4">
                        <span className="text-[10px] font-medium text-slate-400">
                          {worker.SC_NOMBRE || 'GLOBAL'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="py-2 px-4 text-center">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{worker.servicios_count}</span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-center">
                      <span className="text-xs font-black text-emerald-600">${worker.total_vales.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-center">
                      <span className={cn(
                        "text-xs font-black",
                        worker.vales_pendientes > 0 ? "text-red-600" : "text-slate-400"
                      )}>
                        {worker.vales_pendientes}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border shadow-sm",
                        worker.TR_ACTIVO ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20" : "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20"
                      )}>
                        {worker.TR_ACTIVO ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </TableCell>
                    {isTotalAdmin && (
                      <TableCell className="py-2 px-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleToggleStatus(worker)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                            title="Alternar estado"
                          >
                            <Power className="size-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(worker)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(worker)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-400 hover:text-red-500 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                    {!isTotalAdmin && (
                      <TableCell className="py-2 px-4 text-right">
                        <span className="text-[10px] text-slate-400 italic">Solo lectura</span>
                      </TableCell>
                    )}
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
        />

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          workerName={workerToDelete?.TR_NOMBRE || ''}
        />
      </div>
    </LoadingGate>
  )
}

