export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar parcelas (com filtros opcionais)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get('proposalId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    // Filtrar por proposta específica
    if (proposalId) {
      // SEGURANÇA: Verificar se a proposta pertence ao usuário ou se é admin
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      });
      
      const ADMIN_ROLES = ['master', 'admin', 'financeiro'];
      const isAdmin = user && ADMIN_ROLES.includes(user.role || '');
      
      if (!isAdmin) {
        // Usuário normal só pode ver suas próprias propostas
        const proposal = await prisma.proposal.findFirst({
          where: {
            id: proposalId,
            userId: session.user.id,
          },
        });
        
        if (!proposal) {
          return NextResponse.json(
            { error: 'Proposta não encontrada ou sem permissão' },
            { status: 403 }
          );
        }
      }
      
      where.proposalId = proposalId;
    } else {
      // Se não especificar proposta, buscar apenas do usuário logado
      where.proposal = {
        userId: session.user.id,
      };
    }

    // Filtrar por status
    if (status) {
      where.status = status;
    }

    // Filtrar por período de vencimento
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) {
        where.dueDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate);
      }
    }

    const installments = await prisma.installment.findMany({
      where,
      include: {
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
            demandName: true,
            clientName: true,
            total: true,
          },
        },
        payments: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Converter Decimal para string
    const formattedInstallments = installments.map(inst => ({
      ...inst,
      amount: inst.amount.toString(),
      proposal: {
        ...inst.proposal,
        total: inst.proposal.total.toString(),
      },
      payments: inst.payments.map(p => ({
        ...p,
        amount: p.amount.toString(),
      })),
    }));

    return NextResponse.json(formattedInstallments);
  } catch (error) {
    console.error('Erro ao buscar parcelas:', error);
    return NextResponse.json({ error: 'Erro ao buscar parcelas' }, { status: 500 });
  }
}

// POST - Criar nova parcela manualmente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { proposalId, installmentNumber, dueDate, amount, description } = body;

    // Validações
    if (!proposalId || !installmentNumber || !dueDate || !amount) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Verificar se a proposta pertence ao usuário
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        userId: session.user.id,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // Criar parcela
    const installment = await prisma.installment.create({
      data: {
        proposalId,
        installmentNumber,
        dueDate: new Date(dueDate),
        amount,
        description,
        status: 'pending',
      },
      include: {
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
            clientName: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...installment,
      amount: installment.amount.toString(),
    });
  } catch (error) {
    console.error('Erro ao criar parcela:', error);
    return NextResponse.json({ error: 'Erro ao criar parcela' }, { status: 500 });
  }
}
