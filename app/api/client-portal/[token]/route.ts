export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Portal do Cliente - busca dados do cliente por token de proposta
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Busca proposta pelo token
    const proposal = await prisma.proposal.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        proposalNumber: true,
        proposalCode: true,
        demandName: true,
        clientName: true,
        clientEmail: true,
        total: true,
        status: true,
        clientResponse: true,
        createdAt: true,
        validUntil: true,
        services: {
          select: {
            id: true,
            quantity: true,
            service: {
              select: {
                title: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Busca jobs vinculados ao cliente (pelo email)
    const jobs = await prisma.creativeJob.findMany({
      where: {
        clientEmail: proposal.clientEmail,
      },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        status: true,
        deadline: true,
        createdAt: true,
        checklist: {
          select: {
            id: true,
            title: true,
            isCompleted: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Busca parcelas vinculadas à proposta
    const installments = await prisma.installment.findMany({
      where: { proposalId: proposal.id },
      select: {
        id: true,
        installmentNumber: true,
        dueDate: true,
        amount: true,
        status: true,
      },
      orderBy: { installmentNumber: 'asc' },
    });

    // Formata resposta
    const clientPortalData = {
      client: {
        name: proposal.clientName,
        email: proposal.clientEmail,
      },
      proposal: {
        number: proposal.proposalCode || proposal.proposalNumber,
        demandName: proposal.demandName,
        total: Number(proposal.total),
        status: proposal.status,
        clientResponse: proposal.clientResponse,
        createdAt: proposal.createdAt,
        validUntil: proposal.validUntil,
        services: proposal.services.map((s: any) => ({
          title: s.service.title,
          description: s.service.description,
          quantity: s.quantity,
        })),
      },
      jobs: jobs.map((job: any) => {
        const totalTasks = job.checklist.length;
        const completedTasks = job.checklist.filter((c: any) => c.isCompleted).length;
        return {
          id: job.id,
          number: job.jobNumber,
          title: job.title,
          status: job.status,
          deadline: job.deadline,
          createdAt: job.createdAt,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          tasks: {
            total: totalTasks,
            completed: completedTasks,
          },
        };
      }),
      financial: {
        installments: installments.map((i: any) => ({
          number: i.installmentNumber,
          dueDate: i.dueDate,
          amount: Number(i.amount),
          status: i.status,
        })),
      },
    };

    return NextResponse.json(clientPortalData);
  } catch (error) {
    console.error('Erro ao buscar dados do portal:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
