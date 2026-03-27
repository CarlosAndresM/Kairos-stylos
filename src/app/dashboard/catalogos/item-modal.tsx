'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { serviceSchema, productSchema } from '@/features/catalog/schema'

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  editingItem: any
  type: 'service' | 'product'
}

export function ItemModal({ isOpen, onClose, onSave, editingItem, type }: ItemModalProps) {
  const schema = type === 'service' ? serviceSchema : productSchema
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    shouldUnregister: true,
    defaultValues: editingItem || (type === 'service' ? {
      SV_NOMBRE: '',
      SV_ACTIVO: true
    } : {
      PR_NOMBRE: '',
      PR_APLICA_COMISION: false,
      PR_PORCENTAJE_COMISION: 0,
      PR_ACTIVO: true
    })
  })

  const { isValid } = form.formState

  const nameField = type === 'service' ? 'SV_NOMBRE' : 'PR_NOMBRE'
  const activeField = type === 'service' ? 'SV_ACTIVO' : 'PR_ACTIVO'

  // Reset form when item changes
  React.useEffect(() => {
    if (editingItem) {
      form.reset({
        [nameField]: editingItem[nameField] || '',
        [activeField]: editingItem[activeField] ?? true,
        ...(type === 'service' 
          ? { 
              SV_IDSERVICIO_PK: editingItem.SV_IDSERVICIO_PK
            } 
          : { 
              PR_IDPRODUCTO_PK: editingItem.PR_IDPRODUCTO_PK,
              PR_APLICA_COMISION: !!editingItem.PR_APLICA_COMISION,
              PR_PORCENTAJE_COMISION: editingItem.PR_PORCENTAJE_COMISION || 0
            }
        )
      })
    } else {
      form.reset(type === 'service' ? {
        SV_NOMBRE: '',
        SV_ACTIVO: true
      } : {
        PR_NOMBRE: '',
        PR_APLICA_COMISION: false,
        PR_PORCENTAJE_COMISION: 0,
        PR_ACTIVO: true
      })
    }
  }, [editingItem, type, form, nameField, activeField])

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      // Ensure ID is included for updates
      const finalData = {
        ...data,
        ...(editingItem?.SV_IDSERVICIO_PK ? { SV_IDSERVICIO_PK: editingItem.SV_IDSERVICIO_PK } : {}),
        ...(editingItem?.PR_IDPRODUCTO_PK ? { PR_IDPRODUCTO_PK: editingItem.PR_IDPRODUCTO_PK } : {}),
      }
      await onSave(finalData)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">
            {editingItem ? 'Editar' : 'Nuevo'} {type === 'service' ? 'Servicio' : 'Producto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name={nameField}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Corte de Cabello" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            {type === 'product' && (
              <>
                <FormField
                  control={form.control}
                  name="PR_APLICA_COMISION"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Aplica Comisión</FormLabel>
                        <p className="text-xs text-muted-foreground italic">
                          ¿El técnico recibe comisión por venderlo?
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('PR_APLICA_COMISION') && (
                  <FormField
                    control={form.control}
                    name="PR_PORCENTAJE_COMISION"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porcentaje de Comisión (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <FormField
              control={form.control}
              name={activeField}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Activo</FormLabel>
                    <p className="text-xs text-muted-foreground italic">
                      ¿Está disponible para la venta?
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !isValid}
                className="bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:opacity-90 text-white font-bold rounded-xl px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
