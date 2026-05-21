"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxSearchProps {
  options: { label: string; value: string | number }[]
  value?: string | number
  onValueChange: (value: string | number) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function ComboboxSearch({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron resultados.",
  className,
  disabled = false
}: ComboboxSearchProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = React.useMemo(() => {
    return options.find((option) => option.value === value)?.label || placeholder
  }, [options, value, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[200px]" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} autoComplete="off" />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label}__${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
