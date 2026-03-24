'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { cookies } from "next/headers";

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
      `SELECT SUM(FC_TOTAL) as total FROM KS_FACTURAS 
       WHERE DATE(FC_FECHA) BETWEEN ? AND ? AND FC_ESTADO = 'PAGADO' ${sucursalFilter}`,
      params
    );

    // 2. Get breakdown of payments by method (ONLY for PAGADO invoices to match ventas_total)
    const [paymentsBreakdown]: any = await db.execute(
      `SELECT mp.MP_NOMBRE as metodo, SUM(pf.PF_VALOR) as total
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
      `SELECT SUM(ab.AB_VALOR) as total, COUNT(DISTINCT ab.CR_IDCREDITO_FK) as count
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
      `SELECT SUM(pf.PF_VALOR) as total
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? 
       AND f.FC_ESTADO = 'PENDIENTE'
       AND mp.MP_NOMBRE NOT IN ('CREDITO', 'VALE')
       ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}`,
      params
    );

    // 5b. Deuda Total Generada Hoy (Para mostrar en las tarjetas de CREDITO y VALE)
    const [deudaNueva]: any = await db.execute(
      `SELECT mp.MP_NOMBRE as metodo, SUM(pf.PF_VALOR) as total
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       JOIN KS_METODOS_PAGO mp ON pf.MP_IDMETODO_FK = mp.MP_IDMETODO_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? 
       AND (f.FC_ESTADO = 'PENDIENTE' OR f.FC_ESTADO = 'PAGADO')
       AND mp.MP_NOMBRE IN ('CREDITO', 'VALE')
       ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}
       GROUP BY mp.MP_NOMBRE`,
      params
    );

    // 6. Servicios en el periodo
    const [valesResult]: any = await db.execute(
      `SELECT SUM(ST_VALOR_TOTAL) as total, COUNT(*) as count 
       FROM KS_SERVICIOS_TRABAJADOR st
       LEFT JOIN KS_FACTURAS f ON st.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(st.ST_FECHA) BETWEEN ? AND ? ${sucursalFilter ? 'AND (f.FC_IDFACTURA_PK IS NULL OR f.' + sucursalFilter.trim().substring(4) + ')' : ''}`,
      params
    );

    // Process breakdown (ONLY PAGADO for cards 4-8 to match 'Ventas Hoy')
    const metodos: Record<string, number> = {
      'EFECTIVO': 0,
      'TRANSFERENCIA': 0,
      'DATAFONO': 0,
      'CREDITO': 0,
      'VALE': 0
    };

    (paymentsBreakdown || []).forEach((row: any) => {
      const metodo = row.metodo.toUpperCase();
      if (metodo === 'EFECTIVO') metodos['EFECTIVO'] += Number(row.total || 0);
      else if (metodo === 'DATAFONO' || metodo === 'TARJETA') metodos['DATAFONO'] += Number(row.total || 0);
      else if (metodo === 'CREDITO') metodos['CREDITO'] += Number(row.total || 0);
      else if (metodo === 'VALE') metodos['VALE'] += Number(row.total || 0);
      else metodos['TRANSFERENCIA'] += Number(row.total || 0);
    });

    const totalVentasPagadas = Number(salesResult[0]?.total || 0);
    const totalAbonosRecibidos = Number(abonosResult[0]?.total || 0);

    // Recibido en Caja = (Efectivo + Transferencia + Datafono de Facturas Pagadas) + Abonos
    const totalCaja = metodos['EFECTIVO'] + metodos['TRANSFERENCIA'] + metodos['DATAFONO'] + totalAbonosRecibidos;

    return {
      success: true,
      data: {
        ventas_total: totalVentasPagadas,
        total_caja: totalCaja,
        metodos_pago: metodos,
        por_cobrar_total: Number(pendientesHoy[0]?.total || 0),
        total_abonos: totalAbonosRecibidos,
        abonos_count: Number(abonosResult[0]?.count || 0),
        clientes_nuevos: Number(clientsResult[0]?.total || 0),
        vales_total: Number(valesResult[0]?.total || 0),
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
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
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
        topTechs,
        topServices,
        topProducts
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
    return { success: true, data: JSON.parse(sessionUser.value), error: null };
  } catch (error) {
    return { success: false, data: null, error: "Error al obtener sesión" };
  }
}

export async function getDashboardSpecificData(sucursalId: number, dateFrom: string, dateTo: string): Promise<ApiResponse> {
  try {
    const params: any[] = [dateFrom, dateTo];
    let sucursalFilter = "";

    if (sucursalId !== -1) {
      sucursalFilter = " AND f.SC_IDSUCURSAL_FK = ?";
      params.push(sucursalId);
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
      params
    );

    // 2. Créditos
    const [creditos]: any = await db.execute(
      `SELECT c.*, f.FC_NUMERO_FACTURA, f.FC_CLIENTE_TELEFONO, f.FC_FECHA, COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as cliente_display
       FROM KS_CREDITOS c
       JOIN KS_FACTURAS f ON c.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE DATE(c.CR_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       ORDER BY c.CR_FECHA DESC`,
      params
    );

    // 3. Servicios Propios
    const [vales]: any = await db.execute(
      `SELECT st.*, t.TR_NOMBRE as trabajador_nombre, f.FC_NUMERO_FACTURA
       FROM KS_SERVICIOS_TRABAJADOR st
       JOIN KS_TRABAJADORES t ON st.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
       LEFT JOIN KS_FACTURAS f ON st.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(st.ST_FECHA) BETWEEN ? AND ? ${sucursalFilter ? 'AND (f.FC_IDFACTURA_PK IS NULL OR f.' + sucursalFilter.trim().substring(6) + ')' : ''}
       ORDER BY st.ST_FECHA DESC`,
      params
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
      params
    );

    return {
      success: true,
      data: {
        facturas,
        creditos,
        vales,
        productos
      },
      error: null
    };
  } catch (error) {
    console.error("Error in getDashboardSpecificData:", error);
    return { success: false, data: null, error: "Error al obtener datos específicos" };
  }
}
