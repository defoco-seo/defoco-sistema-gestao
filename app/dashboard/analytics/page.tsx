'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  Briefcase,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

interface AnalyticsData {
  proposals: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    conversionRate: number;
  };
  revenue: {
    total: number;
    avgTicket: number;
    byMonth: { month: string; value: number; count: number }[];
  };
  topClients: { name: string; total: number; count: number }[];
  jobs: {
    byStatus: Record<string, number>;
    thisMonth: number;
    lastMonth: number;
    productivityChange: number;
  };
  crm: {
    leads: number;
    active: number;
    lost: number;
  };
  financial: {
    pendingInstallments: number;
    overdueInstallments: number;
    paidInstallments: number;
    pendingAmount: number;
  };
  proposalsByMonth: { month: string; total: number; approved: number; rejected: number }[];
}

const COLORS = ['#f88910', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const JOB_STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  analysis: 'Análise',
  creation: 'Criação',
  adjustments: 'Ajustes',
  approval: 'Aprovação',
  completed: 'Concluído',
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchAnalytics();
    }
  }, [status, router]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/stats');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  // Preparar dados para gráficos
  const proposalStatusData = [
    { name: 'Aprovadas', value: data.proposals.approved, color: '#22c55e' },
    { name: 'Pendentes', value: data.proposals.pending, color: '#f88910' },
    { name: 'Rejeitadas', value: data.proposals.rejected, color: '#ef4444' },
  ];

  const jobStatusData = Object.entries(data.jobs.byStatus).map(([status, count], index) => ({
    name: JOB_STATUS_LABELS[status] || status,
    value: count,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 md:h-7 md:w-7 text-[#f88910]" />
            Analytics Executivo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do desempenho da agência
          </p>
        </div>
      </div>

      {/* KPIs Principais - Grid Responsivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Taxa de Conversão */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-[#f88910]" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-[#f88910]">
              {data.proposals.conversionRate}%
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {data.proposals.approved} de {data.proposals.total} propostas
            </p>
            <Progress 
              value={data.proposals.conversionRate} 
              className="h-1.5 mt-2" 
            />
          </CardContent>
        </Card>

        {/* Receita Total */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600 truncate">
              {formatCurrency(data.revenue.total)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Ticket médio: {formatCurrency(data.revenue.avgTicket)}
            </p>
          </CardContent>
        </Card>

        {/* Produtividade */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Jobs Concluídos</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {data.jobs.thisMonth}
              <span className="text-sm font-normal text-muted-foreground ml-1">este mês</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] md:text-xs">
              {data.jobs.productivityChange >= 0 ? (
                <><ArrowUpRight className="h-3 w-3 text-green-600" />
                <span className="text-green-600">+{data.jobs.productivityChange}%</span></>
              ) : (
                <><ArrowDownRight className="h-3 w-3 text-red-600" />
                <span className="text-red-600">{data.jobs.productivityChange}%</span></>
              )}
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        {/* Financeiro */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">A Receber</CardTitle>
            {data.financial.overdueInstallments > 0 ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600" />
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold truncate">
              {formatCurrency(data.financial.pendingAmount)}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-[10px] px-1">
                {data.financial.pendingInstallments} pendentes
              </Badge>
              {data.financial.overdueInstallments > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1">
                  {data.financial.overdueInstallments} atrasadas
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos - Linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Evolução de Receita */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#f88910]" />
              Evolução de Receita
            </CardTitle>
            <CardDescription className="text-xs">Receita mensal (últimos 6 meses)</CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-[200px] md:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue.byMonth}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f88910" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f88910" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#f88910" 
                    strokeWidth={2}
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Volume de Propostas */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#f88910]" />
              Volume de Propostas
            </CardTitle>
            <CardDescription className="text-xs">Propostas por mês e resultado</CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-[200px] md:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.proposalsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="approved" name="Aprovadas" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="rejected" name="Rejeitadas" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos - Linha 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Status das Propostas (Pizza) */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-[#f88910]" />
              Status das Propostas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-[180px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={proposalStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {proposalStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-3 mt-2">
              {proposalStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-1 text-[10px] md:text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Jobs por Status */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#f88910]" />
              Jobs por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="space-y-2">
              {jobStatusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs md:text-sm">{item.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.value}
                  </Badge>
                </div>
              ))}
              {jobStatusData.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum job criativo registrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-[#f88910]" />
              Top 5 Clientes
            </CardTitle>
            <CardDescription className="text-xs">Por valor total aprovado</CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="space-y-3">
              {data.topClients.map((client, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm font-medium truncate max-w-[60%]">
                      {index + 1}. {client.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {client.count} prop.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(client.total / (data.topClients[0]?.total || 1)) * 100} 
                      className="h-1.5 flex-1" 
                    />
                    <span className="text-[10px] md:text-xs font-medium text-[#f88910] min-w-[70px] text-right">
                      {formatCurrency(client.total)}
                    </span>
                  </div>
                </div>
              ))}
              {data.topClients.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma proposta aprovada ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo CRM */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-[#f88910]" />
            Funil de Clientes (CRM)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <div className="text-center p-3 md:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-yellow-600">
                {data.crm.leads}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Leads</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-green-600">
                {data.crm.active}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ativos</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-red-600">
                {data.crm.lost}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Perdidos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
