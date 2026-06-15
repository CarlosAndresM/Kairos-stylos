import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [facturas]: any = await db.execute(
      `SELECT pf_idpago_pk as id, pf_evidencia_url as url, fc_idfactura_fk as parent_id, 'FACTURA' as source
       FROM ks_pagos_factura 
       WHERE pf_evidencia_url LIKE '%/temp/%'`
    );

    const [evidenciaFisica]: any = await db.execute(
      `SELECT fc_idfactura_pk as id, fc_evidencia_fisica_url as url, fc_idfactura_pk as parent_id, 'FACTURA_EVIDENCIA_FISICA' as source
       FROM ks_facturas
       WHERE fc_evidencia_fisica_url LIKE '%/temp/%'`
    );

    const [gastos]: any = await db.execute(
      `SELECT gs_idgasto_pk as id, gs_comprobantes as url, gs_idgasto_pk as parent_id, 'GASTO' as source
       FROM ks_gastos 
       WHERE gs_comprobantes LIKE '%/temp/%'`
    );

    const processedGastos = [];
    for (const g of gastos) {
      try {
        const urls = JSON.parse(g.url);
        urls.forEach((u: string, idx: number) => {
          if (u.includes('/temp/')) {
            processedGastos.push({
              id: `${g.id}-${idx}`,
              real_id: g.id,
              url: u,
              parent_id: g.parent_id,
              source: 'GASTO',
              json_index: idx
            });
          }
        });
      } catch (e) {
        if (g.url.includes('/temp/')) {
           processedGastos.push({ ...g, real_id: g.id });
        }
      }
    }

    const allImages = [...facturas, ...evidenciaFisica, ...processedGastos];

    return NextResponse.json({ success: true, data: allImages });
  } catch (error) {
    console.error('Error fetching temp images:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener imágenes' }, { status: 500 });
  }
}
