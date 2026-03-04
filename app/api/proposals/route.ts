import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

function generateProposalNumber() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 9999) + 1;
  return `${year}-${String(randomNum).padStart(4, '0')}`;
}

async function generateProposalCode() {
  // Get the last proposal code that starts with "PD"
  const lastProposal = await prisma.proposal.findFirst({
    where: {
      proposalCode: {
        startsWith: 'PD',
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      proposalCode: true,
    },
  });

  let nextNumber = 1;

  if (lastProposal?.proposalCode) {
    // Extract the number from the last code (e.g., "PD00001" -> 1)
    const match = lastProposal.proposalCode.match(/^PD(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format: PD00001, PD00002, etc.
  return `PD${String(nextNumber).padStart(5, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const proposals = await prisma.proposal.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { clientName: { contains: search, mode: 'insensitive' } },
                { proposalNumber: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert Decimal fields to strings for JSON serialization
    const proposalsFormatted = proposals.map((proposal: any) => ({
      ...proposal,
      subtotal: proposal.subtotal.toString(),
      markupPercent: proposal.markupPercent?.toString() ?? null,
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
    }));

    return NextResponse.json(proposalsFormatted);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar propostas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      proposalCode,
      demandName,
      coverImage,
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
    } = body;

    // Validation
    if (!clientName || !clientEmail || !responsibleName || !clientWhatsapp) {
      return NextResponse.json(
        { error: 'Todos os campos do cliente são obrigatórios' },
        { status: 400 }
      );
    }

    if (!services || services.length === 0) {
      return NextResponse.json(
        { error: 'Selecione pelo menos um serviço' },
        { status: 400 }
      );
    }

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
    let discountAmount = new Decimal(0);

    if (discountValue && parseFloat(discountValue) > 0) {
      if (discountType === 'percentage') {
        discountAmount = subtotal.mul(new Decimal(discountValue).div(100));
      } else {
        discountAmount = new Decimal(discountValue);
      }
      total = total.minus(discountAmount);
    }

    // Generate unique proposal number
    let proposalNumber = generateProposalNumber();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.proposal.findUnique({
        where: { proposalNumber },
      });
      if (!existing) break;
      proposalNumber = generateProposalNumber();
      attempts++;
    }

    // Generate proposal code if not provided
    let finalProposalCode = proposalCode;
    if (!finalProposalCode || finalProposalCode.trim() === '') {
      finalProposalCode = await generateProposalCode();
    }

    // Calculate valid until date (60 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 60);

    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        proposalNumber,
        proposalCode: finalProposalCode,
        demandName: demandName || null,
        coverImage: coverImage || null,
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
        installments: installments || null,
        installmentDay: installmentDay || null,
        observations: observations || null,
        paymentTerms: paymentTerms || null,
        validUntil,
        userId: session.user.id,
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
      markupPercent: proposal.markupPercent?.toString() ?? null,
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

    return NextResponse.json(proposalFormatted, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { error: 'Erro ao criar proposta' },
      { status: 500 }
    );
  }
}