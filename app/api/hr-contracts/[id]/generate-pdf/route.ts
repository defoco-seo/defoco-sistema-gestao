export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generateHRContractPDF } from '@/lib/hr-contract-generator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Busca o contrato
    const contract = await prisma.hRContract.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Gera o PDF
    const pdfBlob = await generateHRContractPDF({
      contractNumber: contract.contractNumber,
      contractorName: contract.contractorName,
      contractorCPF: contract.contractorCPF,
      contractorCNPJ: contract.contractorCNPJ,
      contractorAddress: contract.contractorAddress,
      representativeName: contract.representativeName,
      representativeCPF: contract.representativeCPF,
      serviceScope: contract.serviceScope,
      monthlyValue: parseFloat(contract.monthlyValue.toString()),
      startDate: contract.startDate,
      duration: contract.duration,
    });

    // Converte Blob para Buffer
    const buffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Nome do arquivo
    const fileName = `Contrato_RH_${contract.contractNumber}_${contract.contractorName.replace(/\s+/g, '_')}.pdf`;

    // Atualiza o contrato com a data de geração
    await prisma.hRContract.update({
      where: { id: params.id },
      data: {
        generatedAt: new Date(),
      },
    });

    // Retorna o PDF como download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF do contrato:', error);
    return NextResponse.json({ error: 'Erro ao gerar PDF do contrato' }, { status: 500 });
  }
}
