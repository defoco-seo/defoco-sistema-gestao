export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// POST - Criar job a partir de uma proposta aprovada
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { proposalId, title, assignedTo, assignedName, deadline, priority } = body;
    
    if (!proposalId) {
      return NextResponse.json({ error: 'ID da proposta é obrigatório' }, { status: 400 });
    }
    
    // Buscar a proposta com serviços
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });
    
    if (!proposal) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }
    
    // Verificar se a proposta está aprovada
    if (proposal.internalStatus !== 'approved' && proposal.clientResponse !== 'approved') {
      return NextResponse.json({ error: 'A proposta precisa estar aprovada para criar um job' }, { status: 400 });
    }
    
    // Verificar se já existe job vinculado
    const existingJob = await prisma.creativeJob.findFirst({
      where: { proposalId }
    });
    
    if (existingJob) {
      return NextResponse.json({ 
        error: 'Já existe um job vinculado a esta proposta',
        existingJobId: existingJob.id 
      }, { status: 400 });
    }
    
    // Gerar número do job
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
    
    // Título padrão se não informado
    const jobTitle = title || proposal.demandName || `${proposal.clientName} - ${proposal.proposalCode || proposal.proposalNumber}`;
    
    // Criar o job
    const job = await prisma.creativeJob.create({
      data: {
        jobNumber,
        title: jobTitle,
        clientName: proposal.clientName,
        clientEmail: proposal.clientEmail,
        clientWhatsapp: proposal.clientWhatsapp,
        clientCompany: proposal.clientName,
        notifyClient: false,
        priority: priority || 'normal',
        deadline: deadline ? new Date(deadline) : null,
        assignedTo,
        assignedName,
        userId: user.id,
        proposalId: proposal.id,
        status: 'briefing',
        // Criar serviços vinculados
        services: {
          create: proposal.services.map(ps => ({
            serviceId: ps.serviceId,
            serviceName: ps.service.title,
            quantity: ps.quantity,
          }))
        },
        // Criar histórico inicial
        history: {
          create: {
            userId: user.id,
            action: 'created',
            description: `Job criado a partir da proposta ${proposal.proposalCode || proposal.proposalNumber} por ${user.name || session.user.email}`,
          }
        }
      },
      include: {
        services: true,
        history: true,
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
          }
        }
      }
    });
    
    return NextResponse.json(job);
  } catch (error) {
    console.error('Erro ao criar job a partir da proposta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
