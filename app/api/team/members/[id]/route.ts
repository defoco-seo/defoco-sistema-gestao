export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

const ROLES = ['master', 'admin', 'financeiro', 'user'];

// GET - Detalhes de um membro
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        createdAt: true,
        teamMember: {
          include: {
            absences: {
              orderBy: { startDate: 'desc' },
              take: 10,
            },
            workloadHistory: {
              orderBy: { weekStart: 'desc' },
              take: 12,
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar jobs ativos
    const activeJobs = await prisma.creativeJobAssignee.findMany({
      where: { userId: id },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            status: true,
            deadline: true,
            clientName: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...user,
      activeJobs: activeJobs.map(aj => aj.job),
    });
  } catch (error) {
    console.error('Erro ao buscar membro:', error);
    return NextResponse.json({ error: 'Erro ao buscar membro' }, { status: 500 });
  }
}

// PATCH - Atualizar usuário (role, status, nome)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é MASTER (apenas master pode alterar roles e status)
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!currentUser || currentUser.role !== 'master') {
      return NextResponse.json({ error: 'Apenas o Master pode alterar usuários' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, role, isActive } = body;

    // Não permitir alterar o próprio usuário master para evitar lock-out
    if (id === currentUser.id && (role !== 'master' || isActive === false)) {
      return NextResponse.json(
        { error: 'Você não pode remover seu próprio acesso master' },
        { status: 400 }
      );
    }

    // Validar role
    if (role && !ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role inválido' }, { status: 400 });
    }

    // Atualizar usuário
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_USER',
        resourceType: 'User',
        resourceId: id,
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}

// DELETE - Desativar usuário (soft delete) ou remover TeamMember
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é MASTER
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!currentUser || currentUser.role !== 'master') {
      return NextResponse.json({ error: 'Apenas o Master pode remover usuários' }, { status: 403 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'deactivate';

    // Não permitir deletar o próprio usuário
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      );
    }

    if (action === 'remove_team_profile') {
      // Apenas remove o perfil de equipe (TeamMember)
      await prisma.teamMember.delete({
        where: { userId: id },
      }).catch(() => null); // Ignora se não existir

      return NextResponse.json({ success: true, message: 'Perfil de equipe removido' });
    } else {
      // Desativa o usuário (soft delete)
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Registrar log de auditoria
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'DEACTIVATE_USER',
          resourceType: 'User',
          resourceId: id,
        },
      });

      return NextResponse.json({ success: true, message: 'Usuário desativado' });
    }
  } catch (error) {
    console.error('Erro ao deletar membro:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
  }
}
