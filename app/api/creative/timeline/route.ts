export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, format } from 'date-fns';

// GET - Jobs organizados por timeline
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'month'; // week, month
    const dateParam = searchParams.get('date');
    const assignedTo = searchParams.get('assignedTo');
    
    const baseDate = dateParam ? parseISO(dateParam) : new Date();
    
    let startDate: Date;
    let endDate: Date;
    
    if (view === 'week') {
      startDate = startOfWeek(baseDate, { weekStartsOn: 1 });
      endDate = endOfWeek(baseDate, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(baseDate);
      endDate = endOfMonth(baseDate);
    }
    
    // Filtros
    const where: any = {
      deadline: {
        gte: startDate,
        lte: endDate,
      },
      status: { not: 'completed' }
    };
    
    if (assignedTo) {
      where.assignees = {
        some: { userId: assignedTo }
      };
    }
    
    const jobs = await prisma.creativeJob.findMany({
      where,
      include: {
        assignees: true,
        checklist: true,
        _count: {
          select: {
            checklist: true,
            comments: true,
            attachments: true,
          }
        }
      },
      orderBy: { deadline: 'asc' }
    });
    
    // Organizar por data
    const jobsByDate: Record<string, any[]> = {};
    
    jobs.forEach(job => {
      if (job.deadline) {
        const dateKey = format(job.deadline, 'yyyy-MM-dd');
        if (!jobsByDate[dateKey]) {
          jobsByDate[dateKey] = [];
        }
        
        // Calcular progresso do checklist
        const completedTasks = job.checklist?.filter((c) => c.isCompleted).length || 0;
        const totalTasks = job.checklist?.length || 0;
        
        jobsByDate[dateKey].push({
          id: job.id,
          jobNumber: job.jobNumber,
          title: job.title,
          clientName: job.clientName,
          status: job.status,
          priority: job.priority,
          deadline: job.deadline,
          assignees: job.assignees,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          counts: job._count,
        });
      }
    });
    
    // Jobs atrasados (deadline passado e não completados)
    const overdueJobs = await prisma.creativeJob.findMany({
      where: {
        deadline: { lt: new Date() },
        status: { not: 'completed' },
      },
      include: {
        assignees: true,
      },
      orderBy: { deadline: 'asc' }
    });
    
    // Jobs sem deadline
    const noDeadlineJobs = await prisma.creativeJob.findMany({
      where: {
        deadline: null,
        status: { not: 'completed' },
      },
      include: {
        assignees: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    return NextResponse.json({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      view,
      jobsByDate,
      overdueJobs: overdueJobs.map(job => ({
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        clientName: job.clientName,
        status: job.status,
        priority: job.priority,
        deadline: job.deadline,
        assignees: job.assignees,
      })),
      noDeadlineJobs: noDeadlineJobs.map(job => ({
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        clientName: job.clientName,
        status: job.status,
        priority: job.priority,
        assignees: job.assignees,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar timeline:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
