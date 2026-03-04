export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { isMasterUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/audit-logs
 * Lista logs de auditoria (somente Master User)
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica se é Master User
    const isMaster = await isMasterUser();
    if (!isMaster) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas o Usuário Master pode acessar os logs de auditoria.' },
        { status: 403 }
      );
    }

    // Parâmetros de filtro
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Filtros
    const where: any = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (userId) where.userId = userId;

    // Busca logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
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
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip
      }),
      prisma.auditLog.count({ where })
    ]);

    // Parse details de JSON
    const logsFormatted = logs.map((log: any) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    return NextResponse.json({
      logs: logsFormatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar logs de auditoria' },
      { status: 500 }
    );
  }
}
