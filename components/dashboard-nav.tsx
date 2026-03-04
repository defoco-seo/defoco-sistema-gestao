"use client";

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { FileText, Home, LogOut, User, PlusCircle, List, Settings, Users, Shield, Bell, FileCheck, ChevronDown, DollarSign, UserCheck, Target, Palette, Menu, BarChart3, X, FileSpreadsheet, Crosshair, History } from 'lucide-react';
import { AlertsDropdown } from '@/components/alerts-dropdown';
import { GlobalSearch } from '@/components/global-search';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const isMaster = user?.role === 'master';
  const [recentLogins, setRecentLogins] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Início', icon: Home },
    { href: '/dashboard/propostas', label: 'Propostas', icon: List },
    { href: '/dashboard/crm', label: 'CRM', icon: Target },
    { href: '/dashboard/criativo', label: 'Criativo', icon: Palette },
    { href: '/dashboard/contratos', label: 'Contratos', icon: FileCheck },
    { href: '/dashboard/contratos-rh', label: 'RH', icon: UserCheck },
    { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
    { href: '/dashboard/equipe', label: 'Equipe', icon: Users },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/relatorios', label: 'Relatórios', icon: FileSpreadsheet },
    { href: '/dashboard/metas', label: 'Metas', icon: Crosshair },
    { href: '/dashboard/configuracoes', label: 'Config', icon: Settings },
  ];

  // Itens exclusivos do Master User (agora "Usuários" tem submenu)
  const adminNavItems = isMaster ? [
    {
      label: 'Admin',
      icon: Shield,
      hasSubmenu: true,
      submenu: [
        { href: '/dashboard/admin/usuarios', label: 'Usuários', icon: Users },
        { href: '/dashboard/admin/logs', label: 'Logs de Login', icon: Shield },
        { href: '/dashboard/admin/auditoria', label: 'Auditoria', icon: History },
      ],
    },
  ] : [];

  const allNavItems = [...navItems, ...adminNavItems];

  // Busca notificações de login para Master User
  useEffect(() => {
    if (isMaster) {
      fetchLoginNotifications();
      // Atualiza a cada 2 minutos
      const interval = setInterval(fetchLoginNotifications, 120000);
      return () => clearInterval(interval);
    }
  }, [isMaster]);

  const fetchLoginNotifications = async () => {
    try {
      const response = await fetch('/api/admin/login-notifications');
      if (response.ok) {
        const data = await response.json();
        setRecentLogins(data.logins || []);
        // Conta logins dos últimos 5 minutos como não lidos
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const unread = data.logins.filter((login: any) => 
          new Date(login.loginAt).getTime() > fiveMinutesAgo
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

 return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm md:flex md:justify-center">
      <div className="container px-4 overflow-hidden">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Link href="/dashboard" className="flex-shrink-0">
              <div className="relative w-28 h-9">
                <Image
                  src="/logo-defoco.png"
                  alt="Defoco"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Menu Desktop - visível apenas em telas grandes */}
            <div className="hidden xl:flex items-center gap-1 overflow-hidden">
              {allNavItems.slice(0, 8).map((item: any, index) => {
                const Icon = item.icon;
                
                if (item.hasSubmenu && item.submenu) {
                  const isAnySubmenuActive = item.submenu.some((sub: any) => pathname === sub.href);
                  return (
                    <DropdownMenu key={index}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant={isAnySubmenuActive ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            'gap-1 px-2',
                            isAnySubmenuActive && 'bg-orange-100 text-[#f88910] hover:bg-orange-200'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-xs">{item.label}</span>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {item.submenu.map((subItem: any) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname === subItem.href;
                          return (
                            <DropdownMenuItem key={subItem.href} asChild>
                              <Link
                                href={subItem.href}
                                className={cn(
                                  'flex items-center gap-2 cursor-pointer',
                                  isSubActive && 'bg-orange-50 text-[#f88910]'
                                )}
                              >
                                <SubIcon className="h-4 w-4" />
                                {subItem.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }
                
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'gap-1 px-2',
                        isActive && 'bg-orange-100 text-[#f88910] hover:bg-orange-200'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}

              {/* Dropdown "Mais" para itens restantes */}
              {allNavItems.length > 8 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 px-2">
                      <span className="text-xs">Mais</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {allNavItems.slice(8).map((item: any, index) => {
                      const Icon = item.icon;
                      
                      if (item.hasSubmenu && item.submenu) {
                        return (
                          <div key={index}>
                            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </DropdownMenuLabel>
                            {item.submenu.map((subItem: any) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = pathname === subItem.href;
                              return (
                                <DropdownMenuItem key={subItem.href} asChild>
                                  <Link
                                    href={subItem.href}
                                    className={cn(
                                      'flex items-center gap-2 cursor-pointer pl-6',
                                      isSubActive && 'bg-orange-50 text-[#f88910]'
                                    )}
                                  >
                                    <SubIcon className="h-4 w-4" />
                                    {subItem.label}
                                  </Link>
                                </DropdownMenuItem>
                              );
                            })}
                          </div>
                        );
                      }
                      
                      const isActive = pathname === item.href;
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2 cursor-pointer',
                              isActive && 'bg-orange-50 text-[#f88910]'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Busca Global */}
            <div className="hidden md:block">
              <GlobalSearch />
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="relative w-24 h-8">
                      <Image
                        src="/logo-defoco.png"
                        alt="Defoco"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <nav className="flex flex-col gap-1 px-2">
                    {allNavItems.map((item: any, index) => {
                      const Icon = item.icon;
                      
                      if (item.hasSubmenu && item.submenu) {
                        const isAnySubmenuActive = item.submenu.some((sub: any) => pathname === sub.href);
                        return (
                          <div key={index} className="space-y-1">
                            <div className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                              isAnySubmenuActive ? 'bg-orange-100 text-[#f88910]' : 'text-gray-700'
                            )}>
                              <Icon className="h-5 w-5" />
                              {item.label}
                            </div>
                            <div className="pl-8 space-y-1">
                              {item.submenu.map((subItem: any) => {
                                const SubIcon = subItem.icon;
                                const isSubActive = pathname === subItem.href;
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                                      isSubActive 
                                        ? 'bg-orange-100 text-[#f88910] font-medium' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                    )}
                                  >
                                    <SubIcon className="h-4 w-4" />
                                    {subItem.label}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                            isActive 
                              ? 'bg-orange-100 text-[#f88910] font-medium' 
                              : 'text-gray-700 hover:bg-gray-100'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                  
                  {/* User info in mobile menu */}
                  <div className="mt-6 mx-4 pt-4 border-t">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-[#f88910]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full mt-2 justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-5 w-5" />
                      Sair
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Sistema de Alertas */}
            <AlertsDropdown />

            {/* Login Notifications Bell - Somente Master User */}
            {isMaster && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#f88910]"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>
                    <div className="flex items-center justify-between">
                      <span>Acessos Recentes ao Sistema</span>
                      <Badge variant="secondary" className="ml-2">
                        {recentLogins.length}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-96 overflow-y-auto">
                    {recentLogins.length > 0 ? (
                      recentLogins.map((login: any) => (
                        <DropdownMenuItem key={login.id} className="flex flex-col items-start py-3">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium text-sm">{login.user.name}</span>
                            <Badge
                              variant={login.success ? 'default' : 'destructive'}
                              className={cn(
                                'text-xs',
                                login.success && 'bg-green-500'
                              )}
                            >
                              {login.success ? 'Sucesso' : 'Falha'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">{login.user.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(login.loginAt), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                          {login.ipAddress && (
                            <p className="text-xs text-gray-400">IP: {login.ipAddress}</p>
                          )}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Nenhum acesso recente
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/admin/logs"
                      className="w-full text-center text-[#f88910] font-medium"
                    >
                      Ver todos os logs
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {user?.role === 'master' && (
                      <Badge className="w-fit mt-1 bg-[#f88910]">Master User</Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="gap-2 text-red-600">
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      </div>
    </nav>
  );
}