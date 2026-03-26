import { NextRequest, NextResponse } from 'next/server';
import { getClients } from '@/features/clients/services';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';

  try {
    const res = await getClients(query);
    if (res.success) {
      return NextResponse.json(res);
    } else {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error en la búsqueda de clientes' }, { status: 500 });
  }
}
