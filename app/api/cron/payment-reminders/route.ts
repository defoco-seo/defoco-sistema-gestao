export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Máximo de 60 segundos para execução

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/notifications';
import { addDays, subDays, format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Chave secreta para autorizar o cron job (configure no Vercel)
const CRON_SECRET = process.env.CRON_SECRET;

// Template de email para lembrete de pagamento próximo
function getPaymentReminderTemplate(data: {
  clientName: string;
  responsibleName: string;
  proposalNumber: string;
  installmentNumber: number;
  amount: string;
  dueDate: string;
  daysUntilDue: number;
}) {
  const urgency = data.daysUntilDue <= 1 ? 'URGENTE' : '';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, ${data.daysUntilDue <= 1 ? '#ef4444, #dc2626' : '#f88910, #ff6b00'}); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">
          ${urgency ? '⚠️' : '📅'} Lembrete de Pagamento ${urgency}
        </h1>
      </div>
      <div style="background: #f9fafb; padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Olá, ${data.responsibleName}!</h2>
        <p style="color: #666; font-size: 14px;">
          Este é um lembrete sobre o vencimento de uma parcela da proposta <strong>${data.proposalNumber}</strong>.
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${data.daysUntilDue <= 1 ? '#ef4444' : '#f88910'}; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Cliente:</strong> ${data.clientName}</p>
          <p style="margin: 10px 0;"><strong>Parcela:</strong> ${data.installmentNumber}ª parcela</p>
          <p style="margin: 10px 0;"><strong>Valor:</strong> <span style="color: #333; font-size: 18px; font-weight: bold;">${data.amount}</span></p>
          <p style="margin: 10px 0;"><strong>Vencimento:</strong> <span style="color: ${data.daysUntilDue <= 1 ? '#ef4444' : '#333'}; font-weight: bold;">${data.dueDate}</span></p>
          <p style="margin: 10px 0; color: #666; font-size: 12px;">
            ${data.daysUntilDue === 0 ? 'Vence hoje!' : data.daysUntilDue === 1 ? 'Vence amanhã!' : `Faltam ${data.daysUntilDue} dias`}
          </p>
        </div>
        <p style="color: #666; font-size: 14px;">
          Acesse o sistema para registrar o pagamento quando efetuado.
        </p>
      </div>
      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          Defoco • Sistema de Gestão
        </p>
      </div>
    </div>
  `;
}

// Template de email para parcela vencida
function getOverduePaymentTemplate(data: {
  clientName: string;
  responsibleName: string;
  proposalNumber: string;
  installmentNumber: number;
  amount: string;
  dueDate: string;
  daysOverdue: number;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Parcela Vencida</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Atenção!</h2>
        <p style="color: #666; font-size: 14px;">
          A seguinte parcela da proposta <strong>${data.proposalNumber}</strong> está vencida há <strong>${data.daysOverdue} dia(s)</strong>.
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Cliente:</strong> ${data.clientName}</p>
          <p style="margin: 10px 0;"><strong>Responsável:</strong> ${data.responsibleName}</p>
          <p style="margin: 10px 0;"><strong>Parcela:</strong> ${data.installmentNumber}ª parcela</p>
          <p style="margin: 10px 0;"><strong>Valor:</strong> <span style="color: #ef4444; font-size: 18px; font-weight: bold;">${data.amount}</span></p>
          <p style="margin: 10px 0;"><strong>Vencimento:</strong> <span style="color: #ef4444;">${data.dueDate}</span></p>
        </div>
        <p style="color: #666; font-size: 14px;">
          Entre em contato com o cliente para regularizar a situação.
        </p>
      </div>
      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          Defoco • Sistema de Gestão
        </p>
      </div>
    </div>
  `;
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();
    const today = startOfDay(now);
    const results = {
      reminders: { sent: 0, errors: 0 },
      overdues: { sent: 0, errors: 0 },
    };

    // Formatar valores para exibição
    const formatCurrency = (value: any) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(Number(value));
    };

    const formatDate = (date: Date) => {
      return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    };

    // Buscar parcelas que vencem nos próximos 3 dias
    const threeDaysFromNow = addDays(today, 3);
    const upcomingInstallments = await prisma.installment.findMany({
      where: {
        status: 'pending',
        dueDate: {
          gte: today,
          lte: endOfDay(threeDaysFromNow),
        },
      },
      include: {
        proposal: {
          include: {
            user: {
              select: {
                email: true,
                emailNotificationConfig: true,
              },
            },
          },
        },
      },
    });

    // Enviar lembretes de parcelas próximas
    const notificationId = process.env.NOTIF_ID_INSTALLMENT_DUE || process.env.NOTIF_ID_PROPOSTA_APROVADA || '';
    
    for (const installment of upcomingInstallments) {
      const userConfig = installment.proposal.user.emailNotificationConfig;
      
      // Verificar se usuário deseja receber notificações de parcelas
      if (userConfig && !userConfig.installmentDue) {
        continue;
      }

      const daysUntilDue = Math.ceil((new Date(installment.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (notificationId && process.env.WEB_APP_ID && process.env.ABACUSAI_API_KEY) {
        try {
          await sendNotificationEmail({
            notificationId,
            recipientEmail: installment.proposal.user.email || '',
            subject: `📅 Lembrete: Parcela ${installment.installmentNumber} vence ${daysUntilDue === 0 ? 'hoje' : `em ${daysUntilDue} dia(s)`} - ${installment.proposal.proposalNumber}`,
            htmlBody: getPaymentReminderTemplate({
              clientName: installment.proposal.clientName,
              responsibleName: installment.proposal.responsibleName,
              proposalNumber: installment.proposal.proposalNumber,
              installmentNumber: installment.installmentNumber,
              amount: formatCurrency(installment.amount),
              dueDate: formatDate(installment.dueDate),
              daysUntilDue,
            }),
          });
          results.reminders.sent++;
        } catch (error) {
          console.error('Erro ao enviar lembrete:', error);
          results.reminders.errors++;
        }
      }
    }

    // Buscar parcelas vencidas (últimos 7 dias)
    const sevenDaysAgo = subDays(today, 7);
    const overdueInstallments = await prisma.installment.findMany({
      where: {
        status: 'pending',
        dueDate: {
          gte: sevenDaysAgo,
          lt: today,
        },
      },
      include: {
        proposal: {
          include: {
            user: {
              select: {
                email: true,
                emailNotificationConfig: true,
              },
            },
          },
        },
      },
    });

    // Atualizar status para overdue e enviar notificações
    for (const installment of overdueInstallments) {
      // Atualizar status para overdue
      await prisma.installment.update({
        where: { id: installment.id },
        data: { status: 'overdue' },
      });

      const userConfig = installment.proposal.user.emailNotificationConfig;
      
      // Verificar se usuário deseja receber notificações de parcelas vencidas
      if (userConfig && !userConfig.installmentOverdue) {
        continue;
      }

      const daysOverdue = Math.ceil((today.getTime() - new Date(installment.dueDate).getTime()) / (1000 * 60 * 60 * 24));

      // Só envia notificação se estiver vencida há 1, 3 ou 7 dias (evitar spam)
      if (![1, 3, 7].includes(daysOverdue)) {
        continue;
      }

      if (notificationId && process.env.WEB_APP_ID && process.env.ABACUSAI_API_KEY) {
        try {
          await sendNotificationEmail({
            notificationId,
            recipientEmail: installment.proposal.user.email || '',
            subject: `🚨 Parcela Vencida há ${daysOverdue} dia(s) - ${installment.proposal.proposalNumber}`,
            htmlBody: getOverduePaymentTemplate({
              clientName: installment.proposal.clientName,
              responsibleName: installment.proposal.responsibleName,
              proposalNumber: installment.proposal.proposalNumber,
              installmentNumber: installment.installmentNumber,
              amount: formatCurrency(installment.amount),
              dueDate: formatDate(installment.dueDate),
              daysOverdue,
            }),
          });
          results.overdues.sent++;
        } catch (error) {
          console.error('Erro ao enviar notificação de vencida:', error);
          results.overdues.errors++;
        }
      }
    }

    console.log('Cron de lembretes executado:', results);

    return NextResponse.json({
      success: true,
      message: 'Lembretes processados com sucesso',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro no cron de lembretes:', error);
    return NextResponse.json(
      { error: 'Erro ao processar lembretes' },
      { status: 500 }
    );
  }
}
