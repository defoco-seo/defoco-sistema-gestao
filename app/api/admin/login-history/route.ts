export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { isMasterUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/login-history
 * Lista histórico de logins (somente Master User)
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica se é Master User
    const isMaster = await isMasterUser();
    if (!isMaster) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas o Usuário Master pode acessar o histórico de logins.' },
        { status: 403 }
      );
    }

    // Parâmetros de filtro
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const success = searchParams.get('success');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Filtros
    const where: any = {};
    if (userId) where.userId = userId;
    if (success !== null && success !== undefined) where.success = success === 'true';

    // Busca histórico
    const [logins, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { loginAt: 'desc' },
        take: limit,
        skip
      }),
      prisma.loginHistory.count({ where })
    ]);

    return NextResponse.json({
      logins,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de logins:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de logins' },
      { status: 500 }
    );
  }
}
