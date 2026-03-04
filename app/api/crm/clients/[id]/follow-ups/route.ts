export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar follow-ups do cliente
export async function GET(
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
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const followUps = await prisma.cRMFollowUp.findMany({
      where: { clientId: params.id, userId: user.id },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(followUps);
  } catch (error) {
    console.error('Erro ao buscar follow-ups:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar follow-up
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
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se cliente existe
    const client = await prisma.cRMClient.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, dueDate, priority } = body;

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: 'Título e data são obrigatórios' },
        { status: 400 }
      );
    }

    const followUp = await prisma.cRMFollowUp.create({
      data: {
        clientId: params.id,
        userId: user.id,
        title,
        description,
        dueDate: new Date(dueDate),
        priority: priority || 'normal',
      },
    });

    // Atualizar próximo follow-up no cliente
    const nextFollowUp = await prisma.cRMFollowUp.findFirst({
      where: { clientId: params.id, status: 'pending' },
      orderBy: { dueDate: 'asc' },
    });

    await prisma.cRMClient.update({
      where: { id: params.id },
      data: { nextFollowUpAt: nextFollowUp?.dueDate || null },
    });

    return NextResponse.json(followUp);
  } catch (error) {
    console.error('Erro ao criar follow-up:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH - Completar/atualizar follow-up
export async function PATCH(
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
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { followUpId, status, outcome } = body;

    if (!followUpId) {
      return NextResponse.json({ error: 'ID do follow-up é obrigatório' }, { status: 400 });
    }

    const followUp = await prisma.cRMFollowUp.update({
      where: { id: followUpId },
      data: {
        status: status || 'completed',
        outcome,
        completedAt: status === 'completed' ? new Date() : null,
      },
    });

    // Atualizar próximo follow-up no cliente
    const nextFollowUp = await prisma.cRMFollowUp.findFirst({
      where: { clientId: params.id, status: 'pending' },
      orderBy: { dueDate: 'asc' },
    });

    await prisma.cRMClient.update({
      where: { id: params.id },
      data: { nextFollowUpAt: nextFollowUp?.dueDate || null },
    });

    return NextResponse.json(followUp);
  } catch (error) {
    console.error('Erro ao atualizar follow-up:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
