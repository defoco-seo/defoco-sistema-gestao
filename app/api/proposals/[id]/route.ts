import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

// Roles que podem ver todas as propostas (admin/financeiro)
const ADMIN_ROLES = ['master', 'admin', 'financeiro'];

// Verifica se usuário tem acesso à proposta
async function checkProposalAccess(proposalId: string, session: any): Promise<{ allowed: boolean; proposal: any | null }> {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true }
  });
  
  if (!user) {
    return { allowed: false, proposal: null };
  }
  
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      services: {
        include: {
          service: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  
  if (!proposal) {
    return { allowed: false, proposal: null };
  }
  
  // Admin roles podem ver todas as propostas
  if (ADMIN_ROLES.includes(user.role || '')) {
    return { allowed: true, proposal };
  }
  
  // Usuários normais só podem ver suas próprias propostas
  if (proposal.userId !== user.id) {
    return { allowed: false, proposal: null };
  }
  
  return { allowed: true, proposal };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { allowed, proposal } = await checkProposalAccess(params.id, session);
    
    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar esta proposta' },
        { status: 403 }
      );
    }

    // Format for JSON response
    const proposalFormatted = {
      ...proposal,
      subtotal: proposal.subtotal.toString(),
      markupPercent: proposal.markupPercent?.toString() ?? null,
      tax: proposal.tax.toString(),
      discountValue: proposal.discountValue?.toString() ?? null,
      total: proposal.total.toString(),
      services: proposal.services.map((ps: any) => ({
        ...ps,
        customPrice: ps.customPrice?.toString() ?? null,
        service: {
          ...ps.service,
          price: ps.service.price.toString(),
        },
      })),
    };

    return NextResponse.json(proposalFormatted);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar proposta' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verifica acesso à proposta
    const { allowed, proposal: existingProposal } = await checkProposalAccess(params.id, session);
    
    if (!existingProposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar esta proposta' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      proposalCode,
      demandName,
      clientName,
      clientEmail,
      clientCNPJ,
      clientAddress,
      responsibleName,
      clientWhatsapp,
      services,
      markupPercent,
      discountType,
      discountValue,
      taxExempt,
      installments,
      installmentDay,
      observations,
      paymentTerms,
      status,
    } = body;

    // Calculate totals
    let subtotal = new Decimal(0);
    for (const serviceItem of services) {
      const service = await prisma.service.findUnique({
        where: { id: serviceItem.serviceId },
      });
      if (!service) continue;

      const price = serviceItem.customPrice
        ? new Decimal(serviceItem.customPrice)
        : service.price;
      const quantity = serviceItem.quantity || 1;
      subtotal = subtotal.plus(price.mul(quantity));
    }

    // Apply markup if exists
    if (markupPercent && parseFloat(markupPercent) > 0) {
      const markupMultiplier = new Decimal(1).plus(new Decimal(markupPercent).div(100));
      subtotal = subtotal.mul(markupMultiplier);
    }

    // Calculate tax (12% over subtotal) - only if not exempt
    const isTaxExempt = taxExempt === true;
    const taxRate = new Decimal(0.12); // 12%
    const tax = isTaxExempt ? new Decimal(0) : subtotal.mul(taxRate);

    let total = subtotal.plus(tax);
    if (discountValue && parseFloat(discountValue) > 0) {
      const discountAmount =
        discountType === 'percentage'
          ? subtotal.mul(new Decimal(discountValue).div(100))
          : new Decimal(discountValue);
      total = total.minus(discountAmount);
    }

    // Get current version to increment
    const currentProposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      select: { version: true },
    });
    const newVersion = (currentProposal?.version ?? 0) + 1;

    // Delete existing services
    await prisma.proposalService.deleteMany({
      where: { proposalId: params.id },
    });

    // Update proposal
    const proposal = await prisma.proposal.update({
      where: { id: params.id },
      data: {
        proposalCode: proposalCode || null,
        demandName: demandName || null,
        clientName,
        clientEmail,
        clientCNPJ: clientCNPJ || null,
        clientAddress: clientAddress || null,
        responsibleName,
        clientWhatsapp,
        subtotal,
        markupPercent: markupPercent ? new Decimal(markupPercent) : null,
        tax,
        taxExempt: isTaxExempt,
        discountType: discountType || null,
        discountValue: discountValue ? new Decimal(discountValue) : null,
        total,
        version: newVersion,
        installments: installments || null,
        installmentDay: installmentDay || null,
        observations: observations || null,
        paymentTerms: paymentTerms || null,
        status: status || 'pending',
        services: {
          create: services.map((serviceItem: any) => ({
            serviceId: serviceItem.serviceId,
            quantity: serviceItem.quantity || 1,
            customPrice: serviceItem.customPrice
              ? new Decimal(serviceItem.customPrice)
              : null,
          })),
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    // Format for JSON response
    const proposalFormatted = {
      ...proposal,
      subtotal: proposal.subtotal.toString(),
      discountValue: proposal.discountValue?.toString() ?? null,
      total: proposal.total.toString(),
      services: proposal.services.map((ps: any) => ({
        ...ps,
        customPrice: ps.customPrice?.toString() ?? null,
        service: {
          ...ps.service,
          price: ps.service.price.toString(),
        },
      })),
    };

    return NextResponse.json(proposalFormatted);
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar proposta' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verifica acesso à proposta (somente donos e admins podem deletar)
    const { allowed, proposal: existingProposal } = await checkProposalAccess(params.id, session);
    
    if (!existingProposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Você não tem permissão para deletar esta proposta' },
        { status: 403 }
      );
    }

    await prisma.proposal.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar proposta' },
      { status: 500 }
    );
  }
}