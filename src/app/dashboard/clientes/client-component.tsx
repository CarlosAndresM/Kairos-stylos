'use client'

import * as React from 'react'
import { Search, User, Phone, Calendar, DollarSign } from 'lucide-react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TableFilter } from '@/components/ui/table-filter'
import { LoadingGate } from '@/components/ui/loading-gate'

interface ClientClientProps {
  initialClients: any[]
}

export function ClientClient({ initialClients }: ClientClientProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [activeFilters, setActiveFilters] = React.useState<{ [key: string]: string[] }>({})

  const filteredClients = React.useMemo(() => {
    return initialClients.filter(c => {
      const searchMatch = !searchTerm ||
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telefono.includes(searchTerm);

      if (!searchMatch) return false;

      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;
        
        let val = '';
        if (col === 'has_debt') {
          const hasDebt = Number(c.deuda_pendiente) > 0;
          val = hasDebt ? 'CON DEUDA' : 'SIN DEUDA';
        } else {
          val = c[col]?.toString() || '';
        }

        if (!values.includes(val)) return false;
      }
      return true;
    });
  }, [initialClients, searchTerm, activeFilters])

  const getFilterOptions = (col: string) => {
    if (col === 'has_debt') return ['CON DEUDA', 'SIN DEUDA'];
    return Array.from(new Set(initialClients.map(c => c[col]?.toString() || ''))).filter(Boolean).sort();
  }

  const handleFilterChange = (col: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [col]: values }))
  }

  return (
    <LoadingGate>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            placeholder="Buscar por cliente..."
            className="pl-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 py-0 px-4">
                <TableFilter 
                  label="Cliente" 
                  options={getFilterOptions('nombre')}
                  selectedValues={activeFilters['nombre'] || []}
                  onFilterChange={(vals: string[]) => handleFilterChange('nombre', vals)}
                />
              </TableHead>
              <TableHead className="h-10 py-0 px-4 w-[150px]">
                <TableFilter 
                  label="Teléfono" 
                  options={getFilterOptions('telefono')}
                  selectedValues={activeFilters['telefono'] || []}
                  onFilterChange={(vals: string[]) => handleFilterChange('telefono', vals)}
                />
              </TableHead>
              <TableHead className="h-10 py-0 px-4 font-black text-slate-500 uppercase tracking-widest text-[10px] text-center w-[100px]">Visitas</TableHead>
              <TableHead className="h-10 py-0 px-4 font-black text-slate-500 uppercase tracking-widest text-[10px] text-right w-[140px]">Total Gastado</TableHead>
              <TableHead className="h-10 py-0 px-4 font-black text-slate-500 uppercase tracking-widest text-[10px] w-[140px]">Última Visita</TableHead>
              <TableHead className="h-10 py-0 px-4 text-right w-[140px]">
                <TableFilter 
                  label="Deuda" 
                  align="right"
                  options={getFilterOptions('has_debt')}
                  selectedValues={activeFilters['has_debt'] || []}
                  onFilterChange={(vals: string[]) => handleFilterChange('has_debt', vals)}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const hasDebt = Number(client.deuda_pendiente) > 0;
                return (
                  <TableRow key={client.telefono} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
                    <TableCell className="py-2 px-4">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate block">
                        {client.nombre}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {client.telefono}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-center">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        {client.total_visitas}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-right">
                      <span className="text-xs font-black text-emerald-600 text-right">
                        ${Number(client.total_gastado).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-4 text-[10px] text-slate-500">
                      {format(new Date(client.ultima_visita), "d MMM, yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="py-2 px-4 text-right">
                      {hasDebt ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border bg-red-50 text-red-600 border-red-200 shadow-sm">
                          ${Number(client.deuda_pendiente).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">---</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <User className="size-8 mb-2 opacity-20" />
                    <p>No se encontraron clientes</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>
      </div>
    </LoadingGate>
  )
}
