import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function getAdelantos(sucursalId?: number) {
  const params: any[] = [];
  let query = `
    SELECT 
      a.*, 
      t.TR_NOMBRE,
      r.RL_NOMBRE
    FROM KS_ADELANTOS a
    JOIN KS_TRABAJADORES t ON a.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
    JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
    WHERE 1=1
  `;

  if (sucursalId) {
    query += ` AND t.SC_IDSUCURSAL_FK = ?`;
    params.push(sucursalId);
  }

  query += ` ORDER BY a.AD_FECHA_CREACION DESC`;

  const [rows] = await db.query<RowDataPacket[]>(query, params);
  return rows;
}

export async function getAdelantosPendientes() {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT 
      a.*, 
      t.TR_NOMBRE,
      r.RL_NOMBRE
    FROM KS_ADELANTOS a
    JOIN KS_TRABAJADORES t ON a.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
    JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
    WHERE a.AD_ESTADO = 'PENDIENTE'
    ORDER BY a.AD_FECHA_CREACION DESC
  `);
  return rows;
}

export async function getAdelantosByTrabajador(trabajadorId: number) {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT 
      a.*, 
      t.TR_NOMBRE,
      r.RL_NOMBRE
    FROM KS_ADELANTOS a
    JOIN KS_TRABAJADORES t ON a.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
    JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
    WHERE a.TR_IDTRABAJADOR_FK = ?
    ORDER BY a.AD_FECHA_CREACION DESC
  `, [trabajadorId]);
  return rows;
}
