import { z } from 'zod';

export const workerSchema = z.object({
  TR_IDTRABAJADOR_PK: z.number().optional(),
  TR_NOMBRE: z.string().min(1, 'El nombre es obligatorio').max(255),
  TR_TELEFONO: z.string().max(20).optional().nullable(),
  TR_PASSWORD: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255).optional().or(z.literal('')),
  TR_ACTIVO: z.coerce.boolean().default(true),
  RL_IDROL_FK: z.coerce.number({ required_error: 'El rol es obligatorio' }).min(1, 'El rol es obligatorio'),
  SC_IDSUCURSAL_FK: z.coerce.number({ required_error: 'La sucursal es obligatoria' }).min(1, 'La sucursal es obligatoria').optional().nullable(),
});

export type WorkerFormData = z.infer<typeof workerSchema>;

export interface WorkerWithStats {
  TR_IDTRABAJADOR_PK: number;
  TR_NOMBRE: string;
  TR_TELEFONO: string | null;
  TR_ACTIVO: boolean;
  RL_IDROL_FK: number;
  RL_NOMBRE: string;
  SC_IDSUCURSAL_FK: number | null;
  SC_NOMBRE: string | null;
  servicios_count: number;
  total_vales: number;
  vales_pendientes: number;
}

export const sedeSchema = z.object({
  SC_IDSUCURSAL_PK: z.number().optional(),
  SC_NOMBRE: z.string().min(1, 'El nombre es obligatorio').max(100),
  SC_DIRECCION: z.string().max(255).optional().nullable(),
});

export type SedeFormData = z.infer<typeof sedeSchema>;
