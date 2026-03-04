export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generateContractPDF } from '@/lib/contract-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Parse request body for contract-specific data (if provided)
    let contractData = null;
    try {
      contractData = await request.json();
    } catch {
      // No body provided, this is a re-download request
      contractData = null;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find proposal with services
    const proposal = await prisma.proposal.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        services: {
          include: {
            service: true,
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

    // Get user's layout config
    const layoutConfig = await prisma.layoutConfig.findFirst({
      where: { userId: user.id },
    });

    // If contract data is provided, update the proposal with contract fields
    if (contractData) {
      await prisma.proposal.update({
        where: { id },
        data: {
          // Dados do representante legal
          representativeName: contractData.representativeName,
          representativeNationality: contractData.representativeNationality,
          representativeMaritalStatus: contractData.representativeMaritalStatus,
          representativeProfession: contractData.representativeProfession,
          representativeCPF: contractData.representativeCPF,
          representativeRG: contractData.representativeRG,
          // Dados do contrato
          contractForumCity: contractData.contractForumCity,
          contractForumState: contractData.contractForumState,
          contractSignatureDate: contractData.contractSignatureDate ? new Date(contractData.contractSignatureDate) : null,
          contractSignatureMethod: contractData.contractSignatureMethod,
          contractSignaturePlatform: contractData.contractSignaturePlatform,
          contractEmailForSignature: contractData.contractEmailForSignature,
          contractResponsibleUser: user.email,
          contractGenerated: true,
          contractGeneratedAt: new Date(),
        },
      });

      // Refetch proposal with updated data
      const updatedProposal = await prisma.proposal.findFirst({
        where: { id },
        include: {
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      // Generate contract PDF with updated proposal data
      const pdfBlob = await generateContractPDF({
        proposal: updatedProposal!,
        layoutConfig,
      });

      // Create filename
      const clientName = (updatedProposal?.clientName || 'Cliente').replace(/\s+/g, '_');
      const proposalCode = updatedProposal?.proposalCode || updatedProposal?.proposalNumber || 'CODIGO';
      const date = new Date().toISOString().split('T')[0];
      const filename = `Contrato_${clientName}_${proposalCode}_${date}.pdf`;

      // Return PDF as download
      return new NextResponse(pdfBlob, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      // Re-download existing contract (no updates)
      const pdfBlob = await generateContractPDF({
        proposal,
        layoutConfig,
      });

      // Create filename
      const clientName = (proposal?.clientName || 'Cliente').replace(/\s+/g, '_');
      const proposalCode = proposal?.proposalCode || proposal?.proposalNumber || 'CODIGO';
      const date = new Date().toISOString().split('T')[0];
      const filename = `Contrato_${clientName}_${proposalCode}_${date}.pdf`;

      // Return PDF as download
      return new NextResponse(pdfBlob, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Error generating contract:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar contrato' },
      { status: 500 }
    );
  }
}
