import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generateProposalPDF } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

// Roles que podem acessar todas as propostas
const ADMIN_ROLES = ['master', 'admin', 'financeiro'];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    // Buscar proposta completa do banco de dados
    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    // SEGURANÇA: Verificar se o usuário é dono da proposta ou admin
    const isAdmin = ADMIN_ROLES.includes(user.role || '');
    if (proposal.userId !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar esta proposta' },
        { status: 403 }
      );
    }

    console.log('[API] Generating PDF for proposal:', proposal.id);
    console.log('[API] User ID:', proposal.userId);

    // Gerar PDF (retorna o blob do PDF)
    const pdfBlob = await generateProposalPDF(proposal);

    // Determinar o nome do arquivo
    const version = proposal.version ? `_v${proposal.version}` : '';
    const filename = `${proposal.proposalCode || proposal.proposalNumber}${version}_proposta-defoco.pdf`;

    // Retornar o PDF como resposta
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[API] Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
