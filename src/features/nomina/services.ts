'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
import { NominaBatchData, NominaConfigData, nominaConfigSchema } from "./schema";
import { toLocalDateString } from "@/lib/date-utils";

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
      `INSERT INTO KS_NOMINA_CONFIG (NC_PORCENTAJE_SERVICIO, NC_FECHA_INICIO)
       VALUES (?, ?)`,
      [validated.NC_PORCENTAJE_SERVICIO, toLocalDateString(validated.NC_FECHA_INICIO)]
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
       SET NC_PORCENTAJE_SERVICIO = ?, NC_FECHA_INICIO = ?
       WHERE NC_IDCONFIG_PK = ?`,
      [validated.NC_PORCENTAJE_SERVICIO, toLocalDateString(validated.NC_FECHA_INICIO), id]
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
      "SELECT NM_IDNOMINA_PK FROM KS_NOMINAS WHERE DATE(NM_FECHA_INICIO) = ? AND DATE(NM_FECHA_FIN) = ? AND NM_TIPO = ? AND NM_ESTADO != 'CONFIRMADA'",
      [toLocalDateString(data.startDate), toLocalDateString(data.endDate), roleName]
    );

    if (existing.length > 0) {
      await (connection as any).execute("DELETE FROM KS_NOMINA_DETALLES WHERE NM_IDNOMINA_FK = ?", [existing[0].NM_IDNOMINA_PK]);
      await (connection as any).execute("DELETE FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?", [existing[0].NM_IDNOMINA_PK]);
    }

    // 3. Crear cabecera de Nómina
    const [nominaResult]: any = await (connection as any).execute(
      "INSERT INTO KS_NOMINAS (NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO, NM_TIPO) VALUES (?, ?, 'PROCESANDO', ?)",
      [toLocalDateString(data.startDate), toLocalDateString(data.endDate), roleName]
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
      // 4.0 Determinar fecha de inicio individual (Opción A)
      const [lastNom]: any = await (connection as any).execute(
        `SELECT MAX(n.NM_FECHA_FIN) as last_date
         FROM KS_NOMINAS n
         JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
         WHERE nd.TR_IDTRABAJADOR_FK = ? AND n.NM_ESTADO = 'CONFIRMADA'`,
        [worker.TR_IDTRABAJADOR_PK]
      );
      
      const lastDate = lastNom[0]?.last_date ? new Date(lastNom[0].last_date) : null;
      const loteStartMinus1 = new Date(data.startDate);
      loteStartMinus1.setDate(loteStartMinus1.getDate() - 1);
      
      const effectiveLastDate = (lastDate && lastDate >= data.startDate) ? lastDate : loteStartMinus1;

      // 4.1. Calcular comisiones de servicios (Descontando insumos asociados)
      const [services]: any = await (connection as any).execute(
        `SELECT SUM((fd.FD_VALOR * fd.FD_CANTIDAD) - IFNULL((
           SELECT SUM(fp.FP_VALOR * fp.FP_CANTIDAD) 
           FROM KS_FACTURA_PRODUCTOS fp 
           WHERE fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK
         ), 0)) as total,
         SUM(fd.FD_PROPINA) as propinas
         FROM KS_FACTURA_DETALLES fd 
         JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fd.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?)
         AND f.FC_ESTADO != 'CANCELADO'
         AND NOT EXISTS (
           SELECT 1 FROM KS_PAGOS_FACTURA pf
           JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
           WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
         )`,
        [worker.TR_IDTRABAJADOR_PK, effectiveLastDate, data.endDate]
      );
      const svcTotal = Number(services[0].total || 0);
      const svcPropinas = Number(services[0].propinas || 0);
      const svcComm = svcTotal * (config.NC_PORCENTAJE_SERVICIO / 100);

      // 4.2. Calcular comisiones de productos (Persistidas en la factura)
      const [products]: any = await (connection as any).execute(
        `SELECT SUM(fp.FP_COMISION_VALOR) as total 
         FROM KS_FACTURA_PRODUCTOS fp
         JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fp.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?) AND f.FC_ESTADO = 'PAGADO'
         AND fp.FD_IDDETALLE_FK IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM KS_PAGOS_FACTURA pf
           JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
           WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
         )`,
        [worker.TR_IDTRABAJADOR_PK, effectiveLastDate, data.endDate]
      );
      const prdComm = Number(products[0].total || 0);

      // 4.3. Obtener cuotas de servicios para este periodo
      const [vales]: any = await (connection as any).execute(
        `SELECT SUM(STC_VALOR_CUOTA) as total 
         FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
         JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
         WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE' AND DATE(stc.STC_FECHA_COBRO) > DATE(?) AND DATE(stc.STC_FECHA_COBRO) <= DATE(?)`,
        [worker.TR_IDTRABAJADOR_PK, effectiveLastDate, data.endDate]
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

      // 4.5. Calcular deducciones por Garantías (Servicios malos que se cobraron en este periodo)
      const [garantiasRegistros]: any = await (connection as any).execute(
        `SELECT SUM(GA_VALOR) as total
         FROM KS_GARANTIAS
         WHERE TR_IDTECNICO_ORIGINAL_FK = ? AND DATE(GA_FECHA) > DATE(?) AND DATE(GA_FECHA) <= DATE(?)`,
         [worker.TR_IDTRABAJADOR_PK, effectiveLastDate, data.endDate]
      );
      const garantiasDeduct = Number(garantiasRegistros[0].total || 0);

      // 4.6. Calcular totales
      const totalComisiones = svcComm + prdComm + svcPropinas;
      const basePay = 0; // Se elimina el sueldo base para técnicos
      const netPay = basePay + totalComisiones - valesDeduct - valesTotalDeduct - garantiasDeduct;

      // 4.7. Insertar detalle
      await (connection as any).execute(
        `INSERT INTO KS_NOMINA_DETALLES 
         (NM_IDNOMINA_FK, TR_IDTRABAJADOR_FK, ND_BASE, ND_COMISIONES, ND_BONOS, ND_DEDUCCIONES_SERVICIOS_TRABAJADOR, ND_DEDUCCIONES_VALES, ND_DEDUCCIONES_GARANTIAS, ND_TOTAL_NETO)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nominaId, worker.TR_IDTRABAJADOR_PK, basePay, totalComisiones, 0, valesDeduct, valesTotalDeduct, garantiasDeduct, netPay]
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
        const cuotaMonto = Number(vale.VL_MONTO) / Number(vale.VL_CUOTAS);

        await (connection as any).execute(
          "UPDATE KS_VALES SET VL_CUOTAS_PAGADAS = ?, VL_ESTADO = ?, NM_IDNOMINA_FK = ? WHERE VL_IDVALE_PK = ?",
          [newPagadas, newEstado, nominaId, vale.VL_IDVALE_PK]
        );

        await (connection as any).execute(
          "INSERT INTO KS_NOMINA_VALES (NM_IDNOMINA_FK, VL_IDVALE_PK, NV_MONTO_DESCONTADO) VALUES (?, ?, ?)",
          [nominaId, vale.VL_IDVALE_PK, cuotaMonto]
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
 * Desconfirmar una nómina (Revierte el estado de 'CONFIRMADA' a 'PROCESANDO' y libera cuotas)
 */
export async function desconfirmarNomina(nominaId: number): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener la nómina y su estado
    const [nomRows]: any = await (connection as any).execute(
      "SELECT NM_IDNOMINA_PK, NM_ESTADO, NM_FECHA_INICIO, NM_FECHA_FIN, NM_TIPO FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?",
      [nominaId]
    );

    if (nomRows.length === 0) throw new Error("Nómina no encontrada");
    const { NM_ESTADO, NM_FECHA_INICIO, NM_FECHA_FIN, NM_TIPO } = nomRows[0];

    if (NM_ESTADO !== 'CONFIRMADA') {
      return { success: false, error: "Solo se pueden desconfirmar nóminas que estén en estado CONFIRMADA" };
    }

    // 2. Obtener los trabajadores de esta nómina
    const [details]: any = await (connection as any).execute(
      "SELECT TR_IDTRABAJADOR_FK FROM KS_NOMINA_DETALLES WHERE NM_IDNOMINA_FK = ?",
      [nominaId]
    );

    // 3. Revertir cuotas de servicios (PAGADO -> PENDIENTE)
    for (const detail of details) {
      await (connection as any).execute(
        `UPDATE KS_SERVICIO_TRABAJADOR_CUOTAS stc
         JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
         SET stc.STC_ESTADO = 'PENDIENTE'
         WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PAGADO' 
         AND stc.STC_FECHA_COBRO BETWEEN ? AND ?`,
        [detail.TR_IDTRABAJADOR_FK, NM_FECHA_INICIO, NM_FECHA_FIN]
      );
    }

    // 4. Revertir vales (Adelantos) usando la tabla de histórico de descuentos
    const [descuentos]: any = await (connection as any).execute(
      "SELECT VL_IDVALE_PK FROM KS_NOMINA_VALES WHERE NM_IDNOMINA_FK = ?",
      [nominaId]
    );

    for (const desc of descuentos) {
      const [valeRows]: any = await (connection as any).execute(
        "SELECT VL_CUOTAS_PAGADAS FROM KS_VALES WHERE VL_IDVALE_PK = ?",
        [desc.VL_IDVALE_PK]
      );
      
      if (valeRows.length > 0) {
        const currentPagadas = valeRows[0].VL_CUOTAS_PAGADAS;
        const newPagadas = Math.max(0, currentPagadas - 1);
        
        await (connection as any).execute(
          "UPDATE KS_VALES SET VL_CUOTAS_PAGADAS = ?, VL_ESTADO = 'PENDIENTE', NM_IDNOMINA_FK = NULL WHERE VL_IDVALE_PK = ?",
          [newPagadas, desc.VL_IDVALE_PK]
        );
      }
    }

    // 5. Cambiar estado de la nómina a PROCESANDO
    await (connection as any).execute(
      "UPDATE KS_NOMINAS SET NM_ESTADO = 'PROCESANDO', NM_FECHA_CIERRE = NULL WHERE NM_IDNOMINA_PK = ?",
      [nominaId]
    );

    await connection.commit();

    // Revalidar según el tipo
    if (NM_TIPO === 'TECNICO') revalidatePath("/dashboard/nomina");
    else if (NM_TIPO === 'ADMINISTRADOR_PUNTO') revalidatePath("/dashboard/nomina-admin");

    return { success: true, message: "Nómina desconfirmada correctamente. Ahora puede editarla o borrarla." };

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al desconfirmar nómina:", error);
    return { success: false, error: "Error al desconfirmar la nómina" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Obtener una nómina procesada para un rango de fechas
 */
export async function getNominaByRange(startDate: Date, endDate: Date, type: string = 'TECNICO'): Promise<ApiResponse> {
  try {
    const startStr = toLocalDateString(startDate);
    const endStr = toLocalDateString(endDate);

    const [rows]: any = await db.query(
      "SELECT * FROM KS_NOMINAS WHERE DATE(NM_FECHA_INICIO) = ? AND DATE(NM_FECHA_FIN) = ? AND NM_TIPO = ? LIMIT 1",
      [startStr, endStr, type]
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
      "SELECT NM_IDNOMINA_PK FROM KS_NOMINAS WHERE DATE(NM_FECHA_INICIO) = ? AND DATE(NM_FECHA_FIN) = ? AND NM_TIPO = ? AND NM_ESTADO != 'CONFIRMADA'",
      [toLocalDateString(data.startDate), toLocalDateString(data.endDate), roleName]
    );

    if (existing.length > 0) {
      await (connection as any).execute("DELETE FROM KS_NOMINA_DETALLES WHERE NM_IDNOMINA_FK = ?", [existing[0].NM_IDNOMINA_PK]);
      await (connection as any).execute("DELETE FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?", [existing[0].NM_IDNOMINA_PK]);
    }

    // 2. Crear cabecera de Nómina
    const [nominaResult]: any = await (connection as any).execute(
      "INSERT INTO KS_NOMINAS (NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO, NM_TIPO) VALUES (?, ?, 'PROCESANDO', ?)",
      [toLocalDateString(data.startDate), toLocalDateString(data.endDate), roleName]
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
         WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE' AND DATE(stc.STC_FECHA_COBRO) BETWEEN ? AND ?`,
        [item.workerId, toLocalDateString(data.startDate), toLocalDateString(data.endDate)]
      );
      const valesDeduct = Number(vales[0].total || 0);

      // 4. Obtener deducciones de vales (Vales reales) para este periodo
      const [valesRegistros]: any = await (connection as any).execute(
        `SELECT VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_IDVALE_PK
         FROM KS_VALES 
         WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE' 
         AND DATE(VL_FECHA_INICIO_COBRO) <= ?`,
        [item.workerId, toLocalDateString(data.endDate)]
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
    const configRes = await getConfigForDate(endDate);
    const svcPercent = configRes.success && configRes.data ? Number(configRes.data.NC_PORCENTAJE_SERVICIO) : 50;

    // FIX: Use exact same logic as calculations to avoid missing hours/services
    // We use > startDate and <= endDate. To make BETWEEN work the same, we add 1 day to startDate if we want strict greater than, 
    // BUT since FC_FECHA has times, > DATE(startDate) means anything from startDate 00:00:01 if we are not careful.
    // The calculation uses: AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?)
    
    const [rows]: any = await db.query(
      `
      -- SERVICIOS
      SELECT 
        f.FC_IDFACTURA_PK, 
        f.FC_FECHA, 
        'SERVICIO' as PF_TIPO_ITEM, 
        s.SV_NOMBRE as PF_DESCRIPCION, 
        fd.FD_CANTIDAD as PF_CANTIDAD,
        fd.FD_VALOR as PF_VALOR_UNITARIO,
        fd.FD_PROPINA as PF_PROPINA,
        (fd.FD_VALOR * fd.FD_CANTIDAD) - IFNULL((SELECT SUM(fp.FP_VALOR * fp.FP_CANTIDAD) FROM KS_FACTURA_PRODUCTOS fp WHERE fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK), 0) as PF_TOTAL_ITEM, 
        ((fd.FD_VALOR * fd.FD_CANTIDAD) - IFNULL((SELECT SUM(fp.FP_VALOR * fp.FP_CANTIDAD) FROM KS_FACTURA_PRODUCTOS fp WHERE fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK), 0)) * (? / 100) as PF_COMISION_VALOR
      FROM KS_FACTURA_DETALLES fd
      JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
      JOIN KS_SERVICIOS s ON fd.SV_IDSERVICIO_FK = s.SV_IDSERVICIO_PK
      WHERE fd.TR_IDTECNICO_FK = ? 
      AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?)
      AND f.FC_ESTADO != 'CANCELADO'
      AND NOT EXISTS (
        SELECT 1 FROM KS_PAGOS_FACTURA pf
        JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
        WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
      )

      UNION ALL

      -- PRODUCTOS
      SELECT 
        f.FC_IDFACTURA_PK, 
        f.FC_FECHA, 
        'PRODUCTO' as PF_TIPO_ITEM, 
        p.PR_NOMBRE as PF_DESCRIPCION, 
        fp.FP_CANTIDAD as PF_CANTIDAD,
        fp.FP_VALOR as PF_VALOR_UNITARIO,
        0 as PF_PROPINA,
        (fp.FP_VALOR * fp.FP_CANTIDAD) as PF_TOTAL_ITEM, 
        fp.FP_COMISION_VALOR as PF_COMISION_VALOR
      FROM KS_FACTURA_PRODUCTOS fp
      JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
      JOIN KS_PRODUCTOS p ON fp.PR_IDPRODUCTO_FK = p.PR_IDPRODUCTO_PK
      WHERE fp.TR_IDTECNICO_FK = ? 
      AND fp.FD_IDDETALLE_FK IS NULL
      AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?)
      AND f.FC_ESTADO = 'PAGADO'
      AND NOT EXISTS (
        SELECT 1 FROM KS_PAGOS_FACTURA pf
        JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
        WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
      )
      ORDER BY FC_FECHA DESC`,
      [svcPercent, workerId, startDate, endDate, workerId, startDate, endDate]
    );

    const mapped = (rows || []).map((r: any) => ({
      ...r,
      PF_CANTIDAD: Number(r.PF_CANTIDAD || 0),
      PF_VALOR_UNITARIO: Number(r.PF_VALOR_UNITARIO || 0),
      PF_TOTAL_ITEM: Number(r.PF_TOTAL_ITEM || 0),
      PF_COMISION_VALOR: Number(r.PF_COMISION_VALOR || 0)
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error("Error al obtener auditoría de nómina:", error);
    return { success: false, data: null, error: "Error al obtener auditoría" };
  }
}

/**
 * Obtener auditData para una nómina específica, resolviendo su fecha de inicio real (lastDate)
 */
export async function getSmartNominaAudit(
  workerId: number, 
  nominaId: number | null, 
  fallbackStartDate: Date, 
  endDate: Date
): Promise<ApiResponse> {
  try {
    let lastDate = fallbackStartDate;
    const connection = await db.getConnection();
    
    try {
      // Determinar el lastDate real que se usó para esta nómina
      let queryExtra = "";
      let params: any[] = [workerId];
      
      if (nominaId) {
        // Si ya hay nómina, buscamos la última confirmada ANTES de esta
        queryExtra = "AND n.NM_IDNOMINA_PK != ?";
        params.push(nominaId);
      }
      
      const [lastNom]: any = await (connection as any).execute(
        `SELECT MAX(n.NM_FECHA_FIN) as last_date
         FROM KS_NOMINAS n
         JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
         WHERE nd.TR_IDTRABAJADOR_FK = ? AND n.NM_ESTADO = 'CONFIRMADA' ${queryExtra}`,
        params
      );
      
      if (lastNom[0]?.last_date) {
        lastDate = new Date(lastNom[0].last_date);
      } else {
        // Si no hay previas, usar loteStartMinus1
        const loteStartMinus1 = new Date(fallbackStartDate);
        loteStartMinus1.setDate(loteStartMinus1.getDate() - 1);
        lastDate = loteStartMinus1;
      }
    } finally {
      connection.release();
    }
    
    // Ahora llamamos al getNominaAudit normal con la fecha real
    return await getNominaAudit(workerId, lastDate, endDate);
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error resolviendo la fecha de inicio" };
  }
}

/**
 * Realizar liquidación por retiro definitiva e inactivación de un trabajador
 */
export async function liquidarTrabajadorPorRetiro(
  workerId: number,
  fechaRetiro: Date,
  motivo: string,
  basePay: number = 0
): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener datos del trabajador
    const [workers]: any = await (connection as any).execute(
      `SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE, r.RL_NOMBRE 
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE t.TR_IDTRABAJADOR_PK = ?`,
      [workerId]
    );

    if (workers.length === 0) {
      return { success: false, error: "Trabajador no encontrado" };
    }
    const worker = workers[0];

    // 2. Determinar la fecha de inicio del periodo pendiente
    const [lastNom]: any = await (connection as any).execute(
      `SELECT MAX(n.NM_FECHA_FIN) as last_date
       FROM KS_NOMINAS n
       JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
       WHERE nd.TR_IDTRABAJADOR_FK = ? AND n.NM_ESTADO = 'CONFIRMADA'`,
      [workerId]
    );
    
    // Si ya ha sido liquidado antes, empezamos desde el día siguiente de su última nómina confirmada
    const lastDate = lastNom[0]?.last_date ? new Date(lastNom[0].last_date) : new Date("2020-01-01");
    
    // 3. Obtener configuración vigente para calcular comisiones
    const configRes = await getConfigForDate(fechaRetiro);
    const svcPercent = configRes.success && configRes.data ? Number(configRes.data.NC_PORCENTAJE_SERVICIO) : 50;

    let comisionesServicios = 0;
    let comisionesProductos = 0;

    if (worker.RL_NOMBRE === 'TECNICO') {
      // 3.1. Calcular comisiones de servicios en el periodo pendiente (Descontando insumos)
      const [services]: any = await (connection as any).execute(
        `SELECT SUM((fd.FD_VALOR * fd.FD_CANTIDAD) - IFNULL((
           SELECT SUM(fp.FP_VALOR * fp.FP_CANTIDAD) 
           FROM KS_FACTURA_PRODUCTOS fp 
           WHERE fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK
         ), 0)) as total,
         SUM(fd.FD_PROPINA) as propinas
         FROM KS_FACTURA_DETALLES fd 
         JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fd.TR_IDTECNICO_FK = ? 
           AND f.FC_FECHA > ? AND DATE(f.FC_FECHA) <= DATE(?)
           AND f.FC_ESTADO != 'CANCELADO'
           AND NOT EXISTS (
             SELECT 1 FROM KS_PAGOS_FACTURA pf
             JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
             WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
           )`,
        [workerId, lastDate, fechaRetiro]
      );
      const svcTotal = Number(services[0].total || 0);
      const svcPropinas = Number(services[0].propinas || 0);
      comisionesServicios = svcTotal * (svcPercent / 100) + svcPropinas;

      // 3.2. Calcular comisiones de productos
      const [products]: any = await (connection as any).execute(
        `SELECT SUM(fp.FP_COMISION_VALOR) as total 
         FROM KS_FACTURA_PRODUCTOS fp
         JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fp.TR_IDTECNICO_FK = ? 
           AND f.FC_FECHA > ? AND DATE(f.FC_FECHA) <= DATE(?)
           AND f.FC_ESTADO = 'PAGADO'
           AND fp.FD_IDDETALLE_FK IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM KS_PAGOS_FACTURA pf
             JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
             WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
           )`,
        [workerId, lastDate, fechaRetiro]
      );
      comisionesProductos = Number(products[0].total || 0);
    }

    const totalComisiones = comisionesServicios + comisionesProductos + svcPropinas;

    // 4. Calcular el 100% de la deuda consolidada
    // 4.1. Saldo pendiente de vales
    const [valesRegistros]: any = await (connection as any).execute(
      `SELECT VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_IDVALE_PK
       FROM KS_VALES 
       WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE'`,
      [workerId]
    );

    let valesTotalDeduct = 0;
    for (const vale of valesRegistros) {
      const remainingCuotas = vale.VL_CUOTAS - vale.VL_CUOTAS_PAGADAS;
      if (remainingCuotas > 0) {
        const cuotaValor = vale.VL_MONTO / vale.VL_CUOTAS;
        valesTotalDeduct += (cuotaValor * remainingCuotas);
      }
    }

    // 4.2. Saldo pendiente de servicios de trabajador
    const [serviciosCuotas]: any = await (connection as any).execute(
      `SELECT SUM(stc.STC_VALOR_CUOTA) as total 
       FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
       JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
       WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE'`,
      [workerId]
    );
    const serviciosTotalDeduct = Number(serviciosCuotas[0].total || 0);

    // 5. Calcular balance neto definitivo
    const netPay = basePay + totalComisiones - serviciosTotalDeduct - valesTotalDeduct;

    // 6. Crear cabecera de Nómina Especial de Retiro
    const [nominaResult]: any = await (connection as any).execute(
      `INSERT INTO KS_NOMINAS (NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO, NM_TIPO, NM_TOTAL_PAGADO, NM_FECHA_CIERRE) 
       VALUES (?, ?, 'CONFIRMADA', 'RETIRO', ?, CURRENT_TIMESTAMP)`,
      [toLocalDateString(lastDate), toLocalDateString(fechaRetiro), netPay]
    );
    const nominaId = nominaResult.insertId;

    // 7. Insertar detalle de Nómina
    await (connection as any).execute(
      `INSERT INTO KS_NOMINA_DETALLES 
       (NM_IDNOMINA_FK, TR_IDTRABAJADOR_FK, ND_BASE, ND_COMISIONES, ND_BONOS, ND_DEDUCCIONES_SERVICIOS_TRABAJADOR, ND_DEDUCCIONES_VALES, ND_TOTAL_NETO)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [nominaId, workerId, basePay, totalComisiones, serviciosTotalDeduct, valesTotalDeduct, netPay]
    );

    // 8. Cerrar todas las deudas pendientes
    // 8.1. Liquidar vales
    for (const vale of valesRegistros) {
      const remainingCuotas = vale.VL_CUOTAS - vale.VL_CUOTAS_PAGADAS;
      const cuotaMonto = Number(vale.VL_MONTO) / Number(vale.VL_CUOTAS);
      const totalDescontado = cuotaMonto * remainingCuotas;

      await (connection as any).execute(
        `UPDATE KS_VALES 
         SET VL_CUOTAS_PAGADAS = VL_CUOTAS, VL_ESTADO = 'DESCONTADO', NM_IDNOMINA_FK = ? 
         WHERE VL_IDVALE_PK = ?`,
        [nominaId, vale.VL_IDVALE_PK]
      );

      if (totalDescontado > 0) {
        await (connection as any).execute(
          "INSERT INTO KS_NOMINA_VALES (NM_IDNOMINA_FK, VL_IDVALE_PK, NV_MONTO_DESCONTADO) VALUES (?, ?, ?)",
          [nominaId, vale.VL_IDVALE_PK, totalDescontado]
        );
      }
    }

    // 8.2. Liquidar cuotas de servicios de trabajador
    await (connection as any).execute(
      `UPDATE KS_SERVICIO_TRABAJADOR_CUOTAS stc
       JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
       SET stc.STC_ESTADO = 'PAGADO'
       WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE'`,
      [workerId]
    );

    // 9. Actualizar trabajador (Inactivar y guardar fecha y motivo de retiro)
    await (connection as any).execute(
      `UPDATE KS_TRABAJADORES 
       SET TR_ACTIVO = 0, TR_FECHA_RETIRO = ?, TR_MOTIVO_RETIRO = ? 
       WHERE TR_IDTRABAJADOR_PK = ?`,
      [toLocalDateString(fechaRetiro), motivo || null, workerId]
    );

    await connection.commit();
    revalidatePath("/dashboard/nomina");
    revalidatePath("/dashboard/trabajadores");
    revalidatePath("/dashboard/usuarios-admin");

    return {
      success: true,
      message: `El trabajador ${worker.TR_NOMBRE} ha sido liquidado e inactivado correctamente. Balance Final: $${netPay}`,
      data: { nominaId, netPay }
    };

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al liquidar trabajador por retiro:", error);
    return { success: false, error: "Error al procesar la liquidación de retiro" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Generar una previsualización de la liquidación por retiro sin alterar la base de datos
 */
export async function previewLiquidadionRetiro(
  workerId: number,
  fechaRetiro: Date,
  basePay: number = 0
): Promise<ApiResponse> {
  try {
    // 1. Obtener datos del trabajador
    const [workers]: any = await db.execute(
      `SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE, r.RL_NOMBRE, s.SC_NOMBRE 
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       LEFT JOIN KS_SUCURSALES s ON t.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
       WHERE t.TR_IDTRABAJADOR_PK = ?`,
      [workerId]
    );

    if (workers.length === 0) {
      return { success: false, error: "Trabajador no encontrado" };
    }
    const worker = workers[0];

    // 2. Determinar la fecha de inicio del periodo pendiente
    const [lastNom]: any = await db.execute(
      `SELECT MAX(n.NM_FECHA_FIN) as last_date
       FROM KS_NOMINAS n
       JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
       WHERE nd.TR_IDTRABAJADOR_FK = ? AND n.NM_ESTADO = 'CONFIRMADA'`,
      [workerId]
    );
    const lastDate = lastNom[0]?.last_date ? new Date(lastNom[0].last_date) : new Date("2020-01-01");
    
    // 3. Obtener configuración vigente para calcular comisiones
    const configRes = await getConfigForDate(fechaRetiro);
    const svcPercent = configRes.success && configRes.data ? Number(configRes.data.NC_PORCENTAJE_SERVICIO) : 50;

    let comisionesServicios = 0;
    let comisionesProductos = 0;
    let auditData: any[] = [];

    if (worker.RL_NOMBRE === 'TECNICO') {
      // 3.1. Calcular comisiones de servicios en el periodo pendiente
      const [services]: any = await db.execute(
        `SELECT SUM((fd.FD_VALOR * fd.FD_CANTIDAD) - IFNULL((SELECT SUM(fp.FP_VALOR * fp.FP_CANTIDAD) FROM KS_FACTURA_PRODUCTOS fp WHERE fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK), 0)) as total,
         SUM(fd.FD_PROPINA) as propinas
         FROM KS_FACTURA_DETALLES fd 
         JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fd.TR_IDTECNICO_FK = ? 
           AND f.FC_FECHA > ? AND DATE(f.FC_FECHA) <= DATE(?)
           AND f.FC_ESTADO != 'CANCELADO'
           AND NOT EXISTS (
             SELECT 1 FROM KS_PAGOS_FACTURA pf
             JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
             WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
           )`,
        [workerId, lastDate, fechaRetiro]
      );
      const svcTotal = Number(services[0].total || 0);
      const svcPropinas = Number(services[0].propinas || 0);
      comisionesServicios = svcTotal * (svcPercent / 100) + svcPropinas;

      // 3.2. Calcular comisiones de productos
      const [products]: any = await db.execute(
        `SELECT SUM(fp.FP_COMISION_VALOR) as total 
         FROM KS_FACTURA_PRODUCTOS fp
         JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fp.TR_IDTECNICO_FK = ? 
           AND f.FC_FECHA > ? AND DATE(f.FC_FECHA) <= DATE(?)
           AND f.FC_ESTADO = 'PAGADO'
           AND fp.FD_IDDETALLE_FK IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM KS_PAGOS_FACTURA pf
             JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
             WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
           )`,
        [workerId, lastDate, fechaRetiro]
      );
      comisionesProductos = Number(products[0].total || 0);

      // Obtener auditoria
      const auditRes = await getNominaAudit(workerId, lastDate, fechaRetiro);
      if (auditRes.success && auditRes.data) {
        auditData = auditRes.data;
      }
    }

    const totalComisiones = comisionesServicios + comisionesProductos;

    // 4. Calcular el 100% de la deuda consolidada
    // 4.1. Saldo pendiente de vales
    const [valesRegistros]: any = await db.execute(
      `SELECT VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_IDVALE_PK
       FROM KS_VALES 
       WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE'`,
      [workerId]
    );

    let valesTotalDeduct = 0;
    for (const vale of valesRegistros) {
      const remainingCuotas = vale.VL_CUOTAS - vale.VL_CUOTAS_PAGADAS;
      if (remainingCuotas > 0) {
        const cuotaValor = vale.VL_MONTO / vale.VL_CUOTAS;
        valesTotalDeduct += (cuotaValor * remainingCuotas);
      }
    }

    // 4.2. Saldo pendiente de servicios de trabajador
    const [serviciosCuotas]: any = await db.execute(
      `SELECT SUM(stc.STC_VALOR_CUOTA) as total 
       FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
       JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
       WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE'`,
      [workerId]
    );
    const serviciosTotalDeduct = Number(serviciosCuotas[0].total || 0);

    // 5. Calcular balance neto definitivo
    const netPay = basePay + totalComisiones - serviciosTotalDeduct - valesTotalDeduct;

    // Retornar objeto idéntico a showVolante en nómina
    return {
      success: true,
      data: {
        volante: {
          TR_NOMBRE: worker.TR_NOMBRE,
          TR_IDTRABAJADOR_FK: worker.TR_IDTRABAJADOR_PK,
          RL_NOMBRE: worker.RL_NOMBRE,
          SC_NOMBRE: worker.SC_NOMBRE || 'Global',
          ND_BASE: basePay,
          ND_COMISIONES: totalComisiones,
          ND_BONOS: 0,
          ND_DEDUCCIONES_SERVICIOS_TRABAJADOR: serviciosTotalDeduct,
          ND_DEDUCCIONES_VALES: valesTotalDeduct,
          ND_TOTAL_NETO: netPay,
          periodoRange: `Retiro: ${lastDate.toLocaleDateString('es-CO')} al ${new Date(fechaRetiro).toLocaleDateString('es-CO')}`
        },
        auditData
      }
    };

  } catch (error) {
    console.error("Error previewing retirement liquidation:", error);
    return { success: false, error: "Error al generar la previsualización" };
  }
}

/**
 * Realizar liquidación individual definitiva (Sin inactivar al trabajador)
 */
export async function liquidarTrabajadorIndividual(
  workerId: number,
  endDate: Date,
  basePay: number = 0
): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener datos del trabajador
    const [workers]: any = await (connection as any).execute(
      `SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE, r.RL_NOMBRE 
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE t.TR_IDTRABAJADOR_PK = ?`,
      [workerId]
    );

    if (workers.length === 0) {
      return { success: false, error: "Trabajador no encontrado" };
    }
    const worker = workers[0];

    // 2. Determinar la fecha de inicio del periodo pendiente
    const [lastNom]: any = await (connection as any).execute(
      `SELECT MAX(n.NM_FECHA_FIN) as last_date
       FROM KS_NOMINAS n
       JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
       WHERE nd.TR_IDTRABAJADOR_FK = ? AND n.NM_ESTADO = 'CONFIRMADA'`,
      [workerId]
    );
    
    // Si no tiene liquidaciones previas, tomamos 30 días atrás como seguridad
    const defaultDate = new Date(endDate);
    defaultDate.setDate(defaultDate.getDate() - 30);
    const lastDate = lastNom[0]?.last_date ? new Date(lastNom[0].last_date) : defaultDate;
    
    // 3. Obtener configuración vigente
    const configRes = await getConfigForDate(endDate);
    const svcPercent = configRes.success && configRes.data ? Number(configRes.data.NC_PORCENTAJE_SERVICIO) : 50;

    let comisionesServicios = 0;
    let comisionesProductos = 0;
    let propinasTotales = 0;

    if (worker.RL_NOMBRE === 'TECNICO') {
      // 3.1. Calcular comisiones de servicios
      const [services]: any = await (connection as any).execute(
        `SELECT SUM((fd.FD_VALOR * fd.FD_CANTIDAD) - IFNULL((
           SELECT SUM(fp.FP_VALOR * fp.FP_CANTIDAD) 
           FROM KS_FACTURA_PRODUCTOS fp 
           WHERE fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK
         ), 0)) as total,
         SUM(fd.FD_PROPINA) as propinas
         FROM KS_FACTURA_DETALLES fd 
         JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fd.TR_IDTECNICO_FK = ? 
           AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?)
           AND f.FC_ESTADO != 'CANCELADO'
           AND NOT EXISTS (
             SELECT 1 FROM KS_PAGOS_FACTURA pf
             JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
             WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
           )`,
        [workerId, lastDate, endDate]
      );
      const svcTotal = Number(services[0].total || 0);
      propinasTotales = Number(services[0].propinas || 0);
      comisionesServicios = svcTotal * (svcPercent / 100);

      // 3.2. Calcular comisiones de productos
      const [products]: any = await (connection as any).execute(
        `SELECT SUM(fp.FP_COMISION_VALOR) as total 
         FROM KS_FACTURA_PRODUCTOS fp
         JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fp.TR_IDTECNICO_FK = ? 
           AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?)
           AND f.FC_ESTADO = 'PAGADO'
           AND fp.FD_IDDETALLE_FK IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM KS_PAGOS_FACTURA pf
             JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
             WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
           )`,
        [workerId, lastDate, endDate]
      );
      comisionesProductos = Number(products[0].total || 0);
    }

    const totalComisiones = comisionesServicios + comisionesProductos + propinasTotales;

    // 4. Deducciones
    // 4.1. Cuotas de Vales (Solo las correspondientes al periodo)
    const [valesRegistros]: any = await (connection as any).execute(
      `SELECT VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_IDVALE_PK
       FROM KS_VALES 
       WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE'
       AND DATE(VL_FECHA_INICIO_COBRO) <= DATE(?)`,
      [workerId, endDate]
    );

    let valesTotalDeduct = 0;
    const valesADescontar = [];
    for (const vale of valesRegistros) {
      const remainingCuotas = vale.VL_CUOTAS - vale.VL_CUOTAS_PAGADAS;
      if (remainingCuotas > 0) {
        const cuotaValor = vale.VL_MONTO / vale.VL_CUOTAS;
        valesTotalDeduct += cuotaValor; // Una sola cuota
        valesADescontar.push({ valeId: vale.VL_IDVALE_PK, monto: cuotaValor });
      }
    }

    // 4.2. Cuotas de Servicios de Trabajador (Solo las correspondientes al periodo)
    const [serviciosCuotas]: any = await (connection as any).execute(
      `SELECT SUM(stc.STC_VALOR_CUOTA) as total 
       FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
       JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
       WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE'
       AND DATE(stc.STC_FECHA_COBRO) > DATE(?) AND DATE(stc.STC_FECHA_COBRO) <= DATE(?)`,
      [workerId, lastDate, endDate]
    );
    const serviciosTotalDeduct = Number(serviciosCuotas[0].total || 0);

    // 4.3. Garantias
    const [garantiasRegistros]: any = await (connection as any).execute(
      `SELECT SUM(GA_VALOR) as total
       FROM KS_GARANTIAS
       WHERE TR_IDTECNICO_ORIGINAL_FK = ? AND DATE(GA_FECHA) > DATE(?) AND DATE(GA_FECHA) <= DATE(?)`,
       [workerId, lastDate, endDate]
    );
    const garantiasDeduct = Number(garantiasRegistros[0].total || 0);

    // 5. Calcular balance neto definitivo
    const netPay = basePay + totalComisiones - serviciosTotalDeduct - valesTotalDeduct - garantiasDeduct;

    // 6. Crear cabecera de Nómina Individual
    const [nominaResult]: any = await (connection as any).execute(
      `INSERT INTO KS_NOMINAS (NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO, NM_TIPO, NM_TOTAL_PAGADO, NM_FECHA_CIERRE) 
       VALUES (?, ?, 'CONFIRMADA', 'INDIVIDUAL', ?, CURRENT_TIMESTAMP)`,
      [toLocalDateString(lastDate), toLocalDateString(endDate), netPay]
    );
    const nominaId = nominaResult.insertId;

    // 7. Insertar detalle de Nómina
    await (connection as any).execute(
      `INSERT INTO KS_NOMINA_DETALLES 
       (NM_IDNOMINA_FK, TR_IDTRABAJADOR_FK, ND_BASE, ND_COMISIONES, ND_BONOS, ND_DEDUCCIONES_SERVICIOS_TRABAJADOR, ND_DEDUCCIONES_VALES, ND_DEDUCCIONES_GARANTIAS, ND_TOTAL_NETO)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [nominaId, workerId, basePay, totalComisiones, serviciosTotalDeduct, valesTotalDeduct, garantiasDeduct, netPay]
    );

    // 8. Aplicar descuentos (Confirmar Vales y Servicios)
    // 8.1. Liquidar Vales (Aumentar cuotas pagadas)
    for (const vDesc of valesADescontar) {
      // Buscar vale actual para incrementarlo
      const [valeCurrent]: any = await (connection as any).execute(
        "SELECT VL_CUOTAS, VL_CUOTAS_PAGADAS FROM KS_VALES WHERE VL_IDVALE_PK = ?", [vDesc.valeId]
      );
      if(valeCurrent.length > 0) {
        const newPagadas = valeCurrent[0].VL_CUOTAS_PAGADAS + 1;
        const newEstado = newPagadas >= valeCurrent[0].VL_CUOTAS ? 'DESCONTADO' : 'PENDIENTE';
        
        await (connection as any).execute(
          "UPDATE KS_VALES SET VL_CUOTAS_PAGADAS = ?, VL_ESTADO = ?, NM_IDNOMINA_FK = ? WHERE VL_IDVALE_PK = ?",
          [newPagadas, newEstado, nominaId, vDesc.valeId]
        );

        await (connection as any).execute(
          "INSERT INTO KS_NOMINA_VALES (NM_IDNOMINA_FK, VL_IDVALE_PK, NV_MONTO_DESCONTADO) VALUES (?, ?, ?)",
          [nominaId, vDesc.valeId, vDesc.monto]
        );
      }
    }

    // 8.2. Liquidar cuotas de servicios de trabajador
    await (connection as any).execute(
      `UPDATE KS_SERVICIO_TRABAJADOR_CUOTAS stc
       JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
       SET stc.STC_ESTADO = 'PAGADO'
       WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE'
       AND DATE(stc.STC_FECHA_COBRO) > DATE(?) AND DATE(stc.STC_FECHA_COBRO) <= DATE(?)`,
      [workerId, lastDate, endDate]
    );

    // El trabajador CONTINUA ACTIVO, no se hace el paso de retiro.

    await connection.commit();
    revalidatePath("/dashboard/nomina");
    revalidatePath("/dashboard/trabajadores");

    return {
      success: true,
      message: `Liquidación individual para ${worker.TR_NOMBRE} procesada exitosamente. Balance: $${netPay}`,
      data: { nominaId, netPay }
    };

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al liquidar trabajador individualmente:", error);
    return { success: false, error: "Error al procesar la liquidación individual" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Previsualizar liquidación individual (sin guardarla)
 */
export async function previewLiquidacionIndividual(
  workerId: number,
  endDate: Date,
  basePay: number = 0
): Promise<ApiResponse> {
  try {
    const [workers]: any = await db.execute(
      `SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE, r.RL_NOMBRE, s.SC_NOMBRE 
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       LEFT JOIN KS_SUCURSALES s ON t.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
       WHERE t.TR_IDTRABAJADOR_PK = ?`,
      [workerId]
    );

    if (workers.length === 0) {
      return { success: false, error: "Trabajador no encontrado" };
    }
    const worker = workers[0];

    const [lastNom]: any = await db.execute(
      `SELECT MAX(n.NM_FECHA_FIN) as last_date
       FROM KS_NOMINAS n
       JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
       WHERE nd.TR_IDTRABAJADOR_FK = ? AND n.NM_ESTADO = 'CONFIRMADA'`,
      [workerId]
    );
    
    const defaultDate = new Date(endDate);
    defaultDate.setDate(defaultDate.getDate() - 30);
    const lastDate = lastNom[0]?.last_date ? new Date(lastNom[0].last_date) : defaultDate;
    
    const configRes = await getConfigForDate(endDate);
    const svcPercent = configRes.success && configRes.data ? Number(configRes.data.NC_PORCENTAJE_SERVICIO) : 50;

    let comisionesServicios = 0;
    let comisionesProductos = 0;
    let propinasTotales = 0;
    let auditData: any[] = [];

    if (worker.RL_NOMBRE === 'TECNICO') {
      const [services]: any = await db.execute(
        `SELECT SUM((fd.FD_VALOR * fd.FD_CANTIDAD) - IFNULL((SELECT SUM(fp.FP_VALOR * fp.FP_CANTIDAD) FROM KS_FACTURA_PRODUCTOS fp WHERE fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK), 0)) as total,
         SUM(fd.FD_PROPINA) as propinas
         FROM KS_FACTURA_DETALLES fd 
         JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fd.TR_IDTECNICO_FK = ? 
           AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?)
           AND f.FC_ESTADO != 'CANCELADO'
           AND NOT EXISTS (
             SELECT 1 FROM KS_PAGOS_FACTURA pf
             JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
             WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
           )`,
        [workerId, lastDate, endDate]
      );
      const svcTotal = Number(services[0].total || 0);
      propinasTotales = Number(services[0].propinas || 0);
      comisionesServicios = svcTotal * (svcPercent / 100);

      const [products]: any = await db.execute(
        `SELECT SUM(fp.FP_COMISION_VALOR) as total 
         FROM KS_FACTURA_PRODUCTOS fp
         JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
         WHERE fp.TR_IDTECNICO_FK = ? 
           AND DATE(f.FC_FECHA) > DATE(?) AND DATE(f.FC_FECHA) <= DATE(?)
           AND f.FC_ESTADO = 'PAGADO'
           AND fp.FD_IDDETALLE_FK IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM KS_PAGOS_FACTURA pf
             JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
             WHERE pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK AND mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR'
           )`,
        [workerId, lastDate, endDate]
      );
      comisionesProductos = Number(products[0].total || 0);

      const auditRes = await getNominaAudit(workerId, lastDate, endDate);
      if (auditRes.success && auditRes.data) {
        auditData = auditRes.data;
      }
    }

    const totalComisiones = comisionesServicios + comisionesProductos + propinasTotales;

    const [valesRegistros]: any = await db.execute(
      `SELECT VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_IDVALE_PK
       FROM KS_VALES 
       WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE'
       AND DATE(VL_FECHA_INICIO_COBRO) <= DATE(?)`,
      [workerId, endDate]
    );

    let valesTotalDeduct = 0;
    for (const vale of valesRegistros) {
      const remainingCuotas = vale.VL_CUOTAS - vale.VL_CUOTAS_PAGADAS;
      if (remainingCuotas > 0) {
        const cuotaValor = vale.VL_MONTO / vale.VL_CUOTAS;
        valesTotalDeduct += cuotaValor;
      }
    }

    const [serviciosCuotas]: any = await db.execute(
      `SELECT SUM(stc.STC_VALOR_CUOTA) as total 
       FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
       JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
       WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE'
       AND DATE(stc.STC_FECHA_COBRO) > DATE(?) AND DATE(stc.STC_FECHA_COBRO) <= DATE(?)`,
      [workerId, lastDate, endDate]
    );
    const serviciosTotalDeduct = Number(serviciosCuotas[0].total || 0);

    const [garantiasRegistros]: any = await db.execute(
      `SELECT SUM(GA_VALOR) as total
       FROM KS_GARANTIAS
       WHERE TR_IDTECNICO_ORIGINAL_FK = ? AND DATE(GA_FECHA) > DATE(?) AND DATE(GA_FECHA) <= DATE(?)`,
       [workerId, lastDate, endDate]
    );
    const garantiasDeduct = Number(garantiasRegistros[0].total || 0);

    const netPay = basePay + totalComisiones - serviciosTotalDeduct - valesTotalDeduct - garantiasDeduct;

    return {
      success: true,
      data: {
        volante: {
          TR_NOMBRE: worker.TR_NOMBRE,
          TR_IDTRABAJADOR_FK: worker.TR_IDTRABAJADOR_PK,
          RL_NOMBRE: worker.RL_NOMBRE,
          SC_NOMBRE: worker.SC_NOMBRE || 'Global',
          ND_BASE: basePay,
          ND_COMISIONES: totalComisiones,
          ND_BONOS: 0,
          ND_DEDUCCIONES_SERVICIOS_TRABAJADOR: serviciosTotalDeduct,
          ND_DEDUCCIONES_VALES: valesTotalDeduct,
          ND_DEDUCCIONES_GARANTIAS: garantiasDeduct,
          ND_TOTAL_NETO: netPay,
          periodoRange: `Individual: ${lastDate.toISOString().split('T')[0].split('-').reverse().join('/')} al ${new Date(endDate).toISOString().split('T')[0].split('-').reverse().join('/')}`
        },
        auditData
      }
    };

  } catch (error) {
    console.error("Error previewing individual liquidation:", error);
    return { success: false, error: "Error al generar la previsualización individual" };
  }
}

/**
 * Obtener la última fecha de nómina pagada a un trabajador
 * Útil para mostrar al usuario desde cuándo se va a liquidar
 */
export async function getWorkerLastSettlementDate(workerId: number): Promise<ApiResponse> {
  try {
    const [lastNom]: any = await db.execute(
      `SELECT MAX(n.NM_FECHA_FIN) as last_date
       FROM KS_NOMINAS n
       JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
       WHERE nd.TR_IDTRABAJADOR_FK = ? AND n.NM_ESTADO = 'CONFIRMADA'`,
      [workerId]
    );
    
    if (lastNom[0]?.last_date) {
      return { success: true, data: { lastDate: new Date(lastNom[0].last_date).toISOString() } };
    } else {
      // Si no hay, devolvemos 30 días atrás por defecto como en el cálculo
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() - 30);
      return { success: true, data: { lastDate: defaultDate.toISOString() } };
    }
  } catch (error) {
    console.error("Error obteniendo última fecha de nómina:", error);
    return { success: false, error: "Error al obtener fecha de inicio" };
  }
}
