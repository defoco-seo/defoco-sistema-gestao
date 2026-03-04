export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

// GET - Listar metas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const goals = await prisma.goal.findMany({
      where: {
        OR: [
          { userId },
          { isPublic: true },
        ],
        ...(status && { status }),
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcula progresso atual para cada meta
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        let currentValue = 0;

        // Calcula valor atual baseado no tipo
        switch (goal.type) {
          case 'revenue':
            const revenueResult = await prisma.proposal.aggregate({
              where: {
                status: 'approved',
                createdAt: { gte: goal.startDate, lte: goal.endDate },
              },
              _sum: { total: true },
            });
            currentValue = Number(revenueResult._sum.total || 0);
            break;

          case 'proposals':
            currentValue = await prisma.proposal.count({
              where: {
                createdAt: { gte: goal.startDate, lte: goal.endDate },
              },
            });
            break;

          case 'proposals_approved':
            currentValue = await prisma.proposal.count({
              where: {
                status: 'approved',
                createdAt: { gte: goal.startDate, lte: goal.endDate },
              },
            });
            break;

          case 'jobs':
            currentValue = await prisma.creativeJob.count({
              where: {
                status: 'completed',
                completedAt: { gte: goal.startDate, lte: goal.endDate },
              },
            });
            break;

          case 'clients':
            currentValue = await prisma.cRMClient.count({
              where: {
                status: 'client',
                createdAt: { gte: goal.startDate, lte: goal.endDate },
              },
            });
            break;

          case 'conversion':
            const totalProposals = await prisma.proposal.count({
              where: {
                createdAt: { gte: goal.startDate, lte: goal.endDate },
              },
            });
            const approvedProposals = await prisma.proposal.count({
              where: {
                status: 'approved',
                createdAt: { gte: goal.startDate, lte: goal.endDate },
              },
            });
            currentValue = totalProposals > 0 ? (approvedProposals / totalProposals) * 100 : 0;
            break;
        }

        const targetValue = Number(goal.targetValue);
        const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
        const isAchieved = currentValue >= targetValue;

        return {
          ...goal,
          targetValue: Number(goal.targetValue),
          currentValue,
          progress: Math.round(progress * 10) / 10,
          isAchieved,
        };
      })
    );

    return NextResponse.json(goalsWithProgress);
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar meta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { title, description, type, targetValue, period, startDate, endDate, isPublic } = body;

    if (!title || !type || !targetValue || !period) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Calcula datas baseado no período
    let finalStartDate = startDate ? new Date(startDate) : new Date();
    let finalEndDate = endDate ? new Date(endDate) : new Date();

    if (!startDate || !endDate) {
      switch (period) {
        case 'monthly':
          finalStartDate = startOfMonth(new Date());
          finalEndDate = endOfMonth(new Date());
          break;
        case 'quarterly':
          finalStartDate = startOfQuarter(new Date());
          finalEndDate = endOfQuarter(new Date());
          break;
        case 'yearly':
          finalStartDate = startOfYear(new Date());
          finalEndDate = endOfYear(new Date());
          break;
      }
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        title,
        description,
        type,
        targetValue,
        period,
        startDate: finalStartDate,
        endDate: finalEndDate,
        isPublic: isPublic || false,
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir meta
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da meta é obrigatório' }, { status: 400 });
    }

    // Verifica se a meta pertence ao usuário
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir meta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
