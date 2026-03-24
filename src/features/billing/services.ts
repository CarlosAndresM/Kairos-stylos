'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { InvoiceFormData } from "@/features/billing/schema";
import { revalidatePath } from "next/cache";
import { finalizeUpload } from "@/lib/file-utils";

/**
 * Obtener todos los trabajadores activos y sus cargos
 */
export async function getWorkers(): Promise<ApiResponse> {
  try {
    const [rows] = await db.execute(
      `SELECT t.TR_IDTRABAJADOR_PK, t.TR_NOMBRE, r.RL_NOMBRE 
       FROM KS_TRABAJADORES t 
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK 
       WHERE t.TR_ACTIVO = TRUE AND r.RL_NOMBRE != 'ADMINISTRADOR_TOTAL'`
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
       COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as cliente_display,
       t.TR_IDTRABAJADOR_PK as TR_IDCLIENTE_FK
       FROM KS_FACTURAS f 
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE f.FC_IDFACTURA_PK = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return { success: false, data: null, error: "Factura no encontrada" };
    }

    const invoice = invoices[0];

    // Fetch details
    const [services]: any = await (db as any).execute(
      "SELECT FD_IDDETALLE_PK, FD_VALOR, SV_IDSERVICIO_FK, TR_IDTECNICO_FK FROM KS_FACTURA_DETALLES WHERE FC_IDFACTURA_FK = ?",
      [id]
    );

    const [products]: any = await (db as any).execute(
      "SELECT FP_VALOR, PR_IDPRODUCTO_FK, TR_IDTECNICO_FK, FD_IDDETALLE_FK FROM KS_FACTURA_PRODUCTOS WHERE FC_IDFACTURA_FK = ?",
      [id]
    );

    const [payments]: any = await (db as any).execute(
      "SELECT PF_VALOR, PF_EVIDENCIA_URL, MP_IDMETODO_FK FROM KS_PAGOS_FACTURA WHERE FC_IDFACTURA_FK = ?",
      [id]
    );

    // Check if it's a vale
    const [vales]: any = await (db as any).execute(
      "SELECT 1 FROM KS_SERVICIOS_TRABAJADOR WHERE FC_IDFACTURA_FK = ?",
      [id]
    );

    return {
      success: true,
      data: {
        ...invoice,
        services,
        products,
        payments,
        isVale: vales.length > 0
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
    
    // 0.1 Check for duplicate invoice number IF provided
    if (data.FC_NUMERO_FACTURA) {
      const checkQuery = isUpdate 
        ? "SELECT 1 FROM KS_FACTURAS WHERE FC_NUMERO_FACTURA = ? AND FC_IDFACTURA_PK != ?" 
        : "SELECT 1 FROM KS_FACTURAS WHERE FC_NUMERO_FACTURA = ?";
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
        "SELECT COALESCE(MAX(CAST(FC_NUMERO_FACTURA AS UNSIGNED)), 0) + 1 AS next FROM KS_FACTURAS WHERE FC_NUMERO_FACTURA REGEXP '^[0-9]+$'"
      );
      targetInvoiceNum = String(rows[0]?.next || 1);
    }

    // 0. Si hay evidencia física, mover de temp
    let fizUrl = data.FC_EVIDENCIA_FISICA_URL;
    if (fizUrl && fizUrl.includes('/temp/')) {
      fizUrl = await finalizeUpload(fizUrl, data.FC_NUMERO_FACTURA || `FAC-${Date.now()}`);
    }

    if (isUpdate) {
      // ACTUALIZAR FACTURA BASE
      await (connection as any).execute(
        `UPDATE KS_FACTURAS SET 
          FC_NUMERO_FACTURA = ?, FC_FECHA = ?, FC_CLIENTE_NOMBRE = ?, 
          FC_CLIENTE_TELEFONO = ?, FC_TOTAL = ?, FC_ESTADO = ?, 
          SC_IDSUCURSAL_FK = ?, TR_IDCAJERO_FK = ?, FC_TIPO_CLIENTE = ?, 
          TR_IDCLIENTE_FK = ?, FC_EVIDENCIA_FISICA_URL = ?
         WHERE FC_IDFACTURA_PK = ?`,
        [
          data.FC_NUMERO_FACTURA,
          data.FC_FECHA,
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

      // Limpiar detalles de servicios y productos (Safe to clear and re-insert)
      await (connection as any).execute("DELETE FROM KS_FACTURA_DETALLES WHERE FC_IDFACTURA_FK = ?", [invoiceId]);
      await (connection as any).execute("DELETE FROM KS_FACTURA_PRODUCTOS WHERE FC_IDFACTURA_FK = ?", [invoiceId]);
      
      // Para pagos y deudas, seremos más quirúrgicos para no perder trazabilidad de abonos previos
      // 1. Identificar qué métodos de pago ya no están presentes para borrarlos
      const newMethodIds = data.payments.map(p => p.MP_IDMETODO_FK);
      
      // Borrar pagos que ya no están en el nuevo envío
      await (connection as any).execute(
        `DELETE FROM KS_PAGOS_FACTURA WHERE FC_IDFACTURA_FK = ? AND MP_IDMETODO_FK NOT IN (${newMethodIds.length > 0 ? newMethodIds.join(',') : '-1'})`,
        [invoiceId]
      );

      // Borrar Vales y Créditos SOLO si su método de pago correspondiente ya no está
      // (Si están, los actualizaremos en el loop de inserción más abajo)
      const [methodRows]: any = await (connection as any).execute("SELECT MP_IDMETODO_PK, MP_NOMBRE FROM KS_METODOS_PAGO");
      const creditMethodId = methodRows.find((m: any) => m.MP_NOMBRE.toUpperCase() === 'CREDITO')?.MP_IDMETODO_PK;
      const valeMethodId = methodRows.find((m: any) => m.MP_NOMBRE.toUpperCase() === 'VALE')?.MP_IDMETODO_PK;

      if (!newMethodIds.includes(valeMethodId)) {
          const [vRows]: any = await (connection as any).execute("SELECT ST_IDSERVICIO_TRABAJADOR_PK FROM KS_SERVICIOS_TRABAJADOR WHERE FC_IDFACTURA_FK = ?", [invoiceId]);
          for(const v of vRows) {
              await (connection as any).execute("DELETE FROM KS_SERVICIO_TRABAJADOR_CUOTAS WHERE ST_IDSERVICIO_TRABAJADOR_FK = ?", [v.ST_IDSERVICIO_TRABAJADOR_PK]);
          }
          await (connection as any).execute("DELETE FROM KS_SERVICIOS_TRABAJADOR WHERE FC_IDFACTURA_FK = ?", [invoiceId]);
      }

      if (!newMethodIds.includes(creditMethodId)) {
          const [cRows]: any = await (connection as any).execute("SELECT CR_IDCREDITO_PK FROM KS_CREDITOS WHERE FC_IDFACTURA_FK = ?", [invoiceId]);
          for(const c of cRows) {
              await (connection as any).execute("DELETE FROM KS_CREDITO_ABONOS WHERE CR_IDCREDITO_FK = ?", [c.CR_IDCREDITO_PK]);
          }
          await (connection as any).execute("DELETE FROM KS_CREDITOS WHERE FC_IDFACTURA_FK = ?", [invoiceId]);
      }

    } else {
      // INSERTAR NUEVA FACTURA
      const [invoiceResult]: any = await (connection as any).execute(
        `INSERT INTO KS_FACTURAS (
          FC_NUMERO_FACTURA, FC_FECHA, FC_CLIENTE_NOMBRE, FC_CLIENTE_TELEFONO, 
          FC_TOTAL, FC_ESTADO, SC_IDSUCURSAL_FK, TR_IDCAJERO_FK,
          FC_TIPO_CLIENTE, TR_IDCLIENTE_FK, FC_EVIDENCIA_FISICA_URL
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetInvoiceNum,
          data.FC_FECHA,
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

    // Identificar IDs especiales de métodos de pago
    const [methodRows]: any = await (connection as any).execute("SELECT MP_IDMETODO_PK, MP_NOMBRE FROM KS_METODOS_PAGO");
    const methods = methodRows as { MP_IDMETODO_PK: number, MP_NOMBRE: string }[];
    const creditMethodId = methods.find(m => m.MP_NOMBRE.toUpperCase() === 'CREDITO')?.MP_IDMETODO_PK;
    const valeMethodId = methods.find(m => m.MP_NOMBRE.toUpperCase() === 'VALE')?.MP_IDMETODO_PK;

    // 1.1 Si es Vale de técnico, registrar en KS_VALES y sus Cuotas
    const isValeInPayments = data.payments.some(p => p.MP_IDMETODO_FK === valeMethodId);
    if ((data.FC_TIPO_CLIENTE === 'TECNICO' && data.isVale) || isValeInPayments) {
      const valeTotal = isValeInPayments 
        ? data.payments.find(p => p.MP_IDMETODO_FK === valeMethodId)?.PF_VALOR || 0
        : data.FC_TOTAL;
      
      const numCuotas = data.VL_NUMERO_CUOTAS || 1;
      const valorCuota = Math.round((valeTotal / numCuotas) * 100) / 100;
      const fechaInicio = data.VL_FECHA_INICIO_COBRO || data.FC_FECHA;

      const [valeResult]: any = await (connection as any).execute(
        `INSERT INTO KS_SERVICIOS_TRABAJADOR (ST_VALOR_TOTAL, ST_NUMERO_CUOTAS, ST_VALOR_CUOTA, ST_ESTADO, FC_IDFACTURA_FK, TR_IDTRABAJADOR_FK, ST_FECHA_INICIO_COBRO)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [valeTotal, numCuotas, valorCuota, 'PENDIENTE', invoiceId, data.TR_IDCLIENTE_FK || data.TR_IDCAJERO_FK, fechaInicio]
      );
      const valeId = valeResult.insertId;

      // Generar cuotas semanales
      for (let i = 1; i <= numCuotas; i++) {
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setDate(fechaCuota.getDate() + (i - 1) * 7);

        await (connection as any).execute(
          `INSERT INTO KS_SERVICIO_TRABAJADOR_CUOTAS (STC_NUMERO_CUOTA, STC_VALOR_CUOTA, STC_ESTADO, STC_FECHA_COBRO, ST_IDSERVICIO_TRABAJADOR_FK)
           VALUES (?, ?, ?, ?, ?)`,
          [i, valorCuota, 'PENDIENTE', fechaCuota, valeId]
        );
      }
    }

    // 2. Insertar Detalles de Servicios
    for (const service of data.services) {
      const [serviceResult]: any = await (connection as any).execute(
        `INSERT INTO KS_FACTURA_DETALLES (FD_VALOR, FC_IDFACTURA_FK, SV_IDSERVICIO_FK, TR_IDTECNICO_FK) 
         VALUES (?, ?, ?, ?)`,
        [service.FD_VALOR, invoiceId, service.SV_IDSERVICIO_FK, service.TR_IDTECNICO_FK]
      );
      const serviceDetailId = serviceResult.insertId;

      // 2.1 Insertar productos asociados a este servicio
      if (service.products && service.products.length > 0) {
        for (const product of service.products) {
          await (connection as any).execute(
            `INSERT INTO KS_FACTURA_PRODUCTOS (FP_VALOR, FC_IDFACTURA_FK, PR_IDPRODUCTO_FK, TR_IDTECNICO_FK, FD_IDDETALLE_FK) 
             VALUES (?, ?, ?, ?, ?)`,
            [product.FP_VALOR, invoiceId, product.PR_IDPRODUCTO_FK, product.TR_IDTECNICO_FK, serviceDetailId]
          );
        }
      }
    }

    // 3. Insertar Detalles de Productos INDEPENDIENTES (si existen en el array de nivel superior)
    if (data.products && data.products.length > 0) {
      for (const product of data.products) {
        await (connection as any).execute(
          `INSERT INTO KS_FACTURA_PRODUCTOS (FP_VALOR, FC_IDFACTURA_FK, PR_IDPRODUCTO_FK, TR_IDTECNICO_FK, FD_IDDETALLE_FK) 
           VALUES (?, ?, ?, ?, ?)`,
          [product.FP_VALOR, invoiceId, product.PR_IDPRODUCTO_FK, product.TR_IDTECNICO_FK, product.FD_IDDETALLE_FK || null]
        );
      }
    }

    // 4. Insertar o Actualizar Pagos
    for (const payment of data.payments) {
      if (payment.PF_VALOR > 0) {
        let finalUrl = payment.PF_EVIDENCIA_URL;
        if (finalUrl && finalUrl.includes('/temp/')) {
          finalUrl = await finalizeUpload(finalUrl, data.FC_NUMERO_FACTURA || `FAC-${invoiceId}`);
        }

        // Verificar si este método ya existía para esta factura
        const [existingPayment]: any = await (connection as any).execute(
          "SELECT PF_IDPAGO_PK FROM KS_PAGOS_FACTURA WHERE FC_IDFACTURA_FK = ? AND MP_IDMETODO_FK = ?",
          [invoiceId, payment.MP_IDMETODO_FK]
        );

        if (existingPayment.length > 0) {
          await (connection as any).execute(
            "UPDATE KS_PAGOS_FACTURA SET PF_VALOR = ?, PF_EVIDENCIA_URL = ? WHERE PF_IDPAGO_PK = ?",
            [payment.PF_VALOR, finalUrl || null, existingPayment[0].PF_IDPAGO_PK]
          );
        } else {
          await (connection as any).execute(
            `INSERT INTO KS_PAGOS_FACTURA (PF_VALOR, PF_EVIDENCIA_URL, FC_IDFACTURA_FK, MP_IDMETODO_FK) 
             VALUES (?, ?, ?, ?)`,
            [payment.PF_VALOR, finalUrl || null, invoiceId, payment.MP_IDMETODO_FK]
          );
        }

        // 4.1 Si es Vale de técnico, registrar o actualizar
        const isVale = payment.MP_IDMETODO_FK === valeMethodId;
        if ((data.FC_TIPO_CLIENTE === 'TECNICO' && data.isVale) || isVale) {
            const valeTotal = payment.MP_IDMETODO_FK === valeMethodId ? payment.PF_VALOR : data.FC_TOTAL;
            const [existingVale]: any = await (connection as any).execute(
              "SELECT ST_IDSERVICIO_TRABAJADOR_PK FROM KS_SERVICIOS_TRABAJADOR WHERE FC_IDFACTURA_FK = ?",
              [invoiceId]
            );

            if (existingVale.length > 0) {
              const valeId = existingVale[0].ST_IDSERVICIO_TRABAJADOR_PK;
              await (connection as any).execute(
                "UPDATE KS_SERVICIOS_TRABAJADOR SET ST_VALOR_TOTAL = ? WHERE ST_IDSERVICIO_TRABAJADOR_PK = ?",
                [valeTotal, valeId]
              );
            } else {
              const numCuotas = data.VL_NUMERO_CUOTAS || 1;
              const valorCuota = Math.round((valeTotal / numCuotas) * 100) / 100;
              const fechaInicio = data.VL_FECHA_INICIO_COBRO || data.FC_FECHA;

              const [vRes]: any = await (connection as any).execute(
                `INSERT INTO KS_SERVICIOS_TRABAJADOR (ST_VALOR_TOTAL, ST_NUMERO_CUOTAS, ST_VALOR_CUOTA, ST_ESTADO, FC_IDFACTURA_FK, TR_IDTRABAJADOR_FK, ST_FECHA_INICIO_COBRO)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [valeTotal, numCuotas, valorCuota, 'PENDIENTE', invoiceId, data.TR_IDCLIENTE_FK || data.TR_IDCAJERO_FK, fechaInicio]
              );
              const vId = vRes.insertId;
              for (let i = 1; i <= numCuotas; i++) {
                const fCuota = new Date(fechaInicio);
                fCuota.setDate(fCuota.getDate() + (i - 1) * 7);
                await (connection as any).execute(
                  `INSERT INTO KS_SERVICIO_TRABAJADOR_CUOTAS (STC_NUMERO_CUOTA, STC_VALOR_CUOTA, STC_ESTADO, STC_FECHA_COBRO, ST_IDSERVICIO_TRABAJADOR_FK)
                   VALUES (?, ?, ?, ?, ?)`,
                  [i, valorCuota, 'PENDIENTE', fCuota, vId]
                );
              }
            }
        }

        // 4.2 Si es crédito, registrar o actualizar
        if (payment.MP_IDMETODO_FK === creditMethodId) {
          const [existingCredit]: any = await (connection as any).execute(
            "SELECT CR_IDCREDITO_PK FROM KS_CREDITOS WHERE FC_IDFACTURA_FK = ?",
            [invoiceId]
          );

          if (existingCredit.length > 0) {
            // Solo actualizamos el valor pendiente si no se ha pagado nada
            // O mejor: lo actualizamos y la trazabilidad de abonos dirá el resto
            await (connection as any).execute(
              "UPDATE KS_CREDITOS SET CR_VALOR_PENDIENTE = ? WHERE CR_IDCREDITO_PK = ?",
              [payment.PF_VALOR, existingCredit[0].CR_IDCREDITO_PK]
            );
          } else {
            await (connection as any).execute(
              `INSERT INTO KS_CREDITOS (CR_VALOR_PENDIENTE, FC_IDFACTURA_FK)
               VALUES (?, ?)`,
              [payment.PF_VALOR, invoiceId]
            );
          }
        }
      }
    }

    await connection.commit();
    revalidatePath("/dashboard/ventas");
    return { success: true, data: { id: invoiceId }, error: null };

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error saving invoice:", error);
    return { success: false, data: null, error: "Error al guardar la factura" };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Verificar si una contraseña corresponde a un administrador
 */
export async function verifyAdminPassword(password: string): Promise<ApiResponse> {
  try {
    const [users]: any = await db.execute(
      `SELECT T.TR_IDTRABAJADOR_PK, R.RL_NOMBRE 
       FROM KS_TRABAJADORES T
       JOIN KS_ROLES R ON T.RL_IDROL_FK = R.RL_IDROL_PK
       WHERE T.TR_PASSWORD = ? AND R.RL_NOMBRE = 'ADMINISTRADOR_TOTAL'
       LIMIT 1`,
      [password]
    );

    if (users.length > 0) {
      return { success: true };
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
    // 1. Eliminar pagos
    await connection.execute(`DELETE FROM KS_PAGOS_FACTURA WHERE FC_IDFACTURA_FK = ?`, [invoiceId]);

    // 2. Eliminar servicios trabajador
    await connection.execute(`DELETE FROM KS_SERVICIOS_TRABAJADOR WHERE FC_IDFACTURA_FK = ?`, [invoiceId]);

    // 3. Eliminar créditos y sus abonos
    const [oldCredits]: any = await (connection as any).execute("SELECT CR_IDCREDITO_PK FROM KS_CREDITOS WHERE FC_IDFACTURA_FK = ?", [invoiceId]);
    for(const c of oldCredits) {
      await (connection as any).execute("DELETE FROM KS_CREDITO_ABONOS WHERE CR_IDCREDITO_FK = ?", [c.CR_IDCREDITO_PK]);
    }
    await connection.execute(`DELETE FROM KS_CREDITOS WHERE FC_IDFACTURA_FK = ?`, [invoiceId]);

    // 4. Eliminar detalles (servicios)
    await connection.execute(`DELETE FROM KS_FACTURA_DETALLES WHERE FC_IDFACTURA_FK = ?`, [invoiceId]);

    // 5. Eliminar productos
    await connection.execute(`DELETE FROM KS_FACTURA_PRODUCTOS WHERE FC_IDFACTURA_FK = ?`, [invoiceId]);

    // 6. Eliminar la factura
    await connection.execute(`DELETE FROM KS_FACTURAS WHERE FC_IDFACTURA_PK = ?`, [invoiceId]);

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
      SELECT f.*, s.SC_NOMBRE as sucursal_nombre,
      COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as cliente_display,
      (SELECT GROUP_CONCAT(DISTINCT sv.SV_NOMBRE SEPARATOR ', ') 
       FROM KS_FACTURA_DETALLES fd 
       JOIN KS_SERVICIOS sv ON fd.SV_IDSERVICIO_FK = sv.SV_IDSERVICIO_PK 
       WHERE fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK) as servicios
      FROM KS_FACTURAS f 
      JOIN KS_SUCURSALES s ON f.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
      LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.sucursalId) {
      query += ` AND f.SC_IDSUCURSAL_FK = ?`;
      params.push(filters.sucursalId);
    }

    if (filters.date) {
      query += ` AND DATE(f.FC_FECHA) = ?`;
      params.push(filters.date);
    }

    query += ` ORDER BY f.FC_FECHA DESC`;

    const [rows] = await (db as any).execute(query, params);
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return { success: false, data: null, error: "Error al obtener facturas" };
  }
}

// Retro-compatibilidad opcional o actualización de usos
export async function getRecentInvoices(sucursalId: number): Promise<ApiResponse> {
  return getInvoicesByFilter({ sucursalId, date: new Date().toISOString().split('T')[0] });
}

/**
 * Obtener métodos de pago
 */
export async function getPaymentMethods(): Promise<ApiResponse> {
  try {
    const [rows] = await (db as any).execute("SELECT MP_IDMETODO_PK, MP_NOMBRE FROM KS_METODOS_PAGO");
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return { success: false, data: [], error: "Error al obtener métodos de pago" };
  }
}

/**
 * Obtener el siguiente número de factura (consecutivo)
 */
export async function getNextInvoiceNumber(): Promise<ApiResponse> {
  try {
    const [rows]: any = await (db as any).execute(
      "SELECT COALESCE(MAX(CAST(FC_NUMERO_FACTURA AS UNSIGNED)), 0) + 1 AS next FROM KS_FACTURAS WHERE FC_NUMERO_FACTURA REGEXP '^[0-9]+$'"
    );
    return { success: true, data: rows[0]?.next || 1, error: null };
  } catch (error) {
    console.error("Error fetching next invoice number:", error);
    const [rows]: any = await (db as any).execute("SELECT COUNT(*) + 1 AS next FROM KS_FACTURAS");
    return { success: true, data: rows[0]?.next || 1, error: null };
  }
}

/**
 * Agregar un producto a una factura existente y asociarlo opcionalmente a un servicio
 */
export async function addProductToInvoice(
  invoiceId: number, 
  productId: number, 
  technicianId: number, 
  value: number, 
  detailId?: number
): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insertar el producto con la asociación opcional al servicio (detailId)
    await connection.execute(
      `INSERT INTO KS_FACTURA_PRODUCTOS (FP_VALOR, FC_IDFACTURA_FK, PR_IDPRODUCTO_FK, TR_IDTECNICO_FK, FD_IDDETALLE_FK) 
       VALUES (?, ?, ?, ?, ?)`,
      [value, invoiceId, productId, technicianId, detailId || null]
    );

    // 2. Actualizar el total de la factura (incrementar el valor del producto)
    await connection.execute(
      "UPDATE KS_FACTURAS SET FC_TOTAL = FC_TOTAL + ? WHERE FC_IDFACTURA_PK = ?",
      [value, invoiceId]
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
/**
 * Actualizar una asociación de producto existente
 */
export async function updateProductInInvoice(
  productInvoiceId: number,
  productId: number,
  technicianId: number,
  value: number,
  detailId?: number
): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener el valor actual para ajustar el total de la factura
    const [oldRows]: any = await connection.execute(
      "SELECT FP_VALOR, FC_IDFACTURA_FK FROM KS_FACTURA_PRODUCTOS WHERE FP_IDFACTURA_PRODUCTO_PK = ?",
      [productInvoiceId]
    );

    if (oldRows.length === 0) throw new Error("Registro de producto no encontrado");
    const oldValue = Number(oldRows[0].FP_VALOR);
    const invoiceId = oldRows[0].FC_IDFACTURA_FK;

    // 2. Actualizar el registro
    await connection.execute(
      `UPDATE KS_FACTURA_PRODUCTOS SET 
       FP_VALOR = ?, PR_IDPRODUCTO_FK = ?, TR_IDTECNICO_FK = ?, FD_IDDETALLE_FK = ?
       WHERE FP_IDFACTURA_PRODUCTO_PK = ?`,
      [value, productId, technicianId, detailId || null, productInvoiceId]
    );

    // 3. Ajustar el total de la factura (Resta viejo, suma nuevo)
    await connection.execute(
      "UPDATE KS_FACTURAS SET FC_TOTAL = FC_TOTAL - ? + ? WHERE FC_IDFACTURA_PK = ?",
      [oldValue, value, invoiceId]
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

/**
 * Eliminar una asociación de producto
 */
export async function deleteProductFromInvoice(productInvoiceId: number): Promise<ApiResponse> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener valor y factura
    const [rows]: any = await connection.execute(
      "SELECT FP_VALOR, FC_IDFACTURA_FK FROM KS_FACTURA_PRODUCTOS WHERE FP_IDFACTURA_PRODUCTO_PK = ?",
      [productInvoiceId]
    );

    if (rows.length === 0) throw new Error("Registro no encontrado");
    const value = Number(rows[0].FP_VALOR);
    const invoiceId = rows[0].FC_IDFACTURA_FK;

    // 2. Eliminar
    await connection.execute("DELETE FROM KS_FACTURA_PRODUCTOS WHERE FP_IDFACTURA_PRODUCTO_PK = ?", [productInvoiceId]);

    // 3. Ajustar total
    await connection.execute("UPDATE KS_FACTURAS SET FC_TOTAL = FC_TOTAL - ? WHERE FC_IDFACTURA_PK = ?", [value, invoiceId]);

    await connection.commit();
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    if (connection) await connection.rollback();
    return { success: false, error: error.message };
  } finally {
    if (connection) connection.release();
  }
}
