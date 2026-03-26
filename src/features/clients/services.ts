'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";

/**
 * Busca clientes únicos (combinación de nombre y teléfono) en el historial de facturas.
 */
export async function getClients(search?: string): Promise<ApiResponse> {
  try {
    let query = `
      SELECT DISTINCT fc_cliente_nombre AS CL_NOMBRE, fc_cliente_telefono AS CL_TELEFONO 
      FROM ks_facturas 
      WHERE fc_tipo_cliente = 'CLIENTE' AND fc_cliente_nombre IS NOT NULL AND fc_cliente_telefono IS NOT NULL
    `;
    const params: any[] = [];

    if (search) {
      query += " AND (fc_cliente_nombre LIKE ? OR fc_cliente_telefono LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY fc_cliente_nombre ASC LIMIT 1000";
    
    const [rows] = await db.execute(query, params);
    
    // Mapear a un formato compatible con el autocomplete (añadir un ID ficticio para el componente si es necesario)
    const formattedRows = (rows as any[]).map((row, index) => ({
      ...row,
      CL_IDCLIENTE_PK: `history-${index}` // ID temporal para manejo en UI
    }));

    return { success: true, data: formattedRows, error: null };
  } catch (error) {
    console.error("Error fetching clients from history:", error);
    return { success: false, data: null, error: "Error al obtener el historial de clientes" };
  }
}

// Estos servicios ya no son necesarios sin tabla KS_CLIENTES, 
// pero los dejamos vacíos o comentados para evitar errores de importación si existen
export async function saveClient(): Promise<ApiResponse> {
  return { success: false, data: null, error: "Gestión de clientes deshabilitada (Basado en historial)" };
}

export async function deleteClient(): Promise<ApiResponse> {
  return { success: false, data: null, error: "Operación no permitida" };
}
