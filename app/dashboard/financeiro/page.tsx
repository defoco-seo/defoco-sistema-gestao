'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  CalendarDays,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Plus,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  Link2,
  Copy,
  RefreshCw,
  Smartphone,
  PiggyBank,
  Brain,
  FileBarChart,
  Trash2,
  Edit,
  Building,
  Users,
  Receipt,
  Loader2,
  Send,
  BarChart3,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { QuickCalendarButton } from '@/components/calendar-buttons';

interface Installment {
  id: string;
  proposalId: string;
  installmentNumber: number;
  dueDate: string;
  amount: string;
  status: string;
  description?: string;
  proposal: {
    id: string;
    proposalCode: string;
    proposalNumber: string;
    demandName?: string;
    clientName: string;
    total: string;
  };
  payments: Payment[];
}

interface Payment {
  id: string;
  installmentId: string;
  amount: string;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
  receipt?: string;
}

interface Stats {
  totals: {
    receivable: string;
    received: string;
    pending: string;
    overdue: string;
  };
  counts: {
    pending: number;
    paid: number;
    overdue: number;
    total: number;
  };
  upcoming: Installment[];
  overdue: Installment[];
}

interface Proposal {
  id: string;
  proposalCode: string;
  proposalNumber: string;
  clientName: string;
  total: string;
  installments?: number;
  installmentDay?: number;
}

interface FixedCost {
  id: string;
  name: string;
  category: string;
  description?: string;
  amount: string;
  dueDay?: number;
  startDate: string;
  endDate?: string;
  hrContractId?: string;
  isActive: boolean;
}

interface AIAnalysis {
  resumo_executivo: string;
  saude_financeira: 'excelente' | 'boa' | 'atencao' | 'critica';
  pontos_fortes: string[];
  pontos_atencao: string[];
  recomendacoes: {
    prioridade: 'alta' | 'media' | 'baixa';
    titulo: string;
    descricao: string;
    impacto_esperado: string;
  }[];
  metricas_chave: {
    margem_operacional_estimada: string;
    cobertura_custos_fixos: string;
    taxa_inadimplencia: string;
  };
  previsao_proximos_meses: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  salario: 'Salários',
  aluguel: 'Aluguel',
  servico: 'Serviços',
  impostos: 'Impostos',
  marketing: 'Marketing',
  software: 'Software/Assinaturas',
  outros: 'Outros',
};

const CATEGORY_COLORS: Record<string, string> = {
  salario: '#ef4444',
  aluguel: '#f59e0b',
  servico: '#3b82f6',
  impostos: '#8b5cf6',
  marketing: '#ec4899',
  software: '#06b6d4',
  outros: '#6b7280',
};

export default function FinanceiroPage() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [stats, setStats] = useState<Stats | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Estado do calendário
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Estado da URL de assinatura
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [showCalendarSubscription, setShowCalendarSubscription] = useState(false);

  // Custos fixos
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [isLoadingCosts, setIsLoadingCosts] = useState(false);
  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [costForm, setCostForm] = useState({
    name: '',
    category: 'outros',
    description: '',
    amount: '',
    dueDay: '10',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
  });

  // Análise IA
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  // Relatórios
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [lastReport, setLastReport] = useState<any>(null);

  // Configuração de Impostos
  const [taxConfig, setTaxConfig] = useState<{
    currentConfig: {
      id: string | null;
      taxPercent: number;
      description: string | null;
      effectiveFrom: string;
      isActive: boolean;
    };
    history: {
      id: string;
      taxPercent: number;
      description: string | null;
      effectiveFrom: string;
      effectiveUntil: string | null;
      isActive: boolean;
      createdAt: string;
    }[];
  } | null>(null);
  const [isLoadingTax, setIsLoadingTax] = useState(false);
  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({
    taxPercent: '',
    description: '',
    effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
  });

  // Dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  // Form states
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'transferência',
    notes: '',
  });

  const [generateData, setGenerateData] = useState({
    numberOfInstallments: '',
    firstDueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    installmentDay: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchStats();
      fetchInstallments();
      fetchProposals();
      fetchFixedCosts();
      fetchTaxConfig();
    }
  }, [status, router]);

  const fetchTaxConfig = async () => {
    try {
      setIsLoadingTax(true);
      const response = await fetch('/api/financial/tax-config');
      if (response.ok) {
        const data = await response.json();
        setTaxConfig(data);
      }
    } catch (error) {
      console.error('Erro ao buscar configuração de imposto:', error);
    } finally {
      setIsLoadingTax(false);
    }
  };

  const handleSaveTaxConfig = async () => {
    try {
      if (!taxForm.taxPercent) {
        toast.error('Informe o percentual do imposto');
        return;
      }

      const response = await fetch('/api/financial/tax-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxPercent: parseFloat(taxForm.taxPercent),
          description: taxForm.description || null,
          effectiveFrom: taxForm.effectiveFrom,
        }),
      });

      if (response.ok) {
        toast.success('Configuração de imposto atualizada!');
        setIsTaxDialogOpen(false);
        setTaxForm({
          taxPercent: '',
          description: '',
          effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
        });
        fetchTaxConfig();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração de imposto:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  // Calcular impacto do imposto nos recebíveis
  const calculateTaxImpact = () => {
    if (!stats || !taxConfig) return null;
    
    const receivable = parseFloat(stats.totals.receivable) || 0;
    const pending = parseFloat(stats.totals.pending) || 0;
    const taxPercent = taxConfig.currentConfig.taxPercent;
    
    const taxOnReceivable = receivable * (taxPercent / 100);
    const taxOnPending = pending * (taxPercent / 100);
    const netReceivable = receivable - taxOnReceivable;
    const netPending = pending - taxOnPending;
    
    return {
      taxPercent,
      receivable,
      taxOnReceivable,
      netReceivable,
      pending,
      taxOnPending,
      netPending,
    };
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/financial/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao buscar estatísticas');
    }
  };

  const fetchInstallments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/financial/installments');
      if (response.ok) {
        const data = await response.json();
        setInstallments(data);
      }
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      toast.error('Erro ao buscar parcelas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProposals = async () => {
    try {
      const response = await fetch('/api/proposals');
      if (response.ok) {
        const data = await response.json();
        // Filtrar apenas propostas aprovadas
        const approved = data.filter((p: Proposal) => p.installments && p.installments > 0);
        setProposals(approved);
      }
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
    }
  };

  // Funções de Custos Fixos
  const fetchFixedCosts = async () => {
    try {
      setIsLoadingCosts(true);
      const response = await fetch('/api/financial/fixed-costs');
      if (response.ok) {
        const data = await response.json();
        setFixedCosts(data);
      }
    } catch (error) {
      console.error('Erro ao buscar custos fixos:', error);
    } finally {
      setIsLoadingCosts(false);
    }
  };

  const handleSaveCost = async () => {
    try {
      const url = editingCost
        ? `/api/financial/fixed-costs/${editingCost.id}`
        : '/api/financial/fixed-costs';
      const method = editingCost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...costForm,
          endDate: costForm.endDate || null,
        }),
      });

      if (response.ok) {
        toast.success(editingCost ? 'Custo atualizado!' : 'Custo cadastrado!');
        setIsCostDialogOpen(false);
        setEditingCost(null);
        setCostForm({
          name: '',
          category: 'outros',
          description: '',
          amount: '',
          dueDay: '10',
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: '',
        });
        fetchFixedCosts();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar custo');
      }
    } catch (error) {
      console.error('Erro ao salvar custo:', error);
      toast.error('Erro ao salvar custo');
    }
  };

  const handleEditCost = (cost: FixedCost) => {
    setEditingCost(cost);
    setCostForm({
      name: cost.name,
      category: cost.category,
      description: cost.description || '',
      amount: cost.amount,
      dueDay: cost.dueDay?.toString() || '10',
      startDate: format(new Date(cost.startDate), 'yyyy-MM-dd'),
      endDate: cost.endDate ? format(new Date(cost.endDate), 'yyyy-MM-dd') : '',
    });
    setIsCostDialogOpen(true);
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm('Deseja excluir este custo?')) return;
    try {
      const response = await fetch(`/api/financial/fixed-costs/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Custo removido!');
        fetchFixedCosts();
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir custo');
    }
  };

  // Análise IA
  const fetchAIAnalysis = async () => {
    try {
      setIsLoadingAnalysis(true);
      const response = await fetch('/api/financial/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analise);
        setFinancialData(data.dados_financeiros);
      } else {
        toast.error('Erro ao gerar análise');
      }
    } catch (error) {
      console.error('Erro na análise IA:', error);
      toast.error('Erro ao gerar análise');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Relatórios
  const [reportEmail, setReportEmail] = useState('paulo@defoco.com.br');
  
  const generateReport = async (sendEmail: boolean = false) => {
    try {
      setIsGeneratingReport(true);
      const response = await fetch('/api/financial/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail, email: reportEmail }),
      });
      if (response.ok) {
        const data = await response.json();
        setLastReport(data);
        toast.success(sendEmail ? `Relatório gerado e enviado para ${reportEmail}!` : 'Relatório gerado!');
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || 'Erro ao gerar relatório');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Cálculos para gráficos
  const totalFixedCostsMonthly = useMemo(() => {
    return fixedCosts
      .filter(c => c.isActive)
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
  }, [fixedCosts]);

  const costsByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    fixedCosts.filter(c => c.isActive).forEach(cost => {
      grouped[cost.category] = (grouped[cost.category] || 0) + parseFloat(cost.amount);
    });
    return Object.entries(grouped).map(([category, value]) => ({
      name: CATEGORY_LABELS[category] || category,
      value,
      color: CATEGORY_COLORS[category] || '#6b7280',
    }));
  }, [fixedCosts]);

  const handleOpenPaymentDialog = (installment: Installment) => {
    setSelectedInstallment(installment);
    const totalPaid = installment.payments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );
    const remaining = parseFloat(installment.amount) - totalPaid;
    setPaymentData({
      amount: remaining.toFixed(2),
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'transferência',
      notes: '',
    });
    setIsPaymentDialogOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedInstallment) return;

    try {
      const response = await fetch('/api/financial/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installmentId: selectedInstallment.id,
          amount: parseFloat(paymentData.amount),
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes || null,
        }),
      });

      if (response.ok) {
        toast.success('Pagamento registrado com sucesso!');
        setIsPaymentDialogOpen(false);
        fetchStats();
        fetchInstallments();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao registrar pagamento');
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleOpenGenerateDialog = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setGenerateData({
      numberOfInstallments: proposal.installments?.toString() || '',
      firstDueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      installmentDay: proposal.installmentDay?.toString() || '',
    });
    setIsGenerateDialogOpen(true);
  };

  const handleGenerateInstallments = async () => {
    if (!selectedProposal) return;

    try {
      const response = await fetch('/api/financial/generate-installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: selectedProposal.id,
          numberOfInstallments: parseInt(generateData.numberOfInstallments),
          firstDueDate: generateData.firstDueDate,
          installmentDay: generateData.installmentDay
            ? parseInt(generateData.installmentDay)
            : null,
        }),
      });

      if (response.ok) {
        toast.success('Parcelas geradas com sucesso!');
        setIsGenerateDialogOpen(false);
        fetchStats();
        fetchInstallments();
        fetchProposals();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao gerar parcelas');
      }
    } catch (error) {
      console.error('Erro ao gerar parcelas:', error);
      toast.error('Erro ao gerar parcelas');
    }
  };

  // Funções para URL de assinatura do calendário
  const fetchCalendarToken = async () => {
    setIsLoadingToken(true);
    try {
      const response = await fetch('/api/financial/calendar-token');
      if (response.ok) {
        const data = await response.json();
        setCalendarToken(data.token);
      } else {
        toast.error('Erro ao buscar token do calendário');
      }
    } catch (error) {
      console.error('Erro ao buscar token:', error);
      toast.error('Erro ao buscar token do calendário');
    } finally {
      setIsLoadingToken(false);
    }
  };

  const regenerateCalendarToken = async () => {
    setIsLoadingToken(true);
    try {
      const response = await fetch('/api/financial/calendar-token', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setCalendarToken(data.token);
        toast.success('Token regenerado! Atualize a assinatura no Apple Calendar.');
      } else {
        toast.error('Erro ao regenerar token');
      }
    } catch (error) {
      console.error('Erro ao regenerar token:', error);
      toast.error('Erro ao regenerar token');
    } finally {
      setIsLoadingToken(false);
    }
  };

  const getCalendarSubscriptionUrl = () => {
    if (!calendarToken) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://defoco.abacusai.app';
    return `${baseUrl}/api/financial/calendar?token=${calendarToken}`;
  };

  const copyCalendarUrl = () => {
    const url = getCalendarSubscriptionUrl();
    navigator.clipboard.writeText(url);
    toast.success('URL copiada! Cole no Apple Calendar.');
  };

  const downloadICS = (installment: Installment) => {
    const dueDate = new Date(installment.dueDate);
    const startDate = format(dueDate, "yyyyMMdd'T'HHmmss");
    const endDate = format(new Date(dueDate.getTime() + 60 * 60 * 1000), "yyyyMMdd'T'HHmmss");

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Defoco//Financeiro//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${installment.id}@defoco.app`,
      `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:Vencimento: ${installment.proposal.clientName} - Parcela ${installment.installmentNumber}`,
      `DESCRIPTION:Cliente: ${installment.proposal.clientName}\\nProposta: ${installment.proposal.proposalCode || installment.proposal.proposalNumber}\\nValor: R$ ${parseFloat(installment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Lembrete de vencimento',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `parcela_${installment.proposal.proposalCode}_${installment.installmentNumber}.ics`;
    link.click();
    toast.success('Arquivo .ics baixado com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" /> Atrasado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  // Funções do calendário
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = addDays(monthStart, -monthStart.getDay()); // Começa no domingo
    const endDate = addDays(monthEnd, 6 - monthEnd.getDay()); // Termina no sábado
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const getInstallmentsForDate = (date: Date) => {
    return installments.filter((inst) => {
      const dueDate = parseISO(inst.dueDate);
      return isSameDay(dueDate, date);
    });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    const dayInstallments = getInstallmentsForDate(date);
    if (dayInstallments.length > 0) {
      setSelectedDate(date);
    }
  };

  const downloadAllICSForMonth = () => {
    const monthInstallments = installments.filter((inst) => {
      const dueDate = parseISO(inst.dueDate);
      return isSameMonth(dueDate, currentMonth) && inst.status !== 'paid';
    });

    if (monthInstallments.length === 0) {
      toast.error('Nenhum vencimento pendente neste mês');
      return;
    }

    const events = monthInstallments.map((inst) => {
      const dueDate = new Date(inst.dueDate);
      const startDate = format(dueDate, "yyyyMMdd'T'090000");
      const endDate = format(dueDate, "yyyyMMdd'T'100000");
      const totalPaid = inst.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const remaining = parseFloat(inst.amount) - totalPaid;

      return [
        'BEGIN:VEVENT',
        `UID:${inst.id}@defoco.app`,
        `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:💰 ${inst.proposal.clientName} - ${formatCurrency(remaining)}`,
        `DESCRIPTION:Cliente: ${inst.proposal.clientName}\\nProposta: ${inst.proposal.proposalCode || inst.proposal.proposalNumber}\\nParcela: ${inst.installmentNumber}\\nValor: ${formatCurrency(remaining)}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Vencimento amanhã',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT2H',
        'ACTION:DISPLAY',
        'DESCRIPTION:Vencimento em 2 horas',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');
    });

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Defoco//Financeiro//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Defoco - Vencimentos',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vencimentos_defoco_${format(currentMonth, 'yyyy_MM')}.ics`;
    link.click();
    toast.success(`${monthInstallments.length} eventos baixados para o calendário!`);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f88910]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 mt-1">Gerencie os pagamentos e recebimentos</p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
              <DollarSign className="h-4 w-4 text-[#f88910]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totals.receivable)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.counts.total} parcelas no total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Já Recebido</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totals.received)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.counts.paid} parcelas pagas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(stats.totals.pending)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.counts.pending} parcelas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasado</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totals.overdue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.counts.overdue} parcelas atrasadas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-1">
            <PiggyBank className="w-4 h-4" />
            Custos Fixos
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-1">
            <Receipt className="w-4 h-4" />
            Impostos
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-1">
            <Brain className="w-4 h-4" />
            Análise IA
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <FileBarChart className="w-4 h-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="installments">Parcelas</TabsTrigger>
          <TabsTrigger value="generate">Gerar Parcelas</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Próximos Vencimentos */}
          {stats && stats.upcoming.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#f88910]" />
                  Próximos Vencimentos (30 dias)
                </CardTitle>
                <CardDescription>
                  Parcelas com vencimento nos próximos 30 dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.upcoming.map((inst) => {
                    const totalPaid = inst.payments.reduce(
                      (sum, p) => sum + parseFloat(p.amount),
                      0
                    );
                    const remaining = parseFloat(inst.amount) - totalPaid;

                    return (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-gray-900">
                              {inst.proposal.clientName}
                            </span>
                            {getStatusBadge(inst.status)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {inst.proposal.proposalCode || inst.proposal.proposalNumber} -{' '}
                            Parcela {inst.installmentNumber}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Vencimento:{' '}
                            {format(parseISO(inst.dueDate), "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-lg font-bold text-[#f88910]">
                              {formatCurrency(remaining)}
                            </p>
                            {inst.payments.length > 0 && (
                              <p className="text-xs text-gray-500">
                                Pago: {formatCurrency(totalPaid)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <QuickCalendarButton
                              type="installment_due"
                              title={`Parcela ${inst.installmentNumber} - ${inst.proposal.clientName}`}
                              date={new Date(inst.dueDate)}
                              clientName={inst.proposal.clientName}
                              value={parseFloat(inst.amount)}
                            />
                            {inst.status !== 'paid' && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPaymentDialog(inst)}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Registrar Pagamento
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parcelas Atrasadas */}
          {stats && stats.overdue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Parcelas Atrasadas
                </CardTitle>
                <CardDescription>
                  Parcelas vencidas que precisam de atenção
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.overdue.map((inst) => {
                    const totalPaid = inst.payments.reduce(
                      (sum, p) => sum + parseFloat(p.amount),
                      0
                    );
                    const remaining = parseFloat(inst.amount) - totalPaid;

                    return (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-gray-900">
                              {inst.proposal.clientName}
                            </span>
                            {getStatusBadge('overdue')}
                          </div>
                          <p className="text-sm text-gray-600">
                            {inst.proposal.proposalCode || inst.proposal.proposalNumber} -{' '}
                            Parcela {inst.installmentNumber}
                          </p>
                          <p className="text-xs text-red-600 font-medium mt-1">
                            Venceu em:{' '}
                            {format(parseISO(inst.dueDate), "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-lg font-bold text-red-600">
                              {formatCurrency(remaining)}
                            </p>
                            {inst.payments.length > 0 && (
                              <p className="text-xs text-gray-500">
                                Pago: {formatCurrency(totalPaid)}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOpenPaymentDialog(inst)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Registrar Pagamento
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calendário de Vencimentos */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#f88910]" />
                    Calendário de Vencimentos
                  </CardTitle>
                  <CardDescription>
                    Visualize todos os vencimentos no calendário
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold text-lg min-w-[180px] text-center">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAllICSForMonth}
                    className="ml-4"
                    title="Baixar todos os vencimentos do mês para o calendário"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Exportar Mês
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Header dos dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid do calendário */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayInstallments = getInstallmentsForDate(day);
                  const hasInstallments = dayInstallments.length > 0;
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  
                  // Calcular totais do dia
                  const totalPending = dayInstallments
                    .filter((i) => i.status !== 'paid')
                    .reduce((sum, i) => {
                      const totalPaid = i.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
                      return sum + parseFloat(i.amount) - totalPaid;
                    }, 0);
                  
                  const hasOverdue = dayInstallments.some(
                    (i) => parseISO(i.dueDate) < new Date() && i.status !== 'paid'
                  );
                  const hasPaid = dayInstallments.some((i) => i.status === 'paid');
                  const allPaid = dayInstallments.every((i) => i.status === 'paid');

                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`
                        min-h-[90px] p-2 border rounded-lg transition-all cursor-pointer
                        ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                        ${isTodayDate ? 'ring-2 ring-[#f88910]' : ''}
                        ${isSelected ? 'bg-orange-50 border-[#f88910]' : ''}
                        ${hasInstallments && !allPaid ? 'hover:bg-orange-50 hover:border-[#f88910]' : 'hover:bg-gray-50'}
                        ${hasOverdue ? 'border-red-300 bg-red-50' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className={`
                            text-sm font-medium
                            ${isTodayDate ? 'bg-[#f88910] text-white px-1.5 py-0.5 rounded-full' : ''}
                          `}
                        >
                          {format(day, 'd')}
                        </span>
                        {hasInstallments && (
                          <span
                            className={`
                              text-xs px-1.5 py-0.5 rounded-full font-medium
                              ${allPaid ? 'bg-green-100 text-green-700' : hasOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
                            `}
                          >
                            {dayInstallments.length}
                          </span>
                        )}
                      </div>
                      
                      {/* Preview dos vencimentos */}
                      {hasInstallments && isCurrentMonth && (
                        <div className="mt-1 space-y-1">
                          {dayInstallments.slice(0, 2).map((inst) => {
                            const totalPaid = inst.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
                            const remaining = parseFloat(inst.amount) - totalPaid;
                            const isPaid = inst.status === 'paid';
                            
                            return (
                              <div
                                key={inst.id}
                                className={`
                                  text-xs p-1 rounded truncate
                                  ${isPaid ? 'bg-green-100 text-green-800 line-through' : hasOverdue && parseISO(inst.dueDate) < new Date() ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}
                                `}
                                title={`${inst.proposal.clientName} - ${formatCurrency(remaining)}`}
                              >
                                <span className="font-medium">{inst.proposal.clientName.split(' ')[0]}</span>
                                <span className="ml-1">{formatCurrency(remaining)}</span>
                              </div>
                            );
                          })}
                          {dayInstallments.length > 2 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{dayInstallments.length - 2} mais
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
                  <span>Pendente</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                  <span>Atrasado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                  <span>Pago</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded ring-2 ring-[#f88910]"></div>
                  <span>Hoje</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sincronizar com Apple Calendar */}
          <Card className="border-[#f88910]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Smartphone className="h-5 w-5 text-[#f88910]" />
                    Sincronizar com Apple Calendar
                  </CardTitle>
                  <CardDescription>
                    Assine o calendário e receba atualizações automáticas no seu iPhone/Mac
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCalendarSubscription(!showCalendarSubscription);
                    if (!calendarToken && !showCalendarSubscription) {
                      fetchCalendarToken();
                    }
                  }}
                >
                  {showCalendarSubscription ? 'Ocultar' : 'Configurar'}
                </Button>
              </div>
            </CardHeader>
            {showCalendarSubscription && (
              <CardContent className="pt-0">
                {isLoadingToken ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin text-[#f88910]" />
                    <span className="ml-2 text-gray-600">Carregando...</span>
                  </div>
                ) : calendarToken ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        URL de Assinatura do Calendário
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={getCalendarSubscriptionUrl()}
                          className="font-mono text-xs bg-white"
                        />
                        <Button
                          size="sm"
                          onClick={copyCalendarUrl}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar
                        </Button>
                      </div>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-[#f88910]" />
                        Como adicionar no Apple Calendar:
                      </h4>
                      <ol className="text-sm text-gray-700 space-y-2 ml-6 list-decimal">
                        <li><strong>iPhone/iPad:</strong> Ajustes → Calendário → Contas → Adicionar Conta → Outra → Adicionar Assinatura de Calendário → Cole a URL</li>
                        <li><strong>Mac:</strong> Abra o app Calendário → Arquivo → Nova Assinatura de Calendário → Cole a URL</li>
                        <li>O calendário será atualizado automaticamente a cada hora</li>
                      </ol>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        💡 Alertas: 1 dia antes, 2h antes, e 2 dias depois (verificar pagamento)
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={regenerateCalendarToken}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={isLoadingToken}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Regenerar Token
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Button onClick={fetchCalendarToken}>
                      <Link2 className="h-4 w-4 mr-2" />
                      Gerar URL de Assinatura
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Detalhes do dia selecionado */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Vencimentos em {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getInstallmentsForDate(selectedDate).map((inst) => {
                    const totalPaid = inst.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                    const remaining = parseFloat(inst.amount) - totalPaid;
                    const isPaid = inst.status === 'paid';
                    const isOverdue = parseISO(inst.dueDate) < new Date() && !isPaid;

                    return (
                      <div
                        key={inst.id}
                        className={`
                          flex items-center justify-between p-4 border rounded-lg
                          ${isPaid ? 'bg-green-50 border-green-200' : isOverdue ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'}
                        `}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-gray-900">
                              {inst.proposal.clientName}
                            </span>
                            {getStatusBadge(isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending')}
                          </div>
                          <p className="text-sm text-gray-600">
                            {inst.proposal.proposalCode || inst.proposal.proposalNumber} -{' '}
                            Parcela {inst.installmentNumber}
                          </p>
                          {inst.proposal.demandName && (
                            <p className="text-xs text-gray-500 mt-1">
                              Demanda: {inst.proposal.demandName}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p
                              className={`text-lg font-bold ${
                                isPaid ? 'text-green-600' : isOverdue ? 'text-red-600' : 'text-[#f88910]'
                              }`}
                            >
                              {formatCurrency(remaining)}
                            </p>
                            {inst.payments.length > 0 && (
                              <p className="text-xs text-gray-500">
                                Pago: {formatCurrency(totalPaid)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <QuickCalendarButton
                              type="installment_due"
                              title={`Parcela ${inst.installmentNumber} - ${inst.proposal.clientName}`}
                              date={new Date(inst.dueDate)}
                              clientName={inst.proposal.clientName}
                              value={parseFloat(inst.amount)}
                            />
                            {!isPaid && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPaymentDialog(inst)}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Custos Fixos */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card de Total */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-red-500" />
                  Total Custos Fixos
                </CardTitle>
                <CardDescription>Valor mensal comprometido</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {formatCurrency(totalFixedCostsMonthly)}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {fixedCosts.filter(c => c.isActive).length} custos ativos
                </p>
                <Button
                  className="w-full mt-4 bg-[#f88910] hover:bg-[#e07800]"
                  onClick={() => {
                    setEditingCost(null);
                    setCostForm({
                      name: '',
                      category: 'outros',
                      description: '',
                      amount: '',
                      dueDay: '10',
                      startDate: format(new Date(), 'yyyy-MM-dd'),
                      endDate: '',
                    });
                    setIsCostDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Custo
                </Button>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {costsByCategory.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costsByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {costsByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum custo cadastrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lista de Custos */}
          <Card>
            <CardHeader>
              <CardTitle>Custos Cadastrados</CardTitle>
              <CardDescription>Gerencie seus custos fixos mensais</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCosts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
                </div>
              ) : fixedCosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PiggyBank className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum custo cadastrado</p>
                  <p className="text-sm mt-1">Adicione seus custos fixos para acompanhar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fixedCosts.map((cost) => (
                    <div
                      key={cost.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        cost.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-3 h-10 rounded"
                          style={{ backgroundColor: CATEGORY_COLORS[cost.category] || '#6b7280' }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{cost.name}</span>
                            {cost.hrContractId && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                RH
                              </Badge>
                            )}
                            {!cost.isActive && (
                              <Badge variant="secondary" className="text-xs">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {CATEGORY_LABELS[cost.category]} • Vence dia {cost.dueDay || 10} • Desde {format(new Date(cost.startDate), 'dd/MM/yyyy')}
                            {cost.endDate && ` até ${format(new Date(cost.endDate), 'dd/MM/yyyy')}`}
                          </p>
                          {cost.description && (
                            <p className="text-xs text-gray-400 mt-1">{cost.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(parseFloat(cost.amount))}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCost(cost)}
                            disabled={!!cost.hrContractId}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteCost(cost.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impostos */}
        <TabsContent value="tax" className="space-y-6">
          {/* Configuração Atual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-purple-500" />
                      Taxa de Imposto Atual
                    </CardTitle>
                    <CardDescription>
                      Percentual aplicado sobre os recebíveis
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setTaxForm({
                        taxPercent: taxConfig?.currentConfig.taxPercent.toString() || '12',
                        description: '',
                        effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
                      });
                      setIsTaxDialogOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Alterar Taxa
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTax ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : taxConfig ? (
                  <div className="space-y-4">
                    <div className="text-center py-6 bg-purple-50 rounded-lg">
                      <p className="text-5xl font-bold text-purple-600">
                        {taxConfig.currentConfig.taxPercent}%
                      </p>
                      <p className="text-sm text-purple-600 mt-2">
                        Taxa vigente
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vigente desde:</span>
                        <span className="font-medium">
                          {format(new Date(taxConfig.currentConfig.effectiveFrom), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      {taxConfig.currentConfig.description && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Descrição:</span>
                          <span className="font-medium">{taxConfig.currentConfig.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500">Nenhuma configuração definida</p>
                    <p className="text-sm text-gray-400 mt-1">Usando padrão: 12%</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Impacto nos Recebíveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Impacto nos Recebíveis
                </CardTitle>
                <CardDescription>
                  Quanto do seu faturamento será destinado a impostos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const impact = calculateTaxImpact();
                  if (!impact) {
                    return (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-gray-400">Carregando dados...</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-600">Total a Receber</p>
                          <p className="text-xl font-bold text-blue-700">
                            {formatCurrency(impact.receivable)}
                          </p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-600">Imposto Estimado ({impact.taxPercent}%)</p>
                          <p className="text-xl font-bold text-red-700">
                            {formatCurrency(impact.taxOnReceivable)}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600">Valor Líquido Estimado</p>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(impact.netReceivable)}
                        </p>
                      </div>
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium text-gray-700 mb-3">Parcelas Pendentes</h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-gray-500">Pendente</p>
                            <p className="font-semibold">{formatCurrency(impact.pending)}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-gray-500">Imposto</p>
                            <p className="font-semibold text-red-600">{formatCurrency(impact.taxOnPending)}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-gray-500">Líquido</p>
                            <p className="font-semibold text-green-600">{formatCurrency(impact.netPending)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Alterações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                Histórico de Alterações
              </CardTitle>
              <CardDescription>
                Registro de todas as alterações na taxa de imposto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTax ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : taxConfig && taxConfig.history.length > 0 ? (
                <div className="space-y-3">
                  {taxConfig.history.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg ${
                        item.isActive && !item.effectiveUntil
                          ? 'border-purple-200 bg-purple-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            item.isActive && !item.effectiveUntil
                              ? 'bg-purple-100'
                              : 'bg-gray-200'
                          }`}>
                            <Receipt className={`h-4 w-4 ${
                              item.isActive && !item.effectiveUntil
                                ? 'text-purple-600'
                                : 'text-gray-500'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {item.taxPercent}%
                              {item.isActive && !item.effectiveUntil && (
                                <Badge className="ml-2 bg-purple-600">Atual</Badge>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.description || 'Sem descrição'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-600">
                            Vigente a partir de:{' '}
                            {format(new Date(item.effectiveFrom), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          {item.effectiveUntil && (
                            <p className="text-gray-400">
                              Até: {format(new Date(item.effectiveUntil), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Nenhuma alteração registrada</p>
                  <p className="text-sm text-gray-400">O sistema está usando a taxa padrão de 12%</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análise IA */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Análise Financeira com IA
                  </CardTitle>
                  <CardDescription>
                    Análise inteligente dos seus dados financeiros com recomendações personalizadas
                  </CardDescription>
                </div>
                <Button
                  onClick={fetchAIAnalysis}
                  disabled={isLoadingAnalysis}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoadingAnalysis ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Gerar Análise
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!aiAnalysis && !isLoadingAnalysis && (
                <div className="text-center py-12 text-gray-500">
                  <Brain className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Clique em "Gerar Análise" para receber insights da IA</p>
                  <p className="text-sm mt-2">A IA analisará seus custos, receitas e sugerirá melhorias</p>
                </div>
              )}

              {aiAnalysis && (
                <div className="space-y-6">
                  {/* Resumo e Saúde Financeira */}
                  <div className={`p-4 rounded-lg border-l-4 ${
                    aiAnalysis.saude_financeira === 'excelente' ? 'bg-green-50 border-green-500' :
                    aiAnalysis.saude_financeira === 'boa' ? 'bg-blue-50 border-blue-500' :
                    aiAnalysis.saude_financeira === 'atencao' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-red-50 border-red-500'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${
                        aiAnalysis.saude_financeira === 'excelente' ? 'bg-green-500' :
                        aiAnalysis.saude_financeira === 'boa' ? 'bg-blue-500' :
                        aiAnalysis.saude_financeira === 'atencao' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}>
                        Saúde Financeira: {aiAnalysis.saude_financeira.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-gray-700">{aiAnalysis.resumo_executivo}</p>
                  </div>

                  {/* Métricas */}
                  {aiAnalysis.metricas_chave && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Margem Operacional</p>
                        <p className="text-xl font-bold">{aiAnalysis.metricas_chave.margem_operacional_estimada}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Cobertura de Custos</p>
                        <p className="text-xl font-bold">{aiAnalysis.metricas_chave.cobertura_custos_fixos}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Taxa Inadimplência</p>
                        <p className="text-xl font-bold">{aiAnalysis.metricas_chave.taxa_inadimplencia}</p>
                      </div>
                    </div>
                  )}

                  {/* Pontos Fortes e Atenção */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Pontos Fortes
                      </h4>
                      <ul className="space-y-1">
                        {aiAnalysis.pontos_fortes?.map((ponto, i) => (
                          <li key={i} className="text-sm text-green-700">• {ponto}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Pontos de Atenção
                      </h4>
                      <ul className="space-y-1">
                        {aiAnalysis.pontos_atencao?.map((ponto, i) => (
                          <li key={i} className="text-sm text-yellow-700">• {ponto}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recomendações */}
                  {aiAnalysis.recomendacoes && aiAnalysis.recomendacoes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Recomendações</h4>
                      <div className="space-y-3">
                        {aiAnalysis.recomendacoes.map((rec, i) => (
                          <div key={i} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                rec.prioridade === 'alta' ? 'destructive' :
                                rec.prioridade === 'media' ? 'default' : 'secondary'
                              }>
                                {rec.prioridade.toUpperCase()}
                              </Badge>
                              <span className="font-semibold">{rec.titulo}</span>
                            </div>
                            <p className="text-sm text-gray-600">{rec.descricao}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              <strong>Impacto esperado:</strong> {rec.impacto_esperado}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previsão */}
                  {aiAnalysis.previsao_proximos_meses && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-2">Previsão para os Próximos Meses</h4>
                      <p className="text-sm text-purple-700">{aiAnalysis.previsao_proximos_meses}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileBarChart className="h-5 w-5 text-blue-500" />
                    Relatórios Financeiros
                  </CardTitle>
                  <CardDescription>
                    Gere relatórios semanais com análise da IA e envie por email
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="report-email" className="text-sm text-gray-500 whitespace-nowrap">Enviar para:</Label>
                    <Input
                      id="report-email"
                      type="email"
                      value={reportEmail}
                      onChange={(e) => setReportEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-48"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => generateReport(false)}
                    disabled={isGeneratingReport}
                  >
                    {isGeneratingReport ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileBarChart className="h-4 w-4 mr-2" />
                    )}
                    Gerar
                  </Button>
                  <Button
                    onClick={() => generateReport(true)}
                    disabled={isGeneratingReport || !reportEmail}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isGeneratingReport ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Gerar e Enviar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!lastReport && !isGeneratingReport && (
                <div className="text-center py-12 text-gray-500">
                  <FileBarChart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Gere um relatório financeiro semanal</p>
                  <p className="text-sm mt-2">O relatório inclui receitas, custos e análise da IA</p>
                </div>
              )}

              {lastReport && (
                <div className="space-y-6">
                  {/* Período */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Período: {lastReport.report?.periodo?.inicio} a {lastReport.report?.periodo?.fim}</span>
                  </div>

                  {/* Cards de Resumo */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600">Receita da Semana</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(lastReport.report?.receitas?.esta_semana || 0)}
                      </p>
                      <p className="text-xs text-green-600">
                        {parseFloat(lastReport.report?.receitas?.variacao || '0') >= 0 ? '↑' : '↓'}{' '}
                        {Math.abs(parseFloat(lastReport.report?.receitas?.variacao || '0'))}% vs semana anterior
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">Custos Fixos Mensais</p>
                      <p className="text-2xl font-bold text-red-700">
                        {formatCurrency(lastReport.report?.custos_fixos?.total_mensal || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-600">A Receber</p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {formatCurrency(lastReport.report?.contas_a_receber?.total || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600">Em Atraso</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {formatCurrency(lastReport.report?.contas_a_receber?.em_atraso || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Análise da IA */}
                  {lastReport.analysis && (
                    <div className={`p-4 rounded-lg border-l-4 ${
                      lastReport.analysis.saude_financeira === 'excelente' ? 'bg-green-50 border-green-500' :
                      lastReport.analysis.saude_financeira === 'boa' ? 'bg-blue-50 border-blue-500' :
                      lastReport.analysis.saude_financeira === 'atencao' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-red-50 border-red-500'
                    }`}>
                      <Badge className={`mb-2 ${
                        lastReport.analysis.saude_financeira === 'excelente' ? 'bg-green-500' :
                        lastReport.analysis.saude_financeira === 'boa' ? 'bg-blue-500' :
                        lastReport.analysis.saude_financeira === 'atencao' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}>
                        {lastReport.analysis.saude_financeira?.toUpperCase()}
                      </Badge>
                      <p className="text-gray-700 mb-3">{lastReport.analysis.resumo}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-green-700">✓ Destaque</p>
                          <p className="text-gray-600">{lastReport.analysis.destaque_positivo}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-yellow-700">! Atenção</p>
                          <p className="text-gray-600">{lastReport.analysis.ponto_atencao}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-blue-700">→ Ação</p>
                          <p className="text-gray-600">{lastReport.analysis.acao_recomendada}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Atividades */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-gray-500">Propostas Aprovadas na Semana</p>
                      <p className="text-3xl font-bold text-[#f88910]">
                        {lastReport.report?.atividades_semana?.propostas_aprovadas || 0}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-gray-500">Novos Contratos RH na Semana</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {lastReport.report?.atividades_semana?.novos_contratos_rh || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Todas as Parcelas */}
        <TabsContent value="installments">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Parcelas</CardTitle>
              <CardDescription>
                Listagem completa de todas as parcelas cadastradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {installments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma parcela cadastrada ainda.</p>
                  <p className="text-sm mt-2">
                    Gere parcelas a partir de propostas aprovadas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {installments.map((inst) => {
                    const totalPaid = inst.payments.reduce(
                      (sum, p) => sum + parseFloat(p.amount),
                      0
                    );
                    const remaining = parseFloat(inst.amount) - totalPaid;
                    const dueDate = parseISO(inst.dueDate);
                    const isOverdue = dueDate < new Date() && inst.status !== 'paid';

                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          isOverdue ? 'border-red-200 bg-red-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-gray-900">
                              {inst.proposal.clientName}
                            </span>
                            {getStatusBadge(isOverdue ? 'overdue' : inst.status)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {inst.proposal.proposalCode || inst.proposal.proposalNumber} -{' '}
                            Parcela {inst.installmentNumber}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              isOverdue
                                ? 'text-red-600 font-medium'
                                : 'text-gray-500'
                            }`}
                          >
                            Vencimento:{' '}
                            {format(dueDate, "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p
                              className={`text-lg font-bold ${
                                isOverdue ? 'text-red-600' : 'text-[#f88910]'
                              }`}
                            >
                              {formatCurrency(remaining)}
                            </p>
                            {inst.payments.length > 0 && (
                              <p className="text-xs text-gray-500">
                                Pago: {formatCurrency(totalPaid)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <QuickCalendarButton
                              type="installment_due"
                              title={`Parcela ${inst.installmentNumber} - ${inst.proposal.clientName}`}
                              date={new Date(inst.dueDate)}
                              clientName={inst.proposal.clientName}
                              value={parseFloat(inst.amount)}
                            />
                            {inst.status !== 'paid' && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPaymentDialog(inst)}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gerar Parcelas */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Gerar Parcelas de Propostas</CardTitle>
              <CardDescription>
                Selecione uma proposta aprovada para gerar suas parcelas automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma proposta disponível para geração de parcelas.</p>
                  <p className="text-sm mt-2">
                    Certifique-se de que as propostas tenham sido configuradas com parcelamento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {proposal.clientName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {proposal.proposalCode || proposal.proposalNumber}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {proposal.installments} parcelas configuradas
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="text-lg font-bold text-[#f88910]">
                          {formatCurrency(proposal.total)}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleOpenGenerateDialog(proposal)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Gerar Parcelas
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Pagamento */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              {selectedInstallment && (
                <span>
                  Parcela {selectedInstallment.installmentNumber} -{' '}
                  {selectedInstallment.proposal.clientName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="payment-amount">Valor do Pagamento *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="payment-date">Data do Pagamento *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, paymentDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Método de Pagamento</Label>
              <Select
                value={paymentData.paymentMethod}
                onValueChange={(value) =>
                  setPaymentData({ ...paymentData, paymentMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferência">Transferência Bancária</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartão">Cartão de Crédito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-notes">Observações</Label>
              <Input
                id="payment-notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Observações sobre o pagamento (opcional)"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegisterPayment}>Registrar Pagamento</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Custo Fixo */}
      <Dialog open={isCostDialogOpen} onOpenChange={setIsCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCost ? 'Editar Custo Fixo' : 'Adicionar Custo Fixo'}</DialogTitle>
            <DialogDescription>
              Cadastre seus custos fixos mensais para acompanhamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="cost-name">Nome do Custo *</Label>
              <Input
                id="cost-name"
                value={costForm.name}
                onChange={(e) => setCostForm({ ...costForm, name: e.target.value })}
                placeholder="Ex: Aluguel Escritório"
              />
            </div>
            <div>
              <Label htmlFor="cost-category">Categoria *</Label>
              <Select
                value={costForm.category}
                onValueChange={(value) => setCostForm({ ...costForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salario">Salários</SelectItem>
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                  <SelectItem value="servico">Serviços</SelectItem>
                  <SelectItem value="impostos">Impostos</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="software">Software/Assinaturas</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost-amount">Valor Mensal (R$) *</Label>
                <Input
                  id="cost-amount"
                  type="number"
                  step="0.01"
                  value={costForm.amount}
                  onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="cost-dueDay">Dia Vencimento *</Label>
                <Select
                  value={costForm.dueDay}
                  onValueChange={(value) => setCostForm({ ...costForm, dueDay: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">📅 Vai para o calendário</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost-start">Data Início *</Label>
                <Input
                  id="cost-start"
                  type="date"
                  value={costForm.startDate}
                  onChange={(e) => setCostForm({ ...costForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cost-end">Data Término (opcional)</Label>
                <Input
                  id="cost-end"
                  type="date"
                  value={costForm.endDate}
                  onChange={(e) => setCostForm({ ...costForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cost-description">Descrição (opcional)</Label>
              <Textarea
                id="cost-description"
                value={costForm.description}
                onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                placeholder="Detalhes adicionais..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCostDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCost} className="bg-[#f88910] hover:bg-[#e07800]">
                {editingCost ? 'Salvar Alterações' : 'Adicionar Custo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Gerar Parcelas */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Parcelas</DialogTitle>
            <DialogDescription>
              {selectedProposal && <span>{selectedProposal.clientName}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="num-installments">Número de Parcelas *</Label>
              <Input
                id="num-installments"
                type="number"
                value={generateData.numberOfInstallments}
                onChange={(e) =>
                  setGenerateData({ ...generateData, numberOfInstallments: e.target.value })
                }
                placeholder="Ex: 12"
              />
            </div>
            <div>
              <Label htmlFor="first-due-date">Data do Primeiro Vencimento *</Label>
              <Input
                id="first-due-date"
                type="date"
                value={generateData.firstDueDate}
                onChange={(e) =>
                  setGenerateData({ ...generateData, firstDueDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="installment-day">Dia de Vencimento (opcional)</Label>
              <Input
                id="installment-day"
                type="number"
                min="1"
                max="31"
                value={generateData.installmentDay}
                onChange={(e) =>
                  setGenerateData({ ...generateData, installmentDay: e.target.value })
                }
                placeholder="Ex: 10 (para todo dia 10 do mês)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se especificar, todas as parcelas vencerão neste dia do mês
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGenerateInstallments}>Gerar Parcelas</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Configuração de Imposto */}
      <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Taxa de Imposto</DialogTitle>
            <DialogDescription>
              Configure o percentual de imposto aplicado sobre os recebíveis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="tax-percent">Percentual do Imposto (%)*</Label>
              <Input
                id="tax-percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxForm.taxPercent}
                onChange={(e) =>
                  setTaxForm({ ...taxForm, taxPercent: e.target.value })
                }
                placeholder="Ex: 12"
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor entre 0 e 100. Ex: 12 para 12%
              </p>
            </div>
            <div>
              <Label htmlFor="tax-effective">Vigente a partir de*</Label>
              <Input
                id="tax-effective"
                type="date"
                value={taxForm.effectiveFrom}
                onChange={(e) =>
                  setTaxForm({ ...taxForm, effectiveFrom: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="tax-description">Descrição/Motivo da Alteração</Label>
              <Textarea
                id="tax-description"
                value={taxForm.description}
                onChange={(e) =>
                  setTaxForm({ ...taxForm, description: e.target.value })
                }
                placeholder="Ex: Mudança no regime tributário, adesão ao Simples Nacional..."
                rows={3}
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> A alteração da taxa de imposto afetará os cálculos 
                de impacto nos recebíveis. As propostas existentes manterão a taxa original 
                definida no momento da criação.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsTaxDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveTaxConfig}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Salvar Configuração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
