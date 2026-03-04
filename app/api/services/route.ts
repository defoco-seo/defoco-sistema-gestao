import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const services = await prisma.service.findMany({
      where: {
        active: true,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: {
        title: 'asc',
      },
    });

    // Convert Decimal to string for JSON serialization
    const servicesFormatted = services.map((service: any) => ({
      ...service,
      price: service.price.toString(),
    }));

    return NextResponse.json(servicesFormatted);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar serviços' },
      { status: 500 }
    );
  }
}