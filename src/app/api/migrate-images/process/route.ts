import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { finalizeUpload } from '@/lib/file-utils';

export async function POST(request: NextRequest) {
  try {
    const { id, real_id, url, parent_id, source, json_index } = await request.json();

    if (!url || !url.includes('/temp/')) {
      return NextResponse.json({ success: false, error: 'URL inválida o no es temporal' }, { status: 400 });
    }

    let folderName = '';
    if (source === 'FACTURA') {
      const [inv]: any = await db.execute("SELECT fc_numero_factura FROM ks_facturas WHERE fc_idfactura_pk = ?", [parent_id]);
      if (inv.length > 0) {
         folderName = inv[0].fc_numero_factura;
      } else {
         folderName = `${parent_id}`;
      }
    } else {
      folderName = `GASTO-${parent_id}`;
    }

    // Call digital ocean to move it
    const newUrl = await finalizeUpload(url, folderName);

    if (newUrl === url) {
      // It failed to move or didn't change
      return NextResponse.json({ success: false, error: 'Digital Ocean no pudo mover el archivo o ya fue movido' });
    }

    // Update DB
    if (source === 'FACTURA') {
      await db.execute(
        "UPDATE ks_pagos_factura SET pf_evidencia_url = ? WHERE pf_idpago_pk = ?",
        [newUrl, id]
      );
    } else if (source === 'GASTO') {
      const [gastos]: any = await db.execute("SELECT gs_comprobantes FROM ks_gastos WHERE gs_idgasto_pk = ?", [real_id]);
      if (gastos.length > 0) {
        try {
          const urls = JSON.parse(gastos[0].gs_comprobantes);
          urls[json_index] = newUrl;
          await db.execute(
            "UPDATE ks_gastos SET gs_comprobantes = ? WHERE gs_idgasto_pk = ?",
            [JSON.stringify(urls), real_id]
          );
        } catch(e) {
          await db.execute(
            "UPDATE ks_gastos SET gs_comprobantes = ? WHERE gs_idgasto_pk = ?",
            [newUrl, real_id]
          );
        }
      }
    }

    return NextResponse.json({ success: true, newUrl });
  } catch (error: any) {
    console.error('Error processing image:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}
