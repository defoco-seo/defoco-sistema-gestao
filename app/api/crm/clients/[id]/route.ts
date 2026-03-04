export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Buscar cliente específico
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

    const client = await prisma.cRMClient.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        followUps: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Buscar proposta vinculada se houver
    let proposal = null;
    if (client.proposalId) {
      proposal = await prisma.proposal.findUnique({
        where: { id: client.proposalId },
        select: {
          id: true,
          proposalCode: true,
          proposalNumber: true,
          demandName: true,
          status: true,
          total: true,
          createdAt: true,
        },
      });
    }

    return NextResponse.json({
      ...client,
      proposalValue: client.proposalValue ? parseFloat(client.proposalValue.toString()) : null,
      proposal,
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar cliente
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
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const existing = await prisma.cRMClient.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, phone, company, cnpj, tags, notes, status, nextFollowUpAt } = body;

    const client = await prisma.cRMClient.update({
      where: { id: params.id },
      data: {
        name: name || existing.name,
        email: email || existing.email,
        phone,
        company,
        cnpj,
        tags,
        notes,
        status: status || existing.status,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : existing.nextFollowUpAt,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Remover cliente
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
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const existing = await prisma.cRMClient.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    await prisma.cRMClient.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
