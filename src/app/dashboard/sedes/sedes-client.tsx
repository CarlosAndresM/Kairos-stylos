'use client'

import * as React from 'react'
import { Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableFilter } from '@/components/ui/table-filter'
import { LoadingGate } from '@/components/ui/loading-gate'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sedeSchema, SedeFormData } from '@/features/trabajadores/schema'
import { saveSede, deleteSede } from '@/features/trabajadores/services'
import { toast } from '@/lib/toast-helper'

interface SedesClientProps {
  initialSedes: any[]
}

export function SedesClient({ initialSedes }: SedesClientProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingSede, setEditingSede] = React.useState<any | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // Auth state for deletion
  const [isAuthOpen, setIsAuthOpen] = React.useState(false)
  const [sedeToDelete, setSedeToDelete] = React.useState<number | null>(null)
  const [adminPassword, setAdminPassword] = React.useState('')

  const form = useForm<SedeFormData>({
    resolver: zodResolver(sedeSchema),
    defaultValues: {
      SC_NOMBRE: '',
      SC_DIRECCION: ''
    }
  })

  React.useEffect(() => {
    if (editingSede) {
      form.reset({
        SC_IDSUCURSAL_PK: editingSede.SC_IDSUCURSAL_PK,
        SC_NOMBRE: editingSede.SC_NOMBRE,
        SC_DIRECCION: editingSede.SC_DIRECCION || ''
      })
    } else {
      form.reset({
        SC_NOMBRE: '',
        SC_DIRECCION: ''
      })
    }
  }, [editingSede, form])

  const filteredSedes = React.useMemo(() => {
    return initialSedes.filter(s => {
      const searchMatch = !searchTerm ||
        s.SC_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.SC_DIRECCION && s.SC_DIRECCION.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!searchMatch) return false;

      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;
        const val = s[col]?.toString() || '';
        if (!values.includes(val)) return false;
      }
      return true;
    });
  }, [initialSedes, searchTerm, activeFilters])

  const getFilterOptions = (col: string) => {
    return Array.from(new Set(initialSedes.map(s => s[col]?.toString() || ''))).filter(Boolean).sort();
  }

  const handleFilterChange = (col: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [col]: values }))
  }

  const onSubmit = async (data: SedeFormData) => {
    setIsLoading(true);
    try {
      const res = await saveSede(data);
      if (res.success) {
        toast.success(editingSede ? 'SUCURSAL ACTUALIZADA' : 'SUCURSAL CREADA');
        setIsModalOpen(false);
        setEditingSede(null);
      } else {
        toast.error(res.error || 'ERROR AL GUARDAR');
      }
    } catch (error) {
      toast.error('ERROR INESPERADO');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!sedeToDelete || !adminPassword) return;
    setIsLoading(true);
    try {
      const res = await deleteSede(sedeToDelete, adminPassword);
      if (res.success) {
        toast.success('SUCURSAL ELIMINADA');
        setIsAuthOpen(false);
        setSedeToDelete(null);
        setAdminPassword('');
      } else {
        toast.error(res.error || 'ERROR AL ELIMINAR');
      }
    } catch (error) {
      toast.error('ERROR INESPERADO');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LoadingGate>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o dirección..."
              className="pl-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-[#FF7E5F]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>

          <Button
            onClick={() => { setEditingSede(null); setIsModalOpen(true); }}
            className="w-full sm:w-auto bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white font-bold gap-2 rounded-xl shadow-lg shadow-[#FF7E5F]/20 h-10 px-6 text-xs uppercase"
          >
            <Plus className="size-4" />
            Nueva Sucursal
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 h-12 w-[120px]">
                    <TableFilter
                      label="ID"
                      options={getFilterOptions('SC_IDSUCURSAL_PK')}
                      selectedValues={activeFilters['SC_IDSUCURSAL_PK'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('SC_IDSUCURSAL_PK', vals)}
                    />
                  </TableHead>
                  <TableHead className="px-6 h-12">
                    <TableFilter
                      label="Nombre de Sucursal"
                      options={getFilterOptions('SC_NOMBRE')}
                      selectedValues={activeFilters['SC_NOMBRE'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('SC_NOMBRE', vals)}
                    />
                  </TableHead>
                  <TableHead className="px-6 h-12">
                    <TableFilter
                      label="Dirección"
                      options={getFilterOptions('SC_DIRECCION')}
                      selectedValues={activeFilters['SC_DIRECCION'] || []}
                      onFilterChange={(vals: string[]) => handleFilterChange('SC_DIRECCION', vals)}
                    />
                  </TableHead>
                  <TableHead className="px-6 h-12 text-right w-[120px]">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSedes.length > 0 ? (
                  filteredSedes.map((sede) => (
                    <TableRow key={sede.SC_IDSUCURSAL_PK} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
                      <TableCell className="px-6 py-4 font-bold text-xs text-slate-400">
                        #{sede.SC_IDSUCURSAL_PK}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-bold text-slate-900 dark:text-white text-xs">
                        {sede.SC_NOMBRE}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-slate-500">
                        {sede.SC_DIRECCION || '---'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingSede(sede); setIsModalOpen(true); }}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-[#FF7E5F] hover:bg-[#FF7E5F]/5"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSedeToDelete(sede.SC_IDSUCURSAL_PK); setIsAuthOpen(true); }}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-400 py-10 italic text-sm">
                      No se encontraron sucursales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* MODAL EDIT/CREATE */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {editingSede ? 'Editar Sucursal' : 'Nueva Sucursal'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
              <FormField
                control={form.control}
                name="SC_NOMBRE"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Nombre de la Sucursal</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-10 border-slate-200 dark:border-slate-800 rounded-xl font-medium text-xs focus:ring-[#FF7E5F]/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="SC_DIRECCION"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Dirección / Ubicación</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} className="h-10 border-slate-200 dark:border-slate-800 rounded-xl font-medium text-xs focus:ring-[#FF7E5F]/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4 flex gap-2 sm:gap-0 sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs h-10 px-6 text-slate-500">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white rounded-xl font-bold text-xs h-10 px-8 shadow-lg shadow-[#FF7E5F]/20">
                  {isLoading ? <Loader2 className="animate-spin size-4" /> : 'Guardar Sucursal'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* AUTH DELETE */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-xl font-bold text-red-600">
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-xs font-medium text-slate-500">Se requiere contraseña administrativa para eliminar esta sucursal:</p>
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="h-11 border-slate-200 dark:border-slate-800 rounded-xl text-center font-bold tracking-widest focus:ring-red-500/20"
              placeholder="••••••••"
            />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsAuthOpen(false)} className="flex-1 rounded-xl border-slate-200 font-bold text-xs h-11">Cancelar</Button>
              <Button onClick={handleDelete} disabled={isLoading || !adminPassword} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs h-11 shadow-lg shadow-red-600/20">
                {isLoading ? <Loader2 className="animate-spin size-4" /> : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LoadingGate>
  )
}
