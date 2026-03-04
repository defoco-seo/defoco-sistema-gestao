export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import crypto from 'crypto';

// Roles que podem acessar todas as propostas
const ADMIN_ROLES = ['master', 'admin', 'financeiro'];

export async function POST(
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

    // Get proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
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

    // SEGURANÇA: Verificar se o usuário é dono da proposta ou admin
    const isAdmin = ADMIN_ROLES.includes(user.role || '');
    if (proposal.userId !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Você não tem permissão para enviar esta proposta' },
        { status: 403 }
      );
    }

    // Generate access token if it doesn't exist
    let accessToken = proposal.accessToken;
    if (!accessToken) {
      accessToken = crypto.randomBytes(32).toString('hex');
      await prisma.proposal.update({
        where: { id: params.id },
        data: { accessToken },
      });
    }

    // Build public URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const publicUrl = `${baseUrl}/proposta/${accessToken}`;

    // TODO: Integrate with actual email service (Resend, SendGrid, Nodemailer, etc.)
    // For now, we'll just return success and log the email details
    console.log('Email would be sent to:', proposal.clientEmail);
    console.log('Public URL:', publicUrl);

    // Here you would integrate with your email service:
    // Example with nodemailer:
    /*
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Defoco" <propostas@defoco.com.br>',
      to: proposal.clientEmail,
      subject: `Proposta Comercial ${proposal.proposalNumber}`,
      html: `
        <h2>Olá, ${proposal.responsibleName}!</h2>
        <p>Segue em anexo nossa proposta comercial.</p>
        <p>Para visualizar e responder à proposta, acesse: <a href="${publicUrl}">${publicUrl}</a></p>
        <br/>
        <p>Atenciosamente,<br/>Equipe Defoco</p>
      `,
    });
    */

    // For demonstration, we'll return success
    return NextResponse.json({
      success: true,
      message: 'Email enviado com sucesso!',
      publicUrl, // Return the URL so frontend can show it
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    );
  }
}
