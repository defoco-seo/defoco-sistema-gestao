export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// POST - Gerar parcelas automaticamente a partir de uma proposta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { proposalId, numberOfInstallments, firstDueDate, installmentDay } = body;

    // Validações
    if (!proposalId || !numberOfInstallments || !firstDueDate) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Verificar se a proposta pertence ao usuário
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        userId: session.user.id,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se já existem parcelas para esta proposta
    const existingInstallments = await prisma.installment.count({
      where: { proposalId },
    });

    if (existingInstallments > 0) {
      return NextResponse.json(
        { error: 'Já existem parcelas geradas para esta proposta' },
        { status: 400 }
      );
    }

    // Calcular valor de cada parcela
    const totalAmount = Number(proposal.total);
    const installmentAmount = totalAmount / numberOfInstallments;

    // Gerar parcelas
    const installments = [];
    let currentDueDate = new Date(firstDueDate);

    for (let i = 1; i <= numberOfInstallments; i++) {
      // Se installmentDay foi fornecido, usar esse dia
      if (installmentDay) {
        currentDueDate.setDate(installmentDay);
      }

      installments.push({
        proposalId,
        installmentNumber: i,
        dueDate: new Date(currentDueDate),
        amount: new Decimal(installmentAmount.toFixed(2)),
        description: `Parcela ${i}/${numberOfInstallments}`,
        status: 'pending',
      });

      // Próximo mês
      currentDueDate.setMonth(currentDueDate.getMonth() + 1);
    }

    // Criar todas as parcelas
    const created = await prisma.installment.createMany({
      data: installments,
    });

    // Buscar as parcelas criadas para retornar
    const createdInstallments = await prisma.installment.findMany({
      where: { proposalId },
      orderBy: { installmentNumber: 'asc' },
    });

    return NextResponse.json({
      message: `${created.count} parcelas criadas com sucesso`,
      installments: createdInstallments.map(inst => ({
        ...inst,
        amount: inst.amount.toString(),
      })),
    });
  } catch (error) {
    console.error('Erro ao gerar parcelas:', error);
    return NextResponse.json({ error: 'Erro ao gerar parcelas' }, { status: 500 });
  }
}
