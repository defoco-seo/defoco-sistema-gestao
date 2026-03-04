"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Eye, Calendar, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface RecentProposalsProps {
  proposals: any[];
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'default' },
  approved: { label: 'Aprovada', variant: 'default' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
  expired: { label: 'Expirada', variant: 'secondary' },
};

export function RecentProposals({ proposals }: RecentProposalsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Formatar nome da proposta como no PDF
  const formatProposalName = (proposal: any) => {
    const clientName = (proposal?.clientName || 'Cliente').replace(/\s+/g, '_');
    const proposalCode = proposal?.proposalCode || proposal?.proposalNumber || 'CODIGO';
    const date = proposal?.createdAt ? format(new Date(proposal.createdAt), 'yyyy-MM-dd') : '';
    const demandName = (proposal?.demandName || 'Demanda').replace(/\s+/g, '_');
    const version = `V${proposal?.version || 1}`;
    
    return `${clientName}_${proposalCode}_${date}_${demandName}_${version}`;
  };

  const handleDeleteClick = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProposalId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/proposals/${selectedProposalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        toast.error('Erro ao deletar proposta');
        return;
      }

      toast.success('Proposta deletada com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedProposalId(null);
      
      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Erro ao deletar proposta');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (proposalId: string, newStatus: 'approved' | 'rejected') => {
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

      toast.success(`Proposta ${newStatus === 'approved' ? 'aprovada' : 'recusada'}!`);
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Nenhuma proposta encontrada</p>
        <p className="text-sm mt-2">Crie sua primeira proposta para começar!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {proposals.map((proposal) => {
          const status = statusMap[proposal?.status ?? 'pending'] ?? statusMap.pending;
          const internalStatus = proposal?.internalStatus || 'pending';
          const total = parseFloat(proposal?.total?.toString() ?? '0');
          const version = proposal?.version ?? 1;
          const proposalName = formatProposalName(proposal);
          const isUpdatingThis = updatingStatus === proposal?.id;
          
          return (
            <div
              key={proposal?.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {proposalName}
                  </h3>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <p className="text-sm text-gray-600">{proposal?.clientName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {proposal?.createdAt && format(new Date(proposal.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                
                {/* Botões de Status Interno */}
                <div className="flex items-center gap-2 mt-2">
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
              </div>
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Valor total</p>
                  <p className="text-lg font-bold text-[#f88910]">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(total)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link href={`/dashboard/propostas/${proposal?.id}`}>
                    <Button size="sm" variant="outline" className="gap-2 w-full">
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-red-600 border-red-600 hover:bg-red-50 w-full"
                    onClick={() => handleDeleteClick(proposal?.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Deletar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}