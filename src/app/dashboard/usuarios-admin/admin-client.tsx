'use client'

import * as React from 'react'
import { Plus, Search, Shield, Phone, Power, Edit2, Trash2 } from 'lucide-react'
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
import { TableFilter } from '@/components/ui/table-filter' // Added TableFilter
import { WorkerWithStats, WorkerFormData } from '@/features/trabajadores/schema'
import { saveTrabajador, toggleWorkerStatus, deleteWorker } from '@/features/trabajadores/services'
import { WorkerModal } from '@/app/dashboard/trabajadores/worker-modal'
import { DeleteConfirmModal } from '@/app/dashboard/trabajadores/delete-confirm-modal'
import { toast } from '@/lib/toast-helper'
import { LoadingGate } from '@/components/ui/loading-gate'

interface AdminClientProps {
  initialAdmins: WorkerWithStats[]
  roles: any[]
  sedes: any[]
}

export default function AdminClient({ initialAdmins, roles, sedes }: AdminClientProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [editingAdmin, setEditingAdmin] = React.useState<WorkerWithStats | null>(null)
  const [adminToDelete, setAdminToDelete] = React.useState<WorkerWithStats | null>(null)

  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  const filteredAdmins = React.useMemo(() => {
    return initialAdmins.filter(a => {
      // Búsqueda general
      const searchMatch = !searchTerm ||
        a.TR_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.TR_TELEFONO && a.TR_TELEFONO.includes(searchTerm));

      if (!searchMatch) return false;

      // Filtros por columna
      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;
        
        let val = '';
        if (col === 'TR_ACTIVO') {
          val = a.TR_ACTIVO ? 'ACTIVO' : 'INACTIVO';
        } else {
          val = (a[col as keyof WorkerWithStats] as string)?.toString() || '';
        }

        if (!values.includes(val)) return false;
      }

      return true;
    })
  }, [initialAdmins, searchTerm, activeFilters])

  const getFilterOptions = (col: string) => {
    if (col === 'TR_ACTIVO') return ['ACTIVO', 'INACTIVO'];
    return Array.from(new Set(initialAdmins.map(a => (a[col as keyof WorkerWithStats] as string)?.toString() || ''))).filter(Boolean).sort()
  }

  const handleFilterChange = (col: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [col]: values }))
  }

  const handleOpenModal = (admin?: WorkerWithStats) => {
    setEditingAdmin(admin || null)
    setIsModalOpen(true)
  }

  const handleOpenDeleteModal = (admin: WorkerWithStats) => {
    setAdminToDelete(admin)
    setIsDeleteModalOpen(true)
  }

  const handleSave = async (data: WorkerFormData) => {
    const res = await saveTrabajador(data)
    if (res.success) {
      toast.success(data.TR_IDTRABAJADOR_PK ? 'Administrador actualizado' : 'Administrador creado')
      setIsModalOpen(false)
    } else {
      toast.error(res.error || 'Error al guardar')
    }
  }

  const handleToggleStatus = async (admin: WorkerWithStats) => {
    const newStatus = !admin.TR_ACTIVO
    const res = await toggleWorkerStatus(admin.TR_IDTRABAJADOR_PK, newStatus)
    if (res.success) {
      toast.success(`Administrador ${newStatus ? 'activado' : 'desactivado'}`)
    } else {
      toast.error(res.error || 'Error al cambiar estado')
    }
  }

  const handleDelete = async (password: string) => {
    if (!adminToDelete) return

    const res = await deleteWorker(adminToDelete.TR_IDTRABAJADOR_PK, password)
    if (res.success) {
      toast.success('Administrador eliminado definitivamente')
      setIsDeleteModalOpen(false)
      setAdminToDelete(null)
    } else {
      toast.error(res.error || 'Error al eliminar')
    }
  }

  return (
    <LoadingGate>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              className="pl-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-[#FF7E5F]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>

          <Button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white font-bold gap-2 rounded-xl shadow-lg shadow-[#FF7E5F]/20 h-10 px-6 text-xs uppercase"
          >
            <Plus className="size-4" />
            Registrar Administrador
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 h-12">
                    <TableFilter 
                      label="Administrador" 
                      options={getFilterOptions('TR_NOMBRE')}
                      selectedValues={activeFilters['TR_NOMBRE'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_NOMBRE', vals)}
                    />
                  </TableHead>
                  <TableHead className="px-6 h-12">
                    <TableFilter 
                      label="Teléfono" 
                      options={getFilterOptions('TR_TELEFONO')}
                      selectedValues={activeFilters['TR_TELEFONO'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_TELEFONO', vals)}
                    />
                  </TableHead>
                  <TableHead className="px-6 h-12">
                    <TableFilter 
                      label="Sucursal" 
                      options={getFilterOptions('SC_NOMBRE')}
                      selectedValues={activeFilters['SC_NOMBRE'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('SC_NOMBRE', vals)}
                    />
                  </TableHead>
                  <TableHead className="px-6 h-12 text-center">
                    <TableFilter 
                      label="Estado" 
                      align="center"
                      options={getFilterOptions('TR_ACTIVO')}
                      selectedValues={activeFilters['TR_ACTIVO'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('TR_ACTIVO', vals)}
                    />
                  </TableHead>
                  <TableHead className="px-6 h-12 text-right w-[120px]">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.TR_IDTRABAJADOR_PK} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
                    <TableCell className="px-6 py-4">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {admin.TR_NOMBRE}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="font-medium text-slate-500 text-xs">
                        {admin.TR_TELEFONO || '---'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                        {admin.SC_NOMBRE || 'Global'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                        admin.TR_ACTIVO 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-red-50 text-red-600 border-red-100"
                      )}>
                        {admin.TR_ACTIVO ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                         <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(admin)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-[#FF7E5F] hover:bg-[#FF7E5F]/5"
                          title="Alternar estado"
                        >
                          <Power className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(admin)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-[#FF7E5F] hover:bg-[#FF7E5F]/5"
                          title="Editar"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(admin)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAdmins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 py-10 italic text-sm">
                      No se encontraron administradores.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <WorkerModal
          key={editingAdmin?.TR_IDTRABAJADOR_PK || 'new'}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          editingWorker={editingAdmin}
          roles={roles}
          sedes={sedes}
          isTotalAdmin={true}
        />

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          workerName={adminToDelete?.TR_NOMBRE || ''}
        />
      </div>
    </LoadingGate>
  )
}
