'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";

/**
 * Obtener todos los créditos pendientes
 */
export async function getCredits(): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.execute(`
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
      WHERE c.CR_VALOR_PENDIENTE > 0
      ORDER BY c.CR_FECHA DESC
    `);
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching credits:", error);
    return { success: false, data: null, error: "Error al obtener créditos" };
  }
}

/**
 * Registrar un pago/abono a un crédito
 */
export async function payCredit(creditId: number, amount: number): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener crédito actual
    const [credits]: any = await connection.execute(
      "SELECT CR_VALOR_PENDIENTE, FC_IDFACTURA_FK FROM KS_CREDITOS WHERE CR_IDCREDITO_PK = ?",
      [creditId]
    );

    if (credits.length === 0) {
      throw new Error("Crédito no encontrado");
    }

    const { CR_VALOR_PENDIENTE, FC_IDFACTURA_FK } = credits[0];
    const newBalance = Number(CR_VALOR_PENDIENTE) - amount;

    if (newBalance < -0.01) {
      throw new Error("El monto del pago excede el saldo pendiente");
    }

    // 2. Actualizar balance
    await connection.execute(
      "UPDATE KS_CREDITOS SET CR_VALOR_PENDIENTE = ? WHERE CR_IDCREDITO_PK = ?",
      [Math.max(0, newBalance), creditId]
    );

    // 3. Si se pagó todo, actualizar estado de factura
    if (newBalance <= 0) {
      await connection.execute(
        "UPDATE KS_FACTURAS SET FC_ESTADO = 'PAGADO' WHERE FC_IDFACTURA_PK = ?",
        [FC_IDFACTURA_FK]
      );
    }

    // 4. Registrar en pagos factura para historial
    // NOTA: Para unificar, podríamos usar la tabla de pagos existente
    // pero tendríamos que saber qué método de pago usó.
    // Como simplificación por ahora, solo actualizamos el balance.

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
