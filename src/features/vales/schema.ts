import { z } from 'zod';

export const CreateAdelantoSchema = z.object({
  TR_IDTRABAJADOR_FK: z.coerce.number({ required_error: 'El trabajador es requerido' }),
  AD_MONTO: z.coerce.number().min(1, 'El monto debe ser mayor a 0'),
  AD_FECHA: z.string().optional(),
  AD_FECHA_DESEMBOLSO: z.string().optional(),
  AD_FECHA_INICIO_COBRO: z.string().optional(),
  AD_CUOTAS: z.coerce.number().min(1, 'Debe ser al menos 1 cuota').default(1),
  AD_OBSERVACIONES: z.string().optional(),
});

export type CreateAdelantoInput = z.infer<typeof CreateAdelantoSchema>;
