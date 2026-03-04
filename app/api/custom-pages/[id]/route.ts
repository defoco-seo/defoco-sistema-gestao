export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// PATCH - Update custom page
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();

    // Verify ownership
    const customPage = await prisma.customPage.findUnique({
      where: { id },
      include: {
        layoutConfig: {
          include: { user: true },
        },
      },
    });

    if (!customPage) {
      return NextResponse.json(
        { error: 'Página não encontrada' },
        { status: 404 }
      );
    }

    if (customPage.layoutConfig.user.email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update custom page
    const updated = await prisma.customPage.update({
      where: { id },
      data: {
        ...(data.imagePath && { imagePath: data.imagePath }),
        ...(data.pagePosition && { pagePosition: parseInt(data.pagePosition) }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating custom page:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar página' },
      { status: 500 }
    );
  }
}

// DELETE - Delete custom page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify ownership
    const customPage = await prisma.customPage.findUnique({
      where: { id },
      include: {
        layoutConfig: {
          include: { user: true },
        },
      },
    });

    if (!customPage) {
      return NextResponse.json(
        { error: 'Página não encontrada' },
        { status: 404 }
      );
    }

    if (customPage.layoutConfig.user.email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete custom page
    await prisma.customPage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom page:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar página' },
      { status: 500 }
    );
  }
}
