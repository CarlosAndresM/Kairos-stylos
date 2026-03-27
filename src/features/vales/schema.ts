import { z } from 'zod';

export const CreateValeSchema = z.object({
  TR_IDTRABAJADOR_FK: z.coerce.number({ required_error: 'El trabajador es requerido' }),
  VL_MONTO: z.coerce.number().min(1, 'El monto debe ser mayor a 0'),
  VL_FECHA: z.string().optional(),
  VL_FECHA_DESEMBOLSO: z.string().optional(),
  VL_FECHA_INICIO_COBRO: z.string().optional(),
  VL_CUOTAS: z.coerce.number().min(1, 'Debe ser al menos 1 cuota').default(1),
  VL_OBSERVACIONES: z.string().optional(),
});

export type CreateValeInput = z.infer<typeof CreateValeSchema>;
