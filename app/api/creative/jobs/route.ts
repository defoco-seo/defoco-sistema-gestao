export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { FINANCIAL_ROLES, hasCreativeAccess } from '@/lib/security';

const STATUS_COLUMNS = ['briefing', 'analysis', 'creation', 'adjustments', 'approval', 'completed'];

// GET - Listar jobs com filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, isActive: true }
    });
    
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');
    
    const where: any = {};
    
    // Filtros
    if (status && STATUS_COLUMNS.includes(status)) {
      where.status = status;
    }
    
    if (assignedTo) {
      // Buscar jobs onde o usuário é responsável principal OU está na lista de assignees
      where.OR = [
        { assignedTo },
        { assignees: { some: { userId: assignedTo } } }
      ];
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { jobNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Determinar se deve incluir dados financeiros da proposta
    const hasFinancialAccess = FINANCIAL_ROLES.includes(user.role || '');
    
    const jobs = await prisma.creativeJob.findMany({
      where,
      include: {
        services: true,
        checklist: {
          orderBy: { order: 'asc' }
        },
        briefings: true,
        assignees: true, // Incluir múltiplos responsáveis
        // SEGURANÇA: Somente incluir dados completos da proposta para quem tem acesso financeiro
        proposal: hasFinancialAccess ? {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
            total: true,
            status: true,
          }
        } : {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
            // NÃO incluir valores financeiros para usuários sem acesso
          }
        },
        _count: {
          select: {
            history: true,
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { deadline: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    // SEGURANÇA: Sanitizar dados financeiros para usuários sem acesso
    const sanitizedJobs = jobs.map(job => ({
      ...job,
      proposal: job.proposal ? {
        ...job.proposal,
        // Converter total para string se existir
        total: hasFinancialAccess && (job.proposal as any).total 
          ? (job.proposal as any).total.toString() 
          : undefined
      } : null
    }));
    
    return NextResponse.json(sanitizedJobs);
  } catch (error) {
    console.error('Erro ao buscar jobs:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar novo job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, isActive: true }
    });
    
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 403 });
    }
    
    const body = await request.json();
    const {
      title,
      clientName,
      clientEmail,
      clientWhatsapp,
      clientCompany,
      notifyClient,
      priority,
      deadline,
      assignedTo,
      assignedName,
      assignees, // Array de {userId, userName, role}
      services,
      internalNotes,
      proposalId,
      briefingType, // Tipo de briefing selecionado
      briefingContent, // Conteúdo do briefing (se preenchido)
    } = body;
    
    if (!title || !clientName) {
      return NextResponse.json({ error: 'Título e nome do cliente são obrigatórios' }, { status: 400 });
    }
    
    // Gerar número sequencial do job
    const year = new Date().getFullYear();
    const lastJob = await prisma.creativeJob.findFirst({
      where: {
        jobNumber: {
          startsWith: `JOB-${year}-`
        }
      },
      orderBy: { jobNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastJob) {
      const lastNumber = parseInt(lastJob.jobNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    const jobNumber = `JOB-${year}-${nextNumber.toString().padStart(4, '0')}`;
    
    // Criar o job
    const job = await prisma.creativeJob.create({
      data: {
        jobNumber,
        title,
        clientName,
        clientEmail,
        clientWhatsapp,
        clientCompany,
        notifyClient: notifyClient || false,
        priority: priority || 'normal',
        deadline: deadline ? new Date(deadline) : null,
        assignedTo,
        assignedName,
        internalNotes,
        proposalId,
        userId: user.id,
        status: 'briefing',
        // Criar serviços vinculados
        services: services?.length ? {
          create: services.map((s: any) => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            quantity: s.quantity || 1,
          }))
        } : undefined,
        // Criar múltiplos responsáveis
        assignees: assignees?.length ? {
          create: assignees.map((a: any) => ({
            userId: a.userId,
            userName: a.userName,
            role: a.role || 'member',
          }))
        } : undefined,
        // Criar briefing se tipo foi selecionado
        briefings: briefingType ? {
          create: {
            briefingType,
            content: JSON.stringify(briefingContent || {}),
            isComplete: !!briefingContent && Object.keys(briefingContent).length > 0,
          }
        } : undefined,
        // Criar histórico inicial
        history: {
          create: {
            userId: user.id,
            action: 'created',
            description: `Job criado por ${user.name || session.user.email}`,
          }
        }
      },
      include: {
        services: true,
        checklist: true,
        briefings: true,
        assignees: true,
        history: true,
      }
    });
    
    return NextResponse.json(job);
  } catch (error) {
    console.error('Erro ao criar job:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
