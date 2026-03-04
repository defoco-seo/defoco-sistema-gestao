// Serviço de email usando Resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<{ success: boolean; message?: string }> {
  try {
    const fromEmail = from || 'Defoco <no-reply@defoco.com.br>';
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Erro ao enviar email:', error);
      return { success: false, message: error.message };
    }

    console.log('Email enviado com sucesso:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return { success: false, message: String(error) };
  }
}

// Template de email para recuperação de senha
export function getPasswordResetTemplate(data: {
  userName: string;
  resetLink: string;
  expiresIn: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f88910, #ff6b00); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Recuperação de Senha</h1>
      </div>

      <div style="background: #f9fafb; padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Olá, ${data.userName}!</h2>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Recebemos uma solicitação para redefinir a senha da sua conta no sistema Defoco.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink}" 
             style="background: #f88910; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            Redefinir Minha Senha
          </a>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f88910;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>⏰ Este link expira em ${data.expiresIn}.</strong>
          </p>

          <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
            Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.
          </p>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 20px;"> 
          Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
          <a href="${data.resetLink}" style="color: #f88910; word-break: break-all;">
            ${data.resetLink}
          </a>
        </p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
           &copy; ${new Date().getFullYear()} Defoco. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `;
}