export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - List all custom pages for user's layout config
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's layout config
    let layoutConfig = await prisma.layoutConfig.findFirst({
      where: { userId: user.id },
      include: {
        customPages: {
          orderBy: { pagePosition: 'asc' },
        },
      },
    });

    // If no layout config exists, create one
    if (!layoutConfig) {
      layoutConfig = await prisma.layoutConfig.create({
        data: {
          userId: user.id,
        },
        include: {
          customPages: true,
        },
      });
    }

    return NextResponse.json(layoutConfig.customPages);
  } catch (error) {
    console.error('Error fetching custom pages:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar páginas customizadas' },
      { status: 500 }
    );
  }
}

// POST - Create new custom page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create layout config
    let layoutConfig = await prisma.layoutConfig.findFirst({
      where: { userId: user.id },
    });

    if (!layoutConfig) {
      layoutConfig = await prisma.layoutConfig.create({
        data: { userId: user.id },
      });
    }

    const { imagePath, pagePosition, active } = await request.json();

    // Validate inputs
    if (!imagePath || !pagePosition) {
      return NextResponse.json(
        { error: 'imagePath e pagePosition são obrigatórios' },
        { status: 400 }
      );
    }

    // Create custom page
    const customPage = await prisma.customPage.create({
      data: {
        layoutConfigId: layoutConfig.id,
        imagePath,
        pagePosition: parseInt(pagePosition),
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json(customPage);
  } catch (error) {
    console.error('Error creating custom page:', error);
    return NextResponse.json(
      { error: 'Erro ao criar página customizada' },
      { status: 500 }
    );
  }
}
