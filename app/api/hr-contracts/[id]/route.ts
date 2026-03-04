export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Buscar contrato específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const contract = await prisma.hRContract.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ...contract,
      monthlyValue: contract.monthlyValue.toString(),
    });
  } catch (error) {
    console.error('Erro ao buscar contrato:', error);
    return NextResponse.json({ error: 'Erro ao buscar contrato' }, { status: 500 });
  }
}

// PUT - Atualizar contrato
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();

    // Verifica se o contrato pertence ao usuário
    const existingContract = await prisma.hRContract.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingContract) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Atualiza o contrato
    const updatedContract = await prisma.hRContract.update({
      where: { id: params.id },
      data: {
        contractorName: body.contractorName,
        contractorCPF: body.contractorCPF,
        contractorCNPJ: body.contractorCNPJ || null,
        contractorAddress: body.contractorAddress,
        representativeName: body.representativeName,
        representativeCPF: body.representativeCPF,
        serviceScope: body.serviceScope,
        monthlyValue: body.monthlyValue ? parseFloat(body.monthlyValue) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        duration: body.duration,
        status: body.status,
        signatureMethod: body.signatureMethod,
        signaturePlatform: body.signaturePlatform,
        signedAt: body.signedAt ? new Date(body.signedAt) : undefined,
      },
    });

    return NextResponse.json({
      ...updatedContract,
      monthlyValue: updatedContract.monthlyValue.toString(),
    });
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error);
    return NextResponse.json({ error: 'Erro ao atualizar contrato' }, { status: 500 });
  }
}

// DELETE - Deletar contrato
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verifica se o contrato pertence ao usuário
    const contract = await prisma.hRContract.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Deleta o contrato
    await prisma.hRContract.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Contrato deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar contrato:', error);
    return NextResponse.json({ error: 'Erro ao deletar contrato' }, { status: 500 });
  }
}
