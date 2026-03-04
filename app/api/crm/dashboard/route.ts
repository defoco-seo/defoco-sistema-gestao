export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, subDays, addDays } from 'date-fns';

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

    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);
    const thirtyDaysAgo = subDays(today, 30);

    // Estatísticas por status
    const statusCounts = await prisma.cRMClient.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: true,
    });

    const stats = {
      total: 0,
      lead: 0,
      prospect: 0,
      active: 0,
      inactive: 0,
      lost: 0,
    };

    statusCounts.forEach((s: { status: string; _count: number }) => {
      stats[s.status as keyof typeof stats] = s._count;
      stats.total += s._count;
    });

    // Follow-ups pendentes
    const pendingFollowUps = await prisma.cRMFollowUp.findMany({
      where: {
        userId: user.id,
        status: 'pending',
        dueDate: { lte: nextWeek },
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, company: true },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    // Follow-ups de hoje
    const todayFollowUps = pendingFollowUps.filter(
      f => f.dueDate >= today && f.dueDate < tomorrow
    );

    // Follow-ups atrasados
    const overdueFollowUps = await prisma.cRMFollowUp.count({
      where: {
        userId: user.id,
        status: 'pending',
        dueDate: { lt: today },
      },
    });

    // Clientes sem contato há mais de 30 dias (propostas pendentes)
    const needsAttention = await prisma.cRMClient.findMany({
      where: {
        userId: user.id,
        status: { in: ['lead', 'prospect'] },
        OR: [
          { lastContactAt: { lt: thirtyDaysAgo } },
          { lastContactAt: null },
        ],
      },
      orderBy: { lastContactAt: 'asc' },
      take: 10,
    });

    // Propostas pendentes (clientes que precisam de follow-up)
    const pendingProposals = await prisma.cRMClient.findMany({
      where: {
        userId: user.id,
        proposalStatus: 'pending',
        status: { in: ['lead', 'prospect'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Valor total em propostas pendentes
    const pendingValue = await prisma.cRMClient.aggregate({
      where: {
        userId: user.id,
        proposalStatus: 'pending',
      },
      _sum: { proposalValue: true },
    });

    // Interações recentes
    const recentInteractions = await prisma.cRMInteraction.findMany({
      where: { userId: user.id },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      stats,
      followUps: {
        today: todayFollowUps.length,
        upcoming: pendingFollowUps,
        overdue: overdueFollowUps,
      },
      needsAttention: needsAttention.map(c => ({
        ...c,
        proposalValue: c.proposalValue ? parseFloat(c.proposalValue.toString()) : null,
      })),
      pendingProposals: pendingProposals.map(c => ({
        ...c,
        proposalValue: c.proposalValue ? parseFloat(c.proposalValue.toString()) : null,
      })),
      pendingValue: pendingValue._sum.proposalValue 
        ? parseFloat(pendingValue._sum.proposalValue.toString()) 
        : 0,
      recentInteractions,
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard CRM:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
