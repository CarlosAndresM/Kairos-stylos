'use server'

import { db } from "@/lib/db";
import { ApiResponse } from "@/lib/api-response";
import { ServiceFormData, ProductFormData } from "@/features/catalog/schema";
import { revalidatePath } from "next/cache";

/**
 * SERVICIOS
 */

export async function getServices(): Promise<ApiResponse> {
  try {
    const [rows] = await db.execute(
      "SELECT SV_IDSERVICIO_PK, SV_NOMBRE, SV_ACTIVO FROM KS_SERVICIOS ORDER BY SV_NOMBRE ASC"
    );

    // Convert TINYINT (0/1) from MySQL to Boolean for Zod validation
    const services = (rows as any[]).map(s => ({
      ...s,
      SV_ACTIVO: !!s.SV_ACTIVO
    }));

    return { success: true, data: services, error: null };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { success: false, data: null, error: "Error al obtener los servicios" };
  }
}

export async function saveService(data: ServiceFormData): Promise<ApiResponse> {
  try {
    if (data.SV_IDSERVICIO_PK) {
      await db.execute(
        "UPDATE KS_SERVICIOS SET SV_NOMBRE = ?, SV_ACTIVO = ? WHERE SV_IDSERVICIO_PK = ?",
        [data.SV_NOMBRE, data.SV_ACTIVO, data.SV_IDSERVICIO_PK]
      );
    } else {
      await db.execute(
        "INSERT INTO KS_SERVICIOS (SV_NOMBRE, SV_ACTIVO) VALUES (?, ?)",
        [data.SV_NOMBRE, data.SV_ACTIVO]
      );
    }
    revalidatePath("/dashboard/catalogos");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error saving service:", error);
    return { success: false, data: null, error: "Error al guardar el servicio" };
  }
}

export async function deleteService(id: number): Promise<ApiResponse> {
  try {
    await db.execute("DELETE FROM KS_SERVICIOS WHERE SV_IDSERVICIO_PK = ?", [id]);
    revalidatePath("/dashboard/catalogos");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error deleting service:", error);
    return { success: false, data: null, error: "Error al eliminar el servicio. Verifique que no esté en uso." };
  }
}

/**
 * PRODUCTOS
 */

export async function getProducts(): Promise<ApiResponse> {
  try {
    // FORCE NO CACHE with a random comment
    const [rows] = await db.execute(
      "SELECT PR_IDPRODUCTO_PK, PR_NOMBRE, PR_APLICA_COMISION, PR_PORCENTAJE_COMISION, PR_ACTIVO FROM KS_PRODUCTOS ORDER BY PR_NOMBRE ASC"
    );

    const products = (rows as any[]).map(p => ({
      ...p,
      PR_ACTIVO: !!p.PR_ACTIVO
    }));

    return { success: true, data: products, error: null };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, data: null, error: "Error al obtener los productos" };
  }
}

export async function saveProduct(data: ProductFormData): Promise<ApiResponse> {
  try {
    if (data.PR_IDPRODUCTO_PK) {
      await db.execute(
        "UPDATE KS_PRODUCTOS SET PR_NOMBRE = ?, PR_APLICA_COMISION = ?, PR_PORCENTAJE_COMISION = ?, PR_ACTIVO = ? WHERE PR_IDPRODUCTO_PK = ?",
        [data.PR_NOMBRE, data.PR_APLICA_COMISION, data.PR_PORCENTAJE_COMISION, data.PR_ACTIVO, data.PR_IDPRODUCTO_PK]
      );
    } else {
      await db.execute(
        "INSERT INTO KS_PRODUCTOS (PR_NOMBRE, PR_APLICA_COMISION, PR_PORCENTAJE_COMISION, PR_ACTIVO) VALUES (?, ?, ?, ?)",
        [data.PR_NOMBRE, data.PR_APLICA_COMISION, data.PR_PORCENTAJE_COMISION, data.PR_ACTIVO]
      );
    }
    revalidatePath("/dashboard/catalogos");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error saving product:", error);
    return { success: false, data: null, error: "Error al guardar el product" };
  }
}

export async function deleteProduct(id: number): Promise<ApiResponse> {
  try {
    await db.execute("DELETE FROM KS_PRODUCTOS WHERE PR_IDPRODUCTO_PK = ?", [id]);
    revalidatePath("/dashboard/catalogos");
    return { success: true, data: null, error: null };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, data: null, error: "Error al eliminar el producto. Verifique que no esté en uso." };
  }
}
