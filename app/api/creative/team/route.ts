export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar membros da equipe criativa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Buscar usuários que podem ser atribuídos a jobs
    // Inclui todos com role creative, admin ou master, ou com permissões de design
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: ['creative', 'admin', 'master'] } },
          { permissions: { contains: 'creative' } },
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Erro ao buscar equipe:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
