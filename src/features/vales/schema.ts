import { z } from 'zod';

export const valeCuotaSchema = z.object({
  VC_IDCUOTA_PK: z.number().optional(),
  VC_NUMERO_CUOTA: z.number(),
  VC_VALOR_CUOTA: z.number(),
  VC_ESTADO: z.enum(['PENDIENTE', 'PAGADO', 'CANCELADO']).default('PENDIENTE'),
  VC_FECHA_COBRO: z.date(),
  VL_IDVALE_FK: z.number().optional(),
});

export const valeSchema = z.object({
  VL_IDVALE_PK: z.number().optional(),
  VL_VALOR_TOTAL: z.coerce.number().min(500, 'El monto mínimo es $500'),
  VL_NUMERO_CUOTAS: z.coerce.number().min(1, 'Mínimo 1 cuota'),
  VL_FECHA_INICIO_COBRO: z.date({ required_error: 'Seleccione la fecha de inicio de cobro' }),
  TR_IDTRABAJADOR_FK: z.number({ required_error: 'Seleccione un trabajador' }),
  FC_IDFACTURA_FK: z.number().optional().nullable(),
  VL_ESTADO: z.enum(['PENDIENTE', 'PAGADO', 'CANCELADO']).default('PENDIENTE'),
});

export type ValeFormData = z.infer<typeof valeSchema>;
export type ValeCuotaData = z.infer<typeof valeCuotaSchema>;
