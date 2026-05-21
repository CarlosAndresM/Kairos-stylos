import { db } from '@/lib/db';
import { ResultSetHeader } from 'mysql2/promise';
import { CreateValeInput } from '@/features/vales/schema';
import { toLocalDateString } from '@/lib/date-utils';

import { UpdateValeInput } from '@/features/vales/schema';

export async function createValeMutation(data: CreateValeInput) {
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO KS_VALES (TR_IDTRABAJADOR_FK, SC_IDSUCURSAL_FK, VL_MONTO, VL_FECHA, VL_OBSERVACIONES, VL_ESTADO, VL_CUOTAS, VL_FECHA_DESEMBOLSO, VL_FECHA_INICIO_COBRO)
     VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?)`,
    [
      data.TR_IDTRABAJADOR_FK,
      data.SC_IDSUCURSAL_FK,
      data.VL_MONTO,
      toLocalDateString(data.VL_FECHA || data.VL_FECHA_DESEMBOLSO || null),
      data.VL_OBSERVACIONES || null,
      data.VL_CUOTAS || 1,
      toLocalDateString(data.VL_FECHA_DESEMBOLSO || null),
      toLocalDateString(data.VL_FECHA_INICIO_COBRO || null)
    ]
  );
  return result.insertId;
}

export async function updateValeMutation(data: UpdateValeInput) {
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE KS_VALES 
     SET TR_IDTRABAJADOR_FK = ?, SC_IDSUCURSAL_FK = ?, VL_MONTO = ?, VL_FECHA = ?, VL_OBSERVACIONES = ?, VL_CUOTAS = ?, VL_FECHA_DESEMBOLSO = ?, VL_FECHA_INICIO_COBRO = ?
     WHERE VL_IDVALE_PK = ? AND VL_ESTADO = 'PENDIENTE' AND VL_CUOTAS_PAGADAS = 0`,
    [
      data.TR_IDTRABAJADOR_FK,
      data.SC_IDSUCURSAL_FK,
      data.VL_MONTO,
      toLocalDateString(data.VL_FECHA || data.VL_FECHA_DESEMBOLSO || null),
      data.VL_OBSERVACIONES || null,
      data.VL_CUOTAS || 1,
      toLocalDateString(data.VL_FECHA_DESEMBOLSO || null),
      toLocalDateString(data.VL_FECHA_INICIO_COBRO || null),
      data.VL_IDVALE_PK
    ]
  );
  return result.affectedRows > 0;
}

export async function anularValeMutation(idVale: number) {
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE KS_VALES SET VL_ESTADO = 'ANULADO' WHERE VL_IDVALE_PK = ? AND VL_ESTADO = 'PENDIENTE'`,
    [idVale]
  );
  return result.affectedRows > 0;
}

export async function eliminarValeMutation(idVale: number) {
  const [result] = await db.query<ResultSetHeader>(
    `DELETE FROM KS_VALES WHERE VL_IDVALE_PK = ? AND VL_CUOTAS_PAGADAS = 0`,
    [idVale]
  );
  return result.affectedRows > 0;
}

export async function deshacerAnularValeMutation(idVale: number) {
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE KS_VALES SET VL_ESTADO = 'PENDIENTE' WHERE VL_IDVALE_PK = ? AND VL_ESTADO = 'ANULADO'`,
    [idVale]
  );
  return result.affectedRows > 0;
}
