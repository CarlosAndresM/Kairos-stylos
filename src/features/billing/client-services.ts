'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";

/**
 * Obtener listado dinámico de clientes (agrupados por teléfono)
 */
export async function getDynamicClients(sucursalId?: number): Promise<ApiResponse> {
  try {
    const params: any[] = [];
    let query = `
      SELECT 
        COALESCE(f.FC_CLIENTE_TELEFONO, t.TR_TELEFONO, '') as telefono,
        MAX(COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE)) as nombre,
        COUNT(*) as total_visitas,
        SUM(f.FC_TOTAL) as total_gastado,
        MAX(f.FC_FECHA) as ultima_visita,
        SUM(CASE WHEN f.FC_ESTADO = 'PENDIENTE' THEN f.FC_TOTAL ELSE 0 END) as deuda_pendiente
       FROM KS_FACTURAS f
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE 1=1
    `;

    if (sucursalId) {
      query += ` AND f.SC_IDSUCURSAL_FK = ?`;
      params.push(sucursalId);
    }

    query += ` GROUP BY f.FC_CLIENTE_TELEFONO, f.TR_IDCLIENTE_FK ORDER BY ultima_visita DESC`;

    const [rows] = await db.execute(query, params);
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching dynamic clients:", error);
    return { success: false, data: null, error: "Error al obtener clientes" };
  }
}
