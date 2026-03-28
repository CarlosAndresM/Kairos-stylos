'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
import { GastoData, UnifiedGasto, gastoSchema } from "./schema";
import { toLocalDateString } from "@/lib/date-utils";

/**
 * Obtener lista unificada de gastos (Manuales + Nómina Confirmada)
 */
export async function getUnifiedExpenses(sucursalId?: number): Promise<ApiResponse<UnifiedGasto[]>> {
  try {
    let manualFilter = "";
    const params: any[] = [];

    if (sucursalId) {
      manualFilter = " WHERE GS.SC_IDSUCURSAL_FK = ?";
      params.push(sucursalId);
    }

    const query = `
      SELECT 
        GS_IDGASTO_PK as id, 
        CONVERT(GS_CONCEPTO USING utf8mb4) as concepto, 
        CONVERT(COALESCE(GS_DESCRIPCION, '') USING utf8mb4) as descripcion,
        GS_FECHA as fecha, 
        GS_VALOR as valor, 
        'MANUAL' as tipo,
        CONVERT(COALESCE(SC.SC_NOMBRE, 'GENERAL') USING utf8mb4) as sucursal
      FROM KS_GASTOS GS
      LEFT JOIN KS_SUCURSALES SC ON GS.SC_IDSUCURSAL_FK = SC.SC_IDSUCURSAL_PK
      ${manualFilter}
      
      UNION ALL
      
      SELECT 
        NM_IDNOMINA_PK as id, 
        CONVERT(CONCAT('NÓMINA ', DATE_FORMAT(NM_FECHA_INICIO, '%Y-%m-%d'), ' AL ', DATE_FORMAT(NM_FECHA_FIN, '%Y-%m-%d')) USING utf8mb4) as concepto, 
        CONVERT('PAGO DE NÓMINA CONFIRMADA' USING utf8mb4) as descripcion,
        NM_FECHA_CIERRE as fecha, 
        NM_TOTAL_PAGADO as valor, 
        'NOMINA' as tipo,
        'GENERAL' as sucursal
      FROM KS_NOMINAS
      WHERE NM_ESTADO = 'CONFIRMADA'
      ORDER BY fecha DESC
    `;

    const [rows] = await db.query(query, params) as any;
    return { success: true, data: rows };
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

    const [result]: any = await db.execute(
      `INSERT INTO KS_GASTOS (GS_CONCEPTO, GS_DESCRIPCION, GS_FECHA, GS_VALOR, SC_IDSUCURSAL_FK)
       VALUES (?, ?, ?, ?, ?)`,
      [
        validated.GS_CONCEPTO,
        validated.GS_DESCRIPCION || '',
        toLocalDateString(validated.GS_FECHA),
        validated.GS_VALOR,
        validated.SC_IDSUCURSAL_FK || null
      ]
    );

    revalidatePath("/dashboard/gastos");
    return { success: true, data: result.insertId, message: "Gasto registrado correctamente" };
  } catch (error) {
    console.error("Error createExpense:", error);
    return { success: false, data: null, error: "Error al registrar el gasto" };
  }
}
