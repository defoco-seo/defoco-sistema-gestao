export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Buscar configuração atual de imposto e histórico
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar configuração ativa atual
    const currentConfig = await prisma.taxConfig.findFirst({
      where: {
        isActive: true,
        effectiveUntil: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    // Buscar histórico de alterações (últimas 20)
    const history = await prisma.taxConfig.findMany({
      orderBy: { effectiveFrom: 'desc' },
      take: 20,
    });

    // Se não houver configuração, retornar padrão de 12%
    const activeTaxPercent = currentConfig 
      ? parseFloat(currentConfig.taxPercent.toString())
      : 12.00;

    return NextResponse.json({
      currentConfig: currentConfig ? {
        id: currentConfig.id,
        taxPercent: activeTaxPercent,
        description: currentConfig.description,
        effectiveFrom: currentConfig.effectiveFrom,
        isActive: currentConfig.isActive,
      } : {
        id: null,
        taxPercent: 12.00,
        description: 'Configuração padrão',
        effectiveFrom: new Date(),
        isActive: true,
      },
      history: history.map(h => ({
        id: h.id,
        taxPercent: parseFloat(h.taxPercent.toString()),
        description: h.description,
        effectiveFrom: h.effectiveFrom,
        effectiveUntil: h.effectiveUntil,
        isActive: h.isActive,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar configuração de imposto:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    );
  }
}

// POST - Criar nova configuração de imposto
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

    const body = await request.json();
    const { taxPercent, description, effectiveFrom } = body;

    // Validação
    if (taxPercent === undefined || taxPercent === null) {
      return NextResponse.json(
        { error: 'Percentual do imposto é obrigatório' },
        { status: 400 }
      );
    }

    const parsedTaxPercent = parseFloat(taxPercent);
    if (isNaN(parsedTaxPercent) || parsedTaxPercent < 0 || parsedTaxPercent > 100) {
      return NextResponse.json(
        { error: 'Percentual do imposto deve estar entre 0 e 100' },
        { status: 400 }
      );
    }

    const effectiveDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

    // Desativar configuração atual (se existir)
    await prisma.taxConfig.updateMany({
      where: {
        isActive: true,
        effectiveUntil: null,
      },
      data: {
        isActive: false,
        effectiveUntil: effectiveDate,
      },
    });

    // Criar nova configuração
    const newConfig = await prisma.taxConfig.create({
      data: {
        userId: user.id,
        taxPercent: parsedTaxPercent,
        description: description || `Alteração para ${parsedTaxPercent}%`,
        effectiveFrom: effectiveDate,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        id: newConfig.id,
        taxPercent: parseFloat(newConfig.taxPercent.toString()),
        description: newConfig.description,
        effectiveFrom: newConfig.effectiveFrom,
        isActive: newConfig.isActive,
      },
    });
  } catch (error) {
    console.error('Erro ao criar configuração de imposto:', error);
    return NextResponse.json(
      { error: 'Erro ao criar configuração' },
      { status: 500 }
    );
  }
}
