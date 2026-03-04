export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Busca configuração de layout do usuário
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let config = await prisma.layoutConfig.findFirst({
      where: { userId: session.user.id },
    });

    // Se não existe configuração, cria uma com valores padrão
    if (!config) {
      config = await prisma.layoutConfig.create({
        data: {
          userId: session.user.id,
          footerText1: 'Defoco - Design de Resultados | Av. Paulista, 1471 - CONJ 275, CEP: 01.311-927 - Bela Vista',
          footerText2: 'Tel: (11) 97251-5822 | Fone: (11) 2452-1305 | defoco@defoco.com.br',
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('[API] Error fetching layout config:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

// PUT - Atualiza configuração de layout
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();

    // Remove campos que não devem ser atualizados
    const { id, userId, createdAt, updatedAt, ...updateData } = data;

    // Busca configuração existente
    let config = await prisma.layoutConfig.findFirst({
      where: { userId: session.user.id },
    });

    if (config) {
      // Atualiza configuração existente
      config = await prisma.layoutConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    } else {
      // Cria nova configuração
      config = await prisma.layoutConfig.create({
        data: {
          ...updateData,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('[API] Error updating layout config:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
}
