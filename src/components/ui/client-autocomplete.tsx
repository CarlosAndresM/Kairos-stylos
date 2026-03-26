'use client'

import * as React from 'react'
import { Search, Loader2, User, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface Client {
  CL_IDCLIENTE_PK: number | string
  CL_NOMBRE: string
  CL_TELEFONO: string
}

interface ClientAutocompleteProps {
  value: string
  onValueChange: (value: string) => void
  onClientSelect: (client: Client) => void
  clients: Client[]
  placeholder?: string
  disabled?: boolean
  icon?: 'user' | 'phone'
}

export function ClientAutocomplete({
  value,
  onValueChange,
  onClientSelect,
  clients: allClients,
  placeholder,
  disabled,
  icon = 'user'
}: ClientAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [filteredClients, setFilteredClients] = React.useState<Client[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Filtrado local
  React.useEffect(() => {
    if (!value || value.length < 1) {
      setFilteredClients([])
      return
    }
    
    const search = value.toLowerCase()
    const found = allClients.filter(c => 
      (c.CL_NOMBRE?.toLowerCase() || '').includes(search) || 
      (c.CL_TELEFONO?.toLowerCase() || '').includes(search)
    ).slice(0, 20)
    
    setFilteredClients(found)
  }, [value, allClients])

  // Cerrar al hacer click afuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon === 'user' ? <User className="size-4" /> : <Phone className="size-4" />}
        </div>
        <Input
          value={value || ''}
          onChange={(e) => {
            onValueChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-9 bg-white border-slate-200 focus:border-[#FF7E5F] focus:ring-[#FF7E5F]/20 transition-all", 
            open && filteredClients.length > 0 && "rounded-b-none border-b-transparent shadow-sm")}
          autoComplete="off"
        />
        {/* Removido el spinner de carga para búsqueda local instantánea */}
      </div>

      {open && filteredClients.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-slate-200 border-t-0 rounded-b-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          <ul className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
            {filteredClients.map((client) => (
              <li
                key={client.CL_IDCLIENTE_PK}
                className="px-4 py-3 hover:bg-[#FF7E5F]/5 cursor-pointer flex flex-col group transition-colors border-b border-slate-50 last:border-0"
                onClick={() => {
                  onClientSelect(client)
                  setOpen(false)
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 group-hover:text-[#FF7E5F] transition-colors">{client.CL_NOMBRE}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase font-sans">Historial</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-500">
                  <Phone className="size-3 text-slate-400" />
                  <span className="text-xs">{client.CL_TELEFONO}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Sugerencias: {filteredClients.length}</span>
            <span className="text-[9px] text-[#FF7E5F] font-black">Búsqueda Instantánea</span>
          </div>
        </div>
      )}
    </div>
  )
}
