export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar briefings do job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const briefings = await prisma.creativeBriefing.findMany({
      where: { jobId: params.id },
      orderBy: { createdAt: 'asc' }
    });
    
    // Parse o JSON do content
    const parsedBriefings = briefings.map(b => ({
      ...b,
      content: JSON.parse(b.content)
    }));
    
    return NextResponse.json(parsedBriefings);
  } catch (error) {
    console.error('Erro ao buscar briefings:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar/atualizar briefing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const body = await request.json();
    const { briefingType, content, isComplete } = body;
    
    if (!briefingType || !content) {
      return NextResponse.json({ error: 'Tipo e conteúdo são obrigatórios' }, { status: 400 });
    }
    
    // Verificar se já existe briefing desse tipo para o job
    const existingBriefing = await prisma.creativeBriefing.findFirst({
      where: {
        jobId: params.id,
        briefingType,
      }
    });
    
    let briefing;
    if (existingBriefing) {
      // Atualizar existente
      briefing = await prisma.creativeBriefing.update({
        where: { id: existingBriefing.id },
        data: {
          content: JSON.stringify(content),
          isComplete: isComplete ?? existingBriefing.isComplete,
        }
      });
    } else {
      // Criar novo
      briefing = await prisma.creativeBriefing.create({
        data: {
          jobId: params.id,
          briefingType,
          content: JSON.stringify(content),
          isComplete: isComplete ?? false,
        }
      });
    }
    
    // Registrar no histórico
    await prisma.creativeJobHistory.create({
      data: {
        jobId: params.id,
        userId: user.id,
        action: existingBriefing ? 'briefing_updated' : 'briefing_created',
        newValue: briefingType,
        description: `Briefing de ${briefingType} ${existingBriefing ? 'atualizado' : 'criado'} por ${user.name || session.user.email}`,
      }
    });
    
    return NextResponse.json({
      ...briefing,
      content: JSON.parse(briefing.content)
    });
  } catch (error) {
    console.error('Erro ao salvar briefing:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
