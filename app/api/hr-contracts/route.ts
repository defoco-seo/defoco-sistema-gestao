export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar todos os contratos do usuário
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const contracts = await prisma.hRContract.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Converte Decimal para string para JSON
    const formattedContracts = contracts.map((contract: any) => ({
      ...contract,
      monthlyValue: contract.monthlyValue.toString(),
    }));

    return NextResponse.json(formattedContracts);
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 });
  }
}

// POST - Criar novo contrato
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      contractorName,
      contractorCPF,
      contractorCNPJ,
      contractorAddress,
      representativeName,
      representativeCPF,
      serviceScope,
      monthlyValue,
      startDate,
      duration,
    } = body;

    // Validação de campos obrigatórios
    if (
      !contractorName ||
      !contractorCPF ||
      !contractorAddress ||
      !representativeName ||
      !representativeCPF ||
      !serviceScope ||
      !monthlyValue ||
      !startDate
    ) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Gera número único do contrato
    const currentYear = new Date().getFullYear();
    const lastContract = await prisma.hRContract.findFirst({
      where: {
        contractNumber: {
          startsWith: `CONT-${currentYear}-`,
        },
      },
      orderBy: {
        contractNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastContract) {
      const lastNumber = parseInt(lastContract.contractNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const contractNumber = `CONT-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    // Cria o contrato
    const contract = await prisma.hRContract.create({
      data: {
        contractNumber,
        userId: session.user.id,
        contractorName,
        contractorCPF,
        contractorCNPJ: contractorCNPJ || null,
        contractorAddress,
        representativeName,
        representativeCPF,
        serviceScope,
        monthlyValue: parseFloat(monthlyValue),
        startDate: new Date(startDate),
        duration: duration || 12,
        status: 'active',
      },
    });

    // Criar custo fixo automaticamente vinculado ao contrato
    const contractStartDate = new Date(startDate);
    const contractEndDate = new Date(contractStartDate);
    contractEndDate.setMonth(contractEndDate.getMonth() + (duration || 12));

    await prisma.fixedCost.create({
      data: {
        userId: session.user.id,
        name: `Salário - ${contractorName}`,
        category: 'salario',
        description: `Contrato RH: ${contractNumber} - ${serviceScope || 'Prestação de serviços'}`,
        amount: parseFloat(monthlyValue),
        startDate: contractStartDate,
        endDate: contractEndDate,
        hrContractId: contract.id,
        isActive: true
      }
    });

    return NextResponse.json(
      {
        ...contract,
        monthlyValue: contract.monthlyValue.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar contrato:', error);
    return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 });
  }
}
