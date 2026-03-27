import { z } from 'zod';

export const nominaConfigSchema = z.object({
  NC_IDCONFIG_PK: z.number().optional(),
  NC_PORCENTAJE_SERVICIO: z.coerce.number().min(0).max(100),
  NC_PORCENTAJE_PRODUCTO: z.coerce.number().min(0).max(100),
  NC_FECHA_INICIO: z.coerce.date({ required_error: 'La fecha de inicio es obligatoria' }),
});

export type NominaConfigData = z.infer<typeof nominaConfigSchema>;

// Esquema para la nómina semanal
export const nominaBatchSchema = z.object({
  NM_IDNOMINA_PK: z.number().optional(),
  NM_FECHA_INICIO: z.date(),
  NM_FECHA_FIN: z.date(),
  NM_TOTAL_PAGADO: z.number().default(0),
  NM_ESTADO: z.enum(['PROCESANDO', 'CERRADA', 'CONFIRMADA', 'ANULADA']).default('PROCESANDO'),
  NM_FECHA_CIERRE: z.date().nullable().optional(),
});

export type NominaBatchData = z.infer<typeof nominaBatchSchema>;

export interface NominaDetailData {
  ND_IDDETALLE_PK?: number;
  NM_IDNOMINA_FK: number;
  TR_IDTRABAJADOR_FK: number;
  TR_NOMBRE: string;
  ND_BASE: number;
  ND_COMISIONES: number;
  ND_BONOS: number;
  ND_DEDUCCIONES_SERVICIOS_TRABAJADOR: number;
  ND_DEDUCCIONES_VALES: number;
  ND_TOTAL_NETO: number;
}
