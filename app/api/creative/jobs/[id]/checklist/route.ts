export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar checklist do job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const checklist = await prisma.creativeJobChecklist.findMany({
      where: { jobId: params.id },
      orderBy: { order: 'asc' }
    });
    
    return NextResponse.json(checklist);
  } catch (error) {
    console.error('Erro ao buscar checklist:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Adicionar item ao checklist
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
    
    const body = await request.json();
    const { title, description, assignedToId, assignedToName, dueDate } = body;
    
    if (!title) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }
    
    // Buscar ordem do último item
    const lastItem = await prisma.creativeJobChecklist.findFirst({
      where: { jobId: params.id },
      orderBy: { order: 'desc' }
    });
    
    const item = await prisma.creativeJobChecklist.create({
      data: {
        jobId: params.id,
        title,
        description,
        assignedToId,
        assignedToName,
        dueDate: dueDate ? new Date(dueDate) : null,
        order: (lastItem?.order || 0) + 1,
      }
    });
    
    // Registrar no histórico
    const historyDesc = assignedToName 
      ? `Item adicionado ao checklist: "${title}" (responsável: ${assignedToName})`
      : `Item adicionado ao checklist: "${title}"`;
    
    await prisma.creativeJobHistory.create({
      data: {
        jobId: params.id,
        userId: user.id,
        action: 'checklist_updated',
        newValue: title,
        description: historyDesc,
      }
    });
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar item do checklist (toggle completed, etc.)
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
      select: { id: true, name: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const body = await request.json();
    const { itemId, isCompleted, title, description, order, assignedToId, assignedToName, dueDate } = body;
    
    if (!itemId) {
      return NextResponse.json({ error: 'ID do item é obrigatório' }, { status: 400 });
    }
    
    const existingItem = await prisma.creativeJobChecklist.findUnique({
      where: { id: itemId }
    });
    
    if (!existingItem || existingItem.jobId !== params.id) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }
    
    const item = await prisma.creativeJobChecklist.update({
      where: { id: itemId },
      data: {
        title: title ?? existingItem.title,
        description: description !== undefined ? description : existingItem.description,
        order: order ?? existingItem.order,
        assignedToId: assignedToId !== undefined ? assignedToId : existingItem.assignedToId,
        assignedToName: assignedToName !== undefined ? assignedToName : existingItem.assignedToName,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existingItem.dueDate,
        isCompleted: isCompleted !== undefined ? isCompleted : existingItem.isCompleted,
        completedAt: isCompleted ? new Date() : (isCompleted === false ? null : existingItem.completedAt),
        completedBy: isCompleted ? user.id : (isCompleted === false ? null : existingItem.completedBy),
        completedByName: isCompleted ? (user.name || session.user.email) : (isCompleted === false ? null : existingItem.completedByName),
      }
    });
    
    // Registrar no histórico se alterou o status
    if (isCompleted !== undefined && isCompleted !== existingItem.isCompleted) {
      await prisma.creativeJobHistory.create({
        data: {
          jobId: params.id,
          userId: user.id,
          action: 'checklist_updated',
          previousValue: existingItem.isCompleted ? 'Concluído' : 'Pendente',
          newValue: isCompleted ? 'Concluído' : 'Pendente',
          description: `Item "${item.title}" ${isCompleted ? 'marcado como concluído' : 'desmarcado'} por ${user.name || session.user.email}`,
        }
      });
    }
    
    // Registrar mudança de responsável
    if (assignedToId !== undefined && assignedToId !== existingItem.assignedToId) {
      await prisma.creativeJobHistory.create({
        data: {
          jobId: params.id,
          userId: user.id,
          action: 'checklist_assigned',
          previousValue: existingItem.assignedToName || 'Ninguém',
          newValue: assignedToName || 'Removido',
          description: `Responsável pelo item "${item.title}" alterado para ${assignedToName || 'ninguém'} por ${user.name || session.user.email}`,
        }
      });
    }
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Remover item do checklist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    
    if (!itemId) {
      return NextResponse.json({ error: 'ID do item é obrigatório' }, { status: 400 });
    }
    
    const existingItem = await prisma.creativeJobChecklist.findUnique({
      where: { id: itemId }
    });
    
    if (!existingItem || existingItem.jobId !== params.id) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }
    
    await prisma.creativeJobChecklist.delete({
      where: { id: itemId }
    });
    
    return NextResponse.json({ message: 'Item removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover item:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
