export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// POST - Registrar um pagamento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { installmentId, amount, paymentDate, paymentMethod, notes, receipt } = body;

    // Validações
    if (!installmentId || !amount || !paymentDate) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Verificar se a parcela existe e pertence ao usuário
    const installment = await prisma.installment.findFirst({
      where: {
        id: installmentId,
        proposal: {
          userId: session.user.id,
        },
      },
      include: {
        payments: true,
      },
    });

    if (!installment) {
      return NextResponse.json(
        { error: 'Parcela não encontrada' },
        { status: 404 }
      );
    }

    // Calcular total já pago
    const totalPaid = installment.payments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    );
    const remaining = Number(installment.amount) - totalPaid;

    // Verificar se o pagamento não excede o valor restante
    if (Number(amount) > remaining) {
      return NextResponse.json(
        { error: `Valor excede o saldo restante de R$ ${remaining.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Criar pagamento
    const payment = await prisma.payment.create({
      data: {
        installmentId,
        amount,
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        receipt: receipt || null,
      },
    });

    // Atualizar status da parcela
    const newTotalPaid = totalPaid + Number(amount);
    const newStatus = newTotalPaid >= Number(installment.amount) ? 'paid' : 'pending';

    await prisma.installment.update({
      where: { id: installmentId },
      data: { status: newStatus },
    });

    return NextResponse.json({
      ...payment,
      amount: payment.amount.toString(),
    });
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 });
  }
}
