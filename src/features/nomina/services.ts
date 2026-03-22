'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
import { NominaBatchData, NominaConfigData, nominaConfigSchema } from "./schema";

/**
 * Obtener todas las configuraciones ordenadas por fecha reciente
 */
export async function getNominaConfigs(): Promise<ApiResponse<NominaConfigData[]>> {
  try {
    const [rows] = await db.query(
      "SELECT * FROM KS_NOMINA_CONFIG ORDER BY NC_FECHA_INICIO DESC"
    ) as any;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, data: null, error: "Error al obtener configs de nómina" };
  }
}

/**
 * Obtener la configuración vigente para una fecha específica
 */
export async function getConfigForDate(date: Date): Promise<ApiResponse<NominaConfigData>> {
  try {
    const [rows] = await db.query(
      "SELECT * FROM KS_NOMINA_CONFIG WHERE NC_FECHA_INICIO <= ? ORDER BY NC_FECHA_INICIO DESC LIMIT 1",
      [date]
    ) as any;

    if (!rows || rows.length === 0) {
      return {
        success: true,
        data: { NC_IDCONFIG_PK: 0, NC_PORCENTAJE_SERVICIO: 50, NC_PORCENTAJE_PRODUCTO: 100, NC_FECHA_INICIO: new Date('2024-01-01') }
      };
    }

    return { success: true, data: rows[0] };
  } catch (error) {
    console.error("Error getConfigForDate:", error);
    return { success: false, data: null, error: "Error al obtener config vigente" };
  }
}

/**
 * Guardar una nueva parametrización
 */
export async function saveNominaConfig(data: NominaConfigData): Promise<ApiResponse> {
  try {
    const validated = nominaConfigSchema.parse(data);

    await db.execute(
      `INSERT INTO KS_NOMINA_CONFIG (NC_PORCENTAJE_SERVICIO, NC_PORCENTAJE_PRODUCTO, NC_FECHA_INICIO)
       VALUES (?, ?, ?)`,
      [validated.NC_PORCENTAJE_SERVICIO, validated.NC_PORCENTAJE_PRODUCTO, validated.NC_FECHA_INICIO]
    );

    revalidatePath("/dashboard/nomina");
    return { success: true, message: "Configuración guardada correctamente" };
  } catch (error) {
    return { success: false, error: "Error al guardar configuración" };
  }
}

/**
 * Procesar la nómina semanal para un rango de fechas.
 */
export async function procesarNominaSemanal(data: { startDate: Date, endDate: Date }): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener la configuración vigente para el inicio del periodo
    const configRes = await getConfigForDate(data.startDate);
    const config = configRes.data!;

    // 2. Eliminar cualquier nómina existente en este rango que NO esté CONFIRMADA
    // (Limpieza por si el usuario está volviendo a procesar)
    const [existing]: any = await (connection as any).execute(
      "SELECT NM_IDNOMINA_PK FROM KS_NOMINAS WHERE NM_FECHA_INICIO = ? AND NM_FECHA_FIN = ? AND NM_ESTADO != 'CONFIRMADA'",
      [data.startDate, data.endDate]
    );

    if (existing.length > 0) {
      await (connection as any).execute("DELETE FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?", [existing[0].NM_IDNOMINA_PK]);
    }

    // 3. Crear cabecera de Nómina
    const [nominaResult]: any = await (connection as any).execute(
      "INSERT INTO KS_NOMINAS (NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO) VALUES (?, ?, 'PROCESANDO')",
      [data.startDate, data.endDate]
    );
    const nominaId = nominaResult.insertId;

    // 4. Obtener todos los trabajadores activos que NO sean administrativos
    const [workers]: any = await (connection as any).execute(
      `SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE, t.TR_SUELDO_BASE 
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE t.TR_ACTIVO = TRUE 
       AND r.RL_NOMBRE NOT IN ('ADMINISTRADOR_TOTAL', 'CAJERO')`
    );

    let granTotal = 0;

    for (const worker of workers) {
      // 4.1. Calcular comisiones de servicios
      const [services]: any = await (connection as any).execute(
        `SELECT SUM(fd.FD_VALOR) as total 
         FROM KS_FACTURA_DETALLES fd 
         JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fd.TR_IDTECNICO_FK = ? AND f.FC_FECHA BETWEEN ? AND ?`,
        [worker.TR_IDTRABAJADOR_PK, data.startDate, data.endDate]
      );
      const svcTotal = Number(services[0].total || 0);
      const svcComm = svcTotal * (config.NC_PORCENTAJE_SERVICIO / 100);

      // 4.2. Calcular deducciones de productos
      const [products]: any = await (connection as any).execute(
        `SELECT SUM(fp.FP_VALOR) as total 
         FROM KS_FACTURA_PRODUCTOS fp
         JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fp.TR_IDTECNICO_FK = ? AND f.FC_FECHA BETWEEN ? AND ?`,
        [worker.TR_IDTRABAJADOR_PK, data.startDate, data.endDate]
      );
      const prdTotal = Number(products[0].total || 0);
      const prdDeduct = prdTotal * (config.NC_PORCENTAJE_PRODUCTO / 100);

      // 4.3. Obtener cuotas de vales para este periodo
      const [vales]: any = await (connection as any).execute(
        `SELECT SUM(VC_VALOR_CUOTA) as total 
         FROM KS_VALE_CUOTAS vc
         JOIN KS_VALES vl ON vc.VL_IDVALE_FK = vl.VL_IDVALE_PK
         WHERE vl.TR_IDTRABAJADOR_FK = ? AND vc.VC_ESTADO = 'PENDIENTE' AND vc.VC_FECHA_COBRO BETWEEN ? AND ?`,
        [worker.TR_IDTRABAJADOR_PK, data.startDate, data.endDate]
      );
      const valesDeduct = Number(vales[0].total || 0);

      // 4.4. Calcular totales
      const totalComm = svcComm - prdDeduct;
      const basePay = Number(worker.TR_SUELDO_BASE || 0);
      const netPay = basePay + totalComm - valesDeduct;

      // 4.5. Insertar detalle
      await (connection as any).execute(
        `INSERT INTO KS_NOMINA_DETALLES (NM_IDNOMINA_FK, TR_IDTRABAJADOR_FK, ND_BASE, ND_COMISIONES, ND_BONOS, ND_DEDUCCIONES_VALES, ND_TOTAL_NETO)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nominaId, worker.TR_IDTRABAJADOR_PK, basePay, totalComm, 0, valesDeduct, netPay]
      );

      granTotal += netPay;
    }

    // 5. Actualizar gran total en la cabecera
    await (connection as any).execute("UPDATE KS_NOMINAS SET NM_TOTAL_PAGADO = ? WHERE NM_IDNOMINA_PK = ?", [granTotal, nominaId]);

    await connection.commit();
    revalidatePath("/dashboard/nomina");
    return { success: true, data: { nominaId }, message: "Nómina procesada correctamente" };

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al procesar nómina:", error);
    return { success: false, error: "Error al procesar la nómina" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Confirmar una nómina (Marca vales como pagados y cierra definitivamente)
 */
export async function confirmarNomina(nominaId: number): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener el rango de la nómina
    const [nomRows]: any = await (connection as any).execute(
      "SELECT NM_FECHA_INICIO, NM_FECHA_FIN FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?",
      [nominaId]
    );

    if (nomRows.length === 0) throw new Error("Nómina no encontrada");
    const { NM_FECHA_INICIO, NM_FECHA_FIN } = nomRows[0];

    // 2. Obtener los trabajadores de esta nómina
    const [details]: any = await (connection as any).execute(
      "SELECT TR_IDTRABAJADOR_FK FROM KS_NOMINA_DETALLES WHERE NM_IDNOMINA_FK = ?",
      [nominaId]
    );

    // 3. Marcar las cuotas de vales como pagadas
    for (const detail of details) {
      await (connection as any).execute(
        `UPDATE KS_VALE_CUOTAS vc
         JOIN KS_VALES vl ON vc.VL_IDVALE_FK = vl.VL_IDVALE_PK
         SET vc.VC_ESTADO = 'PAGADO'
         WHERE vl.TR_IDTRABAJADOR_FK = ? AND vc.VC_ESTADO = 'PENDIENTE' 
         AND vc.VC_FECHA_COBRO BETWEEN ? AND ?`,
        [detail.TR_IDTRABAJADOR_FK, NM_FECHA_INICIO, NM_FECHA_FIN]
      );
    }

    // 4. Cambiar estado a CONFIRMADA
    await (connection as any).execute(
      "UPDATE KS_NOMINAS SET NM_ESTADO = 'CONFIRMADA', NM_FECHA_CIERRE = CURRENT_TIMESTAMP WHERE NM_IDNOMINA_PK = ?",
      [nominaId]
    );

    await connection.commit();
    revalidatePath("/dashboard/nomina");
    return { success: true, message: "Nómina confirmada y cuotas liquidadas" };

  } catch (error) {
    if (connection) await connection.rollback();
    return { success: false, error: "Error al confirmar nómina" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Obtener una nómina procesada para un rango de fechas
 */
export async function getNominaByRange(startDate: Date, endDate: Date): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM KS_NOMINAS WHERE NM_FECHA_INICIO = ? AND NM_FECHA_FIN = ? LIMIT 1",
      [startDate, endDate]
    );

    if (rows.length === 0) return { success: true, data: null };

    const nomina = rows[0];
    const [details]: any = await db.query(
      `SELECT nd.*, t.TR_NOMBRE 
       FROM KS_NOMINA_DETALLES nd
       JOIN KS_TRABAJADORES t ON nd.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
       WHERE nd.NM_IDNOMINA_FK = ?`,
      [nomina.NM_IDNOMINA_PK]
    );

    return { 
      success: true, 
      data: {
        ...nomina,
        details
      }
    };
  } catch (error) {
    console.error("Error getNominaByRange:", error);
    return { success: false, error: "Error al obtener datos de nómina" };
  }
}

/**
 * Borrar una nómina que no haya sido confirmada
 */
export async function deleteNomina(nominaId: number): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    const [rows]: any = await (connection as any).execute(
      "SELECT NM_ESTADO FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?", [nominaId]
    );

    if (rows.length > 0 && rows[0].NM_ESTADO === 'CONFIRMADA') {
      return { success: false, error: "No se puede borrar una nómina ya confirmada" };
    }

    await connection.beginTransaction();
    await (connection as any).execute("DELETE FROM KS_NOMINA_DETALLES WHERE NM_IDNOMINA_FK = ?", [nominaId]);
    await (connection as any).execute("DELETE FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?", [nominaId]);
    
    await connection.commit();
    revalidatePath("/dashboard/nomina");
    return { success: true, message: "Liquidación borrada correctamente" };
  } catch (error) {
    if (connection) await connection.rollback();
    return { success: false, error: "Error al borrar nómina" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Obtener todos los trabajadores seleccionables para nómina (Excluyendo administrativos)
 */
export async function getPayrollWorkers(): Promise<ApiResponse<any[]>> {
  try {
    const [rows]: any = await db.execute(`
      SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE
      FROM KS_TRABAJADORES t
      JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
      WHERE t.TR_ACTIVO = TRUE 
      AND r.RL_NOMBRE NOT IN ('ADMINISTRADOR_TOTAL', 'CAJERO')
      ORDER BY t.TR_NOMBRE ASC
    `);
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, data: null, error: "Error al obtener trabajadores para nómina" };
  }
}
