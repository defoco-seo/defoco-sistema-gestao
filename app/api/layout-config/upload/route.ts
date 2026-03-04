export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { uploadFile } from '@/lib/s3';

// POST - Upload de imagens para layout
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const imageType = formData.get('type') as string; // 'logo', 'miniLogo', 'cover'

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    if (!imageType || !['logo', 'miniLogo', 'cover'].includes(imageType)) {
      return NextResponse.json(
        { error: 'Tipo de imagem inválido' },
        { status: 400 }
      );
    }

    // Validação de tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG, SVG ou PDF.' },
        { status: 400 }
      );
    }

    // Validação de tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 10MB' },
        { status: 400 }
      );
    }

    // Converte o arquivo para buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Faz upload para S3 (público para que o PDF possa acessar)
    const fileName = `layout-${imageType}-${Date.now()}-${file.name}`;
    const cloud_storage_path = await uploadFile(buffer, fileName, true);

    return NextResponse.json({
      success: true,
      cloud_storage_path,
      imageType,
    });
  } catch (error) {
    console.error('[API] Error uploading layout image:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload da imagem' },
      { status: 500 }
    );
  }
}
