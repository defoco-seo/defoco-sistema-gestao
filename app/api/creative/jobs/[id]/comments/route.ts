export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar comentários do job
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const comments = await prisma.creativeJobComment.findMany({
      where: { jobId: params.id },
      include: {
        attachment: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            cloudStoragePath: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    const total = await prisma.creativeJobComment.count({
      where: { jobId: params.id }
    });
    
    return NextResponse.json({ comments, total });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Adicionar comentário
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
      select: { id: true, name: true, image: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const body = await request.json();
    const { content, mentions, attachmentId } = body;
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 });
    }
    
    // Verificar se o job existe
    const job = await prisma.creativeJob.findUnique({
      where: { id: params.id },
      select: { id: true, jobNumber: true }
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }
    
    // Criar comentário
    const comment = await prisma.creativeJobComment.create({
      data: {
        jobId: params.id,
        userId: user.id,
        userName: user.name || 'Usuário',
        userImage: user.image,
        content: content.trim(),
        mentions: mentions ? JSON.stringify(mentions) : null,
        attachmentId: attachmentId || null,
      },
      include: {
        attachment: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            cloudStoragePath: true,
          }
        }
      }
    });
    
    // Registrar no histórico
    await prisma.creativeJobHistory.create({
      data: {
        jobId: params.id,
        userId: user.id,
        action: 'comment_added',
        description: `${user.name} adicionou um comentário`,
      }
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Editar comentário
export async function PUT(
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
      select: { id: true, role: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const body = await request.json();
    const { commentId, content } = body;
    
    if (!commentId || !content?.trim()) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    
    // Verificar se o comentário existe e pertence ao usuário
    const existingComment = await prisma.creativeJobComment.findUnique({
      where: { id: commentId }
    });
    
    if (!existingComment) {
      return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 });
    }
    
    // Apenas o autor ou admin pode editar
    const isAdmin = ['master', 'admin'].includes(user.role || '');
    if (existingComment.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Sem permissão para editar' }, { status: 403 });
    }
    
    const comment = await prisma.creativeJobComment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
      }
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error('Erro ao editar comentário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Remover comentário
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
      select: { id: true, role: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json({ error: 'ID do comentário é obrigatório' }, { status: 400 });
    }
    
    // Verificar se o comentário existe
    const comment = await prisma.creativeJobComment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) {
      return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 });
    }
    
    // Apenas o autor ou admin pode deletar
    const isAdmin = ['master', 'admin'].includes(user.role || '');
    if (comment.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Sem permissão para deletar' }, { status: 403 });
    }
    
    await prisma.creativeJobComment.delete({
      where: { id: commentId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
