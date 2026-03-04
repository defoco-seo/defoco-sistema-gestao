import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {

  // No adapter needed for Credentials + JWT strategy
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios');
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user?.password) {
            throw new Error('Email ou senha inválidos');
          }

          // Verifica se usuário está ativo
          if (!user.isActive) {
            throw new Error('Usuário inativo. Entre em contato com o administrador.');
          }

          // Verifica se conta está bloqueada
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesRemaining = Math.ceil(
              (user.lockedUntil.getTime() - Date.now()) / 1000 / 60
            );
            throw new Error(
              `Conta bloqueada devido a múltiplas tentativas falhadas. Tente novamente em ${minutesRemaining} minutos.`
            );
          }

          // Valida senha
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // Incrementa tentativas falhadas
            const newFailedAttempts = user.failedLoginAttempts + 1;
            const updateData: any = {
              failedLoginAttempts: newFailedAttempts,
            };

            // Bloqueia após 5 tentativas
            if (newFailedAttempts >= 5) {
              const lockedUntil = new Date();
              lockedUntil.setMinutes(lockedUntil.getMinutes() + 30);
              updateData.lockedUntil = lockedUntil;
            }

            await prisma.user.update({
              where: { id: user.id },
              data: updateData,
            });

            if (newFailedAttempts >= 5) {
              throw new Error('Conta bloqueada por 30 minutos devido a múltiplas tentativas falhadas.');
            }

            throw new Error(`Email ou senha inválidos. ${5 - newFailedAttempts} tentativas restantes.`);
          }

          // Verifica se senha expirou
          if (user.passwordExpiresAt && user.passwordExpiresAt < new Date()) {
            throw new Error('Senha expirada. Entre em contato com o administrador para redefinir.');
          }

          // Verifica se precisa forçar troca de senha
          if (user.forcePasswordChange) {
            throw new Error('Você precisa alterar sua senha no primeiro acesso. Entre em contato com o administrador.');
          }

          // Reset failed attempts em caso de sucesso
          if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
              },
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
          };
        } catch (error: any) {
          console.error('Auth error:', error.message);
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // Adiciona id, role e permissions ao token
        token.id = user.id;
        
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, permissions: true },
        });
        
        if (dbUser) {
          token.role = dbUser.role;
          token.permissions = dbUser.permissions || undefined;
        }

        // Registra login bem-sucedido no audit log
        try {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'login',
              resourceType: 'auth',
              resourceId: user.id,
              details: JSON.stringify({
                method: account?.provider || 'credentials',
                email: user.email,
              }),
              ipAddress: undefined, // Será preenchido por middleware se disponível
              userAgent: undefined,
            },
          });
        } catch (error) {
          console.error('Erro ao criar audit log:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        // Parse permissions de JSON string para array
        const permsString = token.permissions as string;
        try {
          session.user.permissions = permsString ? JSON.parse(permsString) : [];
        } catch (e) {
          session.user.permissions = [];
        }
      }
      return session;
    },
  },
};
