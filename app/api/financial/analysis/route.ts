export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    // Coletar dados financeiros dos últimos 6 meses
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    
    // Buscar custos fixos ativos
    const fixedCosts = await prisma.fixedCost.findMany({
      where: {
        userId: user.id,
        isActive: true,
        startDate: { lte: now }
      }
    });
    
    // Calcular total de custos fixos mensais
    const totalFixedCostsMonthly = fixedCosts.reduce(
      (sum: number, cost: any) => sum + parseFloat(cost.amount.toString()),
      0
    );
    
    // Agrupar custos por categoria
    const costsByCategory: Record<string, number> = {};
    fixedCosts.forEach(cost => {
      const cat = cost.category;
      costsByCategory[cat] = (costsByCategory[cat] || 0) + parseFloat(cost.amount.toString());
    });
    
    // Buscar pagamentos recebidos nos últimos 6 meses
    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: sixMonthsAgo },
        installment: {
          proposal: { userId: user.id }
        }
      },
      include: {
        installment: {
          include: {
            proposal: { select: { clientName: true } }
          }
        }
      }
    });
    
    // Agrupar receitas por mês
    const revenueByMonth: Record<string, number> = {};
    payments.forEach(payment => {
      const month = format(new Date(payment.paymentDate), 'yyyy-MM');
      revenueByMonth[month] = (revenueByMonth[month] || 0) + parseFloat(payment.amount.toString());
    });
    
    // Buscar parcelas pendentes/vencidas
    const pendingInstallments = await prisma.installment.findMany({
      where: {
        status: { in: ['pending', 'overdue'] },
        proposal: { userId: user.id }
      },
      include: {
        proposal: { select: { clientName: true } },
        payments: true
      }
    });
    
    // Calcular valores a receber
    let totalPending = 0;
    let totalOverdue = 0;
    pendingInstallments.forEach(inst => {
      const paidAmount = inst.payments.reduce((s: number, p: any) => s + parseFloat(p.amount.toString()), 0);
      const remaining = parseFloat(inst.amount.toString()) - paidAmount;
      if (inst.status === 'overdue') {
        totalOverdue += remaining;
      } else {
        totalPending += remaining;
      }
    });
    
    // Buscar propostas aprovadas para projeção
    const approvedProposals = await prisma.proposal.findMany({
      where: {
        userId: user.id,
        internalStatus: 'approved',
        createdAt: { gte: sixMonthsAgo }
      },
      select: { total: true, createdAt: true }
    });
    
    // Preparar dados para a IA
    const financialData = {
      custos_fixos_mensais: totalFixedCostsMonthly,
      custos_por_categoria: costsByCategory,
      detalhes_custos: fixedCosts.map(c => ({
        nome: c.name,
        categoria: c.category,
        valor: parseFloat(c.amount.toString())
      })),
      receitas_por_mes: revenueByMonth,
      total_a_receber: totalPending + totalOverdue,
      valores_em_atraso: totalOverdue,
      valores_pendentes: totalPending,
      propostas_aprovadas: approvedProposals.length,
      valor_total_propostas: approvedProposals.reduce((s: number, p: any) => s + parseFloat(p.total.toString()), 0)
    };
    
    // Chamar a IA para análise
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um consultor financeiro especializado em gestão de pequenas empresas criativas e agências de publicidade no Brasil. Sua função é analisar dados financeiros e fornecer insights acionáveis, recomendações práticas e identificar riscos e oportunidades. Seja direto, profissional e use linguagem acessível. Sempre responda em português brasileiro.

Responda em JSON com a seguinte estrutura:
{
  "resumo_executivo": "Breve resumo da situação financeira (2-3 frases)",
  "saude_financeira": "excelente" | "boa" | "atencao" | "critica",
  "pontos_fortes": ["lista de pontos positivos"],
  "pontos_atencao": ["lista de pontos que precisam atenção"],
  "recomendacoes": [
    {
      "prioridade": "alta" | "media" | "baixa",
      "titulo": "Título da recomendação",
      "descricao": "Descrição detalhada da ação",
      "impacto_esperado": "Impacto esperado da ação"
    }
  ],
  "metricas_chave": {
    "margem_operacional_estimada": "porcentagem",
    "cobertura_custos_fixos": "quantos meses de receita cobrem os custos",
    "taxa_inadimplencia": "porcentagem de valores em atraso"
  },
  "previsao_proximos_meses": "Análise de tendência e previsão"
}

Responda apenas com JSON válido, sem markdown ou formatação adicional.`
          },
          {
            role: 'user',
            content: `Analise os seguintes dados financeiros da minha empresa e forneça insights e recomendações:\n\n${JSON.stringify(financialData, null, 2)}`
          }
        ],
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      console.error('Erro na API de IA:', await response.text());
      return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 });
    }
    
    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);
    
    return NextResponse.json({
      dados_financeiros: financialData,
      analise: analysis
    });
  } catch (error) {
    console.error('Erro na análise financeira:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
