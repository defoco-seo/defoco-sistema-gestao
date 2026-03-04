export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

const ADMIN_ROLES = ['master', 'admin'];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verifica se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Constrói filtros
    const where: any = {};
    
    if (action) {
      where.action = action;
    }
    if (userId) {
      where.userId = userId;
    }
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // Busca logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Busca ações únicas para filtro
    const actions = await prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        actions: actions.map((a: any) => a.action),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Cria um novo log de auditoria
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { action, resourceType, resourceId, details } = body;

    if (!action) {
      return NextResponse.json({ error: 'Ação é obrigatória' }, { status: 400 });
    }

    // Extrai informações do request
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const log = await prisma.auditLog.create({
      data: {
        userId: session?.user?.id || null,
        action,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
