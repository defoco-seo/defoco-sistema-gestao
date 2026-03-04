export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail, getPasswordResetTemplate } from '@/lib/email';
import crypto from 'crypto';

// Rate limiting em memória (em produção, usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_MAX = 5; // máximo de tentativas
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos em ms
const TOKEN_EXPIRY_HOURS = 1;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(email);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(email, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verificar rate limit
    if (!checkRateLimit(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' },
        { status: 429 }
      );
    }

    // Buscar usuário (resposta genérica para não revelar se email existe)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, isActive: true }
    });

    // Sempre retorna sucesso (segurança: não revelar se email existe)
    const successMessage = 'Se o email estiver cadastrado, você receberá um link de recuperação.';

    if (!user) {
      console.log(`Tentativa de recuperação para email não cadastrado: ${normalizedEmail}`);
      return NextResponse.json({ message: successMessage });
    }

    if (!user.isActive) {
      console.log(`Tentativa de recuperação para usuário inativo: ${normalizedEmail}`);
      return NextResponse.json({ message: successMessage });
    }

    // Gerar token seguro
    const rawToken = crypto.randomBytes(32).toString('hex');
    
    // Armazenar HASH do token no banco (segurança)
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    // Definir expiração (1 hora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    // Salvar no banco
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiresAt
      }
    });

    // Construir link de reset
    const baseUrl = process.env.NEXTAUTH_URL || 'https://defoco.abacusai.app';
    const resetLink = `${baseUrl}/redefinir-senha/${rawToken}`;

    // Enviar email
    const emailHtml = getPasswordResetTemplate({
      userName: user.name || 'Usuário',
      resetLink,
      expiresIn: '1 hora'
    });

    const emailResult = await sendEmail({
      to: user.email!,
      subject: '🔐 Recuperação de Senha - Defoco',
      html: emailHtml
    });

    if (!emailResult.success) {
      console.error('Falha ao enviar email de recuperação:', emailResult.message);
      // Não expor erro ao usuário
    } else {
      console.log(`Email de recuperação enviado para: ${user.email}`);
    }

    return NextResponse.json({ message: successMessage });

  } catch (error) {
    console.error('Erro no forgot-password:', error);
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}