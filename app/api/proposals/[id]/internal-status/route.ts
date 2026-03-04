export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

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
    const { internalStatus } = await request.json();

    // Validate internalStatus
    if (!['pending', 'approved', 'rejected'].includes(internalStatus)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Check if proposal exists and belongs to user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const proposal = await prisma.proposal.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // Update internal status
    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { internalStatus },
    });

    return NextResponse.json(updatedProposal);
  } catch (error) {
    console.error('Error updating internal status:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}
