export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format, addDays, addMonths, setDate, isBefore, isAfter } from 'date-fns';

// Esta rota é pública para permitir assinatura pelo Apple Calendar
// Mas usa um token único por usuário para segurança
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return new NextResponse('Token não fornecido', { status: 401 });
    }
    
    // Buscar usuário pelo token de calendário
    const user = await prisma.user.findFirst({
      where: { calendarToken: token }
    });
    
    if (!user) {
      return new NextResponse('Token inválido', { status: 401 });
    }
    
    const now = new Date();
    const formatDateICS = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
    
    // ==========================================
    // 1. PARCELAS (Installments)
    // ==========================================
    const installments = await prisma.installment.findMany({
      where: {
        status: { in: ['pending', 'overdue'] },
        proposal: {
          userId: user.id
        }
      },
      include: {
        proposal: {
          select: {
            id: true,
            proposalCode: true,
            proposalNumber: true,
            demandName: true,
            clientName: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    const installmentEvents = installments.map((inst) => {
      const dueDate = new Date(inst.dueDate);
      const amount = parseFloat(inst.amount.toString());
      const clientName = inst.proposal.clientName;
      const proposalCode = inst.proposal.proposalCode || inst.proposal.proposalNumber;
      const demandName = inst.proposal.demandName || '';
      
      const summary = `💰 Vencimento: ${clientName} - R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const description = [
        `Parcela ${inst.installmentNumber}`,
        `Cliente: ${clientName}`,
        `Proposta: ${proposalCode}`,
        demandName ? `Demanda: ${demandName}` : '',
        `Valor: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        inst.description || ''
      ].filter(Boolean).join('\\n');
      
      const uid = `defoco-${inst.id}@defoco.com.br`;
      const uidFollowup = `defoco-followup-${inst.id}@defoco.com.br`;
      
      // Evento principal - dia do vencimento
      const mainEvent = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatDateICS(now)}`,
        `DTSTART;VALUE=DATE:${format(dueDate, 'yyyyMMdd')}`,
        `DTEND;VALUE=DATE:${format(addDays(dueDate, 1), 'yyyyMMdd')}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Lembrete: ${summary}`,
        'TRIGGER:-P1D',
        'END:VALARM',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Vence hoje: ${summary}`,
        'TRIGGER:-PT2H',
        'END:VALARM',
        'END:VEVENT'
      ].join('\r\n');
      
      // Evento de follow-up - 2 dias após vencimento
      const followupDate = addDays(dueDate, 2);
      const followupSummary = `⚠️ Verificar pagamento: ${clientName} - R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const followupDescription = [
        `VERIFICAR SE FOI PAGO!`,
        `Parcela ${inst.installmentNumber} - Venceu em ${format(dueDate, 'dd/MM/yyyy')}`,
        `Cliente: ${clientName}`,
        `Proposta: ${proposalCode}`,
        `Valor: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ].join('\\n');
      
      const followupEvent = [
        'BEGIN:VEVENT',
        `UID:${uidFollowup}`,
        `DTSTAMP:${formatDateICS(now)}`,
        `DTSTART;VALUE=DATE:${format(followupDate, 'yyyyMMdd')}`,
        `DTEND;VALUE=DATE:${format(addDays(followupDate, 1), 'yyyyMMdd')}`,
        `SUMMARY:${followupSummary}`,
        `DESCRIPTION:${followupDescription}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${followupSummary}`,
        'TRIGGER:-PT9H',
        'END:VALARM',
        'END:VEVENT'
      ].join('\r\n');
      
      return mainEvent + '\r\n' + followupEvent;
    });
    
    // ==========================================
    // 2. CUSTOS FIXOS (Fixed Costs)
    // ==========================================
    const fixedCosts = await prisma.fixedCost.findMany({
      where: {
        userId: user.id,
        isActive: true
      }
    });
    
    const fixedCostEvents: string[] = [];
    
    // Gerar eventos para os próximos 12 meses
    for (const cost of fixedCosts) {
      const amount = parseFloat(cost.amount.toString());
      const dueDay = cost.dueDay || 10;
      const categoryLabels: Record<string, string> = {
        salario: '👤 Salário',
        aluguel: '🏠 Aluguel',
        servico: '🔧 Serviço',
        impostos: '📋 Impostos',
        outros: '📌 Custo Fixo'
      };
      const categoryLabel = categoryLabels[cost.category] || '📌 Custo Fixo';
      
      // Gerar para os próximos 12 meses
      for (let i = 0; i < 12; i++) {
        const monthDate = addMonths(now, i);
        let dueDate = setDate(monthDate, Math.min(dueDay, 28)); // Max dia 28 para evitar problemas
        
        // Verificar se está dentro do período de vigência
        if (isBefore(dueDate, cost.startDate)) continue;
        if (cost.endDate && isAfter(dueDate, cost.endDate)) continue;
        
        const uid = `defoco-fixedcost-${cost.id}-${format(dueDate, 'yyyyMM')}@defoco.com.br`;
        
        const summary = `${categoryLabel}: ${cost.name} - R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        const description = [
          `Custo Fixo Mensal`,
          `Nome: ${cost.name}`,
          `Categoria: ${cost.category}`,
          `Valor: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          cost.description || ''
        ].filter(Boolean).join('\\n');
        
        // Evento principal - dia do vencimento com alertas
        const mainEvent = [
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${formatDateICS(now)}`,
          `DTSTART;VALUE=DATE:${format(dueDate, 'yyyyMMdd')}`,
          `DTEND;VALUE=DATE:${format(addDays(dueDate, 1), 'yyyyMMdd')}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          'STATUS:CONFIRMED',
          // Alerta 2 dias antes
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:⏰ Em 2 dias: ${summary}`,
          'TRIGGER:-P2D',
          'END:VALARM',
          // Alerta no dia do vencimento (manhã)
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:🚨 IMPORTANTE - VENCIMENTO HOJE: ${cost.name} - R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          'TRIGGER:-PT8H',
          'END:VALARM',
          'END:VEVENT'
        ].join('\r\n');
        
        fixedCostEvents.push(mainEvent);
      }
    }
    
    // ==========================================
    // COMBINAR TODOS OS EVENTOS
    // ==========================================
    const allEvents = [...installmentEvents, ...fixedCostEvents];
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Defoco//Vencimentos//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Defoco - Vencimentos',
      'X-WR-CALDESC:Calendário de vencimentos (parcelas e custos fixos)',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H',
      ...allEvents,
      'END:VCALENDAR'
    ].join('\r\n');
    
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="defoco-vencimentos.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar calendário:', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
