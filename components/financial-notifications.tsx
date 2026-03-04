'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface Installment {
  id: string;
  proposalId: string;
  installmentNumber: number;
  dueDate: string;
  amount: string;
  status: string;
  proposal: {
    id: string;
    proposalCode: string;
    clientName: string;
  };
  payments: any[];
}

interface FinancialStats {
  totals: {
    receivable: string;
    pending: string;
    overdue: string;
  };
  counts: {
    pending: number;
    overdue: number;
  };
  upcoming: Installment[];
  overdue: Installment[];
  hasAccess?: boolean;
}

export function FinancialNotifications() {
  const router = useRouter();
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    fetchFinancialStats();
  }, []);

  const fetchFinancialStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/financial/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        // Verificar se o usuário tem acesso aos dados financeiros
        if (data.hasAccess === false) {
          setHasAccess(false);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#f88910]" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f88910]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  // Se o usuário não tem acesso a dados financeiros, não exibir o componente
  if (!hasAccess) {
    return null;
  }

  const hasOverdue = stats.overdue.length > 0;
  const hasUpcoming = stats.upcoming.length > 0;

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#f88910]" />
              Resumo Financeiro
            </CardTitle>
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/financeiro')}
              className="bg-[#f88910] hover:bg-[#e67e0f]"
            >
              Ver Tudo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  A Receber
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(stats.totals.receivable)}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-600">
                  Pendente
                </span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">
                {formatCurrency(stats.totals.pending)}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                {stats.counts.pending} parcela(s)
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  Atrasado
                </span>
              </div>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(stats.totals.overdue)}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {stats.counts.overdue} parcela(s)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Parcelas Atrasadas */}
      {hasOverdue && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Parcelas Atrasadas ({stats.overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.overdue.slice(0, 3).map((inst) => {
                const totalPaid = inst.payments.reduce(
                  (sum: number, p: any) => sum + parseFloat(p.amount),
                  0
                );
                const remaining = parseFloat(inst.amount) - totalPaid;

                return (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {inst.proposal.clientName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {inst.proposal.proposalCode} - Parcela {inst.installmentNumber}
                      </p>
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Venceu em:{' '}
                        {format(parseISO(inst.dueDate), "dd 'de' MMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(remaining)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {stats.overdue.length > 3 && (
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => router.push('/dashboard/financeiro')}
                >
                  Ver todas as {stats.overdue.length} parcelas atrasadas
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos Vencimentos */}
      {hasUpcoming && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#f88910]" />
              Próximos Vencimentos (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcoming.slice(0, 3).map((inst) => {
                const totalPaid = inst.payments.reduce(
                  (sum: number, p: any) => sum + parseFloat(p.amount),
                  0
                );
                const remaining = parseFloat(inst.amount) - totalPaid;

                return (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {inst.proposal.clientName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {inst.proposal.proposalCode} - Parcela {inst.installmentNumber}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Vence em:{' '}
                        {format(parseISO(inst.dueDate), "dd 'de' MMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#f88910]">
                        {formatCurrency(remaining)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {stats.upcoming.length > 3 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/dashboard/financeiro')}
                >
                  Ver todos os {stats.upcoming.length} vencimentos próximos
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há parcelas */}
      {!hasOverdue && !hasUpcoming && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">Nenhuma parcela próxima ou atrasada</p>
              <p className="text-sm mt-2">
                Suas finanças estão em dia!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
