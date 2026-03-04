import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { prisma } from './db';

/**
 * Roles administrativos que têm acesso completo ao sistema
 */
export const ADMIN_ROLES = ['master', 'admin'];

/**
 * Roles com acesso ao módulo financeiro
 */
export const FINANCIAL_ROLES = ['master', 'admin', 'financeiro'];

/**
 * Roles com acesso ao módulo criativo
 */
export const CREATIVE_ROLES = ['master', 'admin', 'creative', 'designer'];

/**
 * Obtém o usuário atual da sessão com suas permissões
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      permissions: true,
      isActive: true,
    }
  });
  
  if (!user || !user.isActive) {
    return null;
  }
  
  return user;
}

/**
 * Verifica se o usuário é admin (master ou admin)
 */
export function isAdmin(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role || '');
}

/**
 * Verifica se o usuário tem acesso ao módulo financeiro
 */
export function hasFinancialAccess(role: string | null | undefined): boolean {
  return FINANCIAL_ROLES.includes(role || '');
}

/**
 * Verifica se o usuário tem acesso ao módulo criativo
 */
export function hasCreativeAccess(role: string | null | undefined): boolean {
  return CREATIVE_ROLES.includes(role || '');
}

/**
 * Verifica se o usuário pode acessar uma proposta específica
 */
export async function canAccessProposal(userId: string, proposalId: string, userRole: string | null | undefined): Promise<boolean> {
  // Admins e financeiros podem acessar todas as propostas
  if (FINANCIAL_ROLES.includes(userRole || '')) {
    return true;
  }
  
  // Usuários normais só podem acessar suas próprias propostas
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { userId: true }
  });
  
  return proposal?.userId === userId;
}

/**
 * Sanitiza string para prevenir XSS
 */
export function sanitizeString(str: string, maxLength: number = 1000): string {
  if (!str) return '';
  return str
    .trim()
    .substring(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove tags HTML
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return entities[char] || char;
    });
}

/**
 * Valida se é um ID válido (CUID)
 */
export function isValidId(id: string): boolean {
  // CUID pattern: c + lowercase letters and numbers
  return /^c[a-z0-9]{24,}$/i.test(id);
}

/**
 * Rate limiter simples baseado em memória
 * Em produção, use Redis ou similar
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minuto
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

// Limpa registros antigos periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Limpa a cada minuto
