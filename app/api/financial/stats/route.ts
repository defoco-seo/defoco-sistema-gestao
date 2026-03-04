export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { FINANCIAL_ROLES } from '@/lib/security';

// GET - Estatísticas financeiras
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados do usuário incluindo role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 403 });
    }

    // SEGURANÇA: Verificar se usuário tem acesso a dados financeiros
    const hasFinancialAccess = FINANCIAL_ROLES.includes(user.role || '');
    
    // Se não tem acesso financeiro, retornar dados vazios
    if (!hasFinancialAccess) {
      return NextResponse.json({
        totals: {
          receivable: '0.00',
          received: '0.00',
          pending: '0.00',
          overdue: '0.00',
        },
        counts: {
          pending: 0,
          paid: 0,
          overdue: 0,
          total: 0,
        },
        upcoming: [],
        overdue: [],
        hasAccess: false,
      });
    }

    const userId = user.id;

    // Buscar todas as parcelas do usuário
    const installments = await prisma.installment.findMany({
      where: {
        proposal: {
          userId,
        },
      },
      include: {
        payments: true,
      },
    });

    // Calcular estatísticas
    let totalReceivable = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let countPending = 0;
    let countPaid = 0;
    let countOverdue = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    installments.forEach(inst => {
      const amount = Number(inst.amount);
      const paid = inst.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const remaining = amount - paid;

      totalReceivable += amount;
      totalReceived += paid;

      if (inst.status === 'paid') {
        countPaid++;
      } else if (new Date(inst.dueDate) < today && inst.status !== 'paid') {
        totalOverdue += remaining;
        countOverdue++;
      } else if (inst.status === 'pending') {
        totalPending += remaining;
        countPending++;
      }
    });

    // Próximos vencimentos (próximos 30 dias)
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const upcomingInstallments = await prisma.installment.findMany({
      where: {
        proposal: {
          userId,
        },
        dueDate: {
          gte: today,
          lte: next30Days,
        },
        status: {
          not: 'paid',
        },
      },
      include: {
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            clientName: true,
          },
        },
        payments: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 10,
    });

    // Parcelas atrasadas
    const overdueInstallments = await prisma.installment.findMany({
      where: {
        proposal: {
          userId,
        },
        dueDate: {
          lt: today,
        },
        status: {
          not: 'paid',
        },
      },
      include: {
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            clientName: true,
          },
        },
        payments: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return NextResponse.json({
      totals: {
        receivable: totalReceivable.toFixed(2),
        received: totalReceived.toFixed(2),
        pending: totalPending.toFixed(2),
        overdue: totalOverdue.toFixed(2),
      },
      counts: {
        pending: countPending,
        paid: countPaid,
        overdue: countOverdue,
        total: installments.length,
      },
      upcoming: upcomingInstallments.map(inst => ({
        ...inst,
        amount: inst.amount.toString(),
        payments: inst.payments.map(p => ({
          ...p,
          amount: p.amount.toString(),
        })),
      })),
      overdue: overdueInstallments.map(inst => ({
        ...inst,
        amount: inst.amount.toString(),
        payments: inst.payments.map(p => ({
          ...p,
          amount: p.amount.toString(),
        })),
      })),
      hasAccess: true,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
