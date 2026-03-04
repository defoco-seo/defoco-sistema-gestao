export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Validação de email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validação de senha
function isStrongPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Senha deve ter no mínimo 6 caracteres' };
  }
  // Requer pelo menos letras E números para segurança básica
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos uma letra' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos um número' };
  }
  return { valid: true, message: '' };
}

// Sanitização de nome
function sanitizeName(name: string): string {
  return name.trim().substring(0, 100); // Limita a 100 caracteres
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    // Validação de campos obrigatórios
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Validação de email
    const sanitizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validação de senha
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }

    // Sanitização de nome
    const sanitizedName = sanitizeName(name);
    if (sanitizedName.length < 2) {
      return NextResponse.json(
        { error: 'Nome deve ter no mínimo 2 caracteres' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Aumentado de 10 para 12 rounds

    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        name: sanitizedName,
        role: 'user', // Role padrão para novos usuários
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}