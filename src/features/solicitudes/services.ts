'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { SolicitudProductoFormData } from "./schema";
import { revalidatePath } from "next/cache";
import { toLocalDateString } from "@/lib/date-utils";

export async function createSolicitud(data: SolicitudProductoFormData): Promise<ApiResponse> {
  try {
    const [result]: any = await db.execute(
      `INSERT INTO KS_SOLICITUDES_PRODUCTOS 
       (PR_IDPRODUCTO_FK, SC_IDSUCURSAL_FK, TR_IDTRABAJADOR_FK, SP_CANTIDAD, SP_ESTADO, SP_COMENTARIOS) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.PR_IDPRODUCTO_FK,
        data.SC_IDSUCURSAL_FK,
        data.TR_IDTRABAJADOR_FK || null,
        data.SP_CANTIDAD,
        'PENDIENTE',
        data.SP_COMENTARIOS || null
      ]
    );

    revalidatePath("/dashboard/solicitudes");
    return { success: true, data: { id: result.insertId }, error: null };
  } catch (error) {
    console.error("Error creating solicitud:", error);
    return { success: false, data: null, error: "Error al crear la solicitud" };
  }
}

export async function updateSolicitudStatus(id: number, status: 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO'): Promise<ApiResponse> {
  try {
    const isEntregado = status === 'ENTREGADO';
    const fechaEntrega = isEntregado ? new Date() : null;

    await db.execute(
      `UPDATE KS_SOLICITUDES_PRODUCTOS SET 
       SP_ESTADO = ?, 
       SP_FECHA_ENTREGA = ? 
       WHERE SP_IDSOLICITUD_PK = ?`,
      [status, toLocalDateString(fechaEntrega), id]
    );

    revalidatePath("/dashboard/solicitudes");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, data: null, error: "Error al actualizar el estado" };
  }
}

export async function deleteSolicitud(id: number): Promise<ApiResponse> {
  try {
    await db.execute("DELETE FROM KS_SOLICITUDES_PRODUCTOS WHERE SP_IDSOLICITUD_PK = ?", [id]);
    revalidatePath("/dashboard/solicitudes");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error deleting solicitud:", error);
    return { success: false, data: null, error: "Error al eliminar la solicitud" };
  }
}
