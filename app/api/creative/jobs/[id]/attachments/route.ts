export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { uploadFile, getFileUrl, deleteFile } from '@/lib/s3';

// GET - Listar anexos do job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    const where: any = { jobId: params.id };
    if (category) where.category = category;
    
    const attachments = await prisma.creativeJobAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    // Gerar URLs assinadas para cada anexo
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const url = await getFileUrl(attachment.cloudStoragePath, false);
        return { ...attachment, url };
      })
    );
    
    return NextResponse.json(attachmentsWithUrls);
  } catch (error) {
    console.error('Erro ao buscar anexos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Upload de anexo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    // Verificar se o job existe
    const job = await prisma.creativeJob.findUnique({
      where: { id: params.id },
      select: { id: true, jobNumber: true }
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'general';
    const description = formData.get('description') as string || '';
    
    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 });
    }
    
    // Validar tamanho (máximo 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 50MB)' }, { status: 400 });
    }
    
    // Upload para S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `job-${job.jobNumber}-${Date.now()}-${file.name}`;
    const cloudStoragePath = await uploadFile(buffer, fileName, false);
    
    // Criar registro no banco
    const attachment = await prisma.creativeJobAttachment.create({
      data: {
        jobId: params.id,
        userId: user.id,
        userName: user.name || 'Usuário',
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        cloudStoragePath,
        category,
        description: description || null,
      }
    });
    
    // Gerar URL
    const url = await getFileUrl(cloudStoragePath, false);
    
    // Registrar no histórico
    await prisma.creativeJobHistory.create({
      data: {
        jobId: params.id,
        userId: user.id,
        action: 'attachment_added',
        description: `${user.name} anexou "${file.name}"`,
      }
    });
    
    return NextResponse.json({ ...attachment, url });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Remover anexo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, role: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');
    
    if (!attachmentId) {
      return NextResponse.json({ error: 'ID do anexo é obrigatório' }, { status: 400 });
    }
    
    // Verificar se o anexo existe
    const attachment = await prisma.creativeJobAttachment.findUnique({
      where: { id: attachmentId }
    });
    
    if (!attachment) {
      return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 });
    }
    
    // Apenas o autor ou admin pode deletar
    const isAdmin = ['master', 'admin'].includes(user.role || '');
    if (attachment.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Sem permissão para deletar' }, { status: 403 });
    }
    
    // Deletar do S3
    await deleteFile(attachment.cloudStoragePath);
    
    // Deletar do banco
    await prisma.creativeJobAttachment.delete({
      where: { id: attachmentId }
    });
    
    // Registrar no histórico
    await prisma.creativeJobHistory.create({
      data: {
        jobId: params.id,
        userId: user.id,
        action: 'attachment_removed',
        description: `${user.name} removeu "${attachment.fileName}"`,
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar anexo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
