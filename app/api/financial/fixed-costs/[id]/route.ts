export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Buscar custo fixo específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const fixedCost = await prisma.fixedCost.findUnique({
      where: { id: params.id }
    });
    
    if (!fixedCost) {
      return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({
      ...fixedCost,
      amount: fixedCost.amount.toString()
    });
  } catch (error) {
    console.error('Erro ao buscar custo fixo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar custo fixo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, category, description, amount, dueDay, startDate, endDate, isActive } = body;
    
    const existingCost = await prisma.fixedCost.findUnique({
      where: { id: params.id }
    });
    
    if (!existingCost) {
      return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });
    }
    
    const fixedCost = await prisma.fixedCost.update({
      where: { id: params.id },
      data: {
        name: name ?? existingCost.name,
        category: category ?? existingCost.category,
        description: description !== undefined ? description : existingCost.description,
        amount: amount !== undefined ? parseFloat(amount) : existingCost.amount,
        dueDay: dueDay !== undefined ? Math.min(Math.max(parseInt(dueDay), 1), 28) : existingCost.dueDay,
        startDate: startDate ? new Date(startDate) : existingCost.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existingCost.endDate,
        isActive: isActive !== undefined ? isActive : existingCost.isActive
      }
    });
    
    return NextResponse.json({
      ...fixedCost,
      amount: fixedCost.amount.toString()
    });
  } catch (error) {
    console.error('Erro ao atualizar custo fixo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir custo fixo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const existingCost = await prisma.fixedCost.findUnique({
      where: { id: params.id }
    });
    
    if (!existingCost) {
      return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });
    }
    
    // Se está vinculado a um contrato RH, apenas desativar
    if (existingCost.hrContractId) {
      await prisma.fixedCost.update({
        where: { id: params.id },
        data: { isActive: false }
      });
      return NextResponse.json({ message: 'Custo desativado (vinculado a contrato RH)' });
    }
    
    await prisma.fixedCost.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'Custo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir custo fixo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
