export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar interações do cliente
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

    const interactions = await prisma.cRMInteraction.findMany({
      where: { clientId: params.id, userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(interactions);
  } catch (error) {
    console.error('Erro ao buscar interações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar interação
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
    const { type, direction, subject, content, status, aiGenerated, aiPromptUsed } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Tipo e conteúdo são obrigatórios' },
        { status: 400 }
      );
    }

    const interaction = await prisma.cRMInteraction.create({
      data: {
        clientId: params.id,
        userId: user.id,
        type,
        direction: direction || 'outbound',
        subject,
        content,
        status: status || 'sent',
        aiGenerated: aiGenerated || false,
        aiPromptUsed,
      },
    });

    // Atualizar último contato e contador
    await prisma.cRMClient.update({
      where: { id: params.id },
      data: {
        lastContactAt: new Date(),
        totalInteractions: { increment: 1 },
      },
    });

    return NextResponse.json(interaction);
  } catch (error) {
    console.error('Erro ao criar interação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
