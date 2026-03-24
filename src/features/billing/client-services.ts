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
        FC_CLIENTE_TELEFONO as telefono,
        MAX(FC_CLIENTE_NOMBRE) as nombre,
        COUNT(*) as total_visitas,
        SUM(FC_TOTAL) as total_gastado,
        MAX(FC_FECHA) as ultima_visita,
        SUM(CASE WHEN FC_ESTADO = 'PENDIENTE' THEN FC_TOTAL ELSE 0 END) as deuda_pendiente
       FROM KS_FACTURAS
       WHERE 1=1
    `;

    if (sucursalId) {
      query += ` AND SC_IDSUCURSAL_FK = ?`;
      params.push(sucursalId);
    }

    query += ` GROUP BY FC_CLIENTE_TELEFONO ORDER BY ultima_visita DESC`;

    const [rows] = await db.execute(query, params);
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching dynamic clients:", error);
    return { success: false, data: null, error: "Error al obtener clientes" };
  }
}
