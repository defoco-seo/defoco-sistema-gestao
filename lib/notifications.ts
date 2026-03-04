// Utilitário para envio de notificações por email

interface SendNotificationParams {
  notificationId: string;
  recipientEmail: string;
  subject: string;
  htmlBody: string;
}

export async function sendNotificationEmail({
  notificationId,
  recipientEmail,
  subject,
  htmlBody,
}: SendNotificationParams): Promise<{ success: boolean; message?: string }> {
  try {
    const appUrl = process.env.NEXTAUTH_URL || 'https://defoco.abacusai.app';
    const hostname = new URL(appUrl).hostname;
    const appName = 'Defoco';

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: notificationId,
        subject,
        body: htmlBody,
        is_html: true,
        recipient_email: recipientEmail,
        sender_email: `noreply@${hostname}`,
        sender_alias: appName,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      if (result.notification_disabled) {
        console.log('Notificação desabilitada pelo usuário');
        return { success: true, message: 'Notificação desabilitada' };
      }
      throw new Error(result.message || 'Falha ao enviar notificação');
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return { success: false, message: String(error) };
  }
}

// Templates de email

export function getProposalApprovedTemplate(data: {
  proposalNumber: string;
  clientName: string;
  demandName?: string;
  total: string;
  responseDate: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f88910, #ff6b00); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Proposta Aprovada!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Parabéns! Sua proposta foi aprovada.</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
          <p style="margin: 10px 0;"><strong>Proposta:</strong> ${data.proposalNumber}</p>
          <p style="margin: 10px 0;"><strong>Cliente:</strong> ${data.clientName}</p>
          ${data.demandName ? `<p style="margin: 10px 0;"><strong>Demanda:</strong> ${data.demandName}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Valor Total:</strong> <span style="color: #22c55e; font-size: 18px; font-weight: bold;">${data.total}</span></p>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Aprovado em: ${data.responseDate}
        </p>
        <p style="color: #666; font-size: 14px;">
          Acesse o sistema para gerar o contrato e configurar as parcelas.
        </p>
      </div>
      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          Defoco • Agência de Comunicação
        </p>
      </div>
    </div>
  `;
}

export function getProposalRejectedTemplate(data: {
  proposalNumber: string;
  clientName: string;
  demandName?: string;
  feedback?: string;
  responseDate: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">❌ Proposta Recusada</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Infelizmente a proposta foi recusada.</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
          <p style="margin: 10px 0;"><strong>Proposta:</strong> ${data.proposalNumber}</p>
          <p style="margin: 10px 0;"><strong>Cliente:</strong> ${data.clientName}</p>
          ${data.demandName ? `<p style="margin: 10px 0;"><strong>Demanda:</strong> ${data.demandName}</p>` : ''}
          ${data.feedback ? `
            <p style="margin: 10px 0;"><strong>Feedback do cliente:</strong></p>
            <div style="background: #fef2f2; padding: 15px; border-radius: 4px; color: #991b1b;">
              ${data.feedback}
            </div>
          ` : ''}
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Recusado em: ${data.responseDate}
        </p>
      </div>
      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          Defoco • Agência de Comunicação
        </p>
      </div>
    </div>
  `;
}

export function getJobAssignedTemplate(data: {
  jobNumber: string;
  jobTitle: string;
  clientName: string;
  deadline?: string;
  assignedByName: string;
  role: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f88910, #ff6b00); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎯 Novo Job Atribuído!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Você foi atribuído a um novo job.</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f88910;">
          <p style="margin: 10px 0;"><strong>Job:</strong> ${data.jobNumber}</p>
          <p style="margin: 10px 0;"><strong>Título:</strong> ${data.jobTitle}</p>
          <p style="margin: 10px 0;"><strong>Cliente:</strong> ${data.clientName}</p>
          <p style="margin: 10px 0;"><strong>Seu Papel:</strong> <span style="background: #f88910; color: white; padding: 2px 8px; border-radius: 4px;">${data.role}</span></p>
          ${data.deadline ? `<p style="margin: 10px 0;"><strong>Prazo:</strong> <span style="color: #dc2626;">${data.deadline}</span></p>` : ''}
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Atribuído por: ${data.assignedByName}
        </p>
        <p style="color: #666; font-size: 14px;">
          Acesse o sistema para ver os detalhes e o briefing.
        </p>
      </div>
      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          Defoco • Agência de Comunicação
        </p>
      </div>
    </div>
  `;
}
