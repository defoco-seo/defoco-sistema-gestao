export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isMasterUser, createAuditLog } from '@/lib/auth-helpers';
import bcrypt from 'bcryptjs';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/admin/users/[id]
 * Busca detalhes de um usuário específico
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = context.params;

    // Verifica se é Master User
    const isMaster = await isMasterUser();
    if (!isMaster) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        twoFactorEnabled: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        passwordChangedAt: true,
        passwordExpiresAt: true,
        forcePasswordChange: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            proposals: true,
            loginHistory: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        ...user,
        permissions: user.permissions ? JSON.parse(user.permissions) : []
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Atualiza um usuário
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = context.params;

    // Verifica se é Master User
    const isMaster = await isMasterUser();
    if (!isMaster) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      permissions,
      isActive,
      forcePasswordChange,
      twoFactorEnabled,
      resetFailedAttempts
    } = body;

    // Verifica se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Previne alteração do role de Master
    if (existingUser.role === 'master' && role && role !== 'master') {
      return NextResponse.json(
        { error: 'Não é possível alterar o role do Usuário Master' },
        { status: 400 }
      );
    }

    // Se está alterando email, verifica se já existe
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email já cadastrado no sistema' },
          { status: 400 }
        );
      }
    }

    // Prepara dados para atualização
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined && existingUser.role !== 'master') updateData.role = role;
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (forcePasswordChange !== undefined) updateData.forcePasswordChange = forcePasswordChange;
    if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = twoFactorEnabled;

    // Se resetar tentativas falhadas
    if (resetFailedAttempts) {
      updateData.failedLoginAttempts = 0;
      updateData.lockedUntil = null;
    }

    // Se trocar senha
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'A senha deve ter no mínimo 8 caracteres' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
      updateData.passwordChangedAt = new Date();
      
      // Atualiza expiração (90 dias)
      const passwordExpiresAt = new Date();
      passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90);
      updateData.passwordExpiresAt = passwordExpiresAt;

      // Adiciona ao histórico de senhas
      if (existingUser.password) {
        const history = existingUser.passwordHistory
          ? JSON.parse(existingUser.passwordHistory)
          : [];
        history.unshift(existingUser.password);
        // Mantém apenas as últimas 5 senhas
        updateData.passwordHistory = JSON.stringify(history.slice(0, 5));
      }
    }

    // Atualiza usuário
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        twoFactorEnabled: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        forcePasswordChange: true,
        updatedAt: true
      }
    });

    // Log de auditoria
    await createAuditLog({
      action: 'UPDATE_USER',
      resourceType: 'User',
      resourceId: id,
      details: { changes: Object.keys(updateData) },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      user: {
        ...updatedUser,
        permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : []
      }
    });
  } catch (error) {

    console.error('Erro ao atualizar usuário:', {
      error,
      message: error instanceof Error ? error.message : error
    });

    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Remove um usuário (não pode remover Master)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = context.params;

    // Verifica se é Master User
    const isMaster = await isMasterUser();
    if (!isMaster) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Verifica se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true, role: true }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Previne exclusão do Master
    if (existingUser.role === 'master') {
      return NextResponse.json(
        { error: 'Não é possível excluir o Usuário Master' },
        { status: 400 }
      );
    }

    // Remove usuário
    await prisma.user.delete({
      where: { id }
    });

    // Log de auditoria
    await createAuditLog({
      action: 'DELETE_USER',
      resourceType: 'User',
      resourceId: id,
      details: { email: existingUser.email },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      message: 'Usuário removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao remover usuário' },
      { status: 500 }
    );
  }
}
