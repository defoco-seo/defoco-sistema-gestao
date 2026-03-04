export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar custos fixos
export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const category = searchParams.get('category');
    
    const where: any = { userId: user.id };
    
    if (activeOnly) {
      where.isActive = true;
    }
    
    if (category) {
      where.category = category;
    }
    
    const fixedCosts = await prisma.fixedCost.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    // Converter Decimal para string
    const formattedCosts = fixedCosts.map(cost => ({
      ...cost,
      amount: cost.amount.toString()
    }));
    
    return NextResponse.json(formattedCosts);
  } catch (error) {
    console.error('Erro ao buscar custos fixos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar custo fixo
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
    
    const body = await request.json();
    const { name, category, description, amount, dueDay, startDate, endDate, hrContractId } = body;
    
    if (!name || !category || !amount || !startDate) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }
    
    const fixedCost = await prisma.fixedCost.create({
      data: {
        userId: user.id,
        name,
        category,
        description,
        amount: parseFloat(amount),
        dueDay: dueDay ? Math.min(Math.max(parseInt(dueDay), 1), 28) : 10, // Entre 1 e 28
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        hrContractId: hrContractId || null,
        isActive: true
      }
    });
    
    return NextResponse.json({
      ...fixedCost,
      amount: fixedCost.amount.toString()
    });
  } catch (error) {
    console.error('Erro ao criar custo fixo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
