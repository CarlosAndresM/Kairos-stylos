'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { WorkerFormData, WorkerWithStats } from "@/features/trabajadores/schema";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * TRABAJADORES
 */

export async function getTrabajadores(): Promise<ApiResponse<WorkerWithStats[]>> {
  try {
    const [rows] = await db.execute(`
      SELECT 
        t.TR_IDTRABAJADOR_PK, 
        t.TR_NOMBRE, 
        t.TR_TELEFONO, 
        t.TR_ACTIVO, 
        t.RL_IDROL_FK, 
        r.RL_NOMBRE,
        t.SC_IDSUCURSAL_FK,
        s.SC_NOMBRE,
        t.TR_SUELDO_BASE,
        (
          SELECT COUNT(*) 
          FROM KS_FACTURA_DETALLES fd 
          WHERE fd.TR_IDTECNICO_FK = t.TR_IDTRABAJADOR_PK
        ) + (
          SELECT COUNT(*) 
          FROM KS_FACTURA_PRODUCTOS fp 
          WHERE fp.TR_IDTECNICO_FK = t.TR_IDTRABAJADOR_PK
        ) as servicios_count,
        IFNULL((
          SELECT SUM(vl.VL_VALOR_TOTAL) 
          FROM KS_VALES vl 
          WHERE vl.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
        ), 0) as total_vales,
        (
          SELECT COUNT(*) 
          FROM KS_VALES vl 
          WHERE vl.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK AND vl.VL_ESTADO = 'PENDIENTE'
        ) as vales_pendientes
      FROM KS_TRABAJADORES t
      JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
      LEFT JOIN KS_SUCURSALES s ON t.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
      ORDER BY t.TR_NOMBRE ASC
    `);

    // Convert TINYINT (0/1) from MySQL to Boolean
    const workers = (rows as any[]).map(t => ({
      ...t,
      TR_ACTIVO: !!t.TR_ACTIVO,
      servicios_count: Number(t.servicios_count || 0),
      total_vales: Number(t.total_vales || 0),
      vales_pendientes: Number(t.vales_pendientes || 0)
    }));

    return { success: true, data: workers, error: null };
  } catch (error) {
    console.error("Error fetching trabajadores:", error);
    return { success: false, data: null, error: "Error al obtener los trabajadores" };
  }
}

export async function saveTrabajador(data: WorkerFormData): Promise<ApiResponse> {
  try {
    if (data.TR_IDTRABAJADOR_PK) {
      // Update
      if (data.TR_PASSWORD && data.TR_PASSWORD.trim() !== '') {
        await db.execute(
          `UPDATE KS_TRABAJADORES 
           SET TR_NOMBRE = ?, TR_TELEFONO = ?, TR_PASSWORD = ?, TR_ACTIVO = ?, RL_IDROL_FK = ?, SC_IDSUCURSAL_FK = ?, TR_SUELDO_BASE = ? 
           WHERE TR_IDTRABAJADOR_PK = ?`,
          [data.TR_NOMBRE, data.TR_TELEFONO || '', data.TR_PASSWORD || '', data.TR_ACTIVO, data.RL_IDROL_FK, data.SC_IDSUCURSAL_FK || null, data.TR_SUELDO_BASE || 0, data.TR_IDTRABAJADOR_PK] as any[]
        );
      } else {
        await db.execute(
          `UPDATE KS_TRABAJADORES 
           SET TR_NOMBRE = ?, TR_TELEFONO = ?, TR_ACTIVO = ?, RL_IDROL_FK = ?, SC_IDSUCURSAL_FK = ?, TR_SUELDO_BASE = ?
           WHERE TR_IDTRABAJADOR_PK = ?`,
          [data.TR_NOMBRE, data.TR_TELEFONO || '', data.TR_ACTIVO, data.RL_IDROL_FK, data.SC_IDSUCURSAL_FK || null, data.TR_SUELDO_BASE || 0, data.TR_IDTRABAJADOR_PK] as any[]
        );
      }
    } else {
      // Create
      await db.execute(
        `INSERT INTO KS_TRABAJADORES (TR_NOMBRE, TR_TELEFONO, TR_PASSWORD, TR_ACTIVO, RL_IDROL_FK, SC_IDSUCURSAL_FK, TR_SUELDO_BASE) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.TR_NOMBRE, data.TR_TELEFONO || '', data.TR_PASSWORD || '123456', data.TR_ACTIVO, data.RL_IDROL_FK, data.SC_IDSUCURSAL_FK || null, data.TR_SUELDO_BASE || 0] as any[]
      );
    }
    revalidatePath("/dashboard/trabajadores");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error saving trabajador:", error);
    return { success: false, data: null, error: "Error al guardar el trabajador" };
  }
}

export async function toggleWorkerStatus(id: number, active: boolean): Promise<ApiResponse> {
  try {
    await db.execute("UPDATE KS_TRABAJADORES SET TR_ACTIVO = ? WHERE TR_IDTRABAJADOR_PK = ?", [active, id]);
    revalidatePath("/dashboard/trabajadores");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error toggling status:", error);
    return { success: false, data: null, error: "Error al cambiar el estado del trabajador" };
  }
}

export async function deleteWorker(workerId: number, adminPassword: string): Promise<ApiResponse> {
  try {
    // 1. Get current admin from cookies
    const cookieStore = await cookies();
    const sessionUser = cookieStore.get("session_user");
    if (!sessionUser) return { success: false, data: null, error: "No hay sesión activa" };

    const user = JSON.parse(sessionUser.value);

    // 2. Verify if the provided password belongs to ANY administrator
    const [adminRows] = await db.execute(
      `SELECT T.TR_IDTRABAJADOR_PK 
       FROM KS_TRABAJADORES T
       JOIN KS_ROLES R ON T.RL_IDROL_FK = R.RL_IDROL_PK
       WHERE T.TR_PASSWORD = ? AND R.RL_NOMBRE = 'ADMINISTRADOR_TOTAL'
       LIMIT 1`,
      [adminPassword]
    );
    const admins = adminRows as any[];
    if (admins.length === 0) {
      return { success: false, data: null, error: "Contraseña administrativa incorrecta" };
    }

    // 3. Check for foreign key constraints manually (to provide better error messages)
    const [facturas]: any = await db.execute("SELECT COUNT(*) as count FROM KS_FACTURAS WHERE TR_IDCAJERO_FK = ?", [workerId]);
    const [detalles]: any = await db.execute("SELECT COUNT(*) as count FROM KS_FACTURA_DETALLES WHERE TR_IDTECNICO_FK = ?", [workerId]);
    const [productos]: any = await db.execute("SELECT COUNT(*) as count FROM KS_FACTURA_PRODUCTOS WHERE TR_IDTECNICO_FK = ?", [workerId]);
    const [vales]: any = await db.execute("SELECT COUNT(*) as count FROM KS_VALES WHERE TR_IDTRABAJADOR_FK = ?", [workerId]);

    if (
      facturas[0].count > 0 ||
      detalles[0].count > 0 ||
      productos[0].count > 0 ||
      vales[0].count > 0
    ) {
      return {
        success: false,
        data: null,
        error: "No se puede eliminar el trabajador porque tiene registros asociados (facturas, servicios o vales). Considere desactivarlo en su lugar."
      };
    }

    // 4. Delete
    await db.execute("DELETE FROM KS_TRABAJADORES WHERE TR_IDTRABAJADOR_PK = ?", [workerId]);

    revalidatePath("/dashboard/trabajadores");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error deleting worker:", error);
    return { success: false, data: null, error: "Error al eliminar el trabajador" };
  }
}

export async function getRoles(): Promise<ApiResponse> {
  try {
    const [rows] = await db.execute("SELECT RL_IDROL_PK, RL_NOMBRE FROM KS_ROLES ORDER BY RL_NOMBRE ASC");
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching roles:", error);
    return { success: false, data: null, error: "Error al obtener los roles" };
  }
}

export async function getSedes(): Promise<ApiResponse> {
  try {
    const [rows] = await db.execute("SELECT SC_IDSUCURSAL_PK, SC_NOMBRE FROM KS_SUCURSALES ORDER BY SC_NOMBRE ASC");
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching sedes:", error);
    return { success: false, data: null, error: "Error al obtener las sedes" };
  }
}
