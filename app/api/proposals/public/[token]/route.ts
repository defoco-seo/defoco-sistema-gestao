import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Validação básica do token
    if (!params.token || params.token.length < 32) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.findUnique({
      where: { accessToken: params.token },
      include: {
        services: {
          include: {
            service: {
              select: {
                id: true,
                title: true,
                description: true,
                price: true,
                // Não expor campos internos do serviço
              }
            },
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // SEGURANÇA: Retornar apenas dados públicos necessários para visualização
    // NÃO expor: userId, accessToken, internalStatus, etc.
    const proposalFormatted = {
      id: proposal.id,
      proposalCode: proposal.proposalCode,
      proposalNumber: proposal.proposalNumber,
      demandName: proposal.demandName,
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      responsibleName: proposal.responsibleName,
      // Dados financeiros necessários para visualização
      subtotal: proposal.subtotal.toString(),
      tax: proposal.tax.toString(),
      discountType: proposal.discountType,
      discountValue: proposal.discountValue?.toString() ?? null,
      total: proposal.total.toString(),
      // Status e validade
      status: proposal.status,
      clientResponse: proposal.clientResponse,
      clientFeedback: proposal.clientFeedback,
      validUntil: proposal.validUntil,
      version: proposal.version,
      // Dados da proposta
      observations: proposal.observations,
      paymentTerms: proposal.paymentTerms,
      installments: proposal.installments,
      createdAt: proposal.createdAt,
      // Serviços (sem dados internos)
      services: proposal.services.map((ps: any) => ({
        id: ps.id,
        quantity: ps.quantity,
        customPrice: ps.customPrice?.toString() ?? null,
        service: {
          id: ps.service.id,
          title: ps.service.title,
          description: ps.service.description,
          price: ps.service.price.toString(),
        },
      })),
    };

    return NextResponse.json(proposalFormatted);
  } catch (error) {
    console.error('Error fetching public proposal:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar proposta' },
      { status: 500 }
    );
  }
}
