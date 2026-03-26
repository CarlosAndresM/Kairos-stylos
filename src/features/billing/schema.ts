import { z } from 'zod';

// Detalle de servicio en la factura
export const invoiceServiceSchema = z.object({
  FD_IDDETALLE_PK: z.number().optional().nullable(), // PK real de la DB para edición
  tempId: z.string().optional(), // Para vinculación en frontend antes de guardar
  SV_IDSERVICIO_FK: z.number({ required_error: 'Seleccione un servicio' }),
  TR_IDTECNICO_FK: z.number({ required_error: 'Seleccione un técnico' }),
  FD_VALOR: z.coerce.number().min(0, 'El valor no puede ser negativo'),
  products: z.array(z.object({
    FP_IDFACTURA_PRODUCTO_PK: z.number().optional().nullable(), // PK real
    PR_IDPRODUCTO_FK: z.number({ required_error: 'Seleccione un producto' }),
    TR_IDTECNICO_FK: z.number({ required_error: 'Seleccione un técnico' }),
    FP_VALOR: z.coerce.number().min(0, 'El valor no puede ser negativo'),
    FD_IDDETALLE_FK: z.any().optional().nullable(), // FK al servicio (puede ser string tempId o number PK)
  })).optional().default([]),
});

// Detalle de producto en la factura (Venta directa o independiente)
export const invoiceProductSchema = z.object({
  FP_IDFACTURA_PRODUCTO_PK: z.number().optional().nullable(),
  PR_IDPRODUCTO_FK: z.number({ required_error: 'Seleccione un producto' }),
  TR_IDTECNICO_FK: z.number({ required_error: 'Seleccione un técnico' }),
  FP_VALOR: z.coerce.number().min(0, 'El valor no puede ser negativo'),
  FD_IDDETALLE_FK: z.any().optional().nullable(),
});

// Desglose de pagos mixtos
export const paymentDetailSchema = z.object({
  MP_IDMETODO_FK: z.number({ required_error: 'Seleccione un método de pago' }),
  PF_VALOR: z.coerce.number().min(0, 'El monto no puede ser negativo'),
  PF_EVIDENCIA_URL: z.string().optional().nullable(),
});

// Esquema principal de la factura
export const invoiceSchema = z.object({
  FC_IDFACTURA_PK: z.number().optional(),
  FC_NUMERO_FACTURA: z.string().regex(/^\d*$/, 'El número de factura debe ser numérico').optional().nullable(),
  FC_FECHA: z.date().default(() => new Date()),
  FC_TIPO_CLIENTE: z.enum(['CLIENTE', 'TECNICO']).default('CLIENTE'),
  TR_IDCLIENTE_FK: z.number().optional().nullable(),
  isVale: z.boolean().default(false),
  VL_NUMERO_CUOTAS: z.coerce.number().min(1, 'Mínimo 1 cuota').default(1),
  VL_FECHA_INICIO_COBRO: z.date().optional().nullable(),
  FC_CLIENTE_NOMBRE: z.string().optional().nullable(),
  FC_CLIENTE_TELEFONO: z.string().optional().nullable(),
  SC_IDSUCURSAL_FK: z.number(),
  TR_IDCAJERO_FK: z.number(),
  
  // Listas dinámicas
  services: z.array(invoiceServiceSchema).min(1, 'Debe agregar al menos un servicio'),
  products: z.array(invoiceProductSchema).optional().default([]),
  payments: z.array(paymentDetailSchema).min(1, 'Debe definir al menos un método de pago'),
  
  FC_ESTADO: z.enum(['PENDIENTE', 'PAGADO', 'CANCELADO']).default('PENDIENTE'),
  FC_TOTAL: z.number().default(0),
  FC_EVIDENCIA_FISICA_URL: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.FC_TIPO_CLIENTE === 'CLIENTE') {
    if (!data.FC_CLIENTE_NOMBRE || data.FC_CLIENTE_NOMBRE.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El nombre del cliente es obligatorio',
        path: ['FC_CLIENTE_NOMBRE'],
      });
    }
    if (!data.FC_CLIENTE_TELEFONO || data.FC_CLIENTE_TELEFONO.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El teléfono del cliente es obligatorio',
        path: ['FC_CLIENTE_TELEFONO'],
      });
    }
  }
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type InvoiceServiceData = z.infer<typeof invoiceServiceSchema>;
export type InvoiceProductData = z.infer<typeof invoiceProductSchema>;
export type PaymentDetailData = z.infer<typeof paymentDetailSchema>;
