'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Shield,
  Clock,
  User,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface LoginHistory {
  id: string;
  userId: string;
  loginAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CREATE_USER: 'Criar Usuário',
  UPDATE_USER: 'Atualizar Usuário',
  DELETE_USER: 'Excluir Usuário',
  APPROVE_PROPOSAL: 'Aprovar Proposta',
  REJECT_PROPOSAL: 'Reprovar Proposta',
  CREATE_PROPOSAL: 'Criar Proposta',
  UPDATE_PROPOSAL: 'Atualizar Proposta',
  DELETE_PROPOSAL: 'Excluir Proposta',
  GENERATE_CONTRACT: 'Gerar Contrato',
};

export default function AuditLogsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Verifica se é Master User
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'master') {
      router.push('/dashboard');
      toast.error('Acesso negado. Apenas o Usuário Master pode acessar esta página.');
    }
  }, [session, status, router]);

  // Carrega logs
  useEffect(() => {
    if (session?.user?.role === 'master') {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [auditResponse, loginResponse] = await Promise.all([
        fetch('/api/admin/audit-logs?limit=100'),
        fetch('/api/admin/login-history?limit=100'),
      ]);

      const auditData = await auditResponse.json();
      const loginData = await loginResponse.json();

      if (auditResponse.ok) {
        setAuditLogs(auditData.logs);
      }
      if (loginResponse.ok) {
        setLoginHistory(loginData.logins);
      }
    } catch (error) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (action.includes('DELETE')) return <XCircle className="h-4 w-4 text-red-600" />;
    if (action.includes('UPDATE')) return <RefreshCw className="h-4 w-4 text-blue-600" />;
    if (action === 'LOGIN') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.user?.name?.toLowerCase().includes(searchLower) ||
        log.user?.email?.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.ipAddress?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const filteredLoginHistory = loginHistory.filter((login) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        login.user?.name?.toLowerCase().includes(searchLower) ||
        login.user?.email?.toLowerCase().includes(searchLower) ||
        login.ipAddress?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f88910] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs de Auditoria e Segurança</h1>
          <p className="text-gray-600 mt-1">
            Histórico completo de ações e acessos ao sistema
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logins Totais</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loginHistory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logins Bem-Sucedidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loginHistory.filter((l) => l.success).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tentativas Falhadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loginHistory.filter((l) => !l.success).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="login">Histórico de Login</TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label>Pesquisar</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por usuário, ação, IP..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full md:w-64">
                  <Label>Filtrar por Ação</Label>
                  <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Ações</SelectItem>
                      {Object.entries(ACTION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs List */}
          <Card>
            <CardHeader>
              <CardTitle>Registros de Auditoria ({filteredAuditLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 border-b pb-3 last:border-b-0"
                  >
                    <div className="mt-1">{getActionIcon(log.action)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          {log.resourceType && (
                            <Badge variant="outline" className="text-xs">
                              {log.resourceType}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {log.user ? (
                          <>
                            Usuário: <strong>{log.user.name}</strong> ({log.user.email})
                          </>
                        ) : (
                          'Sistema'
                        )}
                      </p>
                      {log.ipAddress && (
                        <p className="text-xs text-gray-500">IP: {log.ipAddress}</p>
                      )}
                      {log.details && (
                        <details className="text-xs text-gray-500 mt-2">
                          <summary className="cursor-pointer">Detalhes</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                {filteredAuditLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum log encontrado com os filtros aplicados.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="login" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <Label>Pesquisar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por usuário ou IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Login History List */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Login ({filteredLoginHistory.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredLoginHistory.map((login) => (
                  <div
                    key={login.id}
                    className={`flex items-start gap-4 border-b pb-3 last:border-b-0 ${
                      !login.success ? 'bg-red-50 p-3 rounded' : ''
                    }`}
                  >
                    <div className="mt-1">
                      {login.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{login.user.name}</span>
                          <Badge
                            variant={login.success ? 'default' : 'destructive'}
                            className={login.success ? 'bg-green-500' : ''}
                          >
                            {login.success ? 'Sucesso' : 'Falha'}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(login.loginAt), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{login.user.email}</p>
                      {login.ipAddress && (
                        <p className="text-xs text-gray-500">IP: {login.ipAddress}</p>
                      )}
                      {!login.success && login.failureReason && (
                        <p className="text-xs text-red-600 mt-1">
                          Motivo: {login.failureReason}
                        </p>
                      )}
                      {login.userAgent && (
                        <details className="text-xs text-gray-500 mt-2">
                          <summary className="cursor-pointer">User Agent</summary>
                          <p className="mt-1 p-2 bg-gray-50 rounded">{login.userAgent}</p>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                {filteredLoginHistory.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum registro de login encontrado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
