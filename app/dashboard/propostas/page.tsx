"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Copy,
  PlusCircle,
  FileText,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusMap: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pendente', variant: 'default' },
  approved: { label: 'Aprovada', variant: 'default' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
  expired: { label: 'Expirada', variant: 'secondary' },
};

export default function ProposalsListPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  useEffect(() => {
    filterProposals();
  }, [searchTerm, statusFilter, proposals]);

  const fetchProposals = async () => {
    try {
      const response = await fetch('/api/proposals');
      if (response.ok) {
        const data = await response.json();
        setProposals(data ?? []);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Erro ao carregar propostas');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProposals = () => {
    let filtered = proposals ?? [];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p?.clientName?.toLowerCase()?.includes(search) ?? false) ||
          (p?.proposalNumber?.toLowerCase()?.includes(search) ?? false)
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((p) => p?.status === statusFilter);
    }

    setFilteredProposals(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/proposals/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Proposta excluída com sucesso');
        fetchProposals();
      } else {
        toast.error('Erro ao excluir proposta');
      }
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Erro ao excluir proposta');
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (proposalId: string, newStatus: string) => {
    setUpdatingStatus(proposalId);
    try {
      const response = await fetch(`/api/proposals/${proposalId}/internal-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalStatus: newStatus }),
      });

      if (!response.ok) {
        toast.error('Erro ao atualizar status');
        return;
      }

      toast.success(`Proposta ${newStatus === 'approved' ? 'aprovada' : 'recusada'}`);
      
      // Atualizar a lista de propostas
      fetchProposals();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f88910] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando propostas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Propostas</h1>
          <p className="text-gray-600 mt-1">Gerencie todas as suas propostas comerciais</p>
        </div>
        <Link href="/dashboard/propostas/criar">
          <Button className="bg-[#f88910] hover:bg-[#e07800] gap-2">
            <PlusCircle className="h-4 w-4" />
            Nova Proposta
          </Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {statusFilter === 'all'
                  ? 'Todos os Status'
                  : statusMap[statusFilter]?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                Todos os Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                Pendente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('approved')}>
                Aprovada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('rejected')}>
                Rejeitada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('expired')}>
                Expirada
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {filteredProposals.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma proposta encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Comece criando sua primeira proposta'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link href="/dashboard/propostas/criar">
                <Button className="bg-[#f88910] hover:bg-[#e07800] gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Criar Primeira Proposta
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProposals.map((proposal) => {
            const status = statusMap[proposal?.status ?? 'pending'] ?? statusMap.pending;
            const internalStatus = proposal?.internalStatus || 'pending';
            const total = parseFloat(proposal?.total ?? '0');
            const isUpdatingThis = updatingStatus === proposal?.id;

            return (
              <Card key={proposal?.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {proposal?.proposalNumber}
                      </h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    
                    {/* Internal Status Buttons */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status Interno:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdatingThis}
                        onClick={() => handleStatusChange(proposal?.id, 'approved')}
                        className={`gap-2 ${
                          internalStatus === 'approved'
                            ? 'bg-green-500 text-white border-green-600 hover:bg-green-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-green-50'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                        Aprovado
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdatingThis}
                        onClick={() => handleStatusChange(proposal?.id, 'rejected')}
                        className={`gap-2 ${
                          internalStatus === 'rejected'
                            ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-red-50'
                        }`}
                      >
                        <X className="h-4 w-4" />
                        Recusado
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        {proposal?.clientName}
                      </p>
                      <p className="text-sm text-gray-600">{proposal?.clientEmail}</p>
                      <p className="text-sm text-gray-500">
                        Criado em{' '}
                        {proposal?.createdAt &&
                          format(
                            new Date(proposal.createdAt),
                            "d 'de' MMMM 'de' yyyy",
                            { locale: ptBR }
                          )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Serviços:</span>
                      <Badge variant="outline">
                        {proposal?.services?.length ?? 0} item(s)
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Valor Total</p>
                      <p className="text-2xl font-bold text-[#f88910]">
                        {formatCurrency(total)}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/propostas/${proposal?.id}`}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(proposal?.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A proposta será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}