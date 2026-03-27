import { z } from 'zod';

export const serviceSchema = z.object({
  SV_IDSERVICIO_PK: z.number().optional(),
  SV_NOMBRE: z.string().min(1, 'El nombre del servicio es obligatorio').max(255),
  SV_ACTIVO: z.boolean().default(true),
});

export const productSchema = z.object({
  PR_IDPRODUCTO_PK: z.number().optional(),
  PR_NOMBRE: z.string().min(1, 'El nombre del producto es obligatorio').max(255),
  PR_APLICA_COMISION: z.boolean().default(false),
  PR_PORCENTAJE_COMISION: z.coerce.number().min(0).max(100).default(0),
  PR_ACTIVO: z.boolean().default(true),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
