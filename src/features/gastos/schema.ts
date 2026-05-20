import { z } from "zod";

export const gastoSchema = z.object({
  GS_IDGASTO_PK: z.number().optional(),
  GS_CONCEPTO: z.string().min(3, "El concepto debe tener al menos 3 caracteres"),
  GS_DESCRIPCION: z.string().optional(),
  GS_VALOR: z.number().positive("El valor debe ser mayor a 0"),
  GS_FECHA: z.coerce.date(),
  SC_IDSUCURSAL_FK: z.number().nullable().optional(),
  GS_COMPROBANTES: z.array(z.string()).nullable().optional(),
});

export type GastoData = z.infer<typeof gastoSchema>;

export type UnifiedGasto = {
  id: number;
  concepto: string;
  descripcion: string;
  fecha: Date;
  valor: number;
  tipo: 'MANUAL' | 'NOMINA';
  sucursal: string;
  comprobantes?: string[] | null;
};
