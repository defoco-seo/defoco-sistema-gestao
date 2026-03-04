"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, Search, Filter, ChevronLeft, ChevronRight, User, Clock, Globe, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const actionColors: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  LOGIN_FAILED: 'bg-red-100 text-red-800',
  CREATE_USER: 'bg-blue-100 text-blue-800',
  UPDATE_USER: 'bg-yellow-100 text-yellow-800',
  DELETE_USER: 'bg-red-100 text-red-800',
  CREATE_PROPOSAL: 'bg-blue-100 text-blue-800',
  UPDATE_PROPOSAL: 'bg-yellow-100 text-yellow-800',
  APPROVE_PROPOSAL: 'bg-green-100 text-green-800',
  REJECT_PROPOSAL: 'bg-red-100 text-red-800',
  GENERATE_PDF: 'bg-purple-100 text-purple-800',
  SEND_EMAIL: 'bg-indigo-100 text-indigo-800',
};

const actionLabels: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  LOGIN_FAILED: 'Login Falhou',
  CREATE_USER: 'Usuário Criado',
  UPDATE_USER: 'Usuário Atualizado',
  DELETE_USER: 'Usuário Removido',
  CREATE_PROPOSAL: 'Proposta Criada',
  UPDATE_PROPOSAL: 'Proposta Atualizada',
  APPROVE_PROPOSAL: 'Proposta Aprovada',
  REJECT_PROPOSAL: 'Proposta Rejeitada',
  GENERATE_PDF: 'PDF Gerado',
  SEND_EMAIL: 'E-mail Enviado',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [actionFilter, setActionFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      if (actionFilter) params.set('action', actionFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/audit?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar logs');
      }
      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      setAvailableActions(data.filters?.actions || []);
    } catch (error) {
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilter = () => {
    fetchLogs(1);
  };

  const clearFilters = () => {
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchLogs(1), 100);
  };

  const parseDetails = (details: string | null): Record<string, any> | null => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-[#f88910]" />
          Logs de Auditoria
        </h1>
        <p className="text-gray-600 mt-1">Histórico completo de ações no sistema</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Ação</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {availableActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {actionLabels[action] || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFilter} className="bg-[#f88910] hover:bg-[#e07d0e]">
                <Search className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registros</CardTitle>
              <CardDescription>{pagination.total} logs encontrados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const details = parseDetails(log.details);
                return (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={cn(actionColors[log.action] || 'bg-gray-100 text-gray-800')}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                          {log.resourceType && (
                            <Badge variant="outline">
                              <FileText className="h-3 w-3 mr-1" />
                              {log.resourceType}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          {log.user && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {log.user.name || log.user.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                          </span>
                          {log.ipAddress && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              {log.ipAddress}
                            </span>
                          )}
                        </div>

                        {details && Object.keys(details).length > 0 && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                            {Object.entries(details).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-gray-500">{key}:</span>{' '}
                                <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
