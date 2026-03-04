export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { addDays, isPast, isBefore, startOfDay } from 'date-fns';

// GET - Listar alertas do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Gera alertas automáticos antes de buscar
    await generateAutomaticAlerts(userId);

    const alerts = await prisma.alert.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
        ...(category && { category }),
        isDismissed: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.alert.count({
      where: {
        userId,
        isRead: false,
        isDismissed: false,
      },
    });

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH - Marcar alerta como lido/dispensado
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { alertId, action, markAllRead } = body;

    if (markAllRead) {
      await prisma.alert.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    if (!alertId) {
      return NextResponse.json({ error: 'ID do alerta é obrigatório' }, { status: 400 });
    }

    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert || alert.userId !== userId) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    if (action === 'read') {
      await prisma.alert.update({
        where: { id: alertId },
        data: { isRead: true, readAt: new Date() },
      });
    } else if (action === 'dismiss') {
      await prisma.alert.update({
        where: { id: alertId },
        data: { isDismissed: true, dismissedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar alerta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Função para gerar alertas automáticos
async function generateAutomaticAlerts(userId: string) {
  const today = startOfDay(new Date());
  const threeDaysAhead = addDays(today, 3);
  const sevenDaysAhead = addDays(today, 7);

  // 1. Parcelas vencidas
  const overdueInstallments = await prisma.installment.findMany({
    where: {
      status: 'pending',
      dueDate: { lt: today },
    },
    include: {
      proposal: { select: { clientName: true, proposalCode: true } },
    },
  });

  for (const inst of overdueInstallments) {
    const exists = await prisma.alert.findFirst({
      where: {
        userId,
        referenceId: inst.id,
        referenceType: 'installment_overdue',
        createdAt: { gte: addDays(new Date(), -1) }, // Evita duplicatas no mesmo dia
      },
    });

    if (!exists) {
      await prisma.alert.create({
        data: {
          userId,
          title: 'Parcela Vencida',
          message: `A parcela ${inst.installmentNumber} de ${inst.proposal.clientName} (${inst.proposal.proposalCode}) venceu. Valor: R$ ${Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          type: 'error',
          category: 'financial',
          referenceId: inst.id,
          referenceType: 'installment_overdue',
          actionUrl: '/dashboard/financeiro',
        },
      });
    }
  }

  // 2. Parcelas próximas do vencimento (3 dias)
  const upcomingInstallments = await prisma.installment.findMany({
    where: {
      status: 'pending',
      dueDate: { gte: today, lte: threeDaysAhead },
    },
    include: {
      proposal: { select: { clientName: true, proposalCode: true } },
    },
  });

  for (const inst of upcomingInstallments) {
    const exists = await prisma.alert.findFirst({
      where: {
        userId,
        referenceId: inst.id,
        referenceType: 'installment_due_soon',
        createdAt: { gte: addDays(new Date(), -3) },
      },
    });

    if (!exists) {
      await prisma.alert.create({
        data: {
          userId,
          title: 'Parcela Próxima do Vencimento',
          message: `A parcela ${inst.installmentNumber} de ${inst.proposal.clientName} vence em breve. Valor: R$ ${Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          type: 'warning',
          category: 'financial',
          referenceId: inst.id,
          referenceType: 'installment_due_soon',
          actionUrl: '/dashboard/financeiro',
        },
      });
    }
  }

  // 3. Jobs com prazo próximo (7 dias)
  const upcomingJobs = await prisma.creativeJob.findMany({
    where: {
      status: { notIn: ['completed', 'cancelled'] },
      deadline: { gte: today, lte: sevenDaysAhead },
    },
  });

  for (const job of upcomingJobs) {
    const exists = await prisma.alert.findFirst({
      where: {
        userId,
        referenceId: job.id,
        referenceType: 'job_deadline_soon',
        createdAt: { gte: addDays(new Date(), -3) },
      },
    });

    if (!exists) {
      await prisma.alert.create({
        data: {
          userId,
          title: 'Prazo de Job se Aproximando',
          message: `O job "${job.title}" para ${job.clientName} tem prazo se aproximando.`,
          type: 'warning',
          category: 'job',
          referenceId: job.id,
          referenceType: 'job_deadline_soon',
          actionUrl: '/dashboard/criativo',
        },
      });
    }
  }

  // 4. Jobs com prazo vencido
  const overdueJobs = await prisma.creativeJob.findMany({
    where: {
      status: { notIn: ['completed', 'cancelled'] },
      deadline: { lt: today },
    },
  });

  for (const job of overdueJobs) {
    const exists = await prisma.alert.findFirst({
      where: {
        userId,
        referenceId: job.id,
        referenceType: 'job_deadline_overdue',
        createdAt: { gte: addDays(new Date(), -1) },
      },
    });

    if (!exists) {
      await prisma.alert.create({
        data: {
          userId,
          title: 'Job com Prazo Vencido',
          message: `O job "${job.title}" para ${job.clientName} está com o prazo vencido!`,
          type: 'error',
          category: 'job',
          referenceId: job.id,
          referenceType: 'job_deadline_overdue',
          actionUrl: '/dashboard/criativo',
        },
      });
    }
  }
}
