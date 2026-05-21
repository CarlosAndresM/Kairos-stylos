'use client'

import * as React from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { LoadingGate } from '@/components/ui/loading-gate'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
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
import { ItemModal } from '@/app/dashboard/catalogos/item-modal'
import { ServiceFormData, ProductFormData } from '@/features/catalog/schema'
import { saveService, saveProduct, deleteService, deleteProduct } from '@/features/catalog/services'
import { toast } from '@/lib/toast-helper'
import { TableFilter } from '@/components/ui/table-filter'

interface CatalogClientProps {
  initialServices: any[]
  initialProducts: any[]
}

export function CatalogClient({ initialServices, initialProducts }: CatalogClientProps) {
  const [activeTab, setActiveTab] = React.useState('servicios')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<any>(null)
  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  const filteredServices = React.useMemo(() => {
    return initialServices.filter(s => {
      const searchMatch = !searchTerm || s.SV_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;
        let val = '';
        if (col === 'SV_ACTIVO') val = s.SV_ACTIVO ? 'ACTIVO' : 'INACTIVO';
        else val = s[col]?.toString() || '';
        if (!values.includes(val)) return false;
      }
      return true;
    });
  }, [initialServices, searchTerm, activeFilters])

  const filteredProducts = React.useMemo(() => {
    return initialProducts.filter(p => {
      const searchMatch = !searchTerm || p.PR_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;
        let val = '';
        if (col === 'PR_ACTIVO') val = p.PR_ACTIVO ? 'ACTIVO' : 'INACTIVO';
        else val = p[col]?.toString() || '';
        if (!values.includes(val)) return false;
      }
      return true;
    });
  }, [initialProducts, searchTerm, activeFilters])

  const getFilterOptions = (tab: string, col: string) => {
    const list = tab === 'servicios' ? initialServices : initialProducts;
    if (col === 'SV_ACTIVO' || col === 'PR_ACTIVO') return ['ACTIVO', 'INACTIVO'];
    return Array.from(new Set(list.map(item => item[col]?.toString() || ''))).filter(Boolean).sort();
  }

  const handleFilterChange = (col: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [col]: values }))
  }

  const handleOpenModal = (item?: any) => {
    setEditingItem(item || null)
    setIsModalOpen(true)
  }

  const handleSave = async (data: any) => {
    const isService = activeTab === 'servicios'
    const res = isService ? await saveService(data) : await saveProduct(data)

    if (res.success) {
      toast.success(isService ? 'Servicio guardado' : 'Producto guardado')
      setIsModalOpen(false)
    } else {
      toast.error(res.error || 'Error al guardar')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.')) return

    const isService = activeTab === 'servicios'
    const res = isService ? await deleteService(id) : await deleteProduct(id)

    if (res.success) {
      toast.success(isService ? 'Servicio eliminado' : 'Producto eliminado')
    } else {
      toast.error(res.error || 'Error al eliminar')
    }
  }

  return (
    <LoadingGate>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre..."
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
            {activeTab === 'servicios' ? 'Nuevo Servicio' : 'Nuevo Producto'}
          </Button>
        </div>

        <Tabs defaultValue="servicios" className="w-full" onValueChange={(v) => {
          setActiveTab(v);
          setActiveFilters({});
        }}>
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-11 w-full max-w-[400px] mb-4">
            <TabsTrigger 
              value="servicios" 
              className="flex-1 rounded-lg h-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-[#FF7E5F] font-bold text-xs uppercase transition-all"
            >
              Servicios
            </TabsTrigger>
            <TabsTrigger 
              value="productos" 
              className="flex-1 rounded-lg h-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-[#FF7E5F] font-bold text-xs uppercase transition-all"
            >
              Productos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="servicios" className="mt-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-6 h-12 w-[110px]">
                        <TableFilter
                          label="ID"
                          options={getFilterOptions('servicios', 'SV_IDSERVICIO_PK')}
                          selectedValues={activeFilters['SV_IDSERVICIO_PK'] || []}
                          onFilterChange={(vals: string[]) => handleFilterChange('SV_IDSERVICIO_PK', vals)}
                        />
                      </TableHead>
                      <TableHead className="px-6 h-12">
                        <TableFilter
                          label="Nombre"
                          options={getFilterOptions('servicios', 'SV_NOMBRE')}
                          selectedValues={activeFilters['SV_NOMBRE'] || []}
                          onFilterChange={(vals: string[]) => handleFilterChange('SV_NOMBRE', vals)}
                        />
                      </TableHead>
                      <TableHead className="px-6 h-12 text-center">
                        <TableFilter
                          label="Estado"
                          align="center"
                          options={getFilterOptions('servicios', 'SV_ACTIVO')}
                          selectedValues={activeFilters['SV_ACTIVO'] || []}
                          onFilterChange={(vals: string[]) => handleFilterChange('SV_ACTIVO', vals)}
                        />
                      </TableHead>
                      <TableHead className="px-6 h-12 text-right w-[100px]">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service) => (
                      <TableRow key={service.SV_IDSERVICIO_PK} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
                        <TableCell className="px-6 py-4 font-bold text-xs text-slate-400">
                          #{service.SV_IDSERVICIO_PK}
                        </TableCell>
                        <TableCell className="px-6 py-4 font-bold text-slate-900 dark:text-white text-xs">
                          {service.SV_NOMBRE}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                            service.SV_ACTIVO 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-red-50 text-red-600 border-red-100"
                          )}>
                            {service.SV_ACTIVO ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(service)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-[#FF7E5F] hover:bg-[#FF7E5F]/5"
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(service.SV_IDSERVICIO_PK)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredServices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-slate-400 py-4 italic text-sm">
                          No hay servicios registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="productos" className="mt-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-6 h-12 w-[110px]">
                        <TableFilter
                          label="ID"
                          options={getFilterOptions('productos', 'PR_IDPRODUCTO_PK')}
                          selectedValues={activeFilters['PR_IDPRODUCTO_PK'] || []}
                          onFilterChange={(vals: string[]) => handleFilterChange('PR_IDPRODUCTO_PK', vals)}
                        />
                      </TableHead>
                      <TableHead className="px-6 h-12">
                        <TableFilter
                          label="Nombre"
                          options={getFilterOptions('productos', 'PR_NOMBRE')}
                          selectedValues={activeFilters['PR_NOMBRE'] || []}
                          onFilterChange={(vals: string[]) => handleFilterChange('PR_NOMBRE', vals)}
                        />
                      </TableHead>
                      <TableHead className="px-6 h-12 text-center w-[120px]">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Comisión</span>
                      </TableHead>
                      <TableHead className="px-6 h-12 text-center">
                        <TableFilter
                          label="Estado"
                          align="center"
                          options={getFilterOptions('productos', 'PR_ACTIVO')}
                          selectedValues={activeFilters['PR_ACTIVO'] || []}
                          onFilterChange={(vals: string[]) => handleFilterChange('PR_ACTIVO', vals)}
                        />
                      </TableHead>
                      <TableHead className="px-6 h-12 text-right w-[100px]">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.PR_IDPRODUCTO_PK} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
                        <TableCell className="px-6 py-4 font-bold text-xs text-slate-400">
                          #{product.PR_IDPRODUCTO_PK}
                        </TableCell>
                        <TableCell className="px-6 py-4 font-bold text-slate-900 dark:text-white text-xs">
                          {product.PR_NOMBRE}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          {product.PR_APLICA_COMISION ? (
                             <Badge variant="outline" className="border-[#FF7E5F]/30 bg-[#FF7E5F]/10 text-[#FF7E5F] font-black">{product.PR_PORCENTAJE_COMISION}%</Badge>
                          ) : (
                             <span className="text-slate-400 text-[10px] font-bold uppercase italic">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                            product.PR_ACTIVO 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-red-50 text-red-600 border-red-100"
                          )}>
                            {product.PR_ACTIVO ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(product)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-[#FF7E5F] hover:bg-[#FF7E5F]/5"
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.PR_IDPRODUCTO_PK)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-slate-400 py-4 italic text-sm">
                          No hay productos registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <ItemModal
          key={`${activeTab}-${editingItem?.SV_IDSERVICIO_PK || editingItem?.PR_IDPRODUCTO_PK || 'new'}`}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          editingItem={editingItem}
          type={activeTab === 'servicios' ? 'service' : 'product'}
        />
      </div>
    </LoadingGate>
  )
}

