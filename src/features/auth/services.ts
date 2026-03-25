'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { LoginFormData } from "@/features/auth/schema";
import { cookies } from "next/headers";
import { hashPassword, comparePassword, isHashed } from "@/lib/password-utils";
import { encrypt } from "@/lib/jwt-utils";

export async function login(data: LoginFormData): Promise<ApiResponse> {
  try {
    console.log("Login attempt with:", data.username);

    // 1. Fetch user by username only
    const [rows] = await db.execute(
      `SELECT 
        t.TR_IDTRABAJADOR_PK as tr_idtrabajador_pk, 
        t.TR_NOMBRE as tr_nombre, 
        t.TR_PASSWORD as tr_password, 
        t.SC_IDSUCURSAL_FK as sc_idsucursal_fk,
        r.RL_NOMBRE as rl_nombre 
       FROM KS_TRABAJADORES t
       JOIN KS_ROLES r ON t.RL_IDROL_FK = r.RL_IDROL_PK
       WHERE t.TR_NOMBRE = ? AND t.TR_ACTIVO = 1`,
      [data.username]
    );

    const workers = rows as any[];

    if (workers.length === 0) {
      return {
        success: false,
        data: null,
        error: "Usuario o contraseña incorrectos",
      };
    }

    const worker = workers[0];
    const storedPassword = worker.tr_password;
    // 1. Password verification
    const isPasswordCorrect = await comparePassword(data.password, worker.tr_password);

    if (!isPasswordCorrect) {
      return { success: false, data: null, error: "Credenciales inválidas" };
    }

    const user = {
      id: worker.tr_idtrabajador_pk,
      username: worker.tr_nombre,
      role: worker.rl_nombre,
      branchId: worker.sc_idsucursal_fk,
    };

    // Encrypt token with jose
    const token = await encrypt(user);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session_user", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return {
      success: true,
      data: {
        user,
      },
      error: null,
    };
  } catch (error) {
    console.error("Auth Service Error:", error);
    return {
      success: false,
      data: null,
      error: "Error en el servidor de autenticación",
    };
  }
}

export async function logout() {
  console.log("Logout attempt");
  const cookieStore = await cookies();
  cookieStore.delete("session_user");
  return { success: true };
}

