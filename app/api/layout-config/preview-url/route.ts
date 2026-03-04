export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getFileUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { cloud_storage_path, isPublic } = await request.json();

    if (!cloud_storage_path) {
      return NextResponse.json({ error: 'cloud_storage_path é obrigatório' }, { status: 400 });
    }

    const url = await getFileUrl(cloud_storage_path, isPublic || true);
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating preview URL:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar URL de preview' },
      { status: 500 }
    );
  }
}
