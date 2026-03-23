import { db } from '@/lib/db';
import { ResultSetHeader } from 'mysql2/promise';
import { CreateAdelantoInput } from '@/features/vales/schema';

export async function createAdelantoMutation(data: CreateAdelantoInput) {
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO KS_ADELANTOS (TR_IDTRABAJADOR_FK, AD_MONTO, AD_FECHA, AD_OBSERVACIONES, AD_ESTADO, AD_CUOTAS, AD_FECHA_DESEMBOLSO, AD_FECHA_INICIO_COBRO)
     VALUES (?, ?, ?, ?, 'PENDIENTE', ?, ?, ?)`,
    [
      data.TR_IDTRABAJADOR_FK,
      data.AD_MONTO,
      data.AD_FECHA || null,
      data.AD_OBSERVACIONES || null,
      data.AD_CUOTAS || 1,
      data.AD_FECHA_DESEMBOLSO || null,
      data.AD_FECHA_INICIO_COBRO || null
    ]
  );
  return result.insertId;
}

export async function anularAdelantoMutation(idAdelanto: number) {
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE KS_ADELANTOS SET AD_ESTADO = 'ANULADO' WHERE AD_IDADELANTO_PK = ? AND AD_ESTADO = 'PENDIENTE'`,
    [idAdelanto]
  );
  return result.affectedRows > 0;
}
