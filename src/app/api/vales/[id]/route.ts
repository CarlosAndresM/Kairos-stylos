import { NextResponse } from 'next/server';
import { anularValeService, updateValeService } from '@/features/vales/services';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID inválido', data: null }, { status: 400 });
    }

    const response = await anularValeService(id);
    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, data: null }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
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
