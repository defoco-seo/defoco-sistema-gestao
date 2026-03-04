export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

const STATUS_COLUMNS = ['briefing', 'analysis', 'creation', 'adjustments', 'approval', 'completed'];
const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing Recebido',
  analysis: 'Em Análise',
  creation: 'Em Criação',
  adjustments: 'Em Ajustes',
  approval: 'Aguardando Aprovação',
  completed: 'Finalizado',
};

// GET - Buscar job específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const job = await prisma.creativeJob.findUnique({
      where: { id: params.id },
      include: {
        services: true,
        checklist: {
          orderBy: { order: 'asc' }
        },
        briefings: true,
        assignees: true, // Incluir múltiplos responsáveis
        history: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
            demandName: true,
            total: true,
          }
        }
      }
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(job);
  } catch (error) {
    console.error('Erro ao buscar job:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar job
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const existingJob = await prisma.creativeJob.findUnique({
      where: { id: params.id },
      include: { assignees: true }
    });
    
    if (!existingJob) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }
    
    const body = await request.json();
    const {
      title,
      status,
      priority,
      deadline,
      assignedTo,
      assignedName,
      assignees, // Array de {userId, userName, role}
      internalNotes,
      clientName,
      clientEmail,
      clientWhatsapp,
      clientCompany,
      notifyClient,
    } = body;
    
    const historyEntries: any[] = [];
    
    // Detectar mudanças para histórico
    if (status && status !== existingJob.status && STATUS_COLUMNS.includes(status)) {
      historyEntries.push({
        userId: user.id,
        action: 'status_changed',
        previousValue: existingJob.status,
        newValue: status,
        description: `Status alterado de "${STATUS_LABELS[existingJob.status]}" para "${STATUS_LABELS[status]}" por ${user.name || session.user.email}`,
      });
    }
    
    if (assignedTo !== undefined && assignedTo !== existingJob.assignedTo) {
      historyEntries.push({
        userId: user.id,
        action: 'assigned',
        previousValue: existingJob.assignedName || 'Não atribuído',
        newValue: assignedName || 'Removido',
        description: assignedTo 
          ? `Job atribuído para ${assignedName} por ${user.name || session.user.email}`
          : `Atribuição removida por ${user.name || session.user.email}`,
      });
    }
    
    if (deadline !== undefined) {
      const newDeadline = deadline ? new Date(deadline) : null;
      const oldDeadline = existingJob.deadline;
      if (newDeadline?.getTime() !== oldDeadline?.getTime()) {
        historyEntries.push({
          userId: user.id,
          action: 'deadline_updated',
          previousValue: oldDeadline?.toISOString() || 'Sem prazo',
          newValue: newDeadline?.toISOString() || 'Removido',
          description: `Prazo ${newDeadline ? 'atualizado' : 'removido'} por ${user.name || session.user.email}`,
        });
      }
    }
    
    // Gerenciar múltiplos responsáveis se fornecido
    if (assignees !== undefined) {
      // Remover todos os responsáveis existentes
      await prisma.creativeJobAssignee.deleteMany({
        where: { jobId: params.id }
      });
      
      // Adicionar novos responsáveis
      if (assignees.length > 0) {
        await prisma.creativeJobAssignee.createMany({
          data: assignees.map((a: any) => ({
            jobId: params.id,
            userId: a.userId,
            userName: a.userName,
            role: a.role || 'member',
          }))
        });
        
        // Registrar no histórico
        const assigneeNames = assignees.map((a: any) => a.userName).join(', ');
        historyEntries.push({
          userId: user.id,
          action: 'team_updated',
          newValue: assigneeNames,
          description: `Equipe atualizada: ${assigneeNames} por ${user.name || session.user.email}`,
        });
      }
    }
    
    // Atualizar o job
    const job = await prisma.creativeJob.update({
      where: { id: params.id },
      data: {
        title: title ?? existingJob.title,
        status: status && STATUS_COLUMNS.includes(status) ? status : existingJob.status,
        priority: priority ?? existingJob.priority,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : existingJob.deadline,
        assignedTo: assignedTo !== undefined ? assignedTo : existingJob.assignedTo,
        assignedName: assignedName !== undefined ? assignedName : existingJob.assignedName,
        internalNotes: internalNotes !== undefined ? internalNotes : existingJob.internalNotes,
        clientName: clientName ?? existingJob.clientName,
        clientEmail: clientEmail !== undefined ? clientEmail : existingJob.clientEmail,
        clientWhatsapp: clientWhatsapp !== undefined ? clientWhatsapp : existingJob.clientWhatsapp,
        clientCompany: clientCompany !== undefined ? clientCompany : existingJob.clientCompany,
        notifyClient: notifyClient !== undefined ? notifyClient : existingJob.notifyClient,
        // Atualizar timestamps baseado no status
        startedAt: status === 'creation' && !existingJob.startedAt ? new Date() : existingJob.startedAt,
        completedAt: status === 'completed' && !existingJob.completedAt ? new Date() : existingJob.completedAt,
        // Criar histórico
        history: historyEntries.length > 0 ? {
          create: historyEntries
        } : undefined
      },
      include: {
        services: true,
        checklist: true,
        briefings: true,
        assignees: true,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        }
      }
    });
    
    return NextResponse.json(job);
  } catch (error) {
    console.error('Erro ao atualizar job:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Apenas admin/master pode deletar
    if (!['admin', 'master'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }
    
    await prisma.creativeJob.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'Job excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir job:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
