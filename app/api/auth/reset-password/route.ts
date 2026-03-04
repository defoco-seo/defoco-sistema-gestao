export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail, getPasswordChangedTemplate } from '@/lib/email';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Validação de senha forte
function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'A senha deve ter no mínimo 6 caracteres' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos um número' };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json();

    // Validações básicas
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Senha e confirmação são obrigatórias' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'As senhas não coincidem' },
        { status: 400 }
      );
    }

    // Validar força da senha
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }

    // Hash do token recebido para comparar com o banco
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar usuário com token válido e não expirado
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date() // Token não expirado
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        passwordHistory: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Link inválido ou expirado. Solicite uma nova recuperação de senha.' },
        { status: 400 }
      );
    }

    // Verificar se a nova senha é igual à atual
    if (user.password) {
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return NextResponse.json(
          { error: 'A nova senha não pode ser igual à senha atual' },
          { status: 400 }
        );
      }
    }

    // Verificar histórico de senhas (últimas 5)
    if (user.passwordHistory) {
      try {
        const history = JSON.parse(user.passwordHistory) as string[];
        for (const oldHash of history) {
          const isOldPassword = await bcrypt.compare(password, oldHash);
          if (isOldPassword) {
            return NextResponse.json(
              { error: 'Esta senha já foi utilizada anteriormente. Escolha uma senha diferente.' },
              { status: 400 }
            );
          }
        }
      } catch (e) {
        // Ignorar erro de parse do histórico
      }
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Atualizar histórico de senhas
    let newHistory: string[] = [];
    if (user.password) {
      try {
        const existingHistory = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];
        newHistory = [user.password, ...existingHistory].slice(0, 5);
      } catch (e) {
        newHistory = [user.password];
      }
    }

    // Definir nova expiração (90 dias)
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90);

    // Atualizar usuário
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        passwordExpiresAt,
        passwordHistory: JSON.stringify(newHistory),
        resetToken: null, // Invalida o token
        resetTokenExpiry: null,
        forcePasswordChange: false,
        failedLoginAttempts: 0, // Reset tentativas
        lockedUntil: null // Remove bloqueio
      }
    });

    // Enviar email de confirmação
    const emailHtml = getPasswordChangedTemplate({
      userName: user.name || 'Usuário',
      changeDate: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    });

    await sendEmail({
      to: user.email!,
      subject: '✅ Senha Alterada com Sucesso - Defoco',
      html: emailHtml
    });

    console.log(`Senha redefinida com sucesso para: ${user.email}`);

    return NextResponse.json({
      message: 'Senha redefinida com sucesso! Você já pode fazer login.'
    });

  } catch (error) {
    console.error('Erro no reset-password:', error);
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}