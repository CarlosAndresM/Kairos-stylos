import { getVales, getValesPendientes, getValesByTrabajador } from '@/features/vales/queries';
import { createValeMutation, anularValeMutation, eliminarValeMutation, deshacerAnularValeMutation } from '@/features/vales/mutations';
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

    // Asegurar que la fecha de inicio de cobro no sea NULL para evitar bloquear los descuentos
    if (!validated.VL_FECHA_INICIO_COBRO && validated.VL_FECHA_DESEMBOLSO) {
      validated.VL_FECHA_INICIO_COBRO = validated.VL_FECHA_DESEMBOLSO;
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

export async function updateValeService(input: unknown) {
  try {
    const { UpdateValeSchema } = await import('@/features/vales/schema');
    const validated = UpdateValeSchema.parse(input);
    
    if (!validated.VL_FECHA && validated.VL_FECHA_DESEMBOLSO) {
      validated.VL_FECHA = validated.VL_FECHA_DESEMBOLSO;
    }

    // Asegurar que la fecha de inicio de cobro no sea NULL para evitar bloquear los descuentos
    if (!validated.VL_FECHA_INICIO_COBRO && validated.VL_FECHA_DESEMBOLSO) {
      validated.VL_FECHA_INICIO_COBRO = validated.VL_FECHA_DESEMBOLSO;
    }

    const { updateValeMutation } = await import('@/features/vales/mutations');
    const success = await updateValeMutation(validated);
    if (!success) {
      return { success: false, data: null, error: 'No se pudo actualizar. El vale no existe, no está pendiente o ya tiene cuotas pagadas.' };
    }
    return { success: true, data: { success: true } };
  } catch (error: any) {
    console.error('updateValeService error:', error);
    if (error.name === 'ZodError') {
      return { success: false, data: null, error: 'Datos inválidos', meta: { issues: error.issues } };
    }
    return { success: false, data: null, error: 'Error al actualizar el vale', meta: { error: error.message } };
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

export async function eliminarValeService(id: number) {
  try {
    const success = await eliminarValeMutation(id);
    if (!success) {
      return { success: false, data: null, error: 'No se pudo eliminar el vale. Podría tener cuotas cobradas.' };
    }
    return { success: true, data: { success: true } };
  } catch (error: any) {
    console.error('eliminarValeService error:', error);
    return { success: false, data: null, error: 'Error al eliminar el vale', meta: { error: error.message } };
  }
}

export async function deshacerAnularValeService(id: number) {
  try {
    const success = await deshacerAnularValeMutation(id);
    if (!success) {
      return { success: false, data: null, error: 'No se pudo deshacer la anulación. El vale no existe o no está anulado.' };
    }
    return { success: true, data: { success: true } };
  } catch (error: any) {
    console.error('deshacerAnularValeService error:', error);
    return { success: false, data: null, error: 'Error al deshacer la anulación del vale', meta: { error: error.message } };
  }
}
