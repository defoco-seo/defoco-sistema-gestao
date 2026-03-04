export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar clientes do CRM
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = { userId: user.id };
    
    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.cRMClient.findMany({
      where,
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        followUps: {
          where: { status: 'pending' },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(clients.map(c => ({
      ...c,
      proposalValue: c.proposalValue ? parseFloat(c.proposalValue.toString()) : null,
      lastInteraction: c.interactions[0] || null,
      nextFollowUp: c.followUps[0] || null,
    })));
  } catch (error) {
    console.error('Erro ao buscar clientes CRM:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar cliente manualmente
export async function POST(request: NextRequest) {
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
    const { name, email, phone, company, cnpj, tags, notes, status = 'lead' } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe
    const existing = await prisma.cRMClient.findFirst({
      where: { userId: user.id, email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Cliente já cadastrado com este email' },
        { status: 400 }
      );
    }

    const client = await prisma.cRMClient.create({
      data: {
        userId: user.id,
        name,
        email,
        phone,
        company,
        cnpj,
        tags,
        notes,
        status,
        source: 'manual',
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Erro ao criar cliente CRM:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
