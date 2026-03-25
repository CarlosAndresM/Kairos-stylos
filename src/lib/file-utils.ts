import { join } from 'path';
import { getStorageProvider } from './storage';

/**
 * Mueve un archivo de la carpeta temporal a la carpeta permanente de uploads.
 * @param tempUrl URL relativa del archivo en temp (ej: /uploads/temp/file.jpg)
 * @returns Nueva URL relativa permanente
 */
export async function finalizeUpload(tempUrl: string, invoiceNumber: string): Promise<string> {
  if (!tempUrl || !tempUrl.includes('/temp')) return tempUrl;

  const storage = getStorageProvider();
  
  // Sanitizar el número de factura para usarlo en el nombre de la carpeta
  const sanitizedInvoice = invoiceNumber.toString().replace(/[^a-zA-Z0-9]/g, '_');
  const invoiceFolder = `invoice-${sanitizedInvoice}`;

  try {
    // Mover el archivo usando la abstracción de almacenamiento
    return await storage.move(tempUrl, invoiceFolder);
  } catch (error) {
    console.error(`Error al finalizar upload para ${tempUrl}:`, error);
    return tempUrl; // Devolver el original si falla
  }
}

/**
 * Elimina un archivo de la carpeta temporal.
 * @param tempUrl URL relativa del archivo (ej: /uploads/temp/file.jpg)
 */
export async function deleteTempFile(tempUrl: string): Promise<void> {
  if (!tempUrl || !tempUrl.includes('/temp')) return;

  const storage = getStorageProvider();

  try {
    await storage.delete(tempUrl);
  } catch (error) {
    // Falló pero ignoramos para no romper el flujo
  }
}
