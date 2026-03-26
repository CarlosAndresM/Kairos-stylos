import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getStorageProvider } from '@/lib/storage';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Procesar imagen con sharp para estandarizar a JPEG
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(buffer)
        .jpeg({ quality: 80, force: true })
        .toBuffer();
    } catch (err) {
      console.warn('Sharp processing failed, using original buffer:', err);
      processedBuffer = buffer;
    }

    // Generar nombre de archivo único siempre con extensión .jpg
    const fileName = `${uuidv4()}.jpg`;

    const storage = getStorageProvider();
    const url = await storage.upload(processedBuffer, fileName, 'temp');

    return NextResponse.json({ success: true, url });
  } catch (error) {

    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'Error interno al subir el archivo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url || !url.includes('/temp/')) {
      return NextResponse.json({ success: false, error: 'URL inválida o no es temporal' }, { status: 400 });
    }

    const storage = getStorageProvider();

    try {
      await storage.delete(url);
      return NextResponse.json({ success: true, message: 'Archivo eliminado' });
    } catch (e) {
      return NextResponse.json({ success: true, message: 'El archivo ya no existe o error al borrar' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ success: false, error: 'Error al eliminar archivo' }, { status: 500 });
  }
}
