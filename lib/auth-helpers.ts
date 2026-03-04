import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { prisma } from './db'; 

/**
 * Verifica se o usuário logado é Master User
 */
export async function isMasterUser(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, isActive: true } 
  });

  return user?.role === 'master' && user?.isActive === true;
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { permissions: true, isActive: true, role: true }
  });

  if (!user?.isActive) return false;
  if (user.role === 'master') return true; // Master tem todas as permissões

  if (!user.permissions) return false;

  try {
    const permissions: string[] = JSON.parse(user.permissions);
    return permissions.includes(permission);
  } catch {
    return false;
  }
}

/**
 * Registra uma ação no log de auditoria
 */
export async function createAuditLog({
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
  userAgent
}: {
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  const session = await getServerSession(authOptions);
  
  const user = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;

  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      action,
      resourceType,
      resourceId,
      details: details ? JSON.stringify(details) : undefined,
      ipAddress,
      userAgent
    }
  });
}

/**
 * Registra um login no histórico
 */
export async function createLoginHistory({
  userId,
  ipAddress,
  userAgent,
  success,
  failureReason
}: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}) {
  await prisma.loginHistory.create({
    data: {
      userId,
      ipAddress,
      userAgent,
      success,
      failureReason
    }
  });
}
