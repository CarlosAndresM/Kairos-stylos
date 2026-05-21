'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
import { GastoData, UnifiedGasto, gastoSchema } from "./schema";
import { toLocalDateString } from "@/lib/date-utils";
import { finalizeUpload } from "@/lib/file-utils";

/**
 * Obtener lista unificada de gastos (Manuales + Nómina Confirmada)
 * @param sucursalId - Filtrar por sucursal (undefined = todas)
 * @param dateFrom   - Fecha inicio (undefined = sin límite)
 * @param dateTo     - Fecha fin   (undefined = sin límite)
 */
export async function getUnifiedExpenses(
  sucursalId?: number,
  dateFrom?: string,
  dateTo?: string
): Promise<ApiResponse<UnifiedGasto[]>> {
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (sucursalId) {
      conditions.push("GS.SC_IDSUCURSAL_FK = ?");
      params.push(sucursalId);
    }

    if (dateFrom) {
      conditions.push("DATE(GS.GS_FECHA) >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push("DATE(GS.GS_FECHA) <= ?");
      params.push(dateTo);
    }

    const manualWhere = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    // Condiciones para nómina (solo fecha, sin filtro de sucursal ya que nómina es GENERAL)
    const nominaConditions: string[] = [];
    const nominaParams: any[] = [];
    if (dateFrom) { nominaConditions.push("DATE(NM_FECHA_CIERRE) >= ?"); nominaParams.push(dateFrom); }
    if (dateTo)   { nominaConditions.push("DATE(NM_FECHA_CIERRE) <= ?"); nominaParams.push(dateTo); }
    nominaConditions.push("NM_ESTADO = 'CONFIRMADA'");
    const nominaWhere = `WHERE ${nominaConditions.join(" AND ")}`;

    const query = `
      SELECT 
        GS_IDGASTO_PK as id, 
        CONVERT(GS_CONCEPTO USING utf8mb4) as concepto, 
        CONVERT(COALESCE(GS_DESCRIPCION, '') USING utf8mb4) as descripcion,
        GS_FECHA as fecha, 
        GS_VALOR as valor, 
        'MANUAL' as tipo,
        CONVERT(COALESCE(SC.SC_NOMBRE, 'GENERAL') USING utf8mb4) as sucursal,
        GS.SC_IDSUCURSAL_FK as sucursal_id,
        GS_COMPROBANTES as comprobantes_json
      FROM KS_GASTOS GS
      LEFT JOIN KS_SUCURSALES SC ON GS.SC_IDSUCURSAL_FK = SC.SC_IDSUCURSAL_PK
      ${manualWhere}
      
      UNION ALL
      
      SELECT 
        NM_IDNOMINA_PK as id, 
        CONVERT(CONCAT('NÓMINA ', DATE_FORMAT(NM_FECHA_INICIO, '%Y-%m-%d'), ' AL ', DATE_FORMAT(NM_FECHA_FIN, '%Y-%m-%d')) USING utf8mb4) as concepto, 
        CONVERT('PAGO DE NÓMINA CONFIRMADA' USING utf8mb4) as descripcion,
        NM_FECHA_CIERRE as fecha, 
        NM_TOTAL_PAGADO as valor, 
        'NOMINA' as tipo,
        'GENERAL' as sucursal,
        NULL as sucursal_id,
        NULL as comprobantes_json
      FROM KS_NOMINAS
      ${nominaWhere}
      ORDER BY fecha DESC
    `;

    const [rows] = await db.query(query, [...params, ...nominaParams]) as any;
    const data = rows.map((r: any) => ({
      ...r,
      comprobantes: r.comprobantes_json ? (typeof r.comprobantes_json === 'string' ? JSON.parse(r.comprobantes_json) : r.comprobantes_json) : null
    }));
    return { success: true, data };
  } catch (error) {
    console.error("Error getUnifiedExpenses:", error);
    return { success: false, data: null, error: "Error al obtener la lista de gastos" };
  }
}


/**
 * Registrar un gasto manual
 */
export async function createExpense(data: GastoData): Promise<ApiResponse<number>> {
  try {
    const validated = gastoSchema.parse(data);

    let finalComprobantes: string[] = [];
    if (validated.GS_COMPROBANTES && validated.GS_COMPROBANTES.length > 0) {
      for (const url of validated.GS_COMPROBANTES) {
        if (url.includes('/temp/')) {
          const finalUrl = await finalizeUpload(url, `GASTO-${Date.now()}`);
          finalComprobantes.push(finalUrl);
        } else {
          finalComprobantes.push(url);
        }
      }
    }

    const comprobantesJson = finalComprobantes.length > 0 ? JSON.stringify(finalComprobantes) : null;

    const [result]: any = await db.execute(
      `INSERT INTO KS_GASTOS (GS_CONCEPTO, GS_DESCRIPCION, GS_FECHA, GS_VALOR, SC_IDSUCURSAL_FK, GS_COMPROBANTES)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        validated.GS_CONCEPTO,
        validated.GS_DESCRIPCION || '',
        toLocalDateString(validated.GS_FECHA),
        validated.GS_VALOR,
        validated.SC_IDSUCURSAL_FK || null,
        comprobantesJson
      ]
    );

    revalidatePath("/dashboard/gastos");
    return { success: true, data: result.insertId, message: "Gasto registrado correctamente" };
  } catch (error) {
    console.error("Error createExpense:", error);
    return { success: false, data: null, error: "Error al registrar el gasto" };
  }
}

/**
 * Actualizar un gasto manual
 */
export async function updateExpense(data: GastoData): Promise<ApiResponse<null>> {
  try {
    const validated = gastoSchema.parse(data);
    if (!validated.GS_IDGASTO_PK) {
      return { success: false, data: null, error: "ID de gasto es requerido para actualizar" };
    }

    let finalComprobantes: string[] = [];
    if (validated.GS_COMPROBANTES && validated.GS_COMPROBANTES.length > 0) {
      for (const url of validated.GS_COMPROBANTES) {
        if (url.includes('/temp/')) {
          const finalUrl = await finalizeUpload(url, `GASTO-${Date.now()}`);
          finalComprobantes.push(finalUrl);
        } else {
          finalComprobantes.push(url);
        }
      }
    }

    const comprobantesJson = finalComprobantes.length > 0 ? JSON.stringify(finalComprobantes) : null;

    await db.execute(
      `UPDATE KS_GASTOS 
       SET GS_CONCEPTO = ?, GS_DESCRIPCION = ?, GS_FECHA = ?, GS_VALOR = ?, SC_IDSUCURSAL_FK = ?, GS_COMPROBANTES = ?
       WHERE GS_IDGASTO_PK = ?`,
      [
        validated.GS_CONCEPTO,
        validated.GS_DESCRIPCION || '',
        toLocalDateString(validated.GS_FECHA),
        validated.GS_VALOR,
        validated.SC_IDSUCURSAL_FK || null,
        comprobantesJson,
        validated.GS_IDGASTO_PK
      ]
    );

    revalidatePath("/dashboard/gastos");
    return { success: true, data: null, message: "Gasto actualizado correctamente" };
  } catch (error) {
    console.error("Error updateExpense:", error);
    return { success: false, data: null, error: "Error al actualizar el gasto" };
  }
}
