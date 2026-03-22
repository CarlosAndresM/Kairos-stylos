'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { ValeFormData, valeSchema } from "./schema";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";

/**
 * Crear un vale y generar su plan de cuotas semanales
 */
export async function crearValeCompletado(data: ValeFormData): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    const validated = valeSchema.parse(data);
    await connection.beginTransaction();

    const valorCuota = validated.VL_VALOR_TOTAL / validated.VL_NUMERO_CUOTAS;

    // 1. Insertar Vale principal
    const [valeResult]: any = await (connection as any).execute(
      `INSERT INTO KS_VALES (VL_VALOR_TOTAL, VL_NUMERO_CUOTAS, VL_VALOR_CUOTA, VL_ESTADO, VL_FECHA_INICIO_COBRO, TR_IDTRABAJADOR_FK, FC_IDFACTURA_FK)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.VL_VALOR_TOTAL,
        validated.VL_NUMERO_CUOTAS,
        valorCuota,
        'PENDIENTE',
        validated.VL_FECHA_INICIO_COBRO,
        validated.TR_IDTRABAJADOR_FK,
        validated.FC_IDFACTURA_FK || null
      ]
    );

    const valeId = valeResult.insertId;

    // 2. Generar Plan de Cuotas Semanales
    for (let i = 0; i < validated.VL_NUMERO_CUOTAS; i++) {
        const fechaCobro = addDays(validated.VL_FECHA_INICIO_COBRO, i * 7);
        await (connection as any).execute(
          `INSERT INTO KS_VALE_CUOTAS (VC_NUMERO_CUOTA, VC_VALOR_CUOTA, VC_ESTADO, VC_FECHA_COBRO, VL_IDVALE_FK)
           VALUES (?, ?, ?, ?, ?)`,
          [i + 1, valorCuota, 'PENDIENTE', fechaCobro, valeId]
        );
    }

    await connection.commit();
    revalidatePath("/dashboard/trabajadores");
    return { success: true, message: `Vale creado con ${validated.VL_NUMERO_CUOTAS} cuotas semanales.` };

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al crear vale:", error);
    return { success: false, error: "Error al crear el vale" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Obtener cuotas pendientes para una nómina (dentro de un rango de fechas)
 */
export async function getCuotasPendientes(workerId: number, startDate: Date, endDate: Date): Promise<ApiResponse> {
    try {
        const [rows] = await db.query(
          `SELECT vc.*, vl.VL_VALOR_TOTAL 
           FROM KS_VALE_CUOTAS vc 
           JOIN KS_VALES vl ON vc.VL_IDVALE_FK = vl.VL_IDVALE_PK
           WHERE vl.TR_IDTRABAJADOR_FK = ? 
           AND vc.VC_ESTADO = 'PENDIENTE'
           AND vc.VC_FECHA_COBRO BETWEEN ? AND ?`,
          [workerId, startDate, endDate]
        ) as any;
        return { success: true, data: rows };
    } catch (error) {
        return { success: false, error: "Error al obtener cuotas" };
    }
}
