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
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { workerSchema, WorkerFormData } from '@/features/trabajadores/schema'
import { Loader2 } from 'lucide-react'

interface WorkerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: WorkerFormData) => Promise<void>
  editingWorker?: any
  roles: any[]
  sedes: any[]
}

export function WorkerModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingWorker, 
  roles, 
  sedes 
}: WorkerModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      TR_IDTRABAJADOR_PK: editingWorker?.TR_IDTRABAJADOR_PK,
      TR_NOMBRE: editingWorker?.TR_NOMBRE || '',
      TR_TELEFONO: editingWorker?.TR_TELEFONO || '',
      TR_PASSWORD: '',
      TR_ACTIVO: editingWorker ? !!editingWorker.TR_ACTIVO : true,
      RL_IDROL_FK: editingWorker?.RL_IDROL_FK,
      SC_IDSUCURSAL_FK: editingWorker?.SC_IDSUCURSAL_FK,
      TR_SUELDO_BASE: editingWorker?.TR_SUELDO_BASE || 0,
    }
  })

  // Reset form when editingWorker changes
  React.useEffect(() => {
    if (editingWorker) {
      form.reset({
        TR_IDTRABAJADOR_PK: editingWorker.TR_IDTRABAJADOR_PK,
        TR_NOMBRE: editingWorker.TR_NOMBRE,
        TR_TELEFONO: editingWorker.TR_TELEFONO || '',
        TR_PASSWORD: '',
        TR_ACTIVO: !!editingWorker.TR_ACTIVO,
        RL_IDROL_FK: editingWorker.RL_IDROL_FK,
        SC_IDSUCURSAL_FK: editingWorker.SC_IDSUCURSAL_FK,
        TR_SUELDO_BASE: editingWorker.TR_SUELDO_BASE || 0,
      })
    } else {
      form.reset({
        TR_IDTRABAJADOR_PK: undefined,
        TR_NOMBRE: '',
        TR_TELEFONO: '',
        TR_PASSWORD: '',
        TR_ACTIVO: true,
        RL_IDROL_FK: undefined,
        SC_IDSUCURSAL_FK: undefined,
        TR_SUELDO_BASE: 0,
      })
    }
  }, [editingWorker, form, isOpen])

  const onSubmit = async (data: WorkerFormData) => {
    setIsSubmitting(true)
    try {
      await onSave(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-slate-200 dark:border-slate-800 rounded-[32px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">
            {editingWorker ? 'Editar Trabajador' : 'Nuevo Trabajador'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="TR_NOMBRE"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Juan Pérez" {...field} className="rounded-xl border-slate-200 focus:ring-[#FF7E5F] focus:border-[#FF7E5F]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="TR_TELEFONO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="3001234567" {...field} value={field.value || ''} className="rounded-xl border-slate-200" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="TR_PASSWORD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={editingWorker ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"} {...field} className="rounded-xl border-slate-200" autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="RL_IDROL_FK"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Rol</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-slate-200">
                            <SelectValue placeholder="Seleccione un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {roles.map((role) => (
                            <SelectItem key={role.RL_IDROL_PK} value={role.RL_IDROL_PK.toString()}>
                              {role.RL_NOMBRE.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="SC_IDSUCURSAL_FK"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Sucursal</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === 'none' ? null : parseInt(val))} 
                        value={field.value?.toString() || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-slate-200">
                            <SelectValue placeholder="Seleccione sucursal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none">Sin sucursal (Global)</SelectItem>
                          {sedes.map((sede) => (
                            <SelectItem key={sede.SC_IDSUCURSAL_PK} value={sede.SC_IDSUCURSAL_PK.toString()}>
                              {sede.SC_NOMBRE}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="TR_SUELDO_BASE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700 dark:text-slate-300">Sueldo Base ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} className="rounded-xl border-slate-200" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="TR_ACTIVO"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
                    <div className="space-y-0.5">
                      <FormLabel className="font-bold">Estado de Cuenta</FormLabel>
                      <p className="text-xs text-slate-500 italic">Desactiva para impedir el acceso al sistema.</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-[#FF7E5F]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:opacity-90 text-white font-bold rounded-xl px-8 shadow-lg shadow-orange-500/20"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingWorker ? 'Guardar Cambios' : 'Crear Trabajador'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
