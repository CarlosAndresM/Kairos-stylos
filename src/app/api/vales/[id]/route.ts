import { NextResponse } from 'next/server';
import { anularValeService, updateValeService, eliminarValeService, deshacerAnularValeService } from '@/features/vales/services';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido', data: null }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    let response;
    if (action === 'anular') {
      response = await anularValeService(id);
    } else if (action === 'deshacer') {
      response = await deshacerAnularValeService(id);
    } else {
      response = await eliminarValeService(id);
    }

    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, data: null }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido', data: null }, { status: 400 });
    }

    const body = await req.json();
    const payload = { ...body, VL_IDVALE_PK: id };
    
    const response = await updateValeService(payload);
    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, data: null }, { status: 500 });
  }
}
