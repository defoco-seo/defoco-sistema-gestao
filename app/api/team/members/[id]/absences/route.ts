export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar ausências de um membro
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Buscar TeamMember pelo userId
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: id },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    }

    const absences = await prisma.teamAbsence.findMany({
      where: { teamMemberId: teamMember.id },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(absences);
  } catch (error) {
    console.error('Erro ao buscar ausências:', error);
    return NextResponse.json({ error: 'Erro ao buscar ausências' }, { status: 500 });
  }
}

// POST - Criar nova ausência
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { type, startDate, endDate, reason } = body;

    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Tipo, data início e data fim são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar ou criar TeamMember
    let teamMember = await prisma.teamMember.findUnique({
      where: { userId: id },
    });

    if (!teamMember) {
      teamMember = await prisma.teamMember.create({
        data: { userId: id },
      });
    }

    // Verificar permissão (admin pode criar para qualquer um, usuário só para si)
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    const isAdmin = currentUser ? ['master', 'admin'].includes(currentUser.role) : false;
    const isSelf = currentUser?.id === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Criar ausência
    const absence = await prisma.teamAbsence.create({
      data: {
        teamMemberId: teamMember.id,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        isApproved: isAdmin, // Admins aprovam automaticamente
        approvedBy: isAdmin && currentUser ? currentUser.id : undefined,
        approvedAt: isAdmin ? new Date() : undefined,
      },
    });

    return NextResponse.json(absence, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar ausência:', error);
    return NextResponse.json({ error: 'Erro ao criar ausência' }, { status: 500 });
  }
}

// DELETE - Remover ausência
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const absenceId = searchParams.get('absenceId');

    if (!absenceId) {
      return NextResponse.json({ error: 'absenceId é obrigatório' }, { status: 400 });
    }

    // Verificar permissão
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!currentUser || !['master', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    await prisma.teamAbsence.delete({
      where: { id: absenceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar ausência:', error);
    return NextResponse.json({ error: 'Erro ao deletar ausência' }, { status: 500 });
  }
}

// PATCH - Aprovar/reprovar ausência
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissão
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!currentUser || !['master', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { absenceId, isApproved } = body;

    if (!absenceId || typeof isApproved !== 'boolean') {
      return NextResponse.json(
        { error: 'absenceId e isApproved são obrigatórios' },
        { status: 400 }
      );
    }

    const absence = await prisma.teamAbsence.update({
      where: { id: absenceId },
      data: {
        isApproved,
        approvedBy: currentUser.id,
        approvedAt: new Date(),
      },
    });

    return NextResponse.json(absence);
  } catch (error) {
    console.error('Erro ao aprovar ausência:', error);
    return NextResponse.json({ error: 'Erro ao aprovar ausência' }, { status: 500 });
  }
}
