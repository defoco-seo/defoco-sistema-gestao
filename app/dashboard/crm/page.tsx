'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, parseISO, isPast, isToday } from 'date-fns';
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
import { Textarea } from '@/components/ui/textarea';
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
  Users,
  UserPlus,
  MessageSquare,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  Building,
  Search,
  RefreshCw,
  Sparkles,
  Send,
  FileText,
  TrendingUp,
  Target,
  Bell,
  ChevronRight,
  Loader2,
  Eye,
  Plus,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';

interface CRMClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  cnpj?: string;
  status: string;
  source?: string;
  proposalId?: string;
  proposalStatus?: string;
  proposalValue?: number;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  totalInteractions: number;
  tags?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastInteraction?: any;
  nextFollowUp?: any;
}

interface CRMInteraction {
  id: string;
  clientId: string;
  type: string;
  direction: string;
  subject?: string;
  content: string;
  status: string;
  aiGenerated: boolean;
  createdAt: string;
}

interface CRMFollowUp {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: string;
  priority: string;
  completedAt?: string;
  outcome?: string;
  client?: { id: string; name: string; email: string; company?: string };
}

interface DashboardData {
  stats: {
    total: number;
    lead: number;
    prospect: number;
    active: number;
    inactive: number;
    lost: number;
  };
  followUps: {
    today: number;
    upcoming: CRMFollowUp[];
    overdue: number;
  };
  needsAttention: CRMClient[];
  pendingProposals: CRMClient[];
  pendingValue: number;
  recentInteractions: any[];
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  active: 'Ativo',
  inactive: 'Inativo',
  lost: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800',
  prospect: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  lost: 'bg-red-100 text-red-800',
};

const INTERACTION_TYPES: Record<string, { label: string; icon: any }> = {
  email: { label: 'Email', icon: Mail },
  whatsapp: { label: 'WhatsApp', icon: Phone },
  phone: { label: 'Telefone', icon: Phone },
  meeting: { label: 'Reunião', icon: Users },
  note: { label: 'Nota', icon: FileText },
};

const MESSAGE_TYPES = [
  { value: 'follow_up_proposal', label: 'Follow-up de Proposta' },
  { value: 'reactivation', label: 'Reativação' },
  { value: 'thank_you', label: 'Agradecimento' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'custom', label: 'Personalizada' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function CRMPage() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard data
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Clients data
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected client
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [clientInteractions, setClientInteractions] = useState<CRMInteraction[]>([]);
  const [clientFollowUps, setClientFollowUps] = useState<CRMFollowUp[]>([]);

  // Dialogs
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);

  // Forms
  const [clientForm, setClientForm] = useState({
    name: '', email: '', phone: '', company: '', cnpj: '', tags: '', notes: '', status: 'lead',
  });
  const [interactionForm, setInteractionForm] = useState({
    type: 'email', direction: 'outbound', subject: '', content: '',
  });
  const [followUpForm, setFollowUpForm] = useState({
    title: '', description: '', dueDate: '', priority: 'normal',
  });

  // AI Message Generator
  const [messageType, setMessageType] = useState('follow_up_proposal');
  const [messageChannel, setMessageChannel] = useState('whatsapp');
  const [customContext, setCustomContext] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState<{ subject?: string; message: string } | null>(null);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // Sync
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchDashboard();
      fetchClients();
    }
  }, [status, router]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/crm/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/crm/clients?${params}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchClientDetails = async (client: CRMClient) => {
    setSelectedClient(client);
    setIsClientDetailOpen(true);

    try {
      const [interactionsRes, followUpsRes] = await Promise.all([
        fetch(`/api/crm/clients/${client.id}/interactions`),
        fetch(`/api/crm/clients/${client.id}/follow-ups`),
      ]);

      if (interactionsRes.ok) {
        setClientInteractions(await interactionsRes.json());
      }
      if (followUpsRes.ok) {
        setClientFollowUps(await followUpsRes.json());
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
    }
  };

  const handleSyncProposals = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/crm/sync-proposals', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchDashboard();
        fetchClients();
      } else {
        toast.error('Erro ao sincronizar');
      }
    } catch (error) {
      toast.error('Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveClient = async () => {
    try {
      const response = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm),
      });

      if (response.ok) {
        toast.success('Cliente cadastrado!');
        setIsClientDialogOpen(false);
        setClientForm({ name: '', email: '', phone: '', company: '', cnpj: '', tags: '', notes: '', status: 'lead' });
        fetchClients();
        fetchDashboard();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao cadastrar');
      }
    } catch (error) {
      toast.error('Erro ao cadastrar');
    }
  };

  const handleSaveInteraction = async () => {
    if (!selectedClient) return;

    try {
      const response = await fetch(`/api/crm/clients/${selectedClient.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...interactionForm,
          aiGenerated: !!generatedMessage,
        }),
      });

      if (response.ok) {
        toast.success('Interação registrada!');
        setIsInteractionDialogOpen(false);
        setInteractionForm({ type: 'email', direction: 'outbound', subject: '', content: '' });
        setGeneratedMessage(null);
        fetchClientDetails(selectedClient);
        fetchDashboard();
      } else {
        toast.error('Erro ao registrar');
      }
    } catch (error) {
      toast.error('Erro ao registrar');
    }
  };

  const handleSaveFollowUp = async () => {
    if (!selectedClient) return;

    try {
      const response = await fetch(`/api/crm/clients/${selectedClient.id}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUpForm),
      });

      if (response.ok) {
        toast.success('Follow-up agendado!');
        setIsFollowUpDialogOpen(false);
        setFollowUpForm({ title: '', description: '', dueDate: '', priority: 'normal' });
        fetchClientDetails(selectedClient);
        fetchDashboard();
      } else {
        toast.error('Erro ao agendar');
      }
    } catch (error) {
      toast.error('Erro ao agendar');
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    if (!selectedClient) return;

    try {
      const response = await fetch(`/api/crm/clients/${selectedClient.id}/follow-ups`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpId, status: 'completed' }),
      });

      if (response.ok) {
        toast.success('Follow-up concluído!');
        fetchClientDetails(selectedClient);
        fetchDashboard();
      }
    } catch (error) {
      toast.error('Erro ao concluir');
    }
  };

  const handleGenerateMessage = async () => {
    if (!selectedClient) return;

    try {
      setIsGeneratingMessage(true);
      const response = await fetch('/api/crm/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          messageType,
          channel: messageChannel,
          customContext,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedMessage({ subject: data.subject, message: data.message });
        setInteractionForm(prev => ({
          ...prev,
          type: messageChannel,
          subject: data.subject || '',
          content: data.message,
        }));
        toast.success('Mensagem gerada!');
      } else {
        toast.error('Erro ao gerar mensagem');
      }
    } catch (error) {
      toast.error('Erro ao gerar mensagem');
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleUseGeneratedMessage = () => {
    setIsMessageDialogOpen(false);
    setIsInteractionDialogOpen(true);
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchClients();
    }
  }, [searchTerm, statusFilter]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-600 mt-1">Gestão de relacionamento com clientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncProposals} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Propostas
          </Button>
          <Button onClick={() => setIsClientDialogOpen(true)} className="bg-[#f88910] hover:bg-[#e07d0e]">
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {dashboard && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-gray-900">{dashboard.stats.total}</div>
                    <p className="text-sm text-gray-500">Total</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-700">{dashboard.stats.lead}</div>
                    <p className="text-sm text-blue-600">Leads</p>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-yellow-700">{dashboard.stats.prospect}</div>
                    <p className="text-sm text-yellow-600">Prospects</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-700">{dashboard.stats.active}</div>
                    <p className="text-sm text-green-600">Ativos</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-gray-700">{dashboard.stats.inactive}</div>
                    <p className="text-sm text-gray-600">Inativos</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-red-700">{dashboard.stats.lost}</div>
                    <p className="text-sm text-red-600">Perdidos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Value Card */}
              <Card className="border-[#f88910]/30 bg-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600">Valor em Propostas Pendentes</p>
                      <div className="text-3xl font-bold text-[#f88910]">
                        {formatCurrency(dashboard.pendingValue)}
                      </div>
                    </div>
                    <Target className="h-12 w-12 text-[#f88910]/30" />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Follow-ups de Hoje */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-[#f88910]" />
                        Follow-ups
                      </CardTitle>
                      {dashboard.followUps.overdue > 0 && (
                        <Badge variant="destructive">{dashboard.followUps.overdue} atrasados</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dashboard.followUps.upcoming.length > 0 ? (
                      <div className="space-y-3">
                        {dashboard.followUps.upcoming.map((followUp) => (
                          <div
                            key={followUp.id}
                            className={`p-3 rounded-lg border ${
                              isPast(parseISO(followUp.dueDate)) && !isToday(parseISO(followUp.dueDate))
                                ? 'border-red-200 bg-red-50'
                                : isToday(parseISO(followUp.dueDate))
                                ? 'border-orange-200 bg-orange-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{followUp.title}</p>
                                <p className="text-sm text-gray-500">{followUp.client?.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {format(parseISO(followUp.dueDate), 'dd/MM', { locale: ptBR })}
                                </p>
                                <Badge
                                  variant={followUp.priority === 'high' || followUp.priority === 'urgent' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {followUp.priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">Nenhum follow-up pendente</p>
                    )}
                  </CardContent>
                </Card>

                {/* Propostas Pendentes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-yellow-500" />
                      Propostas Pendentes
                    </CardTitle>
                    <CardDescription>Clientes aguardando decisão</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboard.pendingProposals.length > 0 ? (
                      <div className="space-y-3">
                        {dashboard.pendingProposals.map((client) => (
                          <div
                            key={client.id}
                            className="p-3 rounded-lg border hover:border-[#f88910] cursor-pointer transition-colors"
                            onClick={() => fetchClientDetails(client)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-gray-500">{client.company || client.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-[#f88910]">
                                  {client.proposalValue ? formatCurrency(client.proposalValue) : '-'}
                                </p>
                                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">Nenhuma proposta pendente</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Clientes que Precisam de Atenção */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Precisam de Atenção
                  </CardTitle>
                  <CardDescription>Clientes sem contato há mais de 30 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard.needsAttention.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dashboard.needsAttention.map((client) => (
                        <div
                          key={client.id}
                          className="p-4 rounded-lg border border-red-200 bg-red-50 cursor-pointer hover:border-red-300"
                          onClick={() => fetchClientDetails(client)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-red-600 font-semibold">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{client.name}</p>
                              <p className="text-sm text-gray-500 truncate">
                                {client.lastContactAt
                                  ? `Último contato: ${formatDistanceToNow(parseISO(client.lastContactAt), { addSuffix: true, locale: ptBR })}`
                                  : 'Nunca contatado'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Todos os clientes estão sendo acompanhados!</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="prospect">Prospects</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="lost">Perdidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clients List */}
          <div className="grid gap-4">
            {clients.map((client) => (
              <Card key={client.id} className="hover:border-[#f88910] transition-colors cursor-pointer" onClick={() => fetchClientDetails(client)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#f88910]/10 flex items-center justify-center">
                        <span className="text-[#f88910] font-bold text-lg">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{client.name}</h3>
                          <Badge className={STATUS_COLORS[client.status]}>
                            {STATUS_LABELS[client.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {client.email}
                          </span>
                          {client.company && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" /> {client.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {client.proposalValue && (
                        <p className="font-semibold text-[#f88910]">
                          {formatCurrency(client.proposalValue)}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        {client.totalInteractions} interações
                      </p>
                      {client.nextFollowUp && (
                        <p className="text-xs text-orange-600">
                          Follow-up: {format(parseISO(client.nextFollowUp.dueDate), 'dd/MM')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {clients.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum cliente encontrado</p>
              <Button className="mt-4" onClick={() => setIsClientDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Cliente
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="follow-ups" className="space-y-4">
          {dashboard && (
            <>
              {dashboard.followUps.overdue > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-red-700">
                        Você tem {dashboard.followUps.overdue} follow-ups atrasados!
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {dashboard.followUps.upcoming.map((followUp) => (
                  <Card
                    key={followUp.id}
                    className={`${
                      isPast(parseISO(followUp.dueDate)) && !isToday(parseISO(followUp.dueDate))
                        ? 'border-red-200'
                        : isToday(parseISO(followUp.dueDate))
                        ? 'border-orange-200'
                        : ''
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isPast(parseISO(followUp.dueDate)) && !isToday(parseISO(followUp.dueDate))
                              ? 'bg-red-100'
                              : isToday(parseISO(followUp.dueDate))
                              ? 'bg-orange-100'
                              : 'bg-gray-100'
                          }`}>
                            <Calendar className={`h-5 w-5 ${
                              isPast(parseISO(followUp.dueDate)) && !isToday(parseISO(followUp.dueDate))
                                ? 'text-red-500'
                                : isToday(parseISO(followUp.dueDate))
                                ? 'text-orange-500'
                                : 'text-gray-500'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold">{followUp.title}</p>
                            <p className="text-sm text-gray-500">
                              {followUp.client?.name} • {followUp.description || 'Sem descrição'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">
                              {format(parseISO(followUp.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                            </p>
                            <Badge
                              variant={followUp.priority === 'high' || followUp.priority === 'urgent' ? 'destructive' : 'secondary'}
                            >
                              {followUp.priority}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchClientDetails(followUp.client as unknown as CRMClient);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {dashboard.followUps.upcoming.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Nenhum follow-up agendado</p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Client Dialog */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>Cadastre um novo cliente no CRM</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CNPJ</Label>
                <Input value={clientForm.cnpj} onChange={(e) => setClientForm({ ...clientForm, cnpj: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={clientForm.status} onValueChange={(v) => setClientForm({ ...clientForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveClient} className="bg-[#f88910] hover:bg-[#e07d0e]">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Detail Dialog */}
      <Dialog open={isClientDetailOpen} onOpenChange={setIsClientDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#f88910]/10 flex items-center justify-center">
                      <span className="text-[#f88910] font-bold text-lg">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <DialogTitle>{selectedClient.name}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={STATUS_COLORS[selectedClient.status]}>
                          {STATUS_LABELS[selectedClient.status]}
                        </Badge>
                        {selectedClient.proposalValue && (
                          <span className="text-sm text-[#f88910] font-semibold">
                            {formatCurrency(selectedClient.proposalValue)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1"><Mail className="h-4 w-4 text-gray-400" /> {selectedClient.email}</span>
                  {selectedClient.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-gray-400" /> {selectedClient.phone}</span>}
                  {selectedClient.company && <span className="flex items-center gap-1"><Building className="h-4 w-4 text-gray-400" /> {selectedClient.company}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => { setIsClientDetailOpen(false); setIsMessageDialogOpen(true); }} className="bg-[#f88910] hover:bg-[#e07d0e]">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Mensagem com IA
                  </Button>
                  <Button variant="outline" onClick={() => { setIsClientDetailOpen(false); setIsInteractionDialogOpen(true); }}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Registrar Interação
                  </Button>
                  <Button variant="outline" onClick={() => { setIsClientDetailOpen(false); setIsFollowUpDialogOpen(true); }}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendar Follow-up
                  </Button>
                </div>

                {/* Follow-ups */}
                {clientFollowUps.filter(f => f.status === 'pending').length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Follow-ups Pendentes</h4>
                    <div className="space-y-2">
                      {clientFollowUps.filter(f => f.status === 'pending').map((followUp) => (
                        <div key={followUp.id} className="p-3 border rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium">{followUp.title}</p>
                            <p className="text-sm text-gray-500">
                              {format(parseISO(followUp.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleCompleteFollowUp(followUp.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Concluir
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactions History */}
                <div>
                  <h4 className="font-semibold mb-2">Histórico de Interações</h4>
                  {clientInteractions.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {clientInteractions.map((interaction) => {
                        const TypeIcon = INTERACTION_TYPES[interaction.type]?.icon || MessageSquare;
                        return (
                          <div key={interaction.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-sm">
                                  {INTERACTION_TYPES[interaction.type]?.label || interaction.type}
                                </span>
                                {interaction.aiGenerated && (
                                  <Badge variant="secondary" className="text-xs">IA</Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {format(parseISO(interaction.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {interaction.subject && (
                              <p className="text-sm font-medium mb-1">{interaction.subject}</p>
                            )}
                            <p className="text-sm text-gray-600 whitespace-pre-line">
                              {interaction.content.length > 200
                                ? interaction.content.substring(0, 200) + '...'
                                : interaction.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhuma interação registrada</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Generator Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#f88910]" />
              Gerar Mensagem com IA
            </DialogTitle>
            <DialogDescription>
              {selectedClient?.name} - Crie uma mensagem personalizada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Mensagem</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Canal</Label>
                <Select value={messageChannel} onValueChange={setMessageChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Contexto Adicional (opcional)</Label>
              <Textarea
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Adicione informações extras que a IA deve considerar..."
                rows={2}
              />
            </div>

            <Button onClick={handleGenerateMessage} disabled={isGeneratingMessage} className="w-full bg-[#f88910] hover:bg-[#e07d0e]">
              {isGeneratingMessage ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Gerar Mensagem</>
              )}
            </Button>

            {generatedMessage && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                {generatedMessage.subject && (
                  <div className="mb-2">
                    <Label className="text-xs">Assunto</Label>
                    <p className="font-medium">{generatedMessage.subject}</p>
                  </div>
                )}
                <Label className="text-xs">Mensagem</Label>
                <p className="whitespace-pre-line text-sm mt-1">{generatedMessage.message}</p>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleUseGeneratedMessage} className="flex-1">
                    <Send className="h-4 w-4 mr-2" /> Usar Mensagem
                  </Button>
                  <Button variant="outline" onClick={handleGenerateMessage}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Interaction Dialog */}
      <Dialog open={isInteractionDialogOpen} onOpenChange={setIsInteractionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Interação</DialogTitle>
            <DialogDescription>{selectedClient?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={interactionForm.type} onValueChange={(v) => setInteractionForm({ ...interactionForm, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="note">Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direção</Label>
                <Select value={interactionForm.direction} onValueChange={(v) => setInteractionForm({ ...interactionForm, direction: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Enviado</SelectItem>
                    <SelectItem value="inbound">Recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {interactionForm.type === 'email' && (
              <div>
                <Label>Assunto</Label>
                <Input value={interactionForm.subject} onChange={(e) => setInteractionForm({ ...interactionForm, subject: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Conteúdo *</Label>
              <Textarea
                value={interactionForm.content}
                onChange={(e) => setInteractionForm({ ...interactionForm, content: e.target.value })}
                rows={5}
                placeholder="Descreva a interação..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInteractionDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveInteraction} className="bg-[#f88910] hover:bg-[#e07d0e]">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Follow-up</DialogTitle>
            <DialogDescription>{selectedClient?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={followUpForm.title}
                onChange={(e) => setFollowUpForm({ ...followUpForm, title: e.target.value })}
                placeholder="Ex: Ligar para fechar proposta"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={followUpForm.description}
                onChange={(e) => setFollowUpForm({ ...followUpForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={followUpForm.dueDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={followUpForm.priority} onValueChange={(v) => setFollowUpForm({ ...followUpForm, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsFollowUpDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveFollowUp} className="bg-[#f88910] hover:bg-[#e07d0e]">Agendar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
