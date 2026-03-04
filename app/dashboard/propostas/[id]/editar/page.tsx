"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceSelector } from '@/components/service-selector';
import { toast } from 'sonner';
import { Loader2, Save, Calculator, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

interface SelectedService {
  serviceId: string;
  quantity: number;
  customPrice?: number;
}

export default function EditProposalPage() {
  const router = useRouter();
  const params = useParams();
  const proposalId = params?.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Proposal identification
  const [proposalCode, setProposalCode] = useState('');
  const [demandName, setDemandName] = useState('');

  // Client data
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCNPJ, setClientCNPJ] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');

  // Services
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Financial
  const [markupPercent, setMarkupPercent] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [taxExempt, setTaxExempt] = useState(false);
  const [observations, setObservations] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  // Installments
  const [installments, setInstallments] = useState('');
  const [installmentDay, setInstallmentDay] = useState('15');

  // Load proposal data
  useEffect(() => {
    if (!proposalId) return;
    
    const loadProposal = async () => {
      try {
        const response = await fetch(`/api/proposals/${proposalId}`);
        if (!response.ok) {
          toast.error('Erro ao carregar proposta');
          router.push('/dashboard/propostas');
          return;
        }
        
        const proposal = await response.json();
        
        // Set form data
        setProposalCode(proposal.proposalCode || '');
        setDemandName(proposal.demandName || '');
        setClientName(proposal.clientName || '');
        setClientEmail(proposal.clientEmail || '');
        setClientCNPJ(proposal.clientCNPJ || '');
        setClientAddress(proposal.clientAddress || '');
        setResponsibleName(proposal.responsibleName || '');
        setClientWhatsapp(proposal.clientWhatsapp || '');
        setMarkupPercent(proposal.markupPercent || '');
        setDiscountType(proposal.discountType || 'percentage');
        setDiscountValue(proposal.discountValue || '');
        setTaxExempt(proposal.taxExempt === true);
        setObservations(proposal.observations || '');
        setPaymentTerms(proposal.paymentTerms || '');
        setInstallments(proposal.installments?.toString() || '');
        setInstallmentDay(proposal.installmentDay?.toString() || '15');
        
        // Set selected services
        const servicesData = proposal.services.map((ps: any) => ({
          serviceId: ps.serviceId,
          quantity: ps.quantity,
          customPrice: ps.customPrice ? parseFloat(ps.customPrice) : undefined,
        }));
        setSelectedServices(servicesData);
        
        setIsFetching(false);
      } catch (error) {
        console.error('Error loading proposal:', error);
        toast.error('Erro ao carregar proposta');
        router.push('/dashboard/propostas');
      }
    };
    
    loadProposal();
  }, [proposalId, router]);

  // Load services once
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      setServices(data ?? []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    }
  };

  // Create stable string representation of selected services for memoization
  const selectedServicesKey = useMemo(() => 
    JSON.stringify(selectedServices?.map(s => ({ 
      id: s.serviceId, 
      q: s.quantity, 
      p: s.customPrice 
    })) || []), 
    [selectedServices]
  );

  // Calculate totals with stable dependencies
  const { subtotal, tax, total } = useMemo(() => {
    let calculatedSubtotal = 0;

    selectedServices?.forEach((selectedService) => {
      const service = services?.find((s) => s?.id === selectedService?.serviceId);
      if (!service) return;

      const price = selectedService?.customPrice ?? parseFloat(service?.price ?? '0');
      const quantity = selectedService?.quantity ?? 1;
      calculatedSubtotal += price * quantity;
    });

    // Aplicar markup se houver
    const markup = parseFloat(markupPercent ?? '0');
    if (markup > 0) {
      calculatedSubtotal = calculatedSubtotal * (1 + markup / 100);
    }

    // Calcular imposto (12%) - apenas se não for isento
    const calculatedTax = taxExempt ? 0 : calculatedSubtotal * 0.12;

    let calculatedTotal = calculatedSubtotal + calculatedTax;

    // Aplicar desconto
    const discount = parseFloat(discountValue ?? '0');
    if (discount > 0) {
      if (discountType === 'percentage') {
        const discountAmount = calculatedSubtotal * (discount / 100);
        calculatedTotal = calculatedTotal - discountAmount;
      } else {
        calculatedTotal = calculatedTotal - discount;
      }
    }

    return {
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      total: Math.max(0, calculatedTotal),
    };
  }, [selectedServicesKey, services, markupPercent, discountType, discountValue, taxExempt]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setClientWhatsapp(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proposalCode || !demandName) {
      toast.error('Preencha o código e o nome da demanda');
      return;
    }

    if (!clientName || !clientEmail || !responsibleName || !clientWhatsapp) {
      toast.error('Preencha todos os campos do cliente');
      return;
    }

    if (!selectedServices || selectedServices.length === 0) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalCode: proposalCode || null,
          demandName: demandName || null,
          clientName,
          clientEmail,
          clientCNPJ: clientCNPJ || null,
          clientAddress: clientAddress || null,
          responsibleName,
          clientWhatsapp,
          services: selectedServices,
          markupPercent: markupPercent ? parseFloat(markupPercent) : null,
          discountType,
          discountValue: discountValue ? parseFloat(discountValue) : null,
          taxExempt,
          installments: installments ? parseInt(installments) : null,
          installmentDay: installmentDay ? parseInt(installmentDay) : null,
          observations,
          paymentTerms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error ?? 'Erro ao atualizar proposta');
        setIsLoading(false);
        return;
      }

      toast.success('Proposta atualizada com sucesso!');
      router.push(`/dashboard/propostas/${proposalId}`);
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Erro ao atualizar proposta');
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/propostas/${proposalId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Proposta</h1>
          <p className="text-gray-600 mt-1">Ajuste os dados da proposta conforme necessário</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Proposal Identification */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação da Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="proposalCode">
                  Código da Proposta <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="proposalCode"
                  value={proposalCode}
                  onChange={(e) => setProposalCode(e.target.value)}
                  placeholder="Ex: 2025.0044.V1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demandName">
                  Nome da Demanda <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="demandName"
                  value={demandName}
                  onChange={(e) => setDemandName(e.target.value)}
                  placeholder="Ex: Embalagens 2026"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  Nome da Empresa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Empresa XYZ Ltda"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="contato@empresa.com"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientCNPJ">
                  CNPJ
                </Label>
                <Input
                  id="clientCNPJ"
                  value={clientCNPJ}
                  onChange={(e) => setClientCNPJ(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress">
                  Endereço
                </Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="responsibleName">
                  Nome do Responsável <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="responsibleName"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientWhatsapp">
                  WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientWhatsapp"
                  value={clientWhatsapp}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  required
                  maxLength={16}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceSelector
              services={services}
              selectedServices={selectedServices}
              setSelectedServices={setSelectedServices}
            />
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Valores e Descontos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="markupPercent">Aumento Percentual (%)</Label>
                <Input
                  id="markupPercent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(e.target.value)}
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-gray-500">
                  Percentual de aumento sobre os valores dos serviços
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountType">Tipo de Desconto</Label>
                <Select
                  value={discountType}
                  onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}
                >
                  <SelectTrigger id="discountType">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountValue">
                Valor do Desconto {discountType === 'percentage' ? '(%)' : '(R$)'}
              </Label>
              <Input
                id="discountValue"
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? 'Ex: 10' : 'Ex: 500.00'}
              />
            </div>

            {/* Isenção de Impostos */}
            <div className="flex items-center space-x-3 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <Checkbox
                id="taxExempt"
                checked={taxExempt}
                onCheckedChange={(checked) => setTaxExempt(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="taxExempt" className="text-blue-900 font-medium cursor-pointer">
                  Isento de Impostos (Pagamento à Vista)
                </Label>
                <p className="text-xs text-blue-700 mt-1">
                  Marque esta opção para pagamentos à vista sem incidência de impostos (12%)
                </p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Subtotal:</span>
                <span className="text-gray-700 font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(subtotal)}
                </span>
              </div>
              {!taxExempt && (
                <div className="flex justify-between items-center text-base">
                  <span className="text-gray-600">Impostos (12%):</span>
                  <span className="text-blue-600 font-semibold">
                    + {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(tax)}
                  </span>
                </div>
              )}
              {taxExempt && (
                <div className="flex justify-between items-center text-base">
                  <span className="text-gray-600">Impostos:</span>
                  <span className="text-green-600 font-semibold">Isento (À Vista)</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl mt-2">
                <span className="font-bold">Total:</span>
                <span className="text-[#f88910] font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installment Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Parcelamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="12"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="Ex: 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installmentDay">Dia de Vencimento</Label>
                <Input
                  id="installmentDay"
                  type="number"
                  min="1"
                  max="31"
                  value={installmentDay}
                  onChange={(e) => setInstallmentDay(e.target.value)}
                  placeholder="15"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
              <Textarea
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: Pagamento via boleto bancário, PIX ou transferência"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Adicione observações relevantes sobre a proposta"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/propostas/${proposalId}`)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !clientName || !selectedServices || selectedServices.length === 0}
            className="bg-[#f88910] hover:bg-[#e67e0f]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
