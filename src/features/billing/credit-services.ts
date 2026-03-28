'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
import { finalizeUpload } from "@/lib/file-utils";
import { toLocalDateString } from "@/lib/date-utils";

/**
 * Obtener créditos (por defecto solo pendientes)
 */
export async function getCredits(all: boolean = false): Promise<ApiResponse> {
  try {
    let query = `
      SELECT 
        c.CR_IDCREDITO_PK,
        c.CR_VALOR_PENDIENTE,
        c.CR_FECHA,
        f.FC_NUMERO_FACTURA,
        COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as cliente_display,
        f.FC_CLIENTE_TELEFONO,
        f.FC_TOTAL,
        s.SC_NOMBRE as sucursal_nombre,
        (SELECT GROUP_CONCAT(DISTINCT sv.SV_NOMBRE SEPARATOR ', ') 
         FROM KS_FACTURA_DETALLES fd 
         JOIN KS_SERVICIOS sv ON fd.SV_IDSERVICIO_FK = sv.SV_IDSERVICIO_PK 
         WHERE fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK) as servicios
      FROM KS_CREDITOS c
      JOIN KS_FACTURAS f ON c.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
      JOIN KS_SUCURSALES s ON f.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
      LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
    `;

    if (!all) {
      query += " WHERE c.CR_VALOR_PENDIENTE > 0 ";
    }

    query += " ORDER BY c.CR_FECHA DESC ";

    const [rows]: any = await db.execute(query);
    const normalized = (rows || []).map((r: any) => ({
      ...r,
      CR_VALOR_PENDIENTE: Number(r.CR_VALOR_PENDIENTE || 0),
      FC_TOTAL: Number(r.FC_TOTAL || 0)
    }));
    return { success: true, data: normalized, error: null };
  } catch (error) {
    console.error("Error fetching credits:", error);
    return { success: false, data: null, error: "Error al obtener créditos" };
  }
}

/**
 * Registrar un pago/abono a un crédito con historial y evidencia
 */
export async function payCredit(
  creditId: number,
  amount: number,
  params?: { date?: Date, evidenceUrl?: string }
): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener crédito actual
    const [credits]: any = await connection.execute(
      "SELECT CR_VALOR_PENDIENTE, FC_IDFACTURA_FK, FC_NUMERO_FACTURA FROM KS_CREDITOS c JOIN KS_FACTURAS f ON c.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK WHERE CR_IDCREDITO_PK = ?",
      [creditId]
    );

    if (credits.length === 0) {
      throw new Error("Crédito no encontrado");
    }

    const { CR_VALOR_PENDIENTE, FC_IDFACTURA_FK, FC_NUMERO_FACTURA } = credits[0];
    const newBalance = Number(CR_VALOR_PENDIENTE) - amount;

    if (newBalance < -0.01) {
      throw new Error("El monto del pago excede el saldo pendiente");
    }

    // 1.5 Finalizar carga de evidencia si existe
    let finalEvidenceUrl = params?.evidenceUrl;
    if (finalEvidenceUrl && finalEvidenceUrl.includes('/temp/')) {
      finalEvidenceUrl = await finalizeUpload(finalEvidenceUrl, `ABONO-${FC_NUMERO_FACTURA}-${Date.now()}`);
    }

    // 2. Actualizar balance
    await connection.execute(
      "UPDATE KS_CREDITOS SET CR_VALOR_PENDIENTE = ? WHERE CR_IDCREDITO_PK = ?",
      [Math.max(0, newBalance), creditId]
    );

    // 3. Registrar Abono (Trazabilidad)
    await connection.execute(
      "INSERT INTO KS_CREDITO_ABONOS (AB_VALOR, AB_FECHA, AB_EVIDENCIA_URL, CR_IDCREDITO_FK) VALUES (?, ?, ?, ?)",
      [amount, toLocalDateString(params?.date || new Date()), finalEvidenceUrl || null, creditId]
    );

    // 4. Si se pagó todo, actualizar estado de factura
    if (newBalance <= 0) {
      await connection.execute(
        "UPDATE KS_FACTURAS SET FC_ESTADO = 'PAGADO' WHERE FC_IDFACTURA_PK = ?",
        [FC_IDFACTURA_FK]
      );
    }

    await connection.commit();
    revalidatePath("/dashboard/creditos");
    revalidatePath("/dashboard");
    return { success: true, data: null, error: null };
  } catch (error: any) {
    if (connection) await connection.rollback();
    return { success: false, data: null, error: error.message || "Error al pagar crédito" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Obtener historial de abonos de un crédito
 */
export async function getCreditHistory(creditId: number): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.execute(
      "SELECT AB_IDABONO_PK, AB_VALOR, AB_FECHA, AB_EVIDENCIA_URL FROM KS_CREDITO_ABONOS WHERE CR_IDCREDITO_FK = ? ORDER BY AB_FECHA DESC",
      [creditId]
    );
    const normalized = (rows || []).map((r: any) => ({
      ...r,
      AB_VALOR: Number(r.AB_VALOR || 0)
    }));
    return { success: true, data: normalized, error: null };
  } catch (error) {
    console.error("Error fetching credit history:", error);
    return { success: false, data: null, error: "Error al obtener historial de abonos" };
  }
}
