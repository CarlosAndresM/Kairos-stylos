'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/jwt-utils";
import { getSedes } from "@/features/trabajadores/services";
import { getWorkers, getPaymentMethods } from "@/features/billing/services";
import { getServices, getProducts } from "@/features/catalog/services";

export async function getDashboardStats(sucursalId: number, dateFrom: string, dateTo: string): Promise<ApiResponse> {
  try {
    const params: any[] = [dateFrom, dateTo];
    let sucursalFilter = "";

    if (sucursalId !== -1) {
      sucursalFilter = " AND SC_IDSUCURSAL_FK = ?";
      params.push(sucursalId);
    }

    // 1. Get total sales (ONLY PAGADO invoices)
    const [salesResult]: any = await db.execute(
      `SELECT SUM(FC_TOTAL) as total, COUNT(*) as count FROM KS_FACTURAS 
       WHERE DATE(FC_FECHA) BETWEEN ? AND ? AND FC_ESTADO = 'PAGADO' ${sucursalFilter}`,
      params
    );

    // 2. Get breakdown of payments by method (ONLY for PAGADO invoices to match ventas_total)
    const [paymentsBreakdown]: any = await db.execute(
      `SELECT mp.MP_NOMBRE as metodo, SUM(pf.PF_VALOR) as total, COUNT(pf.PF_IDPAGO_PK) as count
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? 
       AND f.FC_ESTADO = 'PAGADO' 
       ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}
       GROUP BY mp.MP_NOMBRE`,
      params
    );

    // 3. Get total from Credit Abonos in this period
    const [abonosResult]: any = await db.execute(
      `SELECT SUM(ab.AB_VALOR) as total, COUNT(ab.AB_IDABONO_PK) as count
       FROM KS_CREDITO_ABONOS ab
       JOIN KS_CREDITOS c ON ab.CR_IDCREDITO_FK = c.CR_IDCREDITO_PK
       JOIN KS_FACTURAS f ON c.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(ab.AB_FECHA) BETWEEN ? AND ? 
       AND f.FC_ESTADO != 'CANCELADO' 
       ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}`,
      params
    );

    // 4. New clients (Global)
    const [clientsResult]: any = await db.execute(
      `SELECT COUNT(*) as total FROM (
         SELECT FC_CLIENTE_TELEFONO, MIN(FC_FECHA) as primera_vez
         FROM KS_FACTURAS
         GROUP BY FC_CLIENTE_TELEFONO
       ) as primeros
       WHERE DATE(primera_vez) BETWEEN ? AND ?`,
      [dateFrom, dateTo]
    );

    // 5. Total Pendiente por Cobrar (SOLO EFECTIVO, TRANSF, DATAFONO en facturas pendientes)
    // Se omiten CRÉDITOS y VALES porque no se cobrarán hoy
    const [pendientesHoy]: any = await db.execute(
      `SELECT SUM(pf.PF_VALOR) as total, COUNT(pf.PF_IDPAGO_PK) as count
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? 
       AND f.FC_ESTADO = 'PENDIENTE'
       AND mp.MP_NOMBRE NOT IN ('CREDITO', 'VALE')
       ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}`,
      params
    );

    // 5b. Deuda Total Generada Hoy (Para mostrar en las tarjetas de CREDITO, VALE y SERVICIO DE TRABAJADOR)
    const [deudaNueva]: any = await db.execute(
      `SELECT mp.MP_NOMBRE as metodo, SUM(pf.PF_VALOR) as total, COUNT(pf.PF_IDPAGO_PK) as count
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? 
       AND (f.FC_ESTADO = 'PENDIENTE' OR f.FC_ESTADO = 'PAGADO')
       AND mp.MP_NOMBRE IN ('CREDITO', 'SERVICIO DE TRABAJADOR', 'VALE')
       ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}
       GROUP BY mp.MP_NOMBRE`,
      params
    );

    // 6. Servicios de Trabajador (Periodo)
    const valesQuery = `
      SELECT SUM(st.ST_VALOR_TOTAL) as total, COUNT(*) as count 
      FROM KS_SERVICIOS_TRABAJADOR st
      ${sucursalId !== -1 ? `
        JOIN KS_TRABAJADORES t ON st.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
        LEFT JOIN KS_FACTURAS f ON st.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
      ` : ''}
      WHERE DATE(st.ST_FECHA) BETWEEN ? AND ?
      ${sucursalId !== -1 ? 'AND (f.SC_IDSUCURSAL_FK = ? OR (f.FC_IDFACTURA_PK IS NULL AND t.SC_IDSUCURSAL_FK = ?))' : ''}
    `;
    const valesParams = sucursalId !== -1 ? [dateFrom, dateTo, sucursalId, sucursalId] : [dateFrom, dateTo];

    const [valesResult]: any = await db.execute(valesQuery, valesParams);

    // Process breakdown (ONLY PAGADO for EFECTIVO, TRANSF, DATAFONO)
    // Para CREDITO y SERVICIO DE TRABAJADOR, usamos la dudaNueva que cuenta PENDIENTE + PAGADO
    const metodos: Record<string, number> = {
      'EFECTIVO': 0,
      'TRANSFERENCIA': 0,
      'DATAFONO': 0,
      'CREDITO': 0,
      'SERVICIO DE TRABAJADOR': 0,
      'VALE': 0
    };

    const metodosCount: Record<string, number> = {
      'EFECTIVO': 0,
      'TRANSFERENCIA': 0,
      'DATAFONO': 0,
      'CREDITO': 0,
      'SERVICIO DE TRABAJADOR': 0,
      'VALE': 0
    };

    (paymentsBreakdown || []).forEach((row: any) => {
      const metodo = row.metodo.toUpperCase();
      if (metodo === 'EFECTIVO') {
        metodos['EFECTIVO'] += Number(row.total || 0);
        metodosCount['EFECTIVO'] += Number(row.count || 0);
      }
      else if (metodo === 'DATAFONO' || metodo === 'TARJETA') {
        metodos['DATAFONO'] += Number(row.total || 0);
        metodosCount['DATAFONO'] += Number(row.count || 0);
      }
      else if (metodo === 'TRANSFERENCIA') {
        metodos['TRANSFERENCIA'] += Number(row.total || 0);
        metodosCount['TRANSFERENCIA'] += Number(row.count || 0);
      }
    });

    (deudaNueva || []).forEach((row: any) => {
      const metodo = row.metodo.toUpperCase();
      if (metodo === 'CREDITO') {
        metodos['CREDITO'] += Number(row.total || 0);
        metodosCount['CREDITO'] += Number(row.count || 0);
      }
      else if (metodo === 'SERVICIO DE TRABAJADOR' || metodo === 'SERVICIO TRABAJADOR') {
        metodos['SERVICIO DE TRABAJADOR'] += Number(row.total || 0);
        metodosCount['SERVICIO DE TRABAJADOR'] += Number(row.count || 0);
      }
      else if (metodo === 'VALE') {
        metodos['VALE'] += Number(row.total || 0);
        metodosCount['VALE'] += Number(row.count || 0);
      }
    });

    // 7. Vales (Vales Reales de Nómina) en el periodo
    const valeQuery = `
      SELECT SUM(vl.VL_MONTO) as total, COUNT(*) as count
      FROM KS_VALES vl
      ${sucursalId !== -1 ? 'JOIN KS_TRABAJADORES t ON vl.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK' : ''}
      WHERE DATE(vl.VL_FECHA) BETWEEN ? AND ? 
      AND vl.VL_ESTADO != 'ANULADO'
      ${sucursalId !== -1 ? 'AND t.SC_IDSUCURSAL_FK = ?' : ''}
    `;
    const valeParams: any[] = [dateFrom, dateTo];
    if (sucursalId !== -1) valeParams.push(sucursalId);

    const [valesNominaResult]: any = await db.execute(valeQuery, valeParams);

    const totalVentasPagadas = Number(salesResult[0]?.total || 0);
    const totalAbonosRecibidos = Number(abonosResult[0]?.total || 0);
    const totalAbonosCount = Number(abonosResult[0]?.count || 0);

    // Recibido en Caja = (Efectivo + Transferencia + Datafono de Facturas Pagadas) + Abonos
    const totalCaja = (metodos['EFECTIVO'] || 0) + (metodos['TRANSFERENCIA'] || 0) + (metodos['DATAFONO'] || 0) + totalAbonosRecibidos;
    const totalCajaCount = (metodosCount['EFECTIVO'] || 0) + (metodosCount['TRANSFERENCIA'] || 0) + (metodosCount['DATAFONO'] || 0) + totalAbonosCount;

    const valesNominaTotal = Number(valesNominaResult[0]?.total || 0);
    const valesNominaCount = Number(valesNominaResult[0]?.count || 0);

    const valesRealTotal = Number(valesResult[0]?.total || 0);
    const valesRealCount = Number(valesResult[0]?.count || 0);

    // El total de "VALES" para el dashboard es la suma de los vales de nómina + los pagos por VALE en facturas
    const totalValesCard = valesNominaTotal + (metodos['VALE'] || 0);
    const totalValesCount = valesNominaCount + (metodosCount['VALE'] || 0);

    // El total de "SERVICIO TRABAJADOR" es la suma de los registros reales + los pagos marcados asÃ en facturas
    const totalServicioTrabajadorCard = valesRealTotal + (metodos['SERVICIO DE TRABAJADOR'] || 0);
    const totalServicioTrabajadorCount = valesRealCount + (metodosCount['SERVICIO DE TRABAJADOR'] || 0);

    return {
      success: true,
      data: {
        ventas_total: totalVentasPagadas,
        ventas_count: Number(salesResult[0]?.count || 0),
        total_caja: totalCaja,
        total_caja_count: totalCajaCount,
        metodos_pago: {
          ...metodos,
          'SERVICIO DE TRABAJADOR': totalServicioTrabajadorCard
        },
        metodos_count: {
          ...metodosCount,
          'SERVICIO DE TRABAJADOR': totalServicioTrabajadorCount
        },
        por_cobrar_total: Number(pendientesHoy[0]?.total || 0),
        por_cobrar_count: Number(pendientesHoy[0]?.count || 0),
        total_abonos: totalAbonosRecibidos,
        abonos_count: totalAbonosCount,
        clientes_nuevos: Number(clientsResult[0]?.total || 0),
        servicios_trabajador_total: totalServicioTrabajadorCard,
        servicios_trabajador_count: totalServicioTrabajadorCount,
      },
      error: null
    };
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    return { success: false, data: null, error: "Error al obtener estadísticas del dashboard" };
  }
}

export async function getDashboardCharts(sucursalId: number, dateFrom: string, dateTo: string): Promise<ApiResponse> {
  try {
    const params: any[] = [dateFrom, dateTo];
    let sucursalFilter = "";

    if (sucursalId !== -1) {
      sucursalFilter = " AND f.SC_IDSUCURSAL_FK = ?";
      params.push(sucursalId);
    }

    // 1. Top Technicians by services value
    const [topTechs]: any = await db.execute(
      `SELECT t.TR_NOMBRE as name, COUNT(fd.FD_IDDETALLE_PK) as count, SUM(fd.FD_VALOR) as total
       FROM KS_TRABAJADORES t
       JOIN KS_FACTURA_DETALLES fd ON t.TR_IDTRABAJADOR_PK = fd.TR_IDTECNICO_FK
       JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? AND r.RL_NOMBRE = 'TECNICO' ${sucursalFilter}
       GROUP BY t.TR_IDTRABAJADOR_PK
       ORDER BY total DESC
       LIMIT 10`,
      params
    );

    // 2. Top Services
    const [topServices]: any = await db.execute(
      `SELECT s.SV_NOMBRE as name, COUNT(fd.FD_IDDETALLE_PK) as count
       FROM KS_SERVICIOS s
       JOIN KS_FACTURA_DETALLES fd ON s.SV_IDSERVICIO_PK = fd.SV_IDSERVICIO_FK
       JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       GROUP BY s.SV_IDSERVICIO_PK
       ORDER BY count DESC
       LIMIT 5`,
      params
    );

    // 3. Top Products
    const [topProducts]: any = await db.execute(
      `SELECT p.PR_NOMBRE as name, COUNT(fp.FP_IDFACTURA_PRODUCTO_PK) as count
       FROM KS_PRODUCTOS p
       JOIN KS_FACTURA_PRODUCTOS fp ON p.PR_IDPRODUCTO_PK = fp.PR_IDPRODUCTO_FK
       JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       GROUP BY p.PR_IDPRODUCTO_PK
       ORDER BY count DESC
       LIMIT 5`,
      params
    );

    return {
      success: true,
      data: {
        topTechs: (topTechs || []).map((t: any) => ({ ...t, total: Number(t.total || 0), count: Number(t.count || 0) })),
        topServices: (topServices || []).map((s: any) => ({ ...s, count: Number(s.count || 0) })),
        topProducts: (topProducts || []).map((p: any) => ({ ...p, count: Number(p.count || 0) }))
      },
      error: null
    };
  } catch (error) {
    console.error("Error in getDashboardCharts:", error);
    return { success: false, data: null, error: "Error al obtener datos de los gráficos" };
  }
}

export async function getPayrollPeriods(): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.execute(
      `SELECT NM_IDNOMINA_PK, NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO 
       FROM KS_NOMINAS 
       WHERE NM_ESTADO = 'CONFIRMADA'
       ORDER BY NM_FECHA_INICIO DESC 
       LIMIT 24`
    );
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error in getPayrollPeriods:", error);
    return { success: false, data: [], error: "Error al obtener periodos de nómina" };
  }
}

export async function getCurrentUserSession(): Promise<ApiResponse> {
  try {
    const cookieStore = await cookies();
    const sessionUser = cookieStore.get("session_user");
    if (!sessionUser) return { success: false, data: null, error: "No hay sesión activa" };

    const payload = await decrypt(sessionUser.value);
    return { success: true, data: payload, error: null };
  } catch (error) {
    return { success: false, data: null, error: "Error al obtener sesión" };
  }
}

export async function getDashboardSpecificData(sucursalId: number, dateFrom: string, dateTo: string): Promise<ApiResponse> {
  try {
    const baseParams: any[] = [dateFrom, dateTo];
    let sucursalFilter = "";

    if (sucursalId !== -1) {
      sucursalFilter = " AND f.SC_IDSUCURSAL_FK = ?";
    }

    // 1. Facturas detalladas
    const [facturas]: any = await db.execute(
      `SELECT f.*, s.SC_NOMBRE as sucursal_nombre,
       COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as cliente_display,
       (SELECT GROUP_CONCAT(DISTINCT sv.SV_NOMBRE SEPARATOR ', ') 
        FROM KS_FACTURA_DETALLES fd 
        JOIN KS_SERVICIOS sv ON fd.SV_IDSERVICIO_FK = sv.SV_IDSERVICIO_PK 
        WHERE fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK) as servicios,
       (SELECT GROUP_CONCAT(DISTINCT p.PR_NOMBRE SEPARATOR ', ') 
        FROM KS_FACTURA_PRODUCTOS fp 
        JOIN KS_PRODUCTOS p ON fp.PR_IDPRODUCTO_FK = p.PR_IDPRODUCTO_PK 
        WHERE fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK) as productos
       FROM KS_FACTURAS f 
       JOIN KS_SUCURSALES s ON f.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       ORDER BY f.FC_FECHA DESC`,
      sucursalId !== -1 ? [...baseParams, sucursalId] : baseParams
    );

    // 2. Créditos (Pagos registrados hoy)
    const [creditos]: any = await db.execute(
      `SELECT pf.*, f.FC_NUMERO_FACTURA, f.FC_FECHA as CR_FECHA, 
       COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as cliente_display,
       pf.PF_VALOR as CR_VALOR_PENDIENTE,
       pf.PF_IDPAGO_PK as CR_IDCREDITO_PK
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ?
       AND mp.MP_NOMBRE = 'CREDITO'
       ${sucursalFilter}
       ORDER BY f.FC_FECHA DESC`,
      sucursalId !== -1 ? [...baseParams, sucursalId] : baseParams
    );

    // 3. Servicios de Trabajador (Pagos registrados hoy)
    const [vales]: any = await db.execute(
      `SELECT pf.*, f.FC_NUMERO_FACTURA, f.FC_FECHA as ST_FECHA, 
       COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as trabajador_nombre,
       'PAGADO' as ST_ESTADO, pf.PF_VALOR as ST_VALOR,
       pf.PF_IDPAGO_PK as ST_IDSERVICIO_TRABAJADOR_PK
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ?
       AND (mp.MP_NOMBRE = 'SERVICIO DE TRABAJADOR' OR mp.MP_NOMBRE = 'VALE' OR mp.MP_NOMBRE = 'SERVICIO TRABAJADOR')
       ${sucursalFilter}
       ORDER BY f.FC_FECHA DESC`,
      sucursalId !== -1 ? [...baseParams, sucursalId] : baseParams
    );

    // 4. Productos detallados
    const [productos]: any = await db.execute(
      `SELECT fp.*, f.FC_NUMERO_FACTURA, f.FC_FECHA, f.FC_ESTADO, p.PR_NOMBRE as producto_nombre,
       t.TR_NOMBRE as tecnico_nombre, sv.SV_NOMBRE as servicio_nombre
       FROM KS_FACTURA_PRODUCTOS fp
       JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_PRODUCTOS p ON fp.PR_IDPRODUCTO_FK = p.PR_IDPRODUCTO_PK
       JOIN KS_TRABAJADORES t ON fp.TR_IDTECNICO_FK = t.TR_IDTRABAJADOR_PK
       LEFT JOIN KS_FACTURA_DETALLES fd ON fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK
       LEFT JOIN KS_SERVICIOS sv ON fd.SV_IDSERVICIO_FK = sv.SV_IDSERVICIO_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       ORDER BY f.FC_FECHA DESC`,
      sucursalId !== -1 ? [...baseParams, sucursalId] : baseParams
    );

    // 5. Abonos detallados
    const [abonos]: any = await db.execute(
      `SELECT ab.*, c.CR_VALOR_PENDIENTE as cr_valor_pendiente, f.FC_NUMERO_FACTURA, COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as cliente_display
       FROM KS_CREDITO_ABONOS ab
       JOIN KS_CREDITOS c ON ab.CR_IDCREDITO_FK = c.CR_IDCREDITO_PK
       JOIN KS_FACTURAS f ON c.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE DATE(ab.AB_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       ORDER BY ab.AB_FECHA DESC`,
      sucursalId !== -1 ? [...baseParams, sucursalId] : baseParams
    );

    // 6. Vales (Vales Reales de Nómina) detallados
    const valeQuerySpecific = `
      SELECT v.*, t.TR_NOMBRE as trabajador_nombre
      FROM KS_VALES v
      ${sucursalId !== -1 ? 'JOIN KS_TRABAJADORES t ON v.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK' : 'LEFT JOIN KS_TRABAJADORES t ON v.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK'}
      WHERE DATE(v.VL_FECHA) BETWEEN ? AND ?
      AND v.VL_ESTADO != 'ANULADO'
      ${sucursalId !== -1 ? 'AND t.SC_IDSUCURSAL_FK = ?' : ''}
      ORDER BY v.VL_FECHA DESC
    `;
    const valeParamsSpecific: any[] = [dateFrom, dateTo];
    if (sucursalId !== -1) valeParamsSpecific.push(sucursalId);

    const [valesRegistros]: any = await db.execute(valeQuerySpecific, valeParamsSpecific);

    // 7. Pagos por factura (para filtrar por método en el detalle modal)
    const [pagos]: any = await db.execute(
      `SELECT pf.FC_IDFACTURA_FK, pf.PF_VALOR, mp.MP_NOMBRE as metodo
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       ORDER BY f.FC_FECHA DESC`,
      sucursalId !== -1 ? [...baseParams, sucursalId] : baseParams
    );

    // 8. Servicios detallados (para el detalle de técnicos en el ranking)
    const [serviciosDetalle]: any = await db.execute(
      `SELECT fd.*, sv.SV_NOMBRE as servicio_nombre, t.TR_NOMBRE as tecnico_nombre, f.FC_NUMERO_FACTURA, f.FC_FECHA,
       COALESCE(f.FC_CLIENTE_NOMBRE, tc.TR_NOMBRE) as cliente_display
       FROM KS_FACTURA_DETALLES fd
       JOIN KS_SERVICIOS sv ON fd.SV_IDSERVICIO_FK = sv.SV_IDSERVICIO_PK
       JOIN KS_TRABAJADORES t ON fd.TR_IDTECNICO_FK = t.TR_IDTRABAJADOR_PK
       JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       LEFT JOIN KS_TRABAJADORES tc ON f.TR_IDCLIENTE_FK = tc.TR_IDTRABAJADOR_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       ORDER BY f.FC_FECHA DESC`,
      sucursalId !== -1 ? [...baseParams, sucursalId] : baseParams
    );

    // 9. Servicios de Trabajador REALES (vouchers entre técnicos)
    const serviciosRealQuery = `
      SELECT st.*, t.TR_NOMBRE as trabajador_nombre, f.FC_NUMERO_FACTURA, f.FC_FECHA
      FROM KS_SERVICIOS_TRABAJADOR st
      JOIN KS_TRABAJADORES t ON st.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
      LEFT JOIN KS_FACTURAS f ON st.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
      WHERE DATE(st.ST_FECHA) BETWEEN ? AND ?
      ${sucursalId !== -1 ? 'AND (f.SC_IDSUCURSAL_FK = ? OR (f.FC_IDFACTURA_PK IS NULL AND t.SC_IDSUCURSAL_FK = ?))' : ''}
      ORDER BY st.ST_FECHA DESC
    `;
    const serviciosRealParams = sucursalId !== -1 ? [dateFrom, dateTo, sucursalId, sucursalId] : [dateFrom, dateTo];
    const [serviciosReal]: any = await db.execute(serviciosRealQuery, serviciosRealParams);

    return {
      success: true,
      data: {
        facturas: (facturas || []).map((f: any) => ({ ...f, FC_TOTAL: Number(f.FC_TOTAL || 0) })),
        creditos: (creditos || []).map((c: any) => ({ ...c, CR_VALOR_PENDIENTE: Number(c.CR_VALOR_PENDIENTE || 0) })),
        vales: (vales || []).map((v: any) => ({ ...v, ST_VALOR: Number(v.ST_VALOR || 0) })),
        productos: (productos || []).map((p: any) => ({ ...p, FP_VALOR: Number(p.FP_VALOR || 0) })),
        abonos: (abonos || []).map((a: any) => ({ ...a, AB_VALOR: Number(a.AB_VALOR || 0), cr_valor_pendiente: Number(a.cr_valor_pendiente || 0) })),
        pagos: (pagos || []).map((p: any) => ({ ...p, PF_VALOR: Number(p.PF_VALOR || 0) })),
        serviciosDetalle: (serviciosDetalle || []).map((s: any) => ({ ...s, FD_VALOR: Number(s.FD_VALOR || 0) })),
        serviciosReal: (serviciosReal || []).map((s: any) => ({ ...s, ST_VALOR_TOTAL: Number(s.ST_VALOR_TOTAL || 0) })),
        adelantos: (valesRegistros || []).map((v: any) => ({ ...v, VL_MONTO: Number(v.VL_MONTO || 0) })),
      },
      error: null
    };
  } catch (error) {
    console.error("Error in getDashboardSpecificData:", error);
    return { success: false, data: null, error: "Error al obtener datos específicos" };
  }
}

export async function getTechnicianStats(workerId: number, dateFrom: string, dateTo: string): Promise<ApiResponse> {
  try {
    const params = [workerId, dateFrom, dateTo];

    // 1. Total Services Value (Commissions potential)
    const [servicesResult]: any = await db.execute(
      `SELECT SUM(fd.FD_VALOR) as total, COUNT(*) as count
       FROM KS_FACTURA_DETALLES fd
       JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE fd.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) BETWEEN ? AND ? AND f.FC_ESTADO != 'CANCELADO'`,
      params
    );

    // 2. Total Products Value (Deductions potential)
    const [productsResult]: any = await db.execute(
      `SELECT SUM(fp.FP_VALOR) as total, COUNT(*) as count
       FROM KS_FACTURA_PRODUCTOS fp
       JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE fp.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) BETWEEN ? AND ? AND f.FC_ESTADO != 'CANCELADO'`,
      params
    );

    // 3. Vales Pendientes (Servicios de Trabajador)
    const [valesResult]: any = await db.execute(
      `SELECT SUM(stc.STC_VALOR_CUOTA) as total_pendiente, COUNT(stc.STC_IDCUOTA_PK) as count
       FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
       JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
       WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE'`,
      [workerId]
    );

    // 4. Vales Pendientes (Nómina)
    const [valesNominaResult]: any = await db.execute(
      `SELECT SUM(VL_MONTO - (VL_MONTO / VL_CUOTAS * VL_CUOTAS_PAGADAS)) as total_pendiente
       FROM KS_VALES
       WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE'`,
      [workerId]
    );

    return {
      success: true,
      data: {
        services_total: Number(servicesResult[0]?.total || 0),
        services_count: Number(servicesResult[0]?.count || 0),
        products_total: Number(productsResult[0]?.total || 0),
        products_count: Number(productsResult[0]?.count || 0),
        vales_pendiente: Number(valesResult[0]?.total_pendiente || 0),
        adelantos_pendiente: Number(valesNominaResult[0]?.total_pendiente || 0),
      },
      error: null
    };
  } catch (error) {
    console.error("Error in getTechnicianStats:", error);
    return { success: false, data: null, error: "Error al obtener estadísticas del técnico" };
  }
}

export async function getTechnicianCharts(workerId: number, dateFrom: string, dateTo: string): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.execute(
      `SELECT DATE(f.FC_FECHA) as date, SUM(fd.FD_VALOR) as total
       FROM KS_FACTURA_DETALLES fd
       JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE fd.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) BETWEEN ? AND ? AND f.FC_ESTADO != 'CANCELADO'
       GROUP BY DATE(f.FC_FECHA)
       ORDER BY DATE(f.FC_FECHA) ASC`,
      [workerId, dateFrom, dateTo]
    );

    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error in getTechnicianCharts:", error);
    return { success: false, data: null, error: "Error al obtener gráficos del técnico" };
  }
}

export async function getTechnicianServices(workerId: number, dateFrom: string, dateTo: string): Promise<ApiResponse> {
  try {
    // Detailed list of services performed by the technician
    const [rows]: any = await db.execute(
      `SELECT f.FC_NUMERO_FACTURA, f.FC_FECHA, s.SV_NOMBRE as nombre, fd.FD_VALOR as valor, 'SERVICIO' as tipo
       FROM KS_FACTURA_DETALLES fd
       JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_SERVICIOS s ON fd.SV_IDSERVICIO_FK = s.SV_IDSERVICIO_PK
       WHERE fd.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) BETWEEN ? AND ? AND f.FC_ESTADO != 'CANCELADO'
       
       UNION ALL
       
       SELECT f.FC_NUMERO_FACTURA, f.FC_FECHA, p.PR_NOMBRE as nombre, fp.FP_VALOR as valor, 'PRODUCTO' as tipo
       FROM KS_FACTURA_PRODUCTOS fp
       JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_PRODUCTOS p ON fp.PR_IDPRODUCTO_FK = p.PR_IDPRODUCTO_PK
       WHERE fp.TR_IDTECNICO_FK = ? AND DATE(f.FC_FECHA) BETWEEN ? AND ? AND f.FC_ESTADO != 'CANCELADO'
       
       ORDER BY FC_FECHA DESC`,
      [workerId, dateFrom, dateTo, workerId, dateFrom, dateTo]
    );

    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error in getTechnicianServices:", error);
    return { success: false, data: null, error: "Error al obtener servicios del técnico" };
  }
}

export async function getTechnicianDeudas(workerId: number): Promise<ApiResponse> {
  try {
    const [vales]: any = await db.execute(
      `SELECT stc.*, st.ST_VALOR_TOTAL, f.FC_NUMERO_FACTURA, f.FC_FECHA
       FROM KS_SERVICIO_TRABAJADOR_CUOTAS stc
       JOIN KS_SERVICIOS_TRABAJADOR st ON stc.ST_IDSERVICIO_TRABAJADOR_FK = st.ST_IDSERVICIO_TRABAJADOR_PK
       JOIN KS_FACTURAS f ON st.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE st.TR_IDTRABAJADOR_FK = ? AND stc.STC_ESTADO = 'PENDIENTE'
       ORDER BY stc.STC_FECHA_COBRO ASC`,
      [workerId]
    );

    const [valesRegistros]: any = await db.execute(
      `SELECT * FROM KS_VALES
       WHERE TR_IDTRABAJADOR_FK = ? AND VL_ESTADO = 'PENDIENTE'
       ORDER BY VL_FECHA ASC`,
      [workerId]
    );

    return { success: true, data: { vales, adelantos: valesRegistros }, error: null };
  } catch (error) {
    console.error("Error in getTechnicianDeudas:", error);
    return { success: false, data: null, error: "Error al obtener deudas del técnico" };
  }
}

export async function getTechnicianPayrollHistory(workerId: number): Promise<ApiResponse> {
  try {
    const [rows]: any = await db.execute(
      `SELECT n.NM_FECHA_INICIO, n.NM_FECHA_FIN, nd.* 
       FROM KS_NOMINA_DETALLES nd
       JOIN KS_NOMINAS n ON nd.NM_IDNOMINA_FK = n.NM_IDNOMINA_PK
       WHERE nd.TR_IDTRABAJADOR_FK = ? AND n.NM_ESTADO = 'CONFIRMADA'
       ORDER BY n.NM_FECHA_INICIO DESC`,
      [workerId]
    );

    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error in getTechnicianPayrollHistory:", error);
    return { success: false, data: null, error: "Error al obtener historial de nómina" };
  }
}

/**
 * FunciÃƒÂ³n unificada para inicializar todos los catÃƒÂ¡logos y sesiÃƒÂ³n en una sola llamada
 */
export async function getDashboardInitialData(): Promise<ApiResponse> {
  try {
    const [userRes, sedesRes, periodsRes, workersRes, servicesRes, productsRes, paymentsRes] = await Promise.all([
      getCurrentUserSession(),
      getSedes(),
      getPayrollPeriods(),
      getWorkers(),
      getServices(),
      getProducts(),
      getPaymentMethods()
    ]);

    return {
      success: true,
      data: {
        user: userRes.success ? userRes.data : null,
        sedes: sedesRes.success ? sedesRes.data : [],
        periods: periodsRes.success ? periodsRes.data : [],
        catalog: {
          technicians: workersRes.success ? workersRes.data : [],
          services: servicesRes.success ? servicesRes.data : [],
          products: productsRes.success ? productsRes.data : [],
          paymentMethods: paymentsRes.success ? paymentsRes.data : []
        }
      },
      error: null
    };
  } catch (error) {
    console.error("Error initializing dashboard data:", error);
    return { success: false, data: null, error: "Error de inicializaciÃƒÂ³n" };
  }
}

/**
 * FunciÃƒÂ³n unificada para obtener todas las estadÃƒÂsticas y grÃƒÂ¡ficos del dashboard en una sola llamada
 */
export async function getDashboardFullData(sucursalId: number, from: string, to: string): Promise<ApiResponse> {
  try {
    const [statsRes, chartsRes, specificRes] = await Promise.all([
      getDashboardStats(sucursalId, from, to),
      getDashboardCharts(sucursalId, from, to),
      getDashboardSpecificData(sucursalId, from, to)
    ]);

    return {
      success: true,
      data: {
        stats: statsRes.success ? statsRes.data : null,
        charts: chartsRes.success ? chartsRes.data : null,
        specific: specificRes.success ? specificRes.data : null
      },
      error: null
    };
  } catch (error) {
    console.error("Error fetching full dashboard data:", error);
    return { success: false, data: null, error: "Error al obtener datos completos" };
  }
}
