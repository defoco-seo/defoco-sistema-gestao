export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Buscar parcela específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const installment = await prisma.installment.findFirst({
      where: {
        id: params.id,
        proposal: {
          userId: session.user.id,
        },
      },
      include: {
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
            clientName: true,
          },
        },
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
    });

    if (!installment) {
      return NextResponse.json(
        { error: 'Parcela não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...installment,
      amount: installment.amount.toString(),
      payments: installment.payments.map(p => ({
        ...p,
        amount: p.amount.toString(),
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar parcela:', error);
    return NextResponse.json({ error: 'Erro ao buscar parcela' }, { status: 500 });
  }
}

// PUT - Atualizar parcela
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { dueDate, amount, status, description } = body;

    // Verificar se a parcela pertence ao usuário
    const existingInstallment = await prisma.installment.findFirst({
      where: {
        id: params.id,
        proposal: {
          userId: session.user.id,
        },
      },
    });

    if (!existingInstallment) {
      return NextResponse.json(
        { error: 'Parcela não encontrada' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (amount !== undefined) updateData.amount = amount;
    if (status) updateData.status = status;
    if (description !== undefined) updateData.description = description;

    const installment = await prisma.installment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
            clientName: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...installment,
      amount: installment.amount.toString(),
    });
  } catch (error) {
    console.error('Erro ao atualizar parcela:', error);
    return NextResponse.json({ error: 'Erro ao atualizar parcela' }, { status: 500 });
  }
}

// DELETE - Excluir parcela
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se a parcela pertence ao usuário
    const installment = await prisma.installment.findFirst({
      where: {
        id: params.id,
        proposal: {
          userId: session.user.id,
        },
      },
    });

    if (!installment) {
      return NextResponse.json(
        { error: 'Parcela não encontrada' },
        { status: 404 }
      );
    }

    await prisma.installment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Parcela excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir parcela:', error);
    return NextResponse.json({ error: 'Erro ao excluir parcela' }, { status: 500 });
  }
}
