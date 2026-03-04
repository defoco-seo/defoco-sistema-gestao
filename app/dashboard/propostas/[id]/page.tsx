"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Edit,
  FileText,
  Calendar,
  Building,
  Mail,
  Phone,
  User,
  Package,
  Loader2,
  Send,
  MessageCircle,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

const statusMap: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pendente', variant: 'default' },
  approved: { label: 'Aprovada', variant: 'default' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
  expired: { label: 'Expirada', variant: 'secondary' },
};

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchProposal();
    }
  }, [params?.id]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/proposals/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProposal(data);
      } else {
        toast.error('Proposta não encontrada');
        router.push('/dashboard/propostas');
      }
    } catch (error) {
      console.error('Error fetching proposal:', error);
      toast.error('Erro ao carregar proposta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!proposal) return;

    setIsGeneratingPDF(true);
    try {
      // Chamar a API route para gerar o PDF no servidor
      const response = await fetch(`/api/proposals/${params.id}/generate-pdf`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar PDF');
      }

      // Obter o blob do PDF
      const blob = await response.blob();
      
      // Extrair o nome do arquivo do header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'proposta-defoco.pdf';
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

      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!proposal) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/proposals/${params.id}/internal-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalStatus: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      toast.success(`Proposta ${newStatus === 'approved' ? 'aprovada' : 'recusada'} com sucesso!`);
      fetchProposal(); // Recarrega a proposta para atualizar o UI
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendEmail = async () => {
    if (!proposal) return;

    setIsSendingEmail(true);
    try {
      // First, generate and download PDF
      const pdfResponse = await fetch(`/api/proposals/${params.id}/generate-pdf`);
      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob();
        const contentDisposition = pdfResponse.headers.get('Content-Disposition');
        let filename = 'proposta-defoco.pdf';
        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/i.exec(contentDisposition);
          if (matches && matches[1]) filename = matches[1];
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF baixado! Agora você pode anexar no email.');
      }
      
      // Then, get public link
      const response = await fetch(`/api/proposals/${params.id}/send-email`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error ?? 'Erro ao gerar link público');
        return;
      }
      
      // Show public URL in a toast
      if (data.publicUrl) {
        toast.info(`Link público: ${data.publicUrl}`, {
          duration: 15000,
        });
      }
    } catch (error) {
      console.error('Error preparing email:', error);
      toast.error('Erro ao preparar envio');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!proposal) return;

    try {
      // First, generate and download PDF
      const pdfResponse = await fetch(`/api/proposals/${params.id}/generate-pdf`);
      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob();
        const contentDisposition = pdfResponse.headers.get('Content-Disposition');
        let filename = 'proposta-defoco.pdf';
        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/i.exec(contentDisposition);
          if (matches && matches[1]) filename = matches[1];
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF baixado! Agora você pode anexar no WhatsApp.');
      }
      
      // Wait a moment for download to start
      setTimeout(() => {
        // Build WhatsApp message
        const message = `Olá ${proposal.responsibleName}! 

Segue nossa proposta comercial ${proposal.proposalNumber} para ${proposal.demandName || 'serviços solicitados'}.

Total: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(parseFloat(proposal.total))}

Validade: ${format(new Date(proposal.validUntil), 'dd/MM/yyyy', { locale: ptBR })}

Estamos à disposição para esclarecer qualquer dúvida!

Atenciosamente,
Equipe Defoco`;

        // Remove formatting characters from WhatsApp number
        const whatsappNumber = proposal.clientWhatsapp.replace(/\D/g, '');
        
        // Open WhatsApp with pre-filled message
        const whatsappUrl = `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }, 1000);
    } catch (error) {
      console.error('Error preparing WhatsApp:', error);
      toast.error('Erro ao preparar envio');
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
          <p className="mt-4 text-gray-600">Carregando proposta...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  const status = statusMap[proposal?.status ?? 'pending'] ?? statusMap.pending;
  const subtotal = parseFloat(proposal?.subtotal ?? '0');
  const tax = parseFloat(proposal?.tax ?? '0');
  const discountValue = parseFloat(proposal?.discountValue ?? '0');
  const total = parseFloat(proposal?.total ?? '0');
  
  // Calculate actual discount amount in reais
  const discountAmount = proposal?.discountType === 'percentage'
    ? (subtotal * discountValue) / 100
    : discountValue;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/propostas')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          {/* Botões de Aprovação/Recusa */}
          <Button
            onClick={() => handleStatusChange('approved')}
            disabled={isUpdatingStatus}
            variant={proposal?.internalStatus === 'approved' ? 'default' : 'outline'}
            className={`gap-2 ${
              proposal?.internalStatus === 'approved'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'border-green-600 text-green-600 hover:bg-green-50'
            }`}
          >
            <Check className="h-4 w-4" />
            Aprovado
          </Button>
          <Button
            onClick={() => handleStatusChange('rejected')}
            disabled={isUpdatingStatus}
            variant={proposal?.internalStatus === 'rejected' ? 'default' : 'outline'}
            className={`gap-2 ${
              proposal?.internalStatus === 'rejected'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'border-red-600 text-red-600 hover:bg-red-50'
            }`}
          >
            <X className="h-4 w-4" />
            Recusado
          </Button>
          
          <div className="w-px bg-gray-300 mx-1" />
          
          <Link href={`/dashboard/propostas/${params.id}/editar`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <Button
            onClick={handleSendWhatsApp}
            variant="outline"
            className="gap-2 text-green-600 border-green-600 hover:bg-green-50"
          >
            <MessageCircle className="h-4 w-4" />
            Enviar WhatsApp
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            variant="outline"
            className="gap-2"
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Email
              </>
            )}
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="bg-[#f88910] hover:bg-[#e07800] gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Gerar PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <Card className="bg-gradient-to-r from-[#f88910] to-[#e07800] text-white">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8" />
                <div>
                  <h1 className="text-3xl font-bold">
                    {proposal.proposalNumber}
                    <span className="text-xl text-white/70 ml-2">V{proposal.version ?? 1}</span>
                  </h1>
                  <p className="text-white/80">Proposta Comercial</p>
                </div>
              </div>
            </div>
            <Badge
              variant={status.variant}
              className="bg-white text-[#f88910] hover:bg-white/90"
            >
              {status.label}
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/80">Data de Criação</p>
              <p className="font-semibold">
                {format(new Date(proposal.createdAt), "d 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </p>
            </div>
            <div>
              <p className="text-white/80">Válida Até</p>
              <p className="font-semibold">
                {format(new Date(proposal.validUntil), "d 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Empresa</p>
                <p className="font-semibold">{proposal.clientName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Responsável</p>
                <p className="font-semibold">{proposal.responsibleName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{proposal.clientEmail}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                <p className="font-semibold">{proposal.clientWhatsapp}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Serviços Contratados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {proposal?.services?.map((proposalService: any, index: number) => {
              const service = proposalService?.service;
              const quantity = proposalService?.quantity ?? 1;
              const unitPrice =
                parseFloat(proposalService?.customPrice ?? service?.price ?? '0');
              const itemTotal = unitPrice * quantity;

              return (
                <div key={proposalService?.id}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{service?.title}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {service?.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Quantidade: {quantity}</span>
                        <span>•</span>
                        <span>Preço unitário: {formatCurrency(unitPrice)}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-lg text-[#f88910]">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {proposal.taxExempt ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Imposto:</span>
                <span className="font-semibold text-green-600">
                  Isento (À Vista)
                </span>
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Imposto (12%):</span>
                <span className="font-semibold text-blue-600">
                  + {formatCurrency(tax)}
                </span>
              </div>
            )}
            {discountValue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Desconto {proposal.discountType === 'percentage' && `(${discountValue}%)`}:
                </span>
                <span className="font-semibold text-red-600">
                  - {formatCurrency(discountAmount)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-bold">Total:</span>
              <span className="font-bold text-[#f88910] text-2xl">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms */}
      {proposal.paymentTerms && (
        <Card>
          <CardHeader>
            <CardTitle>Condições de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{proposal.paymentTerms}</p>
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {proposal.observations && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{proposal.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Installment Plan */}
      {proposal.installments && proposal.installments > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plano de Parcelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Parcelamento em {proposal.installments}x mensais iguais, com pagamento via boleto bancário.
            </p>
            <div className="space-y-2">
              {(() => {
                const installments = [];
                const installmentAmount = total / (proposal.installments || 1);
                const today = new Date();
                
                for (let i = 0; i < (proposal.installments || 0); i++) {
                  const dueDate = new Date(
                    today.getFullYear(),
                    today.getMonth() + i + 1,
                    proposal.installmentDay || 15
                  );
                  
                  if (dueDate.getDate() !== (proposal.installmentDay || 15)) {
                    dueDate.setDate(0);
                  }
                  
                  installments.push(
                    <div
                      key={i}
                      className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded"
                    >
                      <span className="text-sm font-medium">
                        Parcela {i + 1}/{proposal.installments}
                      </span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {format(dueDate, 'dd/MM/yyyy')}
                        </div>
                        <div className="font-semibold text-[#f88910]">
                          {formatCurrency(installmentAmount)}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                return installments;
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Persuasive Text */}
      <Card className="border-2 border-[#f88910] bg-gradient-to-br from-orange-50 to-white">
        <CardHeader>
          <CardTitle className="text-[#f88910]">Uma Oportunidade Única</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">
            {(() => {
              // Calculate discount amount correctly based on subtotal
              let discountAmount = 0;
              let discountPercent = 0;

              if (proposal.discountType === 'percentage') {
                discountPercent = discountValue;
                // Discount is applied to subtotal (before tax)
                discountAmount = (subtotal * discountValue) / 100;
              } else if (proposal.discountType === 'fixed') {
                discountAmount = discountValue;
                discountPercent = (discountValue / subtotal) * 100;
              }
              
              if (discountAmount > 0) {
                return `Esta é uma oportunidade única de negócio de valor inestimável. Estamos oferecendo um desconto especial de ${discountPercent.toFixed(0)}%, representando uma economia de ${formatCurrency(discountAmount)} sobre o valor de ${formatCurrency(subtotal)}. Este investimento de ${formatCurrency(total)} representa não apenas uma economia significativa, mas também a garantia de retorno através da nossa expertise e compromisso com a excelência. Esta oferta reflete nosso desejo genuíno de estabelecer uma parceria duradoura e bem-sucedida com sua empresa.`;
              }
              
              return `Estamos entusiasmados em apresentar esta proposta exclusiva que demonstra o valor excepcional que agregamos ao seu projeto. Nossa equipe está comprometida em entregar resultados que superem suas expectativas, com a qualidade e excelência que a sua empresa merece. O retorno é garantido através da nossa dedicação em transformar sua visão em realidade.`;
            })()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}