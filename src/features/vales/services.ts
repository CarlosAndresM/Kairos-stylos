import { getAdelantos, getAdelantosPendientes, getAdelantosByTrabajador } from '@/features/vales/queries';
import { createAdelantoMutation, anularAdelantoMutation } from '@/features/vales/mutations';
import { CreateAdelantoSchema } from '@/features/vales/schema';

export async function getAllAdelantosService(sucursalId?: number) {
  try {
    const data = await getAdelantos(sucursalId);
    return { success: true, data };
  } catch (error: any) {
    console.error('getAllAdelantosService error:', error);
    return { success: false, data: null, error: 'Error al obtener los vales', meta: { error: error.message } };
  }
}


export async function getAdelantosPendientesService() {
  try {
    const data = await getAdelantosPendientes();
    return { success: true, data };
  } catch (error: any) {
    console.error('getAdelantosPendientesService error:', error);
    return { success: false, data: null, error: 'Error al obtener los vales pendientes', meta: { error: error.message } };
  }
}

export async function createAdelantoService(input: unknown) {
  try {
    const validated = CreateAdelantoSchema.parse(input);
    const id = await createAdelantoMutation(validated);
    return { success: true, data: { id } };
  } catch (error: any) {
    console.error('createAdelantoService error:', error);
    if (error.name === 'ZodError') {
      return { success: false, data: null, error: 'Datos inválidos', meta: { issues: error.issues } };
    }
    return { success: false, data: null, error: 'Error al crear el vale', meta: { error: error.message } };
  }
}

export async function anularAdelantoService(id: number) {
  try {
    const success = await anularAdelantoMutation(id);
    if (!success) {
      return { success: false, data: null, error: 'No se pudo anular, el vale no existe o ya no está pendiente.' };
    }
    return { success: true, data: { success: true } };
  } catch (error: any) {
    console.error('anularAdelantoService error:', error);
    return { success: false, data: null, error: 'Error al anular el vale', meta: { error: error.message } };
  }
}
