import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function getVales(sucursalId?: number) {
  const params: any[] = [];
  let query = `
    SELECT 
      v.*, 
      t.TR_NOMBRE,
      r.RL_NOMBRE
    FROM KS_VALES v
    JOIN KS_TRABAJADORES t ON v.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
    JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
    WHERE 1=1
  `;

  if (sucursalId) {
    query += ` AND t.SC_IDSUCURSAL_FK = ?`;
    params.push(sucursalId);
  }

  query += ` ORDER BY v.VL_FECHA_CREACION DESC`;

  const [rows] = await db.query<RowDataPacket[]>(query, params);
  return rows;
}

export async function getValesPendientes() {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT 
      v.*, 
      t.TR_NOMBRE,
      r.RL_NOMBRE
    FROM KS_VALES v
    JOIN KS_TRABAJADORES t ON v.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
    JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
    WHERE v.VL_ESTADO = 'PENDIENTE'
    ORDER BY v.VL_FECHA_CREACION DESC
  `);
  return rows;
}

export async function getValesByTrabajador(trabajadorId: number) {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT 
      v.*, 
      t.TR_NOMBRE,
      r.RL_NOMBRE
    FROM KS_VALES v
    JOIN KS_TRABAJADORES t ON v.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
    JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
    WHERE v.TR_IDTRABAJADOR_FK = ?
    ORDER BY v.VL_FECHA_CREACION DESC
  `, [trabajadorId]);
  return rows;
}
