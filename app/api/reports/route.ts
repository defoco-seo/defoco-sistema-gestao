export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // propostas, financeiro, clientes, jobs
    const format = searchParams.get('format'); // excel, json
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    if (!type || !format) {
      return NextResponse.json(
        { error: 'Parâmetros type e format são obrigatórios' },
        { status: 400 }
      );
    }

    let data: any[] = [];
    let filename = '';

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    switch (type) {
      case 'propostas':
        const propostas = await prisma.proposal.findMany({
          where: {
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            ...(status && { status }),
          },
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        data = propostas.map((p) => ({
          'Código': p.proposalCode || '-',
          'Demanda': p.demandName,
          'Cliente': p.clientName,
          'Email Cliente': p.clientEmail,
          'WhatsApp': p.clientWhatsapp || '-',
          'CNPJ': p.clientCNPJ || '-',
          'Status': translateStatus(p.status),
          'Status Interno': p.internalStatus || '-',
          'Subtotal': Number(p.subtotal || 0),
          'Markup (%)': Number(p.markupPercent || 0),
          'Imposto': Number(p.tax || 0),
          'Desconto': Number(p.discountValue || 0),
          'Total': Number(p.total || 0),
          'Criador': p.user?.name || '-',
          'Criado em': formatDate(p.createdAt),
          'Atualizado em': formatDate(p.updatedAt),
        }));
        filename = 'relatorio_propostas';
        break;

      case 'financeiro':
        const installments = await prisma.installment.findMany({
          where: {
            ...(Object.keys(dateFilter).length > 0 && { dueDate: dateFilter }),
            ...(status && { status }),
          },
          include: {
            proposal: { select: { proposalCode: true, demandName: true, clientName: true } },
          },
          orderBy: { dueDate: 'asc' },
        });

        data = installments.map((i: any) => ({
          'Proposta': i.proposal?.proposalCode || '-',
          'Demanda': i.proposal?.demandName || '-',
          'Cliente': i.proposal?.clientName || '-',
          'Parcela': `${i.installmentNumber}/${i.totalInstallments}`,
          'Valor': Number(i.amount || 0),
          'Vencimento': formatDate(i.dueDate),
          'Status': translateInstallmentStatus(i.status),
          'Pago em': i.paidAt ? formatDate(i.paidAt) : '-',
          'Observações': i.notes || '-',
        }));
        filename = 'relatorio_financeiro';
        break;

      case 'clientes':
        const clients = await prisma.cRMClient.findMany({
          where: {
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            ...(status && { status }),
          },
          include: {
            _count: { select: { interactions: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        data = clients.map((c: any) => ({
          'Nome': c.name,
          'Email': c.email || '-',
          'Telefone': c.phone || '-',
          'Empresa': c.company || '-',
          'CNPJ': c.cnpj || '-',
          'Status': translateClientStatus(c.status),
          'Origem': c.source || '-',
          'Valor Proposta': Number(c.proposalValue || 0),
          'Interações': c._count.interactions,
          'Criado em': formatDate(c.createdAt),
          'Último Contato': c.lastContactAt ? formatDate(c.lastContactAt) : '-',
        }));
        filename = 'relatorio_clientes';
        break;

      case 'jobs':
        const jobs = await prisma.creativeJob.findMany({
          where: {
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            ...(status && { status }),
          },
          include: {
            assignees: true,
            briefings: { select: { briefingType: true }, take: 1 },
          },
          orderBy: { createdAt: 'desc' },
        });

        data = jobs.map((j: any) => ({
          'Código': j.jobNumber || '-',
          'Título': j.title,
          'Cliente': j.clientName || '-',
          'Tipo Briefing': j.briefings?.[0]?.briefingType || '-',
          'Status': translateJobStatus(j.status),
          'Prioridade': j.priority || 'normal',
          'Responsáveis': j.assignees?.map((a: any) => a.userName).join(', ') || j.assignedName || '-',
          'Prazo': j.deadline ? formatDate(j.deadline) : '-',
          'Criado em': formatDate(j.createdAt),
          'Atualizado em': formatDate(j.updatedAt),
        }));
        filename = 'relatorio_jobs';
        break;

      default:
        return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 });
    }

    // Adiciona datas ao nome do arquivo
    if (startDate || endDate) {
      const start = startDate ? startDate.split('T')[0] : 'inicio';
      const end = endDate ? endDate.split('T')[0] : 'fim';
      filename += `_${start}_a_${end}`;
    }

    if (format === 'json') {
      return NextResponse.json({ data, count: data.length });
    }

    // Gera Excel
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');

    // Ajusta largura das colunas
    const maxWidth = 30;
    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...data.map((row) => String(row[key] || '').length))),
    }));
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 });
  }
}

// Funções auxiliares
function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviada',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
    expired: 'Expirada',
  };
  return map[status] || status;
}

function translateInstallmentStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Atrasado',
    cancelled: 'Cancelado',
  };
  return map[status] || status;
}

function translateClientStatus(status: string): string {
  const map: Record<string, string> = {
    lead: 'Lead',
    prospect: 'Prospect',
    negotiation: 'Negociação',
    client: 'Cliente',
    inactive: 'Inativo',
  };
  return map[status] || status;
}

function translateJobStatus(status: string): string {
  const map: Record<string, string> = {
    backlog: 'Backlog',
    todo: 'A Fazer',
    in_progress: 'Em Andamento',
    review: 'Revisão',
    done: 'Concluído',
  };
  return map[status] || status;
}
