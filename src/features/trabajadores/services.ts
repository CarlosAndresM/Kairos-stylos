'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { comparePassword, hashPassword } from "@/lib/password-utils";
import { decrypt } from "@/lib/jwt-utils";
import { WorkerFormData, SedeFormData } from "./schema";

/**
 * Obtener todos los trabajadores y sus cargos con estadísticas (servicios, vales)
 */
export async function getTrabajadores(sucursalId?: number): Promise<ApiResponse> {
  try {
    let query = `
      SELECT t.*, r.RL_NOMBRE, s.SC_NOMBRE,
      (SELECT COUNT(*) FROM KS_FACTURA_DETALLES WHERE TR_IDTECNICO_FK = t.TR_IDTRABAJADOR_PK) as servicios_count,
      (SELECT COALESCE(SUM(AD_MONTO), 0) FROM KS_ADELANTOS WHERE TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK AND AD_ESTADO != 'ANULADO') as total_vales,
      (SELECT COUNT(*) FROM KS_ADELANTOS WHERE TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK AND AD_ESTADO = 'PENDIENTE') as vales_pendientes
      FROM KS_TRABAJADORES t
      LEFT JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
      LEFT JOIN KS_SUCURSALES s ON t.SC_IDSUCURSAL_FK = s.SC_IDSUCURSAL_PK
    `;
    
    const params: any[] = [];
    if (sucursalId) {
      query += " WHERE t.SC_IDSUCURSAL_FK = ?";
      params.push(sucursalId);
    }
    
    query += " ORDER BY t.TR_NOMBRE ASC";

    const [rows] = await (db as any).execute(query, params);
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching trabajadores:", error);
    return { success: false, data: null, error: "Error al obtener la lista de trabajadores" };
  }
}

/**
 * Obtener los roles disponibles para asignar a trabajadores
 */
export async function getRoles(): Promise<ApiResponse> {
  try {
    const [rows] = await (db as any).execute("SELECT * FROM KS_ROLES ORDER BY RL_NOMBRE ASC");
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching roles:", error);
    return { success: false, data: null, error: "Error al obtener la lista de roles" };
  }
}

/**
 * Obtener las sedes (sucursales) disponibles
 */
export async function getSedes(): Promise<ApiResponse> {
  try {
    const [rows] = await (db as any).execute("SELECT * FROM KS_SUCURSALES ORDER BY SC_NOMBRE ASC");
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching sedes:", error);
    return { success: false, data: null, error: "Error al obtener la lista de sedes" };
  }
}

/**
 * Guardar o actualizar un trabajador
 */
export async function saveTrabajador(data: WorkerFormData): Promise<ApiResponse> {
  const {
    TR_IDTRABAJADOR_PK: id,
    TR_NOMBRE: nombre,
    TR_TELEFONO: telefono,
    TR_PASSWORD: password,
    RL_IDROL_FK: cargoId,
    SC_IDSUCURSAL_FK: sedeId,
    TR_ACTIVO: activo
  } = data;

  try {
    if (id) {
      // Update
      if (password && password.trim() !== "") {
        const hashedPassword = await hashPassword(password);
        await (db as any).execute(
          "UPDATE KS_TRABAJADORES SET TR_NOMBRE = ?, TR_TELEFONO = ?, TR_PASSWORD = ?, RL_IDROL_FK = ?, SC_IDSUCURSAL_FK = ?, TR_ACTIVO = ? WHERE TR_IDTRABAJADOR_PK = ?",
          [nombre, telefono ?? null, hashedPassword, cargoId, sedeId ?? null, activo ? 1 : 0, id]
        );
      } else {
        await (db as any).execute(
          "UPDATE KS_TRABAJADORES SET TR_NOMBRE = ?, TR_TELEFONO = ?, RL_IDROL_FK = ?, SC_IDSUCURSAL_FK = ?, TR_ACTIVO = ? WHERE TR_IDTRABAJADOR_PK = ?",
          [nombre, telefono ?? null, cargoId, sedeId ?? null, activo ? 1 : 0, id]
        );
      }
    } else {
      // Create new
      const hashedPassword = await hashPassword(password || "123456");
      await (db as any).execute(
        "INSERT INTO KS_TRABAJADORES (TR_NOMBRE, TR_TELEFONO, TR_PASSWORD, RL_IDROL_FK, SC_IDSUCURSAL_FK, TR_ACTIVO) VALUES (?, ?, ?, ?, ?, ?)",
        [nombre, telefono ?? null, hashedPassword, cargoId, sedeId ?? null, activo ? 1 : 0]
      );
    }

    revalidatePath("/dashboard/trabajadores");
    revalidatePath("/dashboard/usuarios-admin");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error saving worker:", error);
    return { success: false, data: null, error: "Error al guardar el trabajador" };
  }
}

/**
 * Alternar el estado activo/inactivo de un trabajador
 */
export async function toggleWorkerStatus(workerId: number, status: boolean): Promise<ApiResponse> {
  try {
    await (db as any).execute(
      "UPDATE KS_TRABAJADORES SET TR_ACTIVO = ? WHERE TR_IDTRABAJADOR_PK = ?",
      [status ? 1 : 0, workerId]
    );
    revalidatePath("/dashboard/trabajadores");
    revalidatePath("/dashboard/usuarios-admin");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error toggling worker status:", error);
    return { success: false, data: null, error: "Error al cambiar el estado" };
  }
}

/**
 * Eliminar un trabajador (con validación de contraseña admin)
 */
export async function deleteWorker(workerId: number, adminPassword: string): Promise<ApiResponse> {
  try {
    // 1. Get current admin from cookies
    const cookieStore = await cookies();
    const sessionUser = cookieStore.get("session_user");
    if (!sessionUser) return { success: false, data: null, error: "No hay sesión activa" };

    const decoded = await decrypt(sessionUser.value);
    if (!decoded || (decoded.role !== 'ADMINISTRADOR_TOTAL' && decoded.role !== 'ADMIN')) {
      return { success: false, data: null, error: "No tienes permisos de administrador para realizar esta acción" };
    }

    // 2. Verify admin password
    const [admins]: any = await (db as any).execute(
      `SELECT t.TR_IDTRABAJADOR_PK as tr_idtrabajador_pk, t.TR_PASSWORD as tr_password 
         FROM KS_TRABAJADORES t
         JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
         WHERE r.RL_NOMBRE = 'ADMINISTRADOR_TOTAL' OR r.RL_NOMBRE = 'ADMIN'`
    );

    let isValidAdmin = false;
    for (const admin of admins) {
      if (await comparePassword(adminPassword, admin.tr_password)) {
        isValidAdmin = true;
        break;
      }
    }

    if (!isValidAdmin) {
      return { success: false, data: null, error: "Contraseña de administrador incorrecta" };
    }

    // 3. Check for dependencies
    const [facturas]: any = await (db as any).execute("SELECT COUNT(*) as count FROM KS_FACTURAS WHERE TR_IDCAJERO_FK = ?", [workerId]);
    if (facturas[0].count > 0) {
      return { success: false, data: null, error: "No se puede eliminar porque tiene facturas registradas como administrador de punto" };
    }

    const [detalles]: any = await (db as any).execute("SELECT COUNT(*) as count FROM KS_FACTURA_DETALLES WHERE TR_IDTECNICO_FK = ?", [workerId]);
    if (detalles[0].count > 0) {
      return { success: false, data: null, error: "No se puede eliminar porque tiene servicios realizados" };
    }

    const [productos]: any = await (db as any).execute("SELECT COUNT(*) as count FROM KS_FACTURA_PRODUCTOS WHERE TR_IDTECNICO_FK = ?", [workerId]);
    if (productos[0].count > 0) {
      return { success: false, data: null, error: "No se puede eliminar porque tiene productos vendidos" };
    }

    // 4. Eliminar
    await (db as any).execute("DELETE FROM KS_TRABAJADORES WHERE TR_IDTRABAJADOR_PK = ?", [workerId]);

    revalidatePath("/dashboard/trabajadores");
    revalidatePath("/dashboard/usuarios-admin");
    return { success: true, data: null, error: null };
  } catch (error: any) {
    console.error("Error deleting worker:", error);
    return { success: false, data: null, error: error.message || "Error al eliminar el trabajador" };
  }
}

/**
 * Guardar o actualizar una sede
 */
export async function saveSede(data: SedeFormData): Promise<ApiResponse> {
  const { SC_IDSUCURSAL_PK: id, SC_NOMBRE: nombre, SC_DIRECCION: direccion } = data;

  try {
    if (id) {
      await (db as any).execute(
        "UPDATE KS_SUCURSALES SET SC_NOMBRE = ?, SC_DIRECCION = ? WHERE SC_IDSUCURSAL_PK = ?",
        [nombre, direccion, id]
      );
    } else {
      await (db as any).execute(
        "INSERT INTO KS_SUCURSALES (SC_NOMBRE, SC_DIRECCION) VALUES (?, ?)",
        [nombre, direccion]
      );
    }

    revalidatePath("/dashboard/trabajadores");
    revalidatePath("/dashboard/sedes");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error saving sede:", error);
    return { success: false, data: null, error: "Error al guardar la sede" };
  }
}

/**
 * Eliminar una sede (sucursal)
 */
export async function deleteSede(sedeId: number, adminPassword: string): Promise<ApiResponse> {
  try {
    // 1. Verify admin password
    const [admins]: any = await (db as any).execute(
      `SELECT t.TR_IDTRABAJADOR_PK as tr_idtrabajador_pk, t.TR_PASSWORD as tr_password
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE r.RL_NOMBRE = 'ADMINISTRADOR_TOTAL' OR r.RL_NOMBRE = 'ADMIN'`
    );

    let isValidAdmin = false;
    for (const admin of admins) {
      if (await comparePassword(adminPassword, admin.tr_password)) {
        isValidAdmin = true;
        break;
      }
    }

    if (!isValidAdmin) return { success: false, data: null, error: "Contraseña incorrecta" };

    // 2. Check dependencies (workers associated with this branch)
    const [workers]: any = await (db as any).execute("SELECT COUNT(*) as count FROM KS_TRABAJADORES WHERE SC_IDSUCURSAL_FK = ?", [sedeId]);
    if (workers[0].count > 0) {
      return { success: false, data: null, error: "No se puede eliminar porque hay trabajadores asociados a esta sede" };
    }

    // 3. Delete
    await (db as any).execute("DELETE FROM KS_SUCURSALES WHERE SC_IDSUCURSAL_PK = ?", [sedeId]);

    revalidatePath("/dashboard/trabajadores");
    revalidatePath("/dashboard/sedes");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error deleting sede:", error);
    return { success: false, data: null, error: "Error al eliminar la sede" };
  }
}
