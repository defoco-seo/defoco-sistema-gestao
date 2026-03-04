"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Palette, DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortalData {
  client: { name: string; email: string };
  proposal: {
    number: string;
    demandName: string;
    total: number;
    status: string;
    clientResponse: string | null;
    createdAt: string;
    validUntil: string;
    services: { title: string; description: string; quantity: number }[];
  };
  jobs: {
    id: string;
    number: string;
    title: string;
    status: string;
    deadline: string | null;
    createdAt: string;
    progress: number;
    tasks: { total: number; completed: number };
  }[];
  financial: {
    installments: {
      number: number;
      dueDate: string;
      amount: number;
      status: string;
    }[];
  };
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Recusada',
  briefing: 'Briefing',
  analysis: 'Análise',
  creation: 'Criação',
  adjustments: 'Ajustes',
  approval: 'Aprovação',
  completed: 'Concluído',
  paid: 'Pago',
  overdue: 'Atrasado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  briefing: 'bg-purple-100 text-purple-800 border-purple-200',
  analysis: 'bg-blue-100 text-blue-800 border-blue-200',
  creation: 'bg-orange-100 text-orange-800 border-orange-200',
  adjustments: 'bg-amber-100 text-amber-800 border-amber-200',
  approval: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
};

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/client-portal/${token}`);
        if (!response.ok) {
          const err = await response.json();
          setError(err.error || 'Erro ao carregar dados');
          return;
        }
        const result = await response.json();
        setData(result);
      } catch (e) {
        setError('Erro ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#f88910] mx-auto mb-4" />
          <p className="text-gray-600">Carregando seu portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acesso não autorizado</h2>
            <p className="text-gray-600">{error || 'Token inválido ou expirado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="relative w-32 h-10">
              <Image
                src="/logo-defoco.png"
                alt="Defoco"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="text-right">
              <p className="font-medium">{data.client.name}</p>
              <p className="text-sm text-gray-500">{data.client.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Portal do Cliente</h1>
          <p className="text-gray-600 mt-1">Acompanhe suas propostas, projetos e pagamentos</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="jobs">Projetos</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Cards de resumo */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <FileText className="h-6 w-6 text-[#f88910]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Proposta</p>
                      <p className="text-xl font-bold">{data.proposal.number}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Palette className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Projetos Ativos</p>
                      <p className="text-xl font-bold">{data.jobs.filter(j => j.status !== 'completed').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valor Total</p>
                      <p className="text-xl font-bold text-[#f88910]">
                        R$ {data.proposal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Proposta */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Proposta {data.proposal.number}</CardTitle>
                    <CardDescription>{data.proposal.demandName}</CardDescription>
                  </div>
                  <Badge className={cn(statusColors[data.proposal.status])}>
                    {statusLabels[data.proposal.status] || data.proposal.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500">Data da Proposta</p>
                      <p className="font-medium">
                        {format(new Date(data.proposal.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Válida até</p>
                      <p className="font-medium">
                        {format(new Date(data.proposal.validUntil), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Serviços Contratados</p>
                    <div className="space-y-2">
                      {data.proposal.services.map((service, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{service.title}</p>
                            <p className="text-sm text-gray-500">{service.description}</p>
                          </div>
                          <Badge variant="secondary">x{service.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projetos/Jobs */}
          <TabsContent value="jobs" className="space-y-4">
            {data.jobs.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Palette className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum projeto encontrado</p>
                </CardContent>
              </Card>
            ) : (
              data.jobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{job.title}</h3>
                          <Badge className={cn(statusColors[job.status])}>
                            {statusLabels[job.status] || job.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{job.number}</p>
                        
                        <div className="flex items-center gap-6 text-sm">
                          {job.deadline && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>Prazo: {format(new Date(job.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-gray-400" />
                            <span>{job.tasks.completed}/{job.tasks.total} tarefas</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-48">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-500">Progresso</span>
                          <span className="text-sm font-medium">{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Parcelas</CardTitle>
                <CardDescription>Acompanhe o status dos seus pagamentos</CardDescription>
              </CardHeader>
              <CardContent>
                {data.financial.installments.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma parcela cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.financial.installments.map((installment) => (
                      <div
                        key={installment.number}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg border',
                          installment.status === 'paid' && 'bg-green-50 border-green-200',
                          installment.status === 'overdue' && 'bg-red-50 border-red-200',
                          installment.status === 'pending' && 'bg-gray-50 border-gray-200'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center font-bold',
                            installment.status === 'paid' && 'bg-green-100 text-green-700',
                            installment.status === 'overdue' && 'bg-red-100 text-red-700',
                            installment.status === 'pending' && 'bg-gray-200 text-gray-700'
                          )}>
                            {installment.number}
                          </div>
                          <div>
                            <p className="font-medium">Parcela {installment.number}</p>
                            <p className="text-sm text-gray-500">
                              Vencimento: {format(new Date(installment.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            R$ {installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge className={cn(statusColors[installment.status])}>
                            {statusLabels[installment.status] || installment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="container mx-auto px-4 py-6 max-w-6xl text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Defoco. Todos os direitos reservados.</p>
          <p className="mt-1">www.defoco.com.br</p>
        </div>
      </footer>
    </div>
  );
}
