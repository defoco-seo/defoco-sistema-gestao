export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// POST - Sincronizar clientes das propostas
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar todas as propostas do usuário
    const proposals = await prisma.proposal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    let created = 0;
    let updated = 0;

    for (const proposal of proposals) {
      // Verificar se já existe cliente com este email
      const existingClient = await prisma.cRMClient.findFirst({
        where: { userId: user.id, email: proposal.clientEmail },
      });

      // Determinar status baseado na proposta
      let status = 'lead';
      if (proposal.status === 'approved' || proposal.internalStatus === 'approved') {
        status = 'active';
      } else if (proposal.status === 'rejected' || proposal.internalStatus === 'rejected') {
        status = 'lost';
      } else if (proposal.status === 'pending') {
        status = 'prospect';
      }

      if (existingClient) {
        // Atualizar se a proposta for mais recente
        if (!existingClient.proposalId || 
            (new Date(proposal.createdAt) > new Date(existingClient.updatedAt))) {
          await prisma.cRMClient.update({
            where: { id: existingClient.id },
            data: {
              name: proposal.clientName,
              phone: proposal.clientWhatsapp,
              company: proposal.clientName,
              cnpj: proposal.clientCNPJ,
              proposalId: proposal.id,
              proposalStatus: proposal.status,
              proposalValue: proposal.total,
              status: existingClient.status === 'active' ? 'active' : status,
            },
          });
          updated++;
        }
      } else {
        // Criar novo cliente
        await prisma.cRMClient.create({
          data: {
            userId: user.id,
            name: proposal.clientName,
            email: proposal.clientEmail,
            phone: proposal.clientWhatsapp,
            company: proposal.clientName,
            cnpj: proposal.clientCNPJ,
            status,
            source: 'proposal',
            proposalId: proposal.id,
            proposalStatus: proposal.status,
            proposalValue: proposal.total,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${created} clientes criados, ${updated} atualizados`,
      created,
      updated,
      total: proposals.length,
    });
  } catch (error) {
    console.error('Erro ao sincronizar propostas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
