export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar histórico do job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const history = await prisma.creativeJobHistory.findMany({
      where: { jobId: params.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Adicionar nota/comentário ao histórico
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
    const { note } = body;
    
    if (!note) {
      return NextResponse.json({ error: 'Nota é obrigatória' }, { status: 400 });
    }
    
    const historyEntry = await prisma.creativeJobHistory.create({
      data: {
        jobId: params.id,
        userId: user.id,
        action: 'note_added',
        description: `Nota adicionada por ${user.name || session.user.email}: ${note}`,
      }
    });
    
    return NextResponse.json(historyEntry);
  } catch (error) {
    console.error('Erro ao adicionar nota:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
