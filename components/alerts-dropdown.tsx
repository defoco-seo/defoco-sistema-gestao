'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export function AlertsDropdown() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts?limit=10');
      if (!response.ok) return;

      const data = await response.json();
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    // Atualiza a cada 2 minutos
    const interval = setInterval(fetchAlerts, 120000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, fetchAlerts]);

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action: 'read' }),
      });
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  const handleDismiss = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action: 'dismiss' }),
      });
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao dispensar:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      fetchAlerts();
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial':
        return 'bg-green-100 text-green-700';
      case 'job':
        return 'bg-purple-100 text-purple-700';
      case 'proposal':
        return 'bg-blue-100 text-blue-700';
      case 'team':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
              className="h-auto py-1 px-2 text-xs"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Marcar todas
                </>
              )}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className={cn(
                  'flex flex-col items-start p-3 cursor-pointer',
                  !alert.isRead && 'bg-muted/50'
                )}
                onClick={() => {
                  if (!alert.isRead) handleMarkAsRead(alert.id);
                }}
              >
                <div className="flex items-start gap-3 w-full">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        !alert.isRead && 'font-semibold'
                      )}>
                        {alert.title}
                      </p>
                      {!alert.isRead && (
                        <div className="h-2 w-2 rounded-full bg-[#f88910]" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px] px-1.5 py-0', getCategoryColor(alert.category))}
                      >
                        {alert.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {alert.actionUrl && (
                      <Link href={alert.actionUrl} onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-red-500"
                      onClick={(e) => handleDismiss(alert.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
