export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isMasterUser, createAuditLog } from '@/lib/auth-helpers';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/users
 * Lista todos os usuários (somente Master User)
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica se é Master User
    const isMaster = await isMasterUser();
    if (!isMaster) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas o Usuário Master pode acessar.' },
        { status: 403 }
      );
    }

    // Busca todos os usuários
    const users = await prisma.user.findMany({
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
      },
      orderBy: [
        { role: 'asc' }, // Master primeiro
        { name: 'asc' }
      ]
    });

    // Parse permissions de JSON para array
    const usersFormatted = users.map((user: any) => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : []
    }));

    return NextResponse.json({ users: usersFormatted });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json(
      { error: 'Erro ao listar usuários' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Cria um novo usuário (somente Master User)
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica se é Master User
    const isMaster = await isMasterUser();
    if (!isMaster) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas o Usuário Master pode criar usuários.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      password,
      role = 'user',
      permissions = [],
      isActive = true,
      forcePasswordChange = true
    } = body;

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado no sistema' },
        { status: 400 }
      );
    }

    // Valida senha
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calcula data de expiração da senha (90 dias)
    const now = new Date();
    const passwordExpiresAt = new Date(now);
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90);

    // Cria o usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role === 'master' ? 'user' : role, // Previne criação de outro master
        permissions: JSON.stringify(permissions),
        isActive,
        forcePasswordChange,
        passwordChangedAt: now,
        passwordExpiresAt
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true
      }
    });

    // Log de auditoria
    await createAuditLog({
      action: 'CREATE_USER',
      resourceType: 'User',
      resourceId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      user: {
        ...newUser,
        permissions: JSON.parse(newUser.permissions || '[]')
      }
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}
