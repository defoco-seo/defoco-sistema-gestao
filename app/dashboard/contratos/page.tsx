"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Download, Eye, Search, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';

interface Proposal {
  id: string;
  proposalNumber: string;
  proposalCode: string | null;
  demandName: string | null;
  clientName: string;
  clientEmail: string;
  clientCNPJ: string | null;
  clientAddress: string | null;
  responsibleName: string;
  total: string;
  internalStatus: string;
  contractGenerated: boolean;
  contractGeneratedAt: string | null;
  createdAt: string;
}

interface ContractFormData {
  // Dados do representante legal
  representativeName: string;
  representativeNationality: string;
  representativeMaritalStatus: string;
  representativeProfession: string;
  representativeCPF: string;
  // Dados do contrato
  contractForumCity: string;
  contractForumState: string;
  contractSignatureDate: string;
  contractSignatureMethod: string;
  contractSignaturePlatform: string;
  contractEmailForSignature: string;
}

export default function ContratosPage() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('approved');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ContractFormData>({
    representativeName: '',
    representativeNationality: 'Brasileiro(a)',
    representativeMaritalStatus: '',
    representativeProfession: '',
    representativeCPF: '',
    contractForumCity: 'São Paulo',
    contractForumState: 'SP',
    contractSignatureDate: format(new Date(), 'yyyy-MM-dd'),
    contractSignatureMethod: 'govbr',
    contractSignaturePlatform: '',
    contractEmailForSignature: '',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProposals();
    }
  }, [status]);

  useEffect(() => {
    filterProposals();
  }, [proposals, statusFilter, searchTerm]);

  const fetchProposals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/proposals');
      if (response.ok) {
        const data = await response.json();
        setProposals(data);
      }
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
      toast.error('Erro ao carregar propostas');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProposals = () => {
    let filtered = [...proposals];
    
    // Filtro por status interno
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(p => p.internalStatus === statusFilter);
    }
    
    // Filtro por busca textual
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.clientName.toLowerCase().includes(term) ||
        p.proposalNumber.toLowerCase().includes(term) ||
        (p.proposalCode && p.proposalCode.toLowerCase().includes(term)) ||
        (p.demandName && p.demandName.toLowerCase().includes(term))
      );
    }
    
    setFilteredProposals(filtered);
  };

  const handleOpenDialog = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    // Preencher email padrão com o email do cliente
    setFormData(prev => ({
      ...prev,
      contractEmailForSignature: proposal.clientEmail || '',
    }));
    setIsDialogOpen(true);
  };

  const handleGenerateContract = async () => {
    if (!selectedProposal) return;

    // Validações
    if (!formData.representativeName || !formData.representativeCPF) {
      toast.error('Preencha todos os dados do representante legal');
      return;
    }

    if (!formData.contractForumCity || !formData.contractForumState) {
      toast.error('Preencha os dados do foro');
      return;
    }

    if (!formData.contractSignatureDate) {
      toast.error('Preencha a data de assinatura');
      return;
    }

    setIsGenerating(true);
    try {
      // Chamar a API para gerar o contrato com os dados do formulário
      const response = await fetch(`/api/proposals/${selectedProposal.id}/generate-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar contrato');
      }

      // Obter o blob do contrato
      const blob = await response.blob();
      
      // Extrair o nome do arquivo do header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'contrato-defoco.pdf';
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/i.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Criar um link temporário e fazer o download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Contrato gerado com sucesso!');
      
      // Fechar o dialog e recarregar propostas
      setIsDialogOpen(false);
      setSelectedProposal(null);
      fetchProposals();
    } catch (error) {
      console.error('Erro ao gerar contrato:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar contrato');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadContract = async (proposalId: string) => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/generate-contract`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar contrato');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'contrato-defoco.pdf';
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/i.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Contrato baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar contrato:', error);
      toast.error('Erro ao baixar contrato');
    }
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Recusado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pendente</Badge>;
    }
  };

  if (status === 'loading' || isLoading) {
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-600 mt-1">Gere e gerencie contratos a partir de propostas aprovadas</p>
        </div>
        <Button
          onClick={fetchProposals}
          variant="outline"
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status-filter">Status Interno</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="rejected">Recusado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Cliente, código, demanda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de propostas */}
      {filteredProposals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma proposta encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                Ajuste os filtros ou crie novas propostas para gerar contratos.
              </p>
              <Link href="/dashboard/propostas/criar">
                <Button className="bg-[#f88910] hover:bg-[#e07800]">
                  Nova Proposta
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {proposal.contractGenerated ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-[#f88910]" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {proposal.proposalCode || proposal.proposalNumber}
                        {proposal.demandName && ` - ${proposal.demandName}`}
                      </h3>
                      {getStatusBadge(proposal.internalStatus)}
                      {proposal.contractGenerated && (
                        <Badge className="bg-blue-100 text-blue-800">
                          Contrato Gerado
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-600">Cliente</p>
                        <p className="font-medium text-gray-900">{proposal.clientName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Valor Total</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(proposal.total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Criado em</p>
                        <p className="font-medium text-gray-900">
                          {format(new Date(proposal.createdAt), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    {proposal.contractGenerated && proposal.contractGeneratedAt && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Contrato gerado em:{' '}
                          <span className="font-medium text-gray-900">
                            {format(new Date(proposal.contractGeneratedAt), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link href={`/dashboard/propostas/${proposal.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Ver Proposta
                      </Button>
                    </Link>
                    {proposal.contractGenerated ? (
                      <Button
                        onClick={() => handleDownloadContract(proposal.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Baixar Contrato
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleOpenDialog(proposal)}
                        size="sm"
                        className="bg-[#f88910] hover:bg-[#e07800] gap-2"
                      >
                        <FileCheck className="h-4 w-4" />
                        Gerar Contrato
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para gerar contrato */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Contrato - {selectedProposal?.clientName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Dados do Representante Legal */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dados do Representante Legal do Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="representativeName">Nome Completo *</Label>
                  <Input
                    id="representativeName"
                    value={formData.representativeName}
                    onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                    placeholder="Nome completo do representante legal"
                  />
                </div>
                <div>
                  <Label htmlFor="representativeCPF">CPF *</Label>
                  <Input
                    id="representativeCPF"
                    value={formData.representativeCPF}
                    onChange={(e) => setFormData({ ...formData, representativeCPF: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="representativeNationality">Nacionalidade</Label>
                  <Input
                    id="representativeNationality"
                    value={formData.representativeNationality}
                    onChange={(e) => setFormData({ ...formData, representativeNationality: e.target.value })}
                    placeholder="Brasileiro(a)"
                  />
                </div>
                <div>
                  <Label htmlFor="representativeMaritalStatus">Estado Civil</Label>
                  <Select
                    value={formData.representativeMaritalStatus}
                    onValueChange={(value) => setFormData({ ...formData, representativeMaritalStatus: value })}
                  >
                    <SelectTrigger id="representativeMaritalStatus">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                      <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                      <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                      <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                      <SelectItem value="União Estável">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="representativeProfession">Profissão</Label>
                  <Input
                    id="representativeProfession"
                    value={formData.representativeProfession}
                    onChange={(e) => setFormData({ ...formData, representativeProfession: e.target.value })}
                    placeholder="Ex: Empresário(a)"
                  />
                </div>
              </div>
            </div>

            {/* Dados do Contrato */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dados do Contrato
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractForumCity">Cidade do Foro *</Label>
                  <Input
                    id="contractForumCity"
                    value={formData.contractForumCity}
                    onChange={(e) => setFormData({ ...formData, contractForumCity: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <Label htmlFor="contractForumState">Estado do Foro *</Label>
                  <Input
                    id="contractForumState"
                    value={formData.contractForumState}
                    onChange={(e) => setFormData({ ...formData, contractForumState: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="contractSignatureDate">Data de Assinatura *</Label>
                  <Input
                    id="contractSignatureDate"
                    type="date"
                    value={formData.contractSignatureDate}
                    onChange={(e) => setFormData({ ...formData, contractSignatureDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contractSignatureMethod">Método de Assinatura *</Label>
                  <Select
                    value={formData.contractSignatureMethod}
                    onValueChange={(value) => setFormData({ ...formData, contractSignatureMethod: value, contractSignaturePlatform: value === 'govbr' ? '' : 'Clicksign' })}
                  >
                    <SelectTrigger id="contractSignatureMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="govbr">Gov.br (Assinatura Digital)</SelectItem>
                      <SelectItem value="platform">Plataforma de Assinatura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.contractSignatureMethod === 'platform' && (
                  <div>
                    <Label htmlFor="contractSignaturePlatform">Plataforma de Assinatura *</Label>
                    <Select
                      value={formData.contractSignaturePlatform}
                      onValueChange={(value) => setFormData({ ...formData, contractSignaturePlatform: value })}
                    >
                      <SelectTrigger id="contractSignaturePlatform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Clicksign">Clicksign</SelectItem>
                        <SelectItem value="DocuSign">DocuSign</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className={formData.contractSignatureMethod === 'platform' ? 'col-span-2' : ''}>
                  <Label htmlFor="contractEmailForSignature">Email para Assinatura</Label>
                  <Input
                    id="contractEmailForSignature"
                    type="email"
                    value={formData.contractEmailForSignature}
                    onChange={(e) => setFormData({ ...formData, contractEmailForSignature: e.target.value })}
                    placeholder="email@cliente.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateContract}
              disabled={isGenerating}
              className="bg-[#f88910] hover:bg-[#e07800]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando Contrato...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Gerar Contrato
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
