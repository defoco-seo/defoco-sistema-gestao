export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

// GET - Recuperar ou gerar token de calendário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, calendarToken: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    // Se já tem token, retornar
    if (user.calendarToken) {
      return NextResponse.json({ token: user.calendarToken });
    }
    
    // Gerar novo token
    const token = crypto.randomBytes(32).toString('hex');
    
    await prisma.user.update({
      where: { id: user.id },
      data: { calendarToken: token }
    });
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Erro ao obter token de calendário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Regenerar token (invalidar antigo)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    // Gerar novo token
    const token = crypto.randomBytes(32).toString('hex');
    
    await prisma.user.update({
      where: { id: user.id },
      data: { calendarToken: token }
    });
    
    return NextResponse.json({ token, message: 'Token regenerado com sucesso' });
  } catch (error) {
    console.error('Erro ao regenerar token:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
