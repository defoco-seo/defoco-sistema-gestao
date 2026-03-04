export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar todos os membros da equipe
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todos os usuários com seus dados de TeamMember
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        createdAt: true,
        teamMember: {
          include: {
            absences: {
              where: {
                endDate: { gte: new Date() },
              },
              orderBy: { startDate: 'asc' },
              take: 5,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Buscar contagem de jobs ativos por usuário
    const jobCounts = await prisma.creativeJobAssignee.groupBy({
      by: ['userId'],
      _count: { id: true },
    });

    const jobCountMap: Record<string, number> = {};
    jobCounts.forEach(jc => {
      jobCountMap[jc.userId] = jc._count.id;
    });

    // Combinar dados
    const members = users.map(user => ({
      ...user,
      activeJobs: jobCountMap[user.id] || 0,
    }));

    return NextResponse.json(members);
  } catch (error) {
    console.error('Erro ao buscar membros:', error);
    return NextResponse.json({ error: 'Erro ao buscar membros' }, { status: 500 });
  }
}

// POST - Criar/atualizar dados de TeamMember para um usuário
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin ou master
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!currentUser || !['master', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      jobTitle,
      department,
      skills,
      weeklyHours,
      maxConcurrentJobs,
      phone,
      whatsapp,
      startDate,
      color,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Upsert TeamMember
    const teamMember = await prisma.teamMember.upsert({
      where: { userId },
      update: {
        jobTitle,
        department,
        skills: skills ? JSON.stringify(skills) : null,
        weeklyHours: weeklyHours || 40,
        maxConcurrentJobs: maxConcurrentJobs || 5,
        phone,
        whatsapp,
        startDate: startDate ? new Date(startDate) : undefined,
        color: color || '#f88910',
      },
      create: {
        userId,
        jobTitle,
        department,
        skills: skills ? JSON.stringify(skills) : null,
        weeklyHours: weeklyHours || 40,
        maxConcurrentJobs: maxConcurrentJobs || 5,
        phone,
        whatsapp,
        startDate: startDate ? new Date(startDate) : new Date(),
        color: color || '#f88910',
      },
    });

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Erro ao salvar membro:', error);
    return NextResponse.json({ error: 'Erro ao salvar membro' }, { status: 500 });
  }
}
