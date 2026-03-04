'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus,
  FileText,
  Download,
  Trash2,
  Calendar,
  DollarSign,
  User,
  Building,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HRContract {
  id: string;
  contractNumber: string;
  contractorName: string;
  contractorCPF: string;
  contractorCNPJ?: string | null;
  contractorAddress: string;
  representativeName: string;
  representativeCPF: string;
  monthlyValue: string;
  startDate: string;
  duration: number;
  status: string;
  generatedAt?: string | null;
  createdAt: string;
}

interface FormData {
  contractorName: string;
  contractorCPF: string;
  contractorCNPJ: string;
  contractorAddress: string;
  representativeName: string;
  representativeCPF: string;
  serviceScope: string;
  monthlyValue: string;
  startDate: string;
  duration: number;
}

export default function ContratosRHPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<HRContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<HRContract | null>(null);
  const [formData, setFormData] = useState<FormData>({
    contractorName: '',
    contractorCPF: '',
    contractorCNPJ: '',
    contractorAddress: '',
    representativeName: '',
    representativeCPF: '',
    serviceScope: '',
    monthlyValue: '',
    startDate: '',
    duration: 12,
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/hr-contracts');
      if (response.ok) {
        const data = await response.json();
        setContracts(data);
      } else {
        toast.error('Erro ao carregar contratos');
      }
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação
    if (
      !formData.contractorName ||
      !formData.contractorCPF ||
      !formData.contractorAddress ||
      !formData.representativeName ||
      !formData.representativeCPF ||
      !formData.serviceScope ||
      !formData.monthlyValue ||
      !formData.startDate
    ) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch('/api/hr-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Contrato criado com sucesso!');
        setIsDialogOpen(false);
        setFormData({
          contractorName: '',
          contractorCPF: '',
          contractorCNPJ: '',
          contractorAddress: '',
          representativeName: '',
          representativeCPF: '',
          serviceScope: '',
          monthlyValue: '',
          startDate: '',
          duration: 12,
        });
        fetchContracts();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao criar contrato');
      }
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      toast.error('Erro ao criar contrato');
    }
  };

  const handleGeneratePDF = async (contractId: string) => {
    setIsGeneratingPDF(contractId);
    try {
      const response = await fetch(`/api/hr-contracts/${contractId}/generate-pdf`, {
        method: 'POST',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contract = contracts.find((c) => c.id === contractId);
        a.download = `Contrato_RH_${contract?.contractNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('PDF gerado com sucesso!');
        fetchContracts();
      } else {
        toast.error('Erro ao gerar PDF');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  const handleDelete = async (contractId: string) => {
    try {
      const response = await fetch(`/api/hr-contracts/${contractId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Contrato deletado com sucesso');
        fetchContracts();
      } else {
        toast.error('Erro ao deletar contrato');
      }
    } catch (error) {
      console.error('Erro ao deletar contrato:', error);
      toast.error('Erro ao deletar contrato');
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(value));
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'terminated':
        return <Badge className="bg-red-500">Encerrado</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500">Expirado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f88910] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando contratos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos RH</h1>
          <p className="text-gray-600 mt-1">
            Gestão de contratos de funcionários e prestadores de serviços
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#f88910] hover:bg-[#e07a00]">
              <Plus className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Contrato RH</DialogTitle>
              <DialogDescription>
                Preencha os dados do prestador de serviço para gerar o contrato
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="contractorName">Nome Completo *</Label>
                  <Input
                    id="contractorName"
                    name="contractorName"
                    value={formData.contractorName}
                    onChange={handleInputChange}
                    placeholder="Ex: MARLOS VELASCO LUZ"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contractorCPF">CPF *</Label>
                  <Input
                    id="contractorCPF"
                    name="contractorCPF"
                    value={formData.contractorCPF}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contractorCNPJ">CNPJ (Opcional)</Label>
                  <Input
                    id="contractorCNPJ"
                    name="contractorCNPJ"
                    value={formData.contractorCNPJ}
                    onChange={handleInputChange}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="contractorAddress">Endereço Completo *</Label>
                  <Input
                    id="contractorAddress"
                    name="contractorAddress"
                    value={formData.contractorAddress}
                    onChange={handleInputChange}
                    placeholder="Rua, Número, Bairro, CEP, Cidade, Estado"
                    required
                  />
                </div>
                <Separator className="col-span-2" />
                <div className="col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Dados do Representante Legal
                  </h3>
                </div>
                <div>
                  <Label htmlFor="representativeName">Nome do Representante *</Label>
                  <Input
                    id="representativeName"
                    name="representativeName"
                    value={formData.representativeName}
                    onChange={handleInputChange}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="representativeCPF">CPF do Representante *</Label>
                  <Input
                    id="representativeCPF"
                    name="representativeCPF"
                    value={formData.representativeCPF}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <Separator className="col-span-2" />
                <div className="col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-2">Escopo do Serviço</h3>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="serviceScope">Descrição do Escopo *</Label>
                  <Textarea
                    id="serviceScope"
                    name="serviceScope"
                    value={formData.serviceScope}
                    onChange={handleInputChange}
                    placeholder="Descreva os serviços que serão prestados. Ex: criação de identidade visual, design de materiais gráficos, etc."
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este texto será incluído na CLÁUSULA PRIMEIRA do contrato no item 1.2
                  </p>
                </div>
                <Separator className="col-span-2" />
                <div className="col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-2">Dados Financeiros</h3>
                </div>
                <div>
                  <Label htmlFor="monthlyValue">Valor Mensal (R$) *</Label>
                  <Input
                    id="monthlyValue"
                    name="monthlyValue"
                    type="number"
                    step="0.01"
                    value={formData.monthlyValue}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duração (meses) *</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    value={formData.duration}
                    onChange={handleInputChange}
                    placeholder="12"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#f88910] hover:bg-[#e07a00]">
                  Criar Contrato
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Contratos */}
      {contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum contrato cadastrado
            </h3>
            <p className="text-gray-600 mb-4">
              Crie seu primeiro contrato de prestação de serviços
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-[#f88910] hover:bg-[#e07a00]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Contrato
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {contracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{contract.contractorName}</CardTitle>
                      {getStatusBadge(contract.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {contract.contractNumber}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">CPF</p>
                      <p className="text-sm text-gray-600">{formatCPF(contract.contractorCPF)}</p>
                    </div>
                  </div>
                  {contract.contractorCNPJ && (
                    <div className="flex items-start gap-2">
                      <Building className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">CNPJ</p>
                        <p className="text-sm text-gray-600">{contract.contractorCNPJ}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Valor Mensal</p>
                      <p className="text-sm text-gray-600 font-semibold">
                        {formatCurrency(contract.monthlyValue)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Data de Início</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(contract.startDate), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Duração</p>
                      <p className="text-sm text-gray-600">{contract.duration} meses</p>
                    </div>
                  </div>
                  {contract.generatedAt && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">PDF Gerado em</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(contract.generatedAt), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleGeneratePDF(contract.id)}
                    disabled={isGeneratingPDF === contract.id}
                    className="bg-[#f88910] hover:bg-[#e07a00]"
                  >
                    {isGeneratingPDF === contract.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Gerar PDF
                      </>
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar este contrato? Esta ação não pode ser
                          desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(contract.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
