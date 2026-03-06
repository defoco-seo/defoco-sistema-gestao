import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/redefinir-senha',
  '/proposta',
  '/portal',
  '/api/auth',
  '/api/signup',
  '/api/proposals/public',
  '/api/client-portal',
  '/api/financial/calendar',
  '/_next',
  '/favicon',
  '/logo',
  '/og-image',
];

// Rotas que requerem role específico
const roleRestrictedRoutes: Record<string, string[]> = {
  // Rotas financeiras detalhadas - apenas master, admin, financeiro
  // Nota: /api/financial/stats é permitido para todos (retorna dados filtrados)
  '/api/financial/installments': ['master', 'admin', 'financeiro'],
  '/api/financial/payments': ['master', 'admin', 'financeiro'],
  '/api/financial/fixed-costs': ['master', 'admin', 'financeiro'],
  '/api/financial/reports': ['master', 'admin', 'financeiro'],
  '/api/financial/analysis': ['master', 'admin', 'financeiro'],
  '/api/financial/tax-config': ['master', 'admin', 'financeiro'],
  '/api/financial/generate-installments': ['master', 'admin', 'financeiro'],
  '/dashboard/financeiro': ['master', 'admin', 'financeiro'],
  
  // Rotas administrativas - apenas master
  '/api/admin': ['master'],
  '/dashboard/admin': ['master'],
  
  // Rotas de contratos RH - apenas master, admin
  '/api/hr-contracts': ['master', 'admin'],
  '/dashboard/contratos-rh': ['master', 'admin'],
};

// Função para verificar se é rota pública
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route));
}

// Função para obter roles permitidos para uma rota
function getAllowedRoles(pathname: string): string[] | null {
  for (const [route, roles] of Object.entries(roleRestrictedRoutes)) {
    if (pathname.startsWith(route)) {
      return roles;
    }
  }
  return null; // Qualquer usuário autenticado pode acessar
}

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    
    // Rotas públicas passam direto
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }
    
    const token = req.nextauth.token;
    
    // Se não tem token, redireciona para login
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Verifica restrição de role
    const allowedRoles = getAllowedRoles(pathname);
    if (allowedRoles) {
      const userRole = token.role as string;
      if (!allowedRoles.includes(userRole)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Acesso negado. Você não tem permissão para acessar este recurso.' },
            { status: 403 }
          );
        }
        // Redireciona para dashboard se tentar acessar página restrita
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    
    // Adiciona headers de segurança
    const response = NextResponse.next();
    
    // Headers de segurança
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Rotas públicas sempre autorizadas
        if (isPublicRoute(pathname)) {
          return true;
        }
        
        // Outras rotas precisam de token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, *.svg, *.png, *.jpg, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
