'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { WorkerFormData, WorkerWithStats } from "@/features/trabajadores/schema";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * TRABAJADORES
 */

export async function getTrabajadores(sucursalId?: number): Promise<ApiResponse<WorkerWithStats[]>> {
  try {
    const params: any[] = [];
    let query = `
      SELECT 
        t.TR_IDTRABAJADOR_PK, 
        t.TR_NOMBRE, 
        t.TR_TELEFONO, 
        t.TR_ACTIVO, 
        t.RL_IDROL_FK, 
        r.RL_NOMBRE,
        t.SC_IDSUCURSAL_FK,
        s.SC_NOMBRE,
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
          SELECT SUM(st.ST_VALOR_TOTAL) 
          FROM KS_SERVICIOS_TRABAJADOR st 
          WHERE st.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
        ), 0) as total_vales,
        (
          SELECT COUNT(*) 
          FROM KS_SERVICIOS_TRABAJADOR st 
          WHERE st.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK AND st.ST_ESTADO = 'PENDIENTE'
        ) as vales_pendientes
      FROM KS_TRABAJADORES t
      JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
      LEFT JOIN KS_SUCURSALES s ON t.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
      WHERE 1=1
    `;

    if (sucursalId) {
      query += ` AND t.SC_IDSUCURSAL_FK = ?`;
      params.push(sucursalId);
    }

    query += ` ORDER BY t.TR_NOMBRE ASC`;

    const [rows] = await db.execute(query, params);


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
           SET TR_NOMBRE = ?, TR_TELEFONO = ?, TR_PASSWORD = ?, TR_ACTIVO = ?, RL_IDROL_FK = ?, SC_IDSUCURSAL_FK = ? 
           WHERE TR_IDTRABAJADOR_PK = ?`,
          [data.TR_NOMBRE, data.TR_TELEFONO || '', data.TR_PASSWORD || '', data.TR_ACTIVO, data.RL_IDROL_FK, data.SC_IDSUCURSAL_FK || null, data.TR_IDTRABAJADOR_PK] as any[]
        );
      } else {
        await db.execute(
          `UPDATE KS_TRABAJADORES 
           SET TR_NOMBRE = ?, TR_TELEFONO = ?, TR_ACTIVO = ?, RL_IDROL_FK = ?, SC_IDSUCURSAL_FK = ?
           WHERE TR_IDTRABAJADOR_PK = ?`,
          [data.TR_NOMBRE, data.TR_TELEFONO || '', data.TR_ACTIVO, data.RL_IDROL_FK, data.SC_IDSUCURSAL_FK || null, data.TR_IDTRABAJADOR_PK] as any[]
        );
      }
    } else {
      // Create
      await db.execute(
        `INSERT INTO KS_TRABAJADORES (TR_NOMBRE, TR_TELEFONO, TR_PASSWORD, TR_ACTIVO, RL_IDROL_FK, SC_IDSUCURSAL_FK) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.TR_NOMBRE, data.TR_TELEFONO || '', data.TR_PASSWORD || '123456', data.TR_ACTIVO, data.RL_IDROL_FK, data.SC_IDSUCURSAL_FK || null] as any[]
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
    const [vales]: any = await db.execute("SELECT COUNT(*) as count FROM KS_SERVICIOS_TRABAJADOR WHERE TR_IDTRABAJADOR_FK = ?", [workerId]);

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
    const [rows] = await db.execute("SELECT SC_IDSUCURSAL_PK, SC_NOMBRE, SC_DIRECCION FROM KS_SUCURSALES ORDER BY SC_NOMBRE ASC");
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching sedes:", error);
    return { success: false, data: null, error: "Error al obtener las sedes" };
  }
}

export async function saveSede(data: { SC_IDSUCURSAL_PK?: number, SC_NOMBRE: string, SC_DIRECCION?: string | null }): Promise<ApiResponse> {
  try {
    if (data.SC_IDSUCURSAL_PK) {
      await db.execute(
        "UPDATE KS_SUCURSALES SET SC_NOMBRE = ?, SC_DIRECCION = ? WHERE SC_IDSUCURSAL_PK = ?",
        [data.SC_NOMBRE, data.SC_DIRECCION || null, data.SC_IDSUCURSAL_PK]
      );
    } else {
      await db.execute(
        "INSERT INTO KS_SUCURSALES (SC_NOMBRE, SC_DIRECCION) VALUES (?, ?)",
        [data.SC_NOMBRE, data.SC_DIRECCION || null]
      );
    }
    revalidatePath("/dashboard/sedes");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error saving sede:", error);
    return { success: false, data: null, error: "Error al guardar la sucursal" };
  }
}

export async function deleteSede(sedeId: number, adminPassword: string): Promise<ApiResponse> {
  try {
    // 1. Verify admin password
    const [adminRows] = await db.execute(
      `SELECT T.TR_IDTRABAJADOR_PK 
       FROM KS_TRABAJADORES T
       JOIN KS_ROLES R ON T.RL_IDROL_FK = R.RL_IDROL_PK
       WHERE T.TR_PASSWORD = ? AND R.RL_NOMBRE = 'ADMINISTRADOR_TOTAL'
       LIMIT 1`,
      [adminPassword]
    );
    const admins = adminRows as any[];
    if (admins.length === 0) return { success: false, data: null, error: "Contraseña incorrecta" };

    // 2. Check dependencies (workers associated with this branch)
    const [workers]: any = await db.execute("SELECT COUNT(*) as count FROM KS_TRABAJADORES WHERE SC_IDSUCURSAL_FK = ?", [sedeId]);
    if (workers[0].count > 0) {
      return { success: false, data: null, error: "No se puede eliminar porque hay trabajadores asociados a esta sede" };
    }

    // 3. Delete
    await db.execute("DELETE FROM KS_SUCURSALES WHERE SC_IDSUCURSAL_PK = ?", [sedeId]);

    revalidatePath("/dashboard/sedes");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error deleting sede:", error);
    return { success: false, data: null, error: "Error al eliminar la sucursal" };
  }
}
