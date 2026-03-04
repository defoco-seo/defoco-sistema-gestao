export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Total de membros ativos
    const totalMembers = await prisma.user.count({
      where: { isActive: true },
    });

    // Membros com perfil de equipe configurado
    const configuredMembers = await prisma.teamMember.count();

    // Ausências ativas hoje
    const activeAbsences = await prisma.teamAbsence.count({
      where: {
        isApproved: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    // Ausências pendentes de aprovação
    const pendingAbsences = await prisma.teamAbsence.count({
      where: {
        isApproved: false,
      },
    });

    // Jobs por status
    const jobsByStatus = await prisma.creativeJob.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // Total de jobs em andamento (não concluídos)
    const activeJobs = await prisma.creativeJob.count({
      where: {
        status: { not: 'completed' },
      },
    });

    // Jobs concluídos este mês
    const completedThisMonth = await prisma.creativeJob.count({
      where: {
        status: 'completed',
        completedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Carga de trabalho por membro (jobs ativos)
    const workloadByMember = await prisma.creativeJobAssignee.groupBy({
      by: ['userId'],
      _count: { id: true },
    });

    // Buscar nomes dos membros
    const memberIds = workloadByMember.map(w => w.userId);
    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });

    const memberNameMap: Record<string, string> = {};
    members.forEach(m => {
      memberNameMap[m.id] = m.name || 'Sem nome';
    });

    const workloadData = workloadByMember
      .map(w => ({
        userId: w.userId,
        name: memberNameMap[w.userId] || 'Desconhecido',
        jobs: w._count.id,
      }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 10);

    // Próximas ausências (próximos 30 dias)
    const upcomingAbsences = await prisma.teamAbsence.findMany({
      where: {
        isApproved: true,
        startDate: {
          gte: now,
          lte: addDays(now, 30),
        },
      },
      include: {
        teamMember: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    });

    // Departamentos
    const departments = await prisma.teamMember.groupBy({
      by: ['department'],
      _count: { id: true },
    });

    return NextResponse.json({
      overview: {
        totalMembers,
        configuredMembers,
        activeAbsences,
        pendingAbsences,
        activeJobs,
        completedThisMonth,
      },
      jobsByStatus: jobsByStatus.reduce((acc, j) => {
        acc[j.status] = j._count.id;
        return acc;
      }, {} as Record<string, number>),
      workloadByMember: workloadData,
      upcomingAbsences: upcomingAbsences.map(a => ({
        id: a.id,
        type: a.type,
        startDate: a.startDate,
        endDate: a.endDate,
        reason: a.reason,
        memberName: a.teamMember.user.name,
        memberEmail: a.teamMember.user.email,
      })),
      departments: departments
        .filter(d => d.department)
        .map(d => ({
          name: d.department,
          count: d._count.id,
        })),
    });
  } catch (error) {
    console.error('Erro ao buscar stats do time:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
