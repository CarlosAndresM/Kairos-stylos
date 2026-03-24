"use client"

import * as React from "react"
import { Search, Filter, X, Check } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TableFilterProps {
  label: string
  options: string[]
  selectedValues: string[]
  onFilterChange: (values: string[]) => void
  onSearchChange?: (value: string) => void
  disabled?: boolean
  align?: 'left' | 'center' | 'right'
}

export function TableFilter({
  label,
  options,
  selectedValues,
  onFilterChange,
  onSearchChange,
  disabled,
  align = 'left'
}: TableFilterProps) {
  const [mounted, setMounted] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const filteredOptions = React.useMemo(() => {
    return options.filter(opt => 
      opt.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  const toggleValue = (val: string) => {
    const newValues = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val]
    onFilterChange(newValues)
  }

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFilterChange([])
    setSearchValue("")
  }

  const isActive = selectedValues.length > 0

  if (!mounted) {
    return (
      <div className={cn(
        "flex items-center gap-1 select-none py-1 px-2 rounded-md",
        align === 'center' ? "justify-center" : align === 'right' ? "justify-end -mr-2" : "justify-start -ml-2"
      )}>
        <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">{label}</span>
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn(
          "flex items-center gap-1 cursor-pointer group select-none py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors px-2 rounded-md",
          align === 'center' ? "justify-center" : align === 'right' ? "justify-end -mr-2" : "justify-start -ml-2",
          isActive && "text-slate-900 dark:text-white"
        )}>
          <span className={cn(
              "font-black uppercase tracking-widest text-[10px]",
              isActive ? "text-slate-900" : "text-slate-500"
          )}>{label}</span>
          <div className="flex items-center">
            {isActive ? (
                <div className="relative">
                    <Filter className="size-3 text-slate-900" />
                    <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full border border-white" />
                </div>
            ) : (
                <Filter className="size-3 text-slate-300 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 rounded-none border-2 border-kyroy-border shadow-[6px_6px_0px_0px_rgba(255,134,162,0.15)]" align="start">
        <div className="p-2 border-b-2 border-kyroy-border bg-kyroy-pink-light/30">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-orange-300" />
            <Input
              placeholder={`Buscar ${label.toLowerCase()}...`}
              value={searchValue}
              onChange={(e) => {
                  setSearchValue(e.target.value)
                  onSearchChange?.(e.target.value)
              }}
              className="pl-8 h-8 text-xs rounded-none border-kyroy-border focus:ring-0 focus:border-kyroy-pink bg-white font-bold"
              autoComplete="off"
            />
            {searchValue && (
              <X 
                className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 cursor-pointer hover:text-black" 
                onClick={() => setSearchValue("")}
              />
            )}
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto p-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => toggleValue(opt)}
                className="flex items-center justify-between px-2 py-1.5 text-xs font-bold uppercase hover:bg-orange-50/50 cursor-pointer transition-colors"
              >
                <span className="truncate flex-1">{opt || 'SIN VALOR'}</span>
                {selectedValues.includes(opt) && <Check className="size-3.5 text-kyroy-pink" />}
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-[10px] text-slate-400 font-bold uppercase italic">
              No se encontraron coincidencias
            </div>
          )}
        </div>

        {(isActive || searchValue) && (
          <div className="p-2 border-t border-slate-200 flex justify-between gap-2 bg-orange-50/30">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilter}
                className="h-7 text-[9px] font-black uppercase text-red-500 hover:text-red-600 hover:bg-red-50 rounded-none px-2"
            >
              LIMPIAR FILTRO
            </Button>
            <Button 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="h-7 text-[9px] font-black uppercase bg-kyroy-pink text-white hover:bg-orange-600 rounded-none px-4 shadow-[2px_2px_0px_0px_rgba(255,126,95,0.2)]"
            >
              APLICAR
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
