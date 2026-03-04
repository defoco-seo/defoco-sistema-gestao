export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  sendNotificationEmail,
  getProposalApprovedTemplate,
  getProposalRejectedTemplate,
} from '@/lib/notifications';

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await req.json();
    const { response, feedback } = body;

    // Validate response
    if (!['approved', 'rejected', 'change_requested'].includes(response)) {
      return NextResponse.json(
        { error: 'Resposta inválida' },
        { status: 400 }
      );
    }

    // Find proposal by access token
    const proposal = await prisma.proposal.findUnique({
      where: { accessToken: params.token },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // Check if proposal already has a response
    if (proposal.clientResponse) {
      return NextResponse.json(
        { error: 'Esta proposta já foi respondida' },
        { status: 400 }
      );
    }

    // Update proposal with client response
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        clientResponse: response,
        clientFeedback: feedback || null,
        status: response, // Also update the main status
      },
    });

    // Send notification email
    const responseDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const totalFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(proposal.total));

    // Admin email - use owner or user email
    const adminEmail = 'paulo@defoco.com.br';

    if (response === 'approved' && process.env.NOTIF_ID_PROPOSTA_APROVADA) {
      const htmlBody = getProposalApprovedTemplate({
        proposalNumber: proposal.proposalCode || proposal.proposalNumber,
        clientName: proposal.clientName,
        demandName: proposal.demandName || undefined,
        total: totalFormatted,
        responseDate,
      });

      await sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_PROPOSTA_APROVADA,
        recipientEmail: adminEmail,
        subject: `✅ Proposta ${proposal.proposalCode || proposal.proposalNumber} Aprovada - ${proposal.clientName}`,
        htmlBody,
      });
    } else if (response === 'rejected' && process.env.NOTIF_ID_PROPOSTA_REJEITADA) {
      const htmlBody = getProposalRejectedTemplate({
        proposalNumber: proposal.proposalCode || proposal.proposalNumber,
        clientName: proposal.clientName,
        demandName: proposal.demandName || undefined,
        feedback: feedback || undefined,
        responseDate,
      });

      await sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_PROPOSTA_REJEITADA,
        recipientEmail: adminEmail,
        subject: `❌ Proposta ${proposal.proposalCode || proposal.proposalNumber} Recusada - ${proposal.clientName}`,
        htmlBody,
      });
    }

    console.log(`Proposal ${proposal.proposalNumber} received response: ${response}`);
    if (feedback) {
      console.log(`Feedback: ${feedback}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Resposta registrada com sucesso!',
    });
  } catch (error) {
    console.error('Error submitting response:', error);
    return NextResponse.json(
      { error: 'Erro ao processar resposta' },
      { status: 500 }
    );
  }
}
