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
        success: false,
        data: null,
        error: "No existe una configuración de nómina vigente para esta fecha. Por favor, agregue una en el botón de Parametrizar."
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
 * Borrar una configuración de nómina
 */
export async function deleteNominaConfig(id: number): Promise<ApiResponse> {
  try {
    await db.execute("DELETE FROM KS_NOMINA_CONFIG WHERE NC_IDCONFIG_PK = ?", [id]);
    revalidatePath("/dashboard/nomina");
    return { success: true, message: "Configuración eliminada" };
  } catch (error) {
    return { success: false, error: "Error al eliminar configuración" };
  }
}

/**
 * Actualizar una configuración de nómina existente
 */
export async function updateNominaConfig(id: number, data: NominaConfigData): Promise<ApiResponse> {
  try {
    const validated = nominaConfigSchema.parse(data);

    await db.execute(
      `UPDATE KS_NOMINA_CONFIG 
       SET NC_PORCENTAJE_SERVICIO = ?, NC_PORCENTAJE_PRODUCTO = ?, NC_FECHA_INICIO = ?
       WHERE NC_IDCONFIG_PK = ?`,
      [validated.NC_PORCENTAJE_SERVICIO, validated.NC_PORCENTAJE_PRODUCTO, validated.NC_FECHA_INICIO, id]
    );

    revalidatePath("/dashboard/nomina");
    return { success: true, message: "Configuración actualizada correctamente" };
  } catch (error) {
    return { success: false, error: "Error al actualizar configuración" };
  }
}

/**
 * Procesar la nómina semanal para un rango de fechas.
 */
export async function procesarNominaSemanal(data: { startDate: Date, endDate: Date, role?: string }): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener el rol y la configuración vigente para el inicio del periodo
    const roleName = (data as any).role || 'TECNICO';
    const configRes = await getConfigForDate(data.startDate);
    if (!configRes.success || !configRes.data) {
      return { success: false, error: configRes.error || "No existe una configuración de nómina para esta fecha." };
    }
    const config = configRes.data;

    // 2. Eliminar cualquier nómina existente en este rango y tipo que NO esté CONFIRMADA
    const [existing]: any = await (connection as any).execute(
      "SELECT NM_IDNOMINA_PK FROM KS_NOMINAS WHERE DATE(NM_FECHA_INICIO) = DATE(?) AND DATE(NM_FECHA_FIN) = DATE(?) AND NM_TIPO = ? AND NM_ESTADO != 'CONFIRMADA'",
      [data.startDate, data.endDate, roleName]
    );

    if (existing.length > 0) {
      await (connection as any).execute("DELETE FROM KS_NOMINA_DETALLES WHERE NM_IDNOMINA_FK = ?", [existing[0].NM_IDNOMINA_PK]);
      await (connection as any).execute("DELETE FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?", [existing[0].NM_IDNOMINA_PK]);
    }

    // 3. Crear cabecera de Nómina
    const [nominaResult]: any = await (connection as any).execute(
      "INSERT INTO KS_NOMINAS (NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO, NM_TIPO) VALUES (?, ?, 'PROCESANDO', ?)",
      [data.startDate, data.endDate, roleName]
    );
    const nominaId = nominaResult.insertId;

    // 4. Obtener todos los trabajadores activos que coincidan con el rol solicitado
    const [workers]: any = await (connection as any).execute(
      `SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE t.TR_ACTIVO = TRUE 
       AND r.RL_NOMBRE = ?`,
      [roleName]
    );

    console.log(`[Nomina] Procesando periodo: ${data.startDate.toISOString()} a ${data.endDate.toISOString()} para rol: ${roleName}`);
    console.log(`[Nomina] Trabajadores activos encontrados: ${workers.length}`);

    let granTotal = 0;

    for (const worker of workers) {
      // 4.1. Calcular comisiones de servicios
      const [services]: any = await (connection as any).execute(
        `SELECT SUM(fd.FD_VALOR) as total 
         FROM KS_FACTURA_DETALLES fd 
         JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fd.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) BETWEEN DATE(?) AND DATE(?)`,
        [worker.TR_IDTRABAJADOR_PK, data.startDate, data.endDate]
      );
      const svcTotal = Number(services[0].total || 0);
      const svcComm = svcTotal * (config.NC_PORCENTAJE_SERVICIO / 100);

      // 4.2. Calcular deducciones de productos
      const [products]: any = await (connection as any).execute(
        `SELECT SUM(fp.FP_VALOR) as total 
         FROM KS_FACTURA_PRODUCTOS fp
         JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fp.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) BETWEEN DATE(?) AND DATE(?)`,
        [worker.TR_IDTRABAJADOR_PK, data.startDate, data.endDate]
      );
      const prdTotal = Number(products[0].total || 0);
      const prdComm = prdTotal * (config.NC_PORCENTAJE_PRODUCTO / 100);

      // 4.3. Obtener cuotas de servicios para este periodo
      const [vales]: any = await (connection as any).execute(
        `SELECT SUM(STC_VALOR_CUOTA) as total 
         FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
         JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
         WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE' AND DATE(stc.STC_FECHA_COBRO) BETWEEN DATE(?) AND DATE(?)`,
        [worker.TR_IDTRABAJADOR_PK, data.startDate, data.endDate]
      );
      const valesDeduct = Number(vales[0].total || 0);

      // 4.4. Obtener deducciones de vales (Vales reales) para este periodo
      const [valesRegistros]: any = await (connection as any).execute(
        `SELECT VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_IDVALE_PK
         FROM KS_VALES 
         WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE' 
         AND DATE(VL_FECHA_INICIO_COBRO) <= DATE(?)`,
        [worker.TR_IDTRABAJADOR_PK, data.endDate]
      );

      let valesTotalDeduct = 0;
      for (const vale of valesRegistros) {
        const remainingCuotas = vale.VL_CUOTAS - vale.VL_CUOTAS_PAGADAS;
        if (remainingCuotas > 0) {
          const cuotaValor = vale.VL_MONTO / vale.VL_CUOTAS;
          valesTotalDeduct += cuotaValor;
        }
      }

      // 4.5. Calcular totales
      const totalEarnings = svcComm + prdComm;
      const basePay = 0; // Se elimina el sueldo base para técnicos
      const netPay = basePay + totalEarnings - valesDeduct - valesTotalDeduct;

      // 4.6. Insertar detalle
      await (connection as any).execute(
        `INSERT INTO KS_NOMINA_DETALLES 
         (NM_IDNOMINA_FK, TR_IDTRABAJADOR_FK, ND_BASE, ND_COMISIONES, ND_BONOS, ND_DEDUCCIONES_SERVICIOS_TRABAJADOR, ND_DEDUCCIONES_VALES, ND_TOTAL_NETO)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nominaId, worker.TR_IDTRABAJADOR_PK, basePay, totalEarnings, 0, valesDeduct, valesTotalDeduct, netPay]
      );

      granTotal += netPay;
    }

    // 5. Actualizar gran total en la cabecera
    await (connection as any).execute("UPDATE KS_NOMINAS SET NM_TOTAL_PAGADO = ? WHERE NM_IDNOMINA_PK = ?", [granTotal, nominaId]);

    await connection.commit();
    revalidatePath("/dashboard/nomina");

    const message = workers.length === 0
      ? "Nómina procesada, pero no se encontraron técnicos activos para este periodo."
      : "Nómina procesada correctamente";

    return { success: true, data: { nominaId }, message };

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

    // 3. Marcar las cuotas de servicios como pagadas
    for (const detail of details) {
      await (connection as any).execute(
        `UPDATE KS_SERVICIO_TRABAJADOR_CUOTAS stc
         JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
         SET stc.STC_ESTADO = 'PAGADO'
         WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE' 
         AND stc.STC_FECHA_COBRO BETWEEN ? AND ?`,
        [detail.TR_IDTRABAJADOR_FK, NM_FECHA_INICIO, NM_FECHA_FIN]
      );

      // 3.1. Actualizar vales (Vales reales)
      const [valesRegistros]: any = await (connection as any).execute(
        `SELECT VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_IDVALE_PK
         FROM KS_VALES 
         WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE' 
         AND VL_FECHA_INICIO_COBRO <= ?`,
        [detail.TR_IDTRABAJADOR_FK, NM_FECHA_FIN]
      );

      for (const vale of valesRegistros) {
        const newPagadas = vale.VL_CUOTAS_PAGADAS + 1;
        const newEstado = newPagadas >= vale.VL_CUOTAS ? 'DESCONTADO' : 'PENDIENTE';

        await (connection as any).execute(
          "UPDATE KS_VALES SET VL_CUOTAS_PAGADAS = ?, VL_ESTADO = ?, NM_IDNOMINA_FK = ? WHERE VL_IDVALE_PK = ?",
          [newPagadas, newEstado, nominaId, vale.VL_IDVALE_PK]
        );
      }
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
export async function getNominaByRange(startDate: Date, endDate: Date, type: string = 'TECNICO'): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM KS_NOMINAS WHERE DATE(NM_FECHA_INICIO) = DATE(?) AND DATE(NM_FECHA_FIN) = DATE(?) AND NM_TIPO = ? LIMIT 1",
      [startDate, endDate, type]
    );

    if (rows.length === 0) return { success: true, data: null };

    const nomina = rows[0];
    const [details]: any = await db.query(
      `SELECT nd.*, t.TR_NOMBRE, t.TR_TELEFONO, s.SC_NOMBRE, r.RL_NOMBRE
       FROM KS_NOMINA_DETALLES nd
       JOIN KS_TRABAJADORES t ON nd.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       LEFT JOIN KS_SUCURSALES s ON t.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
       WHERE nd.NM_IDNOMINA_FK = ?`,
      [nomina.NM_IDNOMINA_PK]
    );

    return {
      success: true,
      data: {
        ...nomina,
        details: details.map((d: any) => ({
          ...d,
          ND_BASE: Number(d.ND_BASE || 0),
          ND_COMISIONES: Number(d.ND_COMISIONES || 0),
          ND_BONOS: Number(d.ND_BONOS || 0),
          ND_DEDUCCIONES_SERVICIOS_TRABAJADOR: Number(d.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0),
          ND_DEDUCCIONES_VALES: Number(d.ND_DEDUCCIONES_VALES || 0),
          ND_TOTAL_NETO: Number(d.ND_TOTAL_NETO || 0),
        }))
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
 * Procesar la nómina para administrativos con salarios manuales.
 */
export async function procesarNominaAdmins(data: {
  startDate: Date,
  endDate: Date,
  salaries: { workerId: number, salary: number }[]
}): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    const roleName = 'ADMINISTRADOR_PUNTO';

    // 1. Eliminar cualquier nómina existente en este rango y tipo que NO esté CONFIRMADA
    const [existing]: any = await (connection as any).execute(
      "SELECT NM_IDNOMINA_PK FROM KS_NOMINAS WHERE DATE(NM_FECHA_INICIO) = DATE(?) AND DATE(NM_FECHA_FIN) = DATE(?) AND NM_TIPO = ? AND NM_ESTADO != 'CONFIRMADA'",
      [data.startDate, data.endDate, roleName]
    );

    if (existing.length > 0) {
      await (connection as any).execute("DELETE FROM KS_NOMINA_DETALLES WHERE NM_IDNOMINA_FK = ?", [existing[0].NM_IDNOMINA_PK]);
      await (connection as any).execute("DELETE FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?", [existing[0].NM_IDNOMINA_PK]);
    }

    // 2. Crear cabecera de Nómina
    const [nominaResult]: any = await (connection as any).execute(
      "INSERT INTO KS_NOMINAS (NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO, NM_TIPO) VALUES (?, ?, 'PROCESANDO', ?)",
      [data.startDate, data.endDate, roleName]
    );
    const nominaId = nominaResult.insertId;

    await (connection as any).beginTransaction();

    let granTotal = 0;

    for (const item of data.salaries) {
      // 3. Obtener cuotas de servicios para este periodo
      const [vales]: any = await (connection as any).execute(
        `SELECT SUM(STC_VALOR_CUOTA) as total 
         FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
         JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
         WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE' AND DATE(stc.STC_FECHA_COBRO) BETWEEN DATE(?) AND DATE(?)`,
        [item.workerId, data.startDate, data.endDate]
      );
      const valesDeduct = Number(vales[0].total || 0);

      // 4. Obtener deducciones de vales (Vales reales) para este periodo
      const [valesRegistros]: any = await (connection as any).execute(
        `SELECT VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_IDVALE_PK
         FROM KS_VALES 
         WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE' 
         AND DATE(VL_FECHA_INICIO_COBRO) <= DATE(?)`,
        [item.workerId, data.endDate]
      );

      let valesTotalDeduct = 0;
      for (const vale of valesRegistros) {
        const remainingCuotas = vale.VL_CUOTAS - vale.VL_CUOTAS_PAGADAS;
        if (remainingCuotas > 0) {
          const cuotaValor = vale.VL_MONTO / vale.VL_CUOTAS;
          valesTotalDeduct += cuotaValor;
        }
      }

      // 5. Calcular totales
      const basePay = Number(item.salary || 0);
      const netPay = basePay - valesDeduct - valesTotalDeduct;

      // 6. Insertar detalle
      await (connection as any).execute(
        `INSERT INTO KS_NOMINA_DETALLES 
         (NM_IDNOMINA_FK, TR_IDTRABAJADOR_FK, ND_BASE, ND_COMISIONES, ND_BONOS, ND_DEDUCCIONES_SERVICIOS_TRABAJADOR, ND_DEDUCCIONES_VALES, ND_TOTAL_NETO)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nominaId, item.workerId, basePay, 0, 0, valesDeduct, valesTotalDeduct, netPay]
      );

      granTotal += netPay;
    }

    // 7. Actualizar gran total en la cabecera
    await (connection as any).execute("UPDATE KS_NOMINAS SET NM_TOTAL_PAGADO = ? WHERE NM_IDNOMINA_PK = ?", [granTotal, nominaId]);

    await connection.commit();
    revalidatePath("/dashboard/nomina-admin");

    return { success: true, data: { nominaId }, message: "Nómina de administradores procesada correctamente" };

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al procesar nómina admins:", error);
    return { success: false, error: "Error al procesar la nómina de administradores" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Obtener trabajadores para nómina con su sueldo base y otros datos
 */
export async function getPayrollWorkers(role: string = 'TECNICO'): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.query(
      `SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE, t.TR_TELEFONO, s.SC_NOMBRE
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       LEFT JOIN KS_SUCURSALES s ON t.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
       WHERE r.RL_NOMBRE = ? AND t.TR_ACTIVO = 1`,
      [role]
    );

    return { success: true, data: rows };
  } catch (error) {
    console.error("Error getPayrollWorkers:", error);
    return { success: false, error: "Error al obtener trabajadores" };
  }
}

/**
 * Obtener el detalle de facturas y servicios que generaron comisiones para un trabajador
 */
export async function getNominaAudit(workerId: number, startDate: Date, endDate: Date): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.query(
      `SELECT 
        f.FC_IDFACTURA_PK, 
        f.FC_FECHA, 
        pf.PF_TIPO_ITEM, 
        pf.PF_DESCRIPCION, 
        pf.PF_TOTAL_ITEM, 
        pf.PF_COMISION_VALOR
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE pf.TR_IDTRABAJADOR_FK = ? 
       AND DATE(f.FC_FECHA) BETWEEN DATE(?) AND DATE(?)
       ORDER BY f.FC_FECHA DESC`,
      [workerId, startDate, endDate]
    );

    const mapped = (rows || []).map((r: any) => ({
      ...r,
      PF_TOTAL_ITEM: Number(r.PF_TOTAL_ITEM || 0),
      PF_COMISION_VALOR: Number(r.PF_COMISION_VALOR || 0)
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error("Error getNominaAudit:", error);
    return { success: false, error: "Error al obtener auditoría" };
  }
}

