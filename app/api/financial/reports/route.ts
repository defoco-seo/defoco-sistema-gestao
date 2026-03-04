export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, subWeeks, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// POST - Gerar e enviar relatório
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, role: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const body = await request.json();
    const { sendEmail = false } = body;
    
    // Período da semana atual
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    
    // Buscar custos fixos ativos
    const fixedCosts = await prisma.fixedCost.findMany({
      where: {
        userId: user.id,
        isActive: true,
        startDate: { lte: now }
      }
    });
    
    const totalFixedCostsMonthly = fixedCosts.reduce(
      (sum: number, cost: any) => sum + parseFloat(cost.amount.toString()),
      0
    );
    
    // Custos por categoria
    const costsByCategory: Record<string, number> = {};
    fixedCosts.forEach(cost => {
      const cat = cost.category;
      costsByCategory[cat] = (costsByCategory[cat] || 0) + parseFloat(cost.amount.toString());
    });
    
    // Receitas desta semana
    const weekPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: weekStart, lte: weekEnd },
        installment: { proposal: { userId: user.id } }
      }
    });
    const weekRevenue = weekPayments.reduce((s: number, p: any) => s + parseFloat(p.amount.toString()), 0);
    
    // Receitas da semana passada
    const lastWeekPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: lastWeekStart, lte: lastWeekEnd },
        installment: { proposal: { userId: user.id } }
      }
    });
    const lastWeekRevenue = lastWeekPayments.reduce((s: number, p: any) => s + parseFloat(p.amount.toString()), 0);
    
    // Receitas dos últimos 6 meses (para gráfico)
    const sixMonthsAgo = subMonths(now, 6);
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: sixMonthsAgo },
        installment: { proposal: { userId: user.id } }
      }
    });
    
    const revenueByMonth: Record<string, number> = {};
    monthlyPayments.forEach(p => {
      const month = format(new Date(p.paymentDate), 'yyyy-MM');
      revenueByMonth[month] = (revenueByMonth[month] || 0) + parseFloat(p.amount.toString());
    });
    
    // Valores a receber
    const pendingInstallments = await prisma.installment.findMany({
      where: {
        status: { in: ['pending', 'overdue'] },
        proposal: { userId: user.id }
      },
      include: { payments: true }
    });
    
    let totalPending = 0;
    let totalOverdue = 0;
    pendingInstallments.forEach(inst => {
      const paid = inst.payments.reduce((s: number, p: any) => s + parseFloat(p.amount.toString()), 0);
      const remaining = parseFloat(inst.amount.toString()) - paid;
      if (inst.status === 'overdue') totalOverdue += remaining;
      else totalPending += remaining;
    });
    
    // Propostas aprovadas esta semana
    const weekProposals = await prisma.proposal.count({
      where: {
        userId: user.id,
        internalStatus: 'approved',
        updatedAt: { gte: weekStart, lte: weekEnd }
      }
    });
    
    // Novos contratos RH esta semana
    const weekContracts = await prisma.hRContract.count({
      where: {
        userId: user.id,
        createdAt: { gte: weekStart, lte: weekEnd }
      }
    });
    
    // Preparar dados do relatório
    const reportData = {
      periodo: {
        inicio: format(weekStart, 'dd/MM/yyyy', { locale: ptBR }),
        fim: format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })
      },
      custos_fixos: {
        total_mensal: totalFixedCostsMonthly,
        por_categoria: costsByCategory,
        detalhes: fixedCosts.map(c => ({
          nome: c.name,
          categoria: c.category,
          valor: parseFloat(c.amount.toString())
        }))
      },
      receitas: {
        esta_semana: weekRevenue,
        semana_passada: lastWeekRevenue,
        variacao: lastWeekRevenue > 0 
          ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue * 100).toFixed(1)
          : '0',
        por_mes: revenueByMonth
      },
      contas_a_receber: {
        total: totalPending + totalOverdue,
        pendente: totalPending,
        em_atraso: totalOverdue
      },
      atividades_semana: {
        propostas_aprovadas: weekProposals,
        novos_contratos_rh: weekContracts
      }
    };
    
    // Gerar análise da IA
    const aiResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
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
            content: `Você é um consultor financeiro especializado em gestão de agências criativas. Analise o relatório semanal e forneça um resumo executivo com insights acionáveis. Seja conciso e direto. Responda em português brasileiro.

Responda em JSON:
{
  "resumo": "Resumo de 2-3 frases sobre a semana",
  "destaque_positivo": "Principal ponto positivo",
  "ponto_atencao": "Principal ponto que precisa atenção",
  "acao_recomendada": "Uma ação concreta para a próxima semana",
  "saude_financeira": "excelente" | "boa" | "atencao" | "critica"
}

Responda apenas com JSON válido.`
          },
          {
            role: 'user',
            content: `Relatório semanal:\n${JSON.stringify(reportData, null, 2)}`
          }
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });
    
    let aiAnalysis = null;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      aiAnalysis = JSON.parse(aiData.choices[0].message.content);
    }
    
    // Salvar relatório
    const report = await prisma.financialReport.create({
      data: {
        userId: user.id,
        periodStart: weekStart,
        periodEnd: weekEnd,
        reportType: 'weekly',
        reportData: JSON.stringify(reportData),
        aiAnalysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null
      }
    });
    
    // Enviar email se solicitado
    if (sendEmail) {
      const emailHtml = generateReportEmailHtml(reportData, aiAnalysis);
      const recipientEmail = body.email || user.email || 'paulo@defoco.com.br';
      
      try {
        const appUrl = process.env.NEXTAUTH_URL || 'https://defoco.abacusai.app';
        const appName = 'Defoco';
        
        console.log('Enviando relatório para:', recipientEmail);
        
        const emailResponse = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deployment_token: process.env.ABACUSAI_API_KEY,
            app_id: process.env.WEB_APP_ID,
            notification_id: process.env.NOTIF_ID_RELATRIO_FINANCEIRO_SEMANAL,
            subject: `📊 Relatório Financeiro Semanal - ${format(weekStart, 'dd/MM')} a ${format(weekEnd, 'dd/MM/yyyy')}`,
            body: emailHtml,
            is_html: true,
            recipient_email: recipientEmail,
            sender_email: `noreply@${new URL(appUrl).hostname}`,
            sender_alias: appName
          })
        });
        
        const emailResult = await emailResponse.json().catch(() => ({}));
        console.log('Resultado do envio:', emailResponse.status, emailResult);
        
        if (emailResponse.ok) {
          await prisma.financialReport.update({
            where: { id: report.id },
            data: { sentAt: new Date(), sentToEmail: recipientEmail }
          });
        } else {
          console.error('Erro na API de email:', emailResult);
        }
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }
    }
    
    return NextResponse.json({
      report: reportData,
      analysis: aiAnalysis,
      reportId: report.id
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function generateReportEmailHtml(data: any, analysis: any): string {
  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  const getSaudeColor = (saude: string) => {
    switch (saude) {
      case 'excelente': return '#22c55e';
      case 'boa': return '#3b82f6';
      case 'atencao': return '#f59e0b';
      case 'critica': return '#ef4444';
      default: return '#6b7280';
    }
  };
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f88910 0%, #ff6b00 100%); padding: 30px; border-radius: 16px 16px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📊 Relatório Financeiro Semanal</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">${data.periodo.inicio} a ${data.periodo.fim}</p>
      </div>
      
      ${analysis ? `
      <div style="background: white; padding: 20px; border-left: 4px solid ${getSaudeColor(analysis.saude_financeira)};">
        <div style="display: inline-block; background: ${getSaudeColor(analysis.saude_financeira)}20; color: ${getSaudeColor(analysis.saude_financeira)}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          Saúde Financeira: ${analysis.saude_financeira}
        </div>
        <p style="color: #374151; margin: 15px 0 0; line-height: 1.6;">${analysis.resumo}</p>
      </div>
      ` : ''}
      
      <div style="background: white; padding: 20px; margin-top: 2px;">
        <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px; border-bottom: 2px solid #f88910; padding-bottom: 10px;">💰 Receitas da Semana</h2>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1; background: #f0fdf4; padding: 15px; border-radius: 8px;">
            <p style="color: #15803d; margin: 0; font-size: 12px;">Esta Semana</p>
            <p style="color: #166534; margin: 5px 0 0; font-size: 24px; font-weight: bold;">${formatCurrency(data.receitas.esta_semana)}</p>
          </div>
          <div style="flex: 1; background: #f8fafc; padding: 15px; border-radius: 8px;">
            <p style="color: #64748b; margin: 0; font-size: 12px;">Semana Passada</p>
            <p style="color: #334155; margin: 5px 0 0; font-size: 24px; font-weight: bold;">${formatCurrency(data.receitas.semana_passada)}</p>
          </div>
        </div>
        <p style="color: ${parseFloat(data.receitas.variacao) >= 0 ? '#15803d' : '#dc2626'}; margin: 10px 0 0; font-size: 14px;">
          ${parseFloat(data.receitas.variacao) >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(data.receitas.variacao))}% em relação à semana anterior
        </p>
      </div>
      
      <div style="background: white; padding: 20px; margin-top: 2px;">
        <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px; border-bottom: 2px solid #f88910; padding-bottom: 10px;">📝 Custos Fixos Mensais</h2>
        <p style="color: #ef4444; font-size: 28px; font-weight: bold; margin: 0;">${formatCurrency(data.custos_fixos.total_mensal)}</p>
        <div style="margin-top: 15px;">
          ${Object.entries(data.custos_fixos.por_categoria).map(([cat, val]) => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
              <span style="color: #374151; font-weight: 500;">${formatCurrency(val as number)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="background: white; padding: 20px; margin-top: 2px;">
        <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px; border-bottom: 2px solid #f88910; padding-bottom: 10px;">📅 Contas a Receber</h2>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1; background: #fef3c7; padding: 15px; border-radius: 8px;">
            <p style="color: #92400e; margin: 0; font-size: 12px;">Pendente</p>
            <p style="color: #78350f; margin: 5px 0 0; font-size: 20px; font-weight: bold;">${formatCurrency(data.contas_a_receber.pendente)}</p>
          </div>
          <div style="flex: 1; background: #fee2e2; padding: 15px; border-radius: 8px;">
            <p style="color: #991b1b; margin: 0; font-size: 12px;">Em Atraso</p>
            <p style="color: #7f1d1d; margin: 5px 0 0; font-size: 20px; font-weight: bold;">${formatCurrency(data.contas_a_receber.em_atraso)}</p>
          </div>
        </div>
      </div>
      
      ${analysis ? `
      <div style="background: #fffbeb; padding: 20px; margin-top: 2px; border-radius: 0 0 16px 16px;">
        <h2 style="color: #92400e; font-size: 18px; margin: 0 0 15px;">💡 Recomendação da IA</h2>
        <p style="color: #78350f; margin: 0; line-height: 1.6;"><strong>✓ Destaque:</strong> ${analysis.destaque_positivo}</p>
        <p style="color: #78350f; margin: 10px 0; line-height: 1.6;"><strong>! Atenção:</strong> ${analysis.ponto_atencao}</p>
        <p style="color: #78350f; margin: 10px 0 0; line-height: 1.6;"><strong>→ Ação:</strong> ${analysis.acao_recomendada}</p>
      </div>
      ` : ''}
      
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        Gerado automaticamente pelo sistema Defoco Propostas
      </p>
    </div>
  `;
}

// GET - Listar relatórios anteriores
export async function GET(request: NextRequest) {
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
    
    const reports = await prisma.financialReport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12
    });
    
    return NextResponse.json(reports.map(r => ({
      ...r,
      reportData: JSON.parse(r.reportData),
      aiAnalysis: r.aiAnalysis ? JSON.parse(r.aiAnalysis) : null
    })));
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
