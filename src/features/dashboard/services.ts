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

    // 1. Get total sales (FC_TOTAL where not cancelled)
    const [salesResult]: any = await db.execute(
      `SELECT SUM(FC_TOTAL) as total FROM KS_FACTURAS 
       WHERE DATE(FC_FECHA) BETWEEN ? AND ? AND FC_ESTADO != 'CANCELADO' ${sucursalFilter}`,
      params
    );

    // 2. Get total cash/direct payments (Paid by Cash or Transfer, excluding credits/vouchers)
    // Actually, simply summing PF_VALOR for those invoices might be better.
    const [paymentsResult]: any = await db.execute(
      `SELECT SUM(pf.PF_VALOR) as total 
       FROM KS_PAGOS_FACTURA pf
       JOIN KS_FACTURAS f ON pf.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? AND f.FC_ESTADO != 'CANCELADO' ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}`,
      params
    );

    // 3. New clients (Unique phones whose FIRST purchase is in this range)
    const [clientsResult]: any = await db.execute(
      `SELECT COUNT(*) as total FROM (
         SELECT FC_CLIENTE_TELEFONO, MIN(FC_FECHA) as primera_vez
         FROM KS_FACTURAS
         GROUP BY FC_CLIENTE_TELEFONO
       ) as primeros
       WHERE DATE(primera_vez) BETWEEN ? AND ?`,
      [dateFrom, dateTo]
    );

    // 4. Credits today
    const [creditsResult]: any = await db.execute(
      `SELECT SUM(CR_VALOR_PENDIENTE) as total, COUNT(*) as count 
       FROM KS_CREDITOS c
       JOIN KS_FACTURAS f ON c.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(c.CR_FECHA) BETWEEN ? AND ? ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}`,
      params
    );

    // 5. Vales today
    const [valesResult]: any = await db.execute(
      `SELECT SUM(VL_VALOR_TOTAL) as total, COUNT(*) as count 
       FROM KS_VALES v
       LEFT JOIN KS_FACTURAS f ON v.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(v.VL_FECHA) BETWEEN ? AND ? ${sucursalFilter ? 'AND (f.FC_IDFACTURA_PK IS NULL OR f.' + sucursalFilter.trim().substring(4) + ')' : ''}`,
      params
    );

    // 6. Total services count
    const [servicesCountResult]: any = await db.execute(
      `SELECT COUNT(*) as total 
       FROM KS_FACTURA_DETALLES fd
       JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(4) : ''}`,
      params
    );

    // 7. Deudas count (Unique phone numbers with at least one pending invoice in range)
    const [deudasResult]: any = await db.execute(
      `SELECT COUNT(DISTINCT FC_CLIENTE_TELEFONO) as total 
       FROM KS_FACTURAS 
       WHERE FC_ESTADO = 'PENDIENTE' 
       AND DATE(FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}`,
      params
    );

    return {
      success: true,
      data: {
        ventas_total: Number(salesResult[0]?.total || 0),
        total_pagos: Number(paymentsResult[0]?.total || 0),
        clientes_nuevos: Number(clientsResult[0]?.total || 0),
        creditos_total: Number(creditsResult[0]?.total || 0),
        creditos_count: Number(creditsResult[0]?.count || 0),
        vales_total: Number(valesResult[0]?.total || 0),
        vales_count: Number(valesResult[0]?.count || 0),
        servicios_count: Number(servicesCountResult[0]?.total || 0),
        deudas_count: Number(deudasResult[0]?.total || 0),
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

    // 1. Top Technicians by services count
    const [topTechs]: any = await db.execute(
      `SELECT t.TR_NOMBRE as name, COUNT(fd.FD_IDDETALLE_PK) as count
       FROM KS_TRABAJADORES t
       JOIN KS_FACTURA_DETALLES fd ON t.TR_IDTRABAJADOR_PK = fd.TR_IDTECNICO_FK
       JOIN KS_FACTURAS f ON fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       GROUP BY t.TR_IDTRABAJADOR_PK
       ORDER BY count DESC
       LIMIT 5`,
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
        WHERE fd.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK) as servicios
       FROM KS_FACTURAS f 
       JOIN KS_SUCURSALES s ON f.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE DATE(f.FC_FECHA) BETWEEN ? AND ? ${sucursalFilter}
       ORDER BY f.FC_FECHA DESC`,
      params
    );

    // 2. Créditos
    const [creditos]: any = await db.execute(
      `SELECT c.*, f.FC_NUMERO_FACTURA, COALESCE(f.FC_CLIENTE_NOMBRE, t.TR_NOMBRE) as cliente_display
       FROM KS_CREDITOS c
       JOIN KS_FACTURAS f ON c.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       LEFT JOIN KS_TRABAJADORES t ON f.TR_IDCLIENTE_FK = t.TR_IDTRABAJADOR_PK
       WHERE DATE(c.CR_FECHA) BETWEEN ? AND ? ${sucursalFilter ? 'AND f.' + sucursalFilter.trim().substring(6) : ''}
       ORDER BY c.CR_FECHA DESC`,
      params
    );

    // 3. Vales
    const [vales]: any = await db.execute(
      `SELECT v.*, t.TR_NOMBRE as trabajador_nombre, f.FC_NUMERO_FACTURA
       FROM KS_VALES v
       JOIN KS_TRABAJADORES t ON v.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
       LEFT JOIN KS_FACTURAS f ON v.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(v.VL_FECHA) BETWEEN ? AND ? ${sucursalFilter ? 'AND (f.FC_IDFACTURA_PK IS NULL OR f.' + sucursalFilter.trim().substring(6) + ')' : ''}
       ORDER BY v.VL_FECHA DESC`,
      params
    );

    return {
      success: true,
      data: {
        facturas,
        creditos,
        vales
      },
      error: null
    };
  } catch (error) {
    console.error("Error in getDashboardSpecificData:", error);
    return { success: false, data: null, error: "Error al obtener datos específicos" };
  }
}
