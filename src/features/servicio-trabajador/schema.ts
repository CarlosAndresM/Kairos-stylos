import { z } from 'zod';

export const cuotaServicioSchema = z.object({
  STC_IDCUOTA_PK: z.number().optional(),
  STC_NUMERO_CUOTA: z.number(),
  STC_VALOR_CUOTA: z.number(),
  STC_ESTADO: z.enum(['PENDIENTE', 'PAGADO', 'CANCELADO']).default('PENDIENTE'),
  STC_FECHA_COBRO: z.date(),
  ST_IDSERVICIO_TRABAJADOR_FK: z.number().optional(),
});

export const servicioTrabajadorSchema = z.object({
  ST_IDSERVICIO_TRABAJADOR_PK: z.number().optional(),
  ST_VALOR_TOTAL: z.coerce.number().min(500, 'El monto mínimo es $500'),
  ST_NUMERO_CUOTAS: z.coerce.number().min(1, 'Mínimo 1 cuota'),
  ST_FECHA_INICIO_COBRO: z.date({ required_error: 'Seleccione la fecha de inicio de cobro' }),
  TR_IDTRABAJADOR_FK: z.number({ required_error: 'Seleccione un trabajador' }),
  FC_IDFACTURA_FK: z.number().optional().nullable(),
  ST_ESTADO: z.enum(['PENDIENTE', 'PAGADO', 'CANCELADO']).default('PENDIENTE'),
});

export type ServicioTrabajadorFormData = z.infer<typeof servicioTrabajadorSchema>;
export type CuotaServicioData = z.infer<typeof cuotaServicioSchema>;
