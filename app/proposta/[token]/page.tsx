"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  FileText,
  Calendar,
  Building,
  Mail,
  Phone,
  User,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusMap: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  approved: { label: 'Aprovada', color: 'text-green-700', bgColor: 'bg-green-50' },
  rejected: { label: 'Recusada', color: 'text-red-700', bgColor: 'bg-red-50' },
  change_requested: { label: 'Alteração Solicitada', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  expired: { label: 'Expirada', color: 'text-gray-700', bgColor: 'bg-gray-50' },
};

export default function PublicProposalPage() {
  const params = useParams();
  const token = params?.token as string;
  
  const [proposal, setProposal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (token) {
      fetchProposal();
    }
  }, [token]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/proposals/public/${token}`);
      if (response.ok) {
        const data = await response.json();
        setProposal(data);
      } else {
        toast.error('Proposta não encontrada ou link inválido');
      }
    } catch (error) {
      console.error('Error fetching proposal:', error);
      toast.error('Erro ao carregar proposta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = async (response: 'approved' | 'rejected' | 'change_requested') => {
    if (response === 'change_requested' && !feedback.trim()) {
      toast.error('Por favor, descreva as alterações desejadas');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/proposals/public/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response,
          feedback: response === 'change_requested' ? feedback : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao processar resposta');
        return;
      }

      toast.success('Resposta enviada com sucesso!');
      
      // Refresh proposal
      await fetchProposal();
      setShowFeedbackForm(false);
      setFeedback('');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Erro ao enviar resposta');
    } finally {
      setIsSubmitting(false);
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <XCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposta não encontrada</h1>
        <p className="text-gray-600">O link pode estar inválido ou a proposta foi removida.</p>
      </div>
    );
  }

  const hasResponded = proposal.clientResponse !== null;
  const statusInfo = statusMap[proposal.clientResponse || proposal.status];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo-defoco.png"
            alt="Defoco"
            width={150}
            height={40}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">Proposta Comercial</h1>
          <p className="text-gray-600 mt-2">{proposal.proposalNumber}</p>
        </div>

        {/* Status Card */}
        {hasResponded && (
          <Card className={`border-2 ${statusInfo.bgColor}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3">
                {proposal.clientResponse === 'approved' && (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
                {proposal.clientResponse === 'rejected' && (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
                {proposal.clientResponse === 'change_requested' && (
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                )}
                <div className="text-center">
                  <p className="text-lg font-semibold">{statusInfo.label}</p>
                  {proposal.clientFeedback && (
                    <p className="text-sm text-gray-600 mt-2">
                      Feedback: {proposal.clientFeedback}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-[#f88910]" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Empresa</p>
                <p className="font-medium">{proposal.clientName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Responsável</p>
                <p className="font-medium">{proposal.responsibleName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{proposal.clientEmail}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">WhatsApp</p>
                <p className="font-medium">{proposal.clientWhatsapp}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demand Name */}
        {proposal.demandName && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#f88910]" />
                Demanda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{proposal.demandName}</p>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#f88910]" />
              Serviços Contratados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proposal.services?.map((ps: any) => (
                <div
                  key={ps.id}
                  className="flex justify-between items-start p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {ps.service?.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {ps.service?.description}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Quantidade: {ps.quantity}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-600">Preço Unit.</p>
                    <p className="font-semibold text-[#f88910]">
                      {formatCurrency(ps.customPrice || ps.service?.price)}
                    </p>
                  </div>
                </div>
              ))}
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
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">
                  {formatCurrency(proposal.subtotal)}
                </span>
              </div>
              {proposal.discountValue && parseFloat(proposal.discountValue) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto:</span>
                  <span className="font-semibold">
                    {proposal.discountType === 'percentage'
                      ? `${proposal.discountValue}%`
                      : formatCurrency(proposal.discountValue)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold text-[#f88910] pt-3 border-t">
                <span>Total:</span>
                <span>{formatCurrency(proposal.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 justify-center">
              <Calendar className="h-5 w-5 text-gray-400" />
              <p className="text-gray-600">
                Proposta válida até:{' '}
                <span className="font-semibold text-gray-900">
                  {format(new Date(proposal.validUntil), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Response Buttons */}
        {!hasResponded && (
          <Card>
            <CardHeader>
              <CardTitle>Responder à Proposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showFeedbackForm ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Button
                    onClick={() => handleResponse('approved')}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => setShowFeedbackForm(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Solicitar Alteração
                  </Button>
                  <Button
                    onClick={() => handleResponse('rejected')}
                    disabled={isSubmitting}
                    variant="destructive"
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feedback">
                      Descreva as alterações desejadas <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Ex: Gostaria de incluir mais 2 serviços..."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleResponse('change_requested')}
                      disabled={isSubmitting || !feedback.trim()}
                      className="bg-[#f88910] hover:bg-[#e07800]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar Solicitação'
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowFeedbackForm(false);
                        setFeedback('');
                      }}
                      variant="outline"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm pt-8">
          <p>© 2025 Defoco - Design de Resultados</p>
          <p className="mt-1">
            Dúvidas? Entre em contato: defoco@defoco.com.br | (11) 93398-2991
          </p>
        </div>
      </div>
    </div>
  );
}
