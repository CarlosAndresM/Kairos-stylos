'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { InvoiceFormData } from "@/features/billing/schema";
import { revalidatePath } from "next/cache";
import { hashPassword, comparePassword, isHashed } from "@/lib/password-utils";
import { finalizeUpload } from "@/lib/file-utils";
import { toLocalDateString } from "@/lib/date-utils";

/**
 * Obtener todos los trabajadores activos y sus cargos
 */
export async function getWorkers(): Promise<ApiResponse> {
  try {
    const [rows] = await db.execute(
      `SELECT t.tr_idtrabajador_pk, t.tr_nombre, r.rl_nombre 
       FROM ks_trabajadores t 
       JOIN ks_roles r ON t.rl_idrol_fk = r.rl_idrol_pk 
       WHERE t.tr_activo = TRUE AND r.rl_nombre != 'ADMINISTRADOR_TOTAL'`
    );
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching workers:", error);
    return { success: false, data: null, error: "Error al obtener trabajadores" };
  }
}

/**
 * Obtener una factura completa por su ID (incluyendo detalles y pagos)
 */
export async function getInvoiceById(id: number): Promise<ApiResponse> {
  try {
    const [invoices]: any = await (db as any).execute(
      `SELECT f.*, 
       COALESCE(f.fc_cliente_nombre, t.tr_nombre) as cliente_display,
       t.tr_idtrabajador_pk as tr_idcliente_fk
       FROM ks_facturas f 
       LEFT JOIN ks_trabajadores t ON f.tr_idcliente_fk = t.tr_idtrabajador_pk
       WHERE f.fc_idfactura_pk = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return { success: false, data: null, error: "Factura no encontrada" };
    }

    const invoice = invoices[0];

    // Fetch details
    const [services]: any = await (db as any).execute(
      `SELECT fd.fd_iddetalle_pk, fd.fd_valor, fd.fd_cantidad, fd.sv_idservicio_fk, fd.tr_idtecnico_fk, t.tr_nombre as tr_tecnico_nombre
       FROM ks_factura_detalles fd
       LEFT JOIN ks_trabajadores t ON fd.tr_idtecnico_fk = t.tr_idtrabajador_pk
       WHERE fd.fc_idfactura_fk = ?`,
      [id]
    );

    const [products]: any = await (db as any).execute(
      `SELECT fp.fp_idfactura_producto_pk, fp.fp_valor, fp.fp_cantidad, fp.fp_porcentaje_aplicado, fp.fp_comision_valor, fp.pr_idproducto_fk, fp.tr_idtecnico_fk, fp.fd_iddetalle_fk, t.tr_nombre as tr_tecnico_nombre
       FROM ks_factura_productos fp
       LEFT JOIN ks_trabajadores t ON fp.tr_idtecnico_fk = t.tr_idtrabajador_pk
       WHERE fp.fc_idfactura_fk = ?`,
      [id]
    );

    const [payments]: any = await (db as any).execute(
      "SELECT pf_valor, pf_evidencia_url, mp_idmetodo_fk FROM ks_pagos_factura WHERE fc_idfactura_fk = ?",
      [id]
    );

    // Check if it's a worker service (voucher)
    const [serviciosRegistrados]: any = await (db as any).execute(
      "SELECT st_numero_cuotas as VL_NUMERO_CUOTAS, st_fecha_inicio_cobro as VL_FECHA_INICIO_COBRO FROM ks_servicios_trabajador WHERE fc_idfactura_fk = ?",
      [id]
    );

    const esServicioTrabajador = serviciosRegistrados.length > 0;
    const infoServicio = esServicioTrabajador ? serviciosRegistrados[0] : {};

    return {
      success: true,
      data: {
        ...invoice,
        ...infoServicio,
        FC_TOTAL: Number(invoice.fc_total || 0),
        services: (services || []).map((s: any) => ({ ...s, FD_VALOR: Number(s.fd_valor || 0) })),
        products: (products || []).map((p: any) => ({ ...p, FP_VALOR: Number(p.fp_valor || 0) })),
        payments: (payments || []).map((p: any) => ({ ...p, PF_VALOR: Number(p.pf_valor || 0) })),
        esServicioTrabajador
      },
      error: null
    };
  } catch (error) {
    console.error("Error fetching invoice details:", error);
    return { success: false, data: null, error: "Error al obtener detalles de la factura" };
  }
}

/**
 * Guardar o Actualizar Factura
 */
export async function saveInvoice(data: InvoiceFormData): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const isUpdate = !!data.FC_IDFACTURA_PK;
    let invoiceId = data.FC_IDFACTURA_PK;

    // Obtener IDs de métodos de pago al inicio para evitar errores de ámbito
    const [methodRows]: any = await (connection as any).execute("SELECT mp_idmetodo_pk, mp_nombre FROM ks_metodos_pago");
    const allMethods = methodRows as { mp_idmetodo_pk: number, mp_nombre: string }[];
    const metodoCreditoId = allMethods.find(m => m.mp_nombre.toUpperCase() === 'CREDITO')?.mp_idmetodo_pk;
    const metodoServicioId = allMethods.find(m => m.mp_nombre.toUpperCase() === 'VALE' || m.mp_nombre.toUpperCase() === 'SERVICIO DE TRABAJADOR' || m.mp_nombre.toUpperCase() === 'SERVICIO TRABAJADOR')?.mp_idmetodo_pk;

    // Auto-resolve invoice status
    if (data.payments && data.payments.length > 0) {
      const totalPagado = data.payments.reduce((sum, p) => sum + (Number(p.PF_VALOR) || 0), 0);
      const invoiceTotal = Number(data.FC_TOTAL || 0);
      const tolerance = 1;

      const getMethodName = (id: number) => allMethods.find((m: any) => m.mp_idmetodo_pk === id)?.mp_nombre?.toUpperCase() || '';

      const allMethodsAreValid = data.payments.every(p => {
        const name = getMethodName(p.MP_IDMETODO_FK);
        return name !== ''
      });

      if (allMethodsAreValid && Math.abs(totalPagado - invoiceTotal) <= tolerance) {
        if (data.FC_ESTADO !== 'PENDIENTE') {
          data.FC_ESTADO = 'PAGADO';
        }
      }
    }

    // 0.1 Check for duplicate invoice number IF provided
    if (data.FC_NUMERO_FACTURA) {
      const checkQuery = isUpdate
        ? "SELECT 1 FROM ks_facturas WHERE fc_numero_factura = ? AND fc_idfactura_pk != ?"
        : "SELECT 1 FROM ks_facturas WHERE fc_numero_factura = ?";
      const checkParams = isUpdate ? [data.FC_NUMERO_FACTURA, invoiceId] : [data.FC_NUMERO_FACTURA];

      const [existing]: any = await (connection as any).execute(checkQuery, checkParams);
      if (existing.length > 0) {
        throw new Error(`El número de factura "${data.FC_NUMERO_FACTURA}" ya está en uso.`);
      }
    }

    // 0.2 If no invoice number provided for new invoice, auto-generate it
    let targetInvoiceNum = data.FC_NUMERO_FACTURA;
    if (!isUpdate && !targetInvoiceNum) {
      const [rows]: any = await (connection as any).execute(
        "SELECT COALESCE(MAX(CAST(fc_numero_factura AS UNSIGNED)), 0) + 1 AS next FROM ks_facturas WHERE fc_numero_factura REGEXP '^[0-9]+$'"
      );
      targetInvoiceNum = String(rows[0]?.next || 1);
    }

    // 0. Si hay evidencia física, mover de temp
    let fizUrl = data.FC_EVIDENCIA_FISICA_URL;
    if (fizUrl && fizUrl.includes('/temp/')) {
      fizUrl = await finalizeUpload(fizUrl, data.FC_NUMERO_FACTURA || `${Date.now()}`);
    }


    if (isUpdate) {
      // ACTUALIZAR FACTURA BASE
      await (connection as any).execute(
        `UPDATE ks_facturas SET 
          fc_numero_factura = ?, fc_fecha = ?, fc_cliente_nombre = ?, 
          fc_cliente_telefono = ?, fc_total = ?, fc_estado = ?, 
          sc_idsucursal_fk = ?, tr_idcajero_fk = ?, fc_tipo_cliente = ?, 
          tr_idcliente_fk = ?, fc_evidencia_fisica_url = ?
         WHERE fc_idfactura_pk = ?`,
        [
          data.FC_NUMERO_FACTURA,
          toLocalDateString(data.FC_FECHA),
          data.FC_TIPO_CLIENTE === 'CLIENTE' ? data.FC_CLIENTE_NOMBRE : null,
          data.FC_TIPO_CLIENTE === 'CLIENTE' ? data.FC_CLIENTE_TELEFONO : null,
          data.FC_TOTAL,
          data.FC_ESTADO,
          data.SC_IDSUCURSAL_FK,
          data.TR_IDCAJERO_FK,
          data.FC_TIPO_CLIENTE || 'CLIENTE',
          data.FC_TIPO_CLIENTE === 'TECNICO' ? data.TR_IDCLIENTE_FK : null,
          fizUrl || null,
          invoiceId
        ]

      );

      // Limpiar detalles
      await (connection as any).execute("DELETE FROM ks_factura_detalles WHERE fc_idfactura_fk = ?", [invoiceId]);
      await (connection as any).execute("DELETE FROM ks_factura_productos WHERE fc_idfactura_fk = ?", [invoiceId]);

      const newMethodIds = data.payments.map(p => Number(p.MP_IDMETODO_FK));

      // Limpiar pagos antiguos que NO están en los nuevos
      await (connection as any).execute(
        `DELETE FROM ks_pagos_factura WHERE fc_idfactura_fk = ? AND mp_idmetodo_fk NOT IN (${newMethodIds.length > 0 ? newMethodIds.join(',') : '-1'})`,
        [invoiceId]
      );

      // Limpiar Vouchers si ya no aplica el método
      if (metodoServicioId && !newMethodIds.includes(metodoServicioId) && !(data.FC_TIPO_CLIENTE === 'TECNICO' && data.esServicioTrabajador)) {
        const [vRows]: any = await (connection as any).execute("SELECT st_idservicio_trabajador_pk FROM ks_servicios_trabajador WHERE fc_idfactura_fk = ?", [invoiceId]);
        for (const v of vRows) {
          await (connection as any).execute("DELETE FROM ks_servicio_trabajador_cuotas WHERE st_idservicio_trabajador_fk = ?", [v.st_idservicio_trabajador_pk]);
        }
        await (connection as any).execute("DELETE FROM ks_servicios_trabajador WHERE fc_idfactura_fk = ?", [invoiceId]);
      }

      // Limpiar Créditos si ya no aplica
      if (metodoCreditoId && !newMethodIds.includes(metodoCreditoId)) {
        const [cRows]: any = await (connection as any).execute("SELECT cr_idcredito_pk FROM ks_creditos WHERE fc_idfactura_fk = ?", [invoiceId]);
        for (const c of cRows) {
          await (connection as any).execute("DELETE FROM ks_credito_abonos WHERE cr_idcredito_fk = ?", [c.cr_idcredito_pk]);
        }
        await (connection as any).execute("DELETE FROM ks_creditos WHERE fc_idfactura_fk = ?", [invoiceId]);
      }

    } else {
      // INSERTAR NUEVA FACTURA
      const [invoiceResult]: any = await (connection as any).execute(
        `INSERT INTO ks_facturas (
          fc_numero_factura, fc_fecha, fc_cliente_nombre, fc_cliente_telefono, 
          fc_total, fc_estado, sc_idsucursal_fk, tr_idcajero_fk,
          fc_tipo_cliente, tr_idcliente_fk, fc_evidencia_fisica_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetInvoiceNum,
          toLocalDateString(data.FC_FECHA),
          data.FC_TIPO_CLIENTE === 'CLIENTE' ? data.FC_CLIENTE_NOMBRE : null,
          data.FC_TIPO_CLIENTE === 'CLIENTE' ? data.FC_CLIENTE_TELEFONO : null,
          data.FC_TOTAL,
          data.FC_ESTADO,
          data.SC_IDSUCURSAL_FK,
          data.TR_IDCAJERO_FK,
          data.FC_TIPO_CLIENTE || 'CLIENTE',
          data.FC_TIPO_CLIENTE === 'TECNICO' ? data.TR_IDCLIENTE_FK : null,
          fizUrl || null
        ]

      );
      invoiceId = invoiceResult.insertId;
    }


    for (const service of (data.services || [])) {
      const [serviceResult]: any = await (connection as any).execute(
        `INSERT INTO ks_factura_detalles (fd_valor, fd_cantidad, fc_idfactura_fk, sv_idservicio_fk, tr_idtecnico_fk) 
         VALUES (?, ?, ?, ?, ?)`,
        [service.FD_VALOR, service.FD_CANTIDAD || 1, invoiceId, service.SV_IDSERVICIO_FK, service.TR_IDTECNICO_FK]
      );
      const serviceDetailId = serviceResult.insertId;

      if (service.products && service.products.length > 0) {
        for (const product of service.products) {
          await (connection as any).execute(
            `INSERT INTO ks_factura_productos (fp_valor, fp_cantidad, fp_porcentaje_aplicado, fp_comision_valor, fc_idfactura_fk, pr_idproducto_fk, tr_idtecnico_fk, fd_iddetalle_fk) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              product.FP_VALOR,
              product.FP_CANTIDAD || 1,
              product.FP_PORCENTAJE_APLICADO || 0,
              product.FP_COMISION_VALOR || 0,
              invoiceId,
              product.PR_IDPRODUCTO_FK,
              product.TR_IDTECNICO_FK,
              serviceDetailId
            ]
          );
        }
      }
    }

    if (data.products && data.products.length > 0) {
      for (const product of data.products) {
        await (connection as any).execute(
          `INSERT INTO ks_factura_productos (fp_valor, fp_cantidad, fp_porcentaje_aplicado, fp_comision_valor, fc_idfactura_fk, pr_idproducto_fk, tr_idtecnico_fk, fd_iddetalle_fk) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.FP_VALOR,
            product.FP_CANTIDAD || 1,
            product.FP_PORCENTAJE_APLICADO || 0,
            product.FP_COMISION_VALOR || 0,
            invoiceId,
            product.PR_IDPRODUCTO_FK,
            product.TR_IDTECNICO_FK,
            product.FD_IDDETALLE_FK || null
          ]
        );
      }
    }

    // PROCESAMIENTO DE PAGOS
    for (const payment of (data.payments || [])) {
      if (Number(payment.PF_VALOR) > 0) {
        let finalUrl = payment.PF_EVIDENCIA_URL;
        if (finalUrl && finalUrl.includes('/temp/')) {
          finalUrl = await finalizeUpload(finalUrl, data.FC_NUMERO_FACTURA || `${invoiceId}`);
        }

        const [existingPayment]: any = await (connection as any).execute(
          "SELECT pf_idpago_pk FROM ks_pagos_factura WHERE fc_idfactura_fk = ? AND mp_idmetodo_fk = ?",
          [invoiceId, payment.MP_IDMETODO_FK]
        );

        if (existingPayment.length > 0) {
          await (connection as any).execute(
            "UPDATE ks_pagos_factura SET pf_valor = ?, pf_evidencia_url = ? WHERE pf_idpago_pk = ?",
            [payment.PF_VALOR, finalUrl || null, existingPayment[0].pf_idpago_pk]
          );
        } else {
          await (connection as any).execute(
            `INSERT INTO ks_pagos_factura (pf_valor, pf_evidencia_url, fc_idfactura_fk, mp_idmetodo_fk) 
             VALUES (?, ?, ?, ?)`,
            [payment.PF_VALOR, finalUrl || null, invoiceId, payment.MP_IDMETODO_FK]
          );
        }
      }
    }

    // GESTIÓN DE DEUDAS (FUERA DEL BUCLE PARA EVITAR DUPLICADOS)
    const valorServicioTotal = (data.payments || []).reduce((sum, p) => p.MP_IDMETODO_FK === metodoServicioId ? sum + Number(p.PF_VALOR) : sum, 0);
    const valorCreditoTotal = (data.payments || []).reduce((sum, p) => p.MP_IDMETODO_FK === metodoCreditoId ? sum + Number(p.PF_VALOR) : sum, 0);

    // 1. Servicio de Trabajador (Voucher)
    if ((data.FC_TIPO_CLIENTE === 'TECNICO' && data.esServicioTrabajador) || valorServicioTotal > 0) {
      const valorTotalServicio = valorServicioTotal > 0 ? valorServicioTotal : Number(data.FC_TOTAL || 0);
      const [existingVale]: any = await (connection as any).execute(
        "SELECT st_idservicio_trabajador_pk FROM ks_servicios_trabajador WHERE fc_idfactura_fk = ?",
        [invoiceId]
      );

      if (existingVale.length > 0) {
        const valeId = existingVale[0].st_idservicio_trabajador_pk;
        await (connection as any).execute(
          "UPDATE ks_servicios_trabajador SET st_valor_total = ?, tr_idtrabajador_fk = ?, st_fecha = ? WHERE st_idservicio_trabajador_pk = ?",
          [valorTotalServicio, data.TR_IDCLIENTE_FK || data.TR_IDCAJERO_FK, toLocalDateString(data.FC_FECHA), valeId]
        );
      } else {
        const numCuotas = data.VL_NUMERO_CUOTAS || 1;
        const valorCuota = Math.round((valorTotalServicio / numCuotas) * 100) / 100;
        const fechaInicio = data.VL_FECHA_INICIO_COBRO || data.FC_FECHA || new Date();

        const [vRes]: any = await (connection as any).execute(
          `INSERT INTO ks_servicios_trabajador (st_valor_total, st_numero_cuotas, st_valor_cuota, st_estado, fc_idfactura_fk, tr_idtrabajador_fk, st_fecha_inicio_cobro, st_fecha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [valorTotalServicio, numCuotas, valorCuota, 'PENDIENTE', invoiceId, data.TR_IDCLIENTE_FK || data.TR_IDCAJERO_FK, toLocalDateString(fechaInicio), toLocalDateString(data.FC_FECHA)]
        );
        const vId = vRes.insertId;
        for (let i = 1; i <= numCuotas; i++) {
          const fCuota = new Date(fechaInicio);
          fCuota.setDate(fCuota.getDate() + (i - 1) * 7);
          await (connection as any).execute(
            `INSERT INTO ks_servicio_trabajador_cuotas (stc_numero_cuota, stc_valor_cuota, stc_estado, stc_fecha_cobro, st_idservicio_trabajador_fk)
               VALUES (?, ?, ?, ?, ?)`,
            [i, valorCuota, 'PENDIENTE', toLocalDateString(fCuota), vId]
          );
        }
      }
    }

    // 2. Créditos
    if (valorCreditoTotal > 0) {
      const [existingCredit]: any = await (connection as any).execute(
        "SELECT cr_idcredito_pk FROM ks_creditos WHERE fc_idfactura_fk = ?",
        [invoiceId]
      );

      if (existingCredit.length > 0) {
        await (connection as any).execute(
          "UPDATE ks_creditos SET cr_valor_pendiente = ? WHERE cr_idcredito_pk = ?",
          [valorCreditoTotal, existingCredit[0].cr_idcredito_pk]
        );
      } else {
        await (connection as any).execute(
          `INSERT INTO ks_creditos (cr_valor_pendiente, fc_idfactura_fk)
           VALUES (?, ?)`,
          [valorCreditoTotal, invoiceId]
        );
      }
    }

    await connection.commit();
    revalidatePath("/dashboard/ventas");
    revalidatePath("/dashboard");
    return { success: true, data: { id: invoiceId }, error: null };

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("Error saving invoice:", error);
    return { success: false, data: null, error: error.message || "Error al guardar la factura" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Verificar si una contraseña corresponde a un administrador
 */
export async function verifyAdminPassword(password: string): Promise<ApiResponse> {
  try {
    const [admins]: any = await db.execute(
      `SELECT t.TR_IDTRABAJADOR_PK as tr_idtrabajador_pk, t.TR_PASSWORD as tr_password 
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE r.RL_NOMBRE = 'ADMINISTRADOR_TOTAL'`
    );

    for (const admin of admins) {
      if (isHashed(admin.tr_password)) {
        if (await comparePassword(password, admin.tr_password)) {
          return { success: true };
        }
      } else if (password === admin.tr_password) {
        const newHash = await hashPassword(password);
        await db.execute(
          "UPDATE ks_trabajadores SET tr_password = ? WHERE tr_idtrabajador_pk = ?",
          [newHash, admin.tr_idtrabajador_pk]
        );
        return { success: true };
      }
    }

    return { success: false, error: 'Contraseña de administrador incorrecta o privilegios insuficientes' };
  } catch (error) {
    console.error('Error verificando password:', error);
    return { success: false, error: 'Error del servidor al verificar' };
  }
}

export async function deleteInvoice(invoiceId: number): Promise<ApiResponse> {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    await connection.execute(`DELETE FROM ks_pagos_factura WHERE fc_idfactura_fk = ?`, [invoiceId]);
    await connection.execute(`DELETE FROM ks_servicios_trabajador WHERE fc_idfactura_fk = ?`, [invoiceId]);

    const [oldCredits]: any = await (connection as any).execute("SELECT cr_idcredito_pk FROM ks_creditos WHERE fc_idfactura_fk = ?", [invoiceId]);
    for (const c of oldCredits) {
      await (connection as any).execute("DELETE FROM ks_credito_abonos WHERE cr_idcredito_fk = ?", [c.cr_idcredito_pk]);
    }
    await connection.execute(`DELETE FROM ks_creditos WHERE fc_idfactura_fk = ?`, [invoiceId]);
    await connection.execute(`DELETE FROM ks_factura_detalles WHERE fc_idfactura_fk = ?`, [invoiceId]);
    await connection.execute(`DELETE FROM ks_factura_productos WHERE fc_idfactura_fk = ?`, [invoiceId]);
    await connection.execute(`DELETE FROM ks_facturas WHERE fc_idfactura_pk = ?`, [invoiceId]);

    await connection.commit();
    revalidatePath('/dashboard/ventas');
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar factura:', error);
    return { success: false, error: 'No se pudo eliminar la factura' };
  } finally {
    connection.release();
  }
}

/**
 * Obtener facturas filtradas por fecha y/o sucursal
 */
export async function getInvoicesByFilter(filters: { sucursalId?: number, date?: string }): Promise<ApiResponse> {
  try {
    let query = `
      SELECT f.*, s.sc_nombre as sucursal_nombre,
      COALESCE(f.fc_cliente_nombre, t.tr_nombre) as cliente_display,
      (SELECT GROUP_CONCAT(DISTINCT sv.sv_nombre SEPARATOR ', ') 
       FROM ks_factura_detalles fd 
       JOIN ks_servicios sv ON fd.sv_idservicio_fk = sv.sv_idservicio_pk 
       WHERE fd.fc_idfactura_fk = f.fc_idfactura_pk) as servicios,
      (SELECT GROUP_CONCAT(DISTINCT pr.pr_nombre SEPARATOR ', ') 
       FROM ks_factura_productos fp 
       JOIN ks_productos pr ON fp.pr_idproducto_fk = pr.pr_idproducto_pk 
       WHERE fp.fc_idfactura_fk = f.fc_idfactura_pk) as productos_nombres,
      (SELECT GROUP_CONCAT(DISTINCT mp.mp_nombre SEPARATOR ', ') 
       FROM ks_pagos_factura pf 
       JOIN ks_metodos_pago mp ON pf.mp_idmetodo_fk = mp.mp_idmetodo_pk 
       WHERE pf.fc_idfactura_fk = f.fc_idfactura_pk) as metodos_pago,
      (SELECT GROUP_CONCAT(DISTINCT t_all.tr_nombre SEPARATOR ', ')
       FROM ks_trabajadores t_all
       WHERE t_all.tr_idtrabajador_pk IN (
         SELECT tr_idtecnico_fk FROM ks_factura_detalles WHERE fc_idfactura_fk = f.fc_idfactura_pk
         UNION
         SELECT tr_idtecnico_fk FROM ks_factura_productos WHERE fc_idfactura_fk = f.fc_idfactura_pk
       )) as tecnicos
      FROM ks_facturas f 
      JOIN ks_sucursales s ON f.sc_idsucursal_fk = s.sc_idsucursal_pk
      LEFT JOIN ks_trabajadores t ON f.tr_idcliente_fk = t.tr_idtrabajador_pk
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.sucursalId) {
      query += ` AND f.sc_idsucursal_fk = ?`;
      params.push(filters.sucursalId);
    }

    if (filters.date) {
      query += ` AND DATE(f.fc_fecha) = ?`;
      params.push(filters.date);
    }

    query += ` ORDER BY f.fc_fecha DESC`;

    const [rows]: any = await (db as any).execute(query, params);
    const normalized = rows.map((r: any) => ({
      ...r,
      FC_TOTAL: Number(r.fc_total || 0)
    }));
    return { success: true, data: normalized, error: null };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return { success: false, data: null, error: "Error al obtener facturas" };
  }
}

export async function getRecentInvoices(sucursalId?: number): Promise<ApiResponse> {
  return getInvoicesByFilter({ sucursalId, date: new Date().toISOString().split('T')[0] });
}

export async function getPaymentMethods(): Promise<ApiResponse> {
  try {
    const [rows] = await (db as any).execute("SELECT mp_idmetodo_pk, mp_nombre FROM ks_metodos_pago WHERE mp_nombre != 'DATAFONO'");
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return { success: false, data: [], error: "Error al obtener métodos de pago" };
  }
}

export async function getNextInvoiceNumber(): Promise<ApiResponse> {
  try {
    const [rows]: any = await (db as any).execute(
      "SELECT COALESCE(MAX(CAST(fc_numero_factura AS UNSIGNED)), 0) + 1 AS next FROM ks_facturas WHERE fc_numero_factura REGEXP '^[0-9]+$'"
    );
    return { success: true, data: rows[0]?.next || 1, error: null };
  } catch (error) {
    console.error("Error fetching next invoice number:", error);
    const [rows]: any = await (db as any).execute("SELECT COUNT(*) + 1 AS next FROM ks_facturas");
    return { success: true, data: rows[0]?.next || 1, error: null };
  }
}

export async function addProductToInvoice(
  invoiceId: number,
  productId: number,
  technicianId: number,
  value: number,
  quantity: number = 1,
  detailId?: number
): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener datos de comisión del producto
    const [products]: any = await connection.execute(
      "SELECT PR_APLICA_COMISION, PR_PORCENTAJE_COMISION FROM KS_PRODUCTOS WHERE PR_IDPRODUCTO_PK = ?",
      [productId]
    );
    const product = products[0];
    const appliesComm = !!product?.PR_APLICA_COMISION;
    const commPercent = Number(product?.PR_PORCENTAJE_COMISION || 0);
    const commValue = appliesComm ? (value * quantity * (commPercent / 100)) : 0;

    await connection.execute(
      `INSERT INTO ks_factura_productos (fp_valor, fp_cantidad, fp_porcentaje_aplicado, fp_comision_valor, fc_idfactura_fk, pr_idproducto_fk, tr_idtecnico_fk, fd_iddetalle_fk) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [value, quantity, commPercent, commValue, invoiceId, productId, technicianId, detailId || null]
    );

    await connection.commit();
    revalidatePath("/dashboard");
    return { success: true, data: null, error: null };
  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("Error adding product to invoice:", error);
    return { success: false, data: null, error: error.message || "Error al agregar producto a la factura" };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateProductInInvoice(
  productInvoiceId: number,
  productId: number,
  technicianId: number,
  value: number,
  quantity: number = 1,
  detailId?: number
): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener datos de comisión del producto
    const [products]: any = await connection.execute(
      "SELECT PR_APLICA_COMISION, PR_PORCENTAJE_COMISION FROM KS_PRODUCTOS WHERE PR_IDPRODUCTO_PK = ?",
      [productId]
    );
    const product = products[0];
    const appliesComm = !!product?.PR_APLICA_COMISION;
    const commPercent = Number(product?.PR_PORCENTAJE_COMISION || 0);
    const commValue = appliesComm ? (value * quantity * (commPercent / 100)) : 0;

    // 2. Obtener valor anterior e ID de factura
    const [oldRow]: any = await connection.execute(
      "SELECT fp_valor, fc_idfactura_fk FROM ks_factura_productos WHERE fp_idfactura_producto_pk = ?",
      [productInvoiceId]
    );

    if (oldRow.length === 0) throw new Error("Producto no encontrado en la factura");
    const invoiceId = oldRow[0].fc_idfactura_fk;

    // 3. Actualizar producto
    await connection.execute(
      `UPDATE ks_factura_productos 
       SET pr_idproducto_fk = ?, tr_idtecnico_fk = ?, fp_valor = ?, fp_cantidad = ?, fp_porcentaje_aplicado = ?, fp_comision_valor = ?, fd_iddetalle_fk = ?
       WHERE fp_idfactura_producto_pk = ?`,
      [productId, technicianId, value, quantity, commPercent, commValue, detailId || null, productInvoiceId]
    );

    await connection.commit();
    revalidatePath("/dashboard");
    return { success: true, data: null, error: null };
  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("Error updating product in invoice:", error);
    return { success: false, data: null, error: error.message || "Error al actualizar producto" };
  } finally {
    if (connection) connection.release();
  }
}

export async function deleteProductFromInvoice(productInvoiceId: number): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener valor e id factura
    const [oldRow]: any = await connection.execute(
      "SELECT fp_valor, fc_idfactura_fk FROM ks_factura_productos WHERE fp_idfactura_producto_pk = ?",
      [productInvoiceId]
    );

    if (oldRow.length === 0) throw new Error("Producto no encontrado");

    const value = Number(oldRow[0].fp_valor);
    const invoiceId = oldRow[0].fc_idfactura_fk;

    // 2. Eliminar
    await connection.execute("DELETE FROM ks_factura_productos WHERE fp_idfactura_producto_pk = ?", [productInvoiceId]);

    await connection.commit();
    revalidatePath("/dashboard");
    return { success: true, data: null, error: null };
  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("Error deleting product from invoice:", error);
    return { success: false, data: null, error: error.message || "Error al eliminar producto" };
  } finally {
    if (connection) connection.release();
  }
}
