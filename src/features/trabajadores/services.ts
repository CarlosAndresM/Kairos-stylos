'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { comparePassword, hashPassword } from "@/lib/password-utils";
import { decrypt } from "@/lib/jwt-utils";

/**
 * Obtener todos los trabajadores y sus cargos
 */
export async function getTrabajadores(): Promise<ApiResponse> {
  try {
    const [rows] = await db.execute(`
      SELECT t.*, r.rl_nombre as tr_cargo_nombre, s.sc_nombre as tr_sede_nombre
      FROM ks_trabajadores t
      LEFT JOIN ks_roles r ON t.rl_idrol_fk = r.rl_idrol_pk
      LEFT JOIN ks_sucursales s ON t.sc_idsucursal_fk = s.sc_idsucursal_pk
      ORDER BY t.tr_nombre ASC
    `);
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
    const [rows] = await db.execute("SELECT * FROM ks_roles ORDER BY rl_nombre ASC");
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
    const [rows] = await db.execute("SELECT * FROM ks_sucursales ORDER BY sc_nombre ASC");
    return { success: true, data: rows, error: null };
  } catch (error) {
    console.error("Error fetching sedes:", error);
    return { success: false, data: null, error: "Error al obtener la lista de sedes" };
  }
}

/**
 * Guardar o actualizar un trabajador
 */
export async function saveWorker(formData: FormData): Promise<ApiResponse> {
  const id = formData.get("id");
  const nombre = formData.get("nombre") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const cargoId = formData.get("cargoId");
  const sedeId = formData.get("sedeId");
  const activo = formData.get("activo") === "true" ? 1 : 0;

  try {
    if (id) {
      // Update
      if (password && password.trim() !== "") {
        const hashedPassword = await hashPassword(password);
        await db.execute(
          "UPDATE ks_trabajadores SET tr_nombre = ?, tr_username = ?, tr_password = ?, rl_idrol_fk = ?, sc_idsucursal_fk = ?, tr_activo = ? WHERE tr_idtrabajador_pk = ?",
          [nombre, username, hashedPassword, cargoId, sedeId, activo, id]
        );
      } else {
        await db.execute(
          "UPDATE ks_trabajadores SET tr_nombre = ?, tr_username = ?, rl_idrol_fk = ?, sc_idsucursal_fk = ?, tr_activo = ? WHERE tr_idtrabajador_pk = ?",
          [nombre, username, cargoId, sedeId, activo, id]
        );
      }
    } else {
      // Create new
      const hashedPassword = await hashPassword(password || "123456");
      await db.execute(
        "INSERT INTO ks_trabajadores (tr_nombre, tr_username, tr_password, rl_idrol_fk, sc_idsucursal_fk, tr_activo) VALUES (?, ?, ?, ?, ?, ?)",
        [nombre, username, hashedPassword, cargoId, sedeId, activo]
      );
    }

    revalidatePath("/dashboard/trabajadores");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error saving worker:", error);
    return { success: false, data: null, error: "Error al guardar el trabajador" };
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
    if (!decoded || decoded.role !== 'ADMINISTRADOR_TOTAL') {
      return { success: false, data: null, error: "No tienes permisos de administrador para realizar esta acción" };
    }

    // 2. Verify admin password
    const [admins]: any = await db.execute(
      `SELECT t.TR_IDTRABAJADOR_PK as tr_idtrabajador_pk, t.TR_PASSWORD as tr_password 
         FROM KS_TRABAJADORES t
         JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
         WHERE r.RL_NOMBRE = 'ADMINISTRADOR_TOTAL'`
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

    // 3. Check for foreign key constraints manually (to provide better error messages)
    const [facturas]: any = await db.execute("SELECT COUNT(*) as count FROM ks_facturas WHERE tr_idcajero_fk = ?", [workerId]);
    if (facturas[0].count > 0) {
      return { success: false, data: null, error: "No se puede eliminar porque este trabajador tiene facturas registradas" };
    }

    const [servicios]: any = await db.execute("SELECT COUNT(*) as count FROM ks_servicio_trabajador WHERE tr_idtrabajador_fk = ?", [workerId]);
    if (servicios[0].count > 0) {
      return { success: false, data: null, error: "No se puede eliminar porque este trabajador tiene servicios realizados" };
    }

    // 4. Delete
    await db.execute("DELETE FROM ks_trabajadores WHERE tr_idtrabajador_pk = ?", [workerId]);

    revalidatePath("/dashboard/trabajadores");
    return { success: true, data: null, error: null };
  } catch (error: any) {
    console.error("Error deleting worker:", error);
    return { success: false, data: null, error: error.message || "Error al eliminar el trabajador" };
  }
}

/**
 * Guardar o actualizar una sede
 */
export async function saveSede(formData: FormData): Promise<ApiResponse> {
  const id = formData.get("id");
  const nombre = formData.get("nombre") as string;
  const direccion = formData.get("direccion") as string;
  const ciudad = formData.get("ciudad") as string;
  const activo = formData.get("activo") === "true" ? 1 : 0;

  try {
    if (id) {
      await db.execute(
        "UPDATE ks_sucursales SET sc_nombre = ?, sc_direccion = ?, sc_ciudad = ?, sc_activa = ? WHERE sc_idsucursal_pk = ?",
        [nombre, direccion, ciudad, activo, id]
      );
    } else {
      await db.execute(
        "INSERT INTO ks_sucursales (sc_nombre, sc_direccion, sc_ciudad, sc_activa) VALUES (?, ?, ?, ?)",
        [nombre, direccion, ciudad, activo]
      );
    }

    revalidatePath("/dashboard/trabajadores");
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
    const [admins]: any = await db.execute(
      `SELECT t.TR_IDTRABAJADOR_PK as tr_idtrabajador_pk, t.TR_PASSWORD as tr_password
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE r.RL_NOMBRE = 'ADMINISTRADOR_TOTAL'`
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
    const [workers]: any = await db.execute("SELECT COUNT(*) as count FROM ks_trabajadores WHERE sc_idsucursal_fk = ?", [sedeId]);
    if (workers[0].count > 0) {
      return { success: false, data: null, error: "No se puede eliminar porque hay trabajadores asociados a esta sede" };
    }

    // 3. Delete
    await db.execute("DELETE FROM ks_sucursales WHERE sc_idsucursal_pk = ?", [sedeId]);

    revalidatePath("/dashboard/trabajadores");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error deleting sede:", error);
    return { success: false, data: null, error: "Error al eliminar la sede" };
  }
}
