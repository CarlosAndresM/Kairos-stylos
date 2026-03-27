import { getVales, getValesPendientes, getValesByTrabajador } from '@/features/vales/queries';
import { createValeMutation, anularValeMutation } from '@/features/vales/mutations';
import { CreateValeSchema } from '@/features/vales/schema';

export async function getAllValesService(sucursalId?: number) {
  try {
    const data = await getVales(sucursalId);
    return { success: true, data };
  } catch (error: any) {
    console.error('getAllValesService error:', error);
    return { success: false, data: null, error: 'Error al obtener los vales', meta: { error: error.message } };
  }
}


export async function getValesPendientesService() {
  try {
    const data = await getValesPendientes();
    return { success: true, data };
  } catch (error: any) {
    console.error('getValesPendientesService error:', error);
    return { success: false, data: null, error: 'Error al obtener los vales pendientes', meta: { error: error.message } };
  }
}

export async function createValeService(input: unknown) {
  try {
    const validated = CreateValeSchema.parse(input);
    
    // Asegurar que VL_FECHA tenga un valor (usar fecha de desembolso si no viene)
    if (!validated.VL_FECHA && validated.VL_FECHA_DESEMBOLSO) {
      validated.VL_FECHA = validated.VL_FECHA_DESEMBOLSO;
    }

    const id = await createValeMutation(validated);
    return { success: true, data: { id } };
  } catch (error: any) {
    console.error('createValeService error:', error);
    if (error.name === 'ZodError') {
      return { success: false, data: null, error: 'Datos inválidos', meta: { issues: error.issues } };
    }
    return { success: false, data: null, error: 'Error al crear el vale', meta: { error: error.message } };
  }
}

export async function anularValeService(id: number) {
  try {
    const success = await anularValeMutation(id);
    if (!success) {
      return { success: false, data: null, error: 'No se pudo anular, el vale no existe o ya no está pendiente.' };
    }
    return { success: true, data: { success: true } };
  } catch (error: any) {
    console.error('anularValeService error:', error);
    return { success: false, data: null, error: 'Error al anular el vale', meta: { error: error.message } };
  }
}
