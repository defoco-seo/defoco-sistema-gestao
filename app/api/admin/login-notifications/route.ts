export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/login-notifications
 * Busca notificações de login recentes para o Master User
 * Retorna os últimos 10 logins no sistema
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verifica se é Master User
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (user?.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Busca os últimos 10 logins de qualquer usuário
    const recentLogins = await prisma.loginHistory.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { loginAt: 'desc' },
      take: 10
    });

    return NextResponse.json({ logins: recentLogins });
  } catch (error) {
    console.error('Erro ao buscar notificações de login:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 }
    );
  }
}
