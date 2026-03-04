export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths, format, startOfYear, endOfYear } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    // 1. KPIs de Propostas
    const [totalProposals, approvedProposals, pendingProposals, rejectedProposals] = await Promise.all([
      prisma.proposal.count(),
      prisma.proposal.count({ where: { internalStatus: 'approved' } }),
      prisma.proposal.count({ where: { internalStatus: 'pending' } }),
      prisma.proposal.count({ where: { internalStatus: 'rejected' } }),
    ]);

    const conversionRate = totalProposals > 0 
      ? ((approvedProposals / totalProposals) * 100).toFixed(1) 
      : '0';

    // 2. Receita Total (propostas aprovadas)
    const approvedProposalsData = await prisma.proposal.findMany({
      where: { internalStatus: 'approved' },
      select: { total: true, createdAt: true },
    });

    const totalRevenue = approvedProposalsData.reduce(
      (sum: number, p: any) => sum + Number(p.total),
      0
    );

    // 3. Receita por mês (ultimos 6 meses)
    const revenueByMonth: { month: string; value: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthProposals = await prisma.proposal.findMany({
        where: {
          internalStatus: 'approved',
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        select: { total: true },
      });

      revenueByMonth.push({
        month: format(monthStart, 'MMM/yy'),
        value: monthProposals.reduce((sum: number, p: any) => sum + Number(p.total), 0),
        count: monthProposals.length,
      });
    }

    // 4. Top 5 Clientes por valor
    const topClients = await prisma.proposal.groupBy({
      by: ['clientName'],
      where: { internalStatus: 'approved' },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    });

    // 5. Jobs Criativos por status
    const jobsByStatus = await prisma.creativeJob.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const jobStatusMap: Record<string, number> = {};
    jobsByStatus.forEach((j: any) => {
      jobStatusMap[j.status] = j._count.id;
    });

    // 6. Produtividade - Jobs completados este mês vs mês passado
    const [jobsThisMonth, jobsLastMonth] = await Promise.all([
      prisma.creativeJob.count({
        where: {
          status: 'completed',
          completedAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      prisma.creativeJob.count({
        where: {
          status: 'completed',
          completedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
    ]);

    const productivityChange = jobsLastMonth > 0
      ? (((jobsThisMonth - jobsLastMonth) / jobsLastMonth) * 100).toFixed(1)
      : jobsThisMonth > 0 ? '100' : '0';

    // 7. CRM - Leads e conversão
    const [totalLeads, activeClients, lostClients] = await Promise.all([
      prisma.cRMClient.count({ where: { status: 'lead' } }),
      prisma.cRMClient.count({ where: { status: 'active' } }),
      prisma.cRMClient.count({ where: { status: 'lost' } }),
    ]);

    // 8. Financeiro - Parcelas
    const [pendingInstallments, overdueInstallments, paidInstallments] = await Promise.all([
      prisma.installment.count({ where: { status: 'pending' } }),
      prisma.installment.count({ where: { status: 'overdue' } }),
      prisma.installment.count({ where: { status: 'paid' } }),
    ]);

    const pendingAmount = await prisma.installment.aggregate({
      where: { status: { in: ['pending', 'overdue'] } },
      _sum: { amount: true },
    });

    // 9. Ticket médio
    const avgTicket = approvedProposals > 0
      ? (totalRevenue / approvedProposals).toFixed(2)
      : '0';

    // 10. Propostas por mês (volume)
    const proposalsByMonth: { month: string; total: number; approved: number; rejected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const [total, approved, rejected] = await Promise.all([
        prisma.proposal.count({
          where: { createdAt: { gte: monthStart, lte: monthEnd } },
        }),
        prisma.proposal.count({
          where: {
            internalStatus: 'approved',
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.proposal.count({
          where: {
            internalStatus: 'rejected',
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
      ]);

      proposalsByMonth.push({
        month: format(monthStart, 'MMM/yy'),
        total,
        approved,
        rejected,
      });
    }

    return NextResponse.json({
      // KPIs principais
      proposals: {
        total: totalProposals,
        approved: approvedProposals,
        pending: pendingProposals,
        rejected: rejectedProposals,
        conversionRate: parseFloat(conversionRate),
      },
      revenue: {
        total: totalRevenue,
        avgTicket: parseFloat(avgTicket),
        byMonth: revenueByMonth,
      },
      topClients: topClients.map((c: any) => ({
        name: c.clientName,
        total: Number(c._sum.total || 0),
        count: c._count.id,
      })),
      jobs: {
        byStatus: jobStatusMap,
        thisMonth: jobsThisMonth,
        lastMonth: jobsLastMonth,
        productivityChange: parseFloat(productivityChange),
      },
      crm: {
        leads: totalLeads,
        active: activeClients,
        lost: lostClients,
      },
      financial: {
        pendingInstallments,
        overdueInstallments,
        paidInstallments,
        pendingAmount: Number(pendingAmount._sum.amount || 0),
      },
      proposalsByMonth,
    });
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados de analytics' },
      { status: 500 }
    );
  }
}
