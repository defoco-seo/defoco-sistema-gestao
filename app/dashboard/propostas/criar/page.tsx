"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceSelector } from '@/components/service-selector';
import { toast } from 'sonner';
import { Loader2, Save, Calculator } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface SelectedService {
  serviceId: string;
  quantity: number;
  customPrice?: number;
}

export default function CreateProposalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Proposal identification
  // ✅ proposalCode removido - agora é automático (PD00001, PD00002, etc.)
  const [demandName, setDemandName] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

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
  const [taxExempt, setTaxExempt] = useState(false); // Isento de impostos (pagamento à vista)
  const [observations, setObservations] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  // Installments
  const [installments, setInstallments] = useState('');
  const [installmentDay, setInstallmentDay] = useState('15');

  // Load services once
  useEffect(() => {
    fetchServices();
  }, []);

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
      total: Math.max(0, calculatedTotal)
    };
  }, [selectedServicesKey, markupPercent, discountType, discountValue, taxExempt]);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data ?? []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setClientWhatsapp(formatted);
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use JPG, PNG, SVG ou PDF.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    setCoverImageFile(file);
    toast.success('Imagem selecionada! Será enviada ao criar a proposta.');
  };

  const uploadCoverImage = async (): Promise<string | null> => {
    if (!coverImageFile) return null;

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', coverImageFile);

      const response = await fetch('/api/upload/cover-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error ?? 'Erro ao fazer upload da capa');
        return null;
      }

      return data.cloud_storage_path;
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('Erro ao fazer upload da capa');
      return null;
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!demandName) {
      toast.error('Preencha o nome da demanda');
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
      // Upload cover image if selected
      let coverImagePath: string | null = null;
      if (coverImageFile) {
        coverImagePath = await uploadCoverImage();
        if (!coverImagePath) {
          toast.error('Erro ao fazer upload da capa. Tente novamente.');
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalCode: null, // ✅ Sempre null - geração automática no backend (PD00001, PD00002, etc.)
          demandName: demandName || null,
          coverImage: coverImagePath,
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
        toast.error(data?.error ?? 'Erro ao criar proposta');
        setIsLoading(false);
        return;
      }

      toast.success('Proposta criada com sucesso!');
      router.push(`/dashboard/propostas/${data?.id}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Erro ao criar proposta');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nova Proposta</h1>
        <p className="text-gray-600 mt-1">Crie uma proposta comercial profissional</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Proposal Identification */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação da Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ✅ CORREÇÃO 4: Código da proposta agora é AUTOMÁTICO (PD00001, PD00002, etc.) */}
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
            <div className="space-y-2">
              <Label htmlFor="coverImage">
                Arte de Capa (A4) - Opcional
              </Label>
              <Input
                id="coverImage"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/svg+xml,application/pdf"
                onChange={handleCoverImageChange}
                disabled={isUploadingCover}
              />
              <p className="text-xs text-gray-500">
                Formatos aceitos: JPG, PNG, SVG ou PDF. Tamanho máximo: 10MB. 
                {coverImageFile && (
                  <span className="text-green-600 font-medium ml-2">
                    ✓ {coverImageFile.name} selecionado
                  </span>
                )}
              </p>
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
                  placeholder="João Silva"
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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Selection */}
        <ServiceSelector
          services={services}
          selectedServices={selectedServices}
          setSelectedServices={setSelectedServices}
        />

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Valores e Descontos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Markup */}
            <div className="space-y-2">
              <Label htmlFor="markupPercent">Aumento Percentual sobre Valores (%)</Label>
              <Input
                id="markupPercent"
                type="number"
                step="0.01"
                min="0"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(e.target.value)}
                placeholder="Ex: 10 (para 10% de aumento)"
              />
              <p className="text-xs text-gray-500">
                Aplica um percentual de aumento sobre todos os valores dos serviços antes do desconto
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="discountType">Tipo de Desconto</Label>
                <Select
                  value={discountType}
                  onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">Valor do Desconto</Label>
                <Input
                  id="discountValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '10' : '100.00'}
                />
              </div>
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

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              {!taxExempt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Impostos (12%):</span>
                  <span className="font-semibold text-blue-600">+ {formatCurrency(tax)}</span>
                </div>
              )}
              {taxExempt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Impostos:</span>
                  <span className="font-semibold text-green-600">Isento (À Vista)</span>
                </div>
              )}
              {discountValue && parseFloat(discountValue) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Desconto:</span>
                  <span className="font-semibold text-red-600">
                    - {discountType === 'percentage' ? `${discountValue}%` : formatCurrency(parseFloat(discountValue))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg border-t pt-2">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-[#f88910]">{formatCurrency(total)}</span>
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
            {/* Parcelamento */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="36"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="Ex: 12"
                />
                <p className="text-xs text-gray-500">
                  Deixe vazio se não houver parcelamento
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="installmentDay">Dia de Vencimento das Parcelas</Label>
                <Input
                  id="installmentDay"
                  type="number"
                  min="1"
                  max="31"
                  value={installmentDay}
                  onChange={(e) => setInstallmentDay(e.target.value)}
                  placeholder="Ex: 15"
                />
                <p className="text-xs text-gray-500">
                  Dia do mês para vencimento (1-31)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
              <Textarea
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: 50% no início do projeto e 50% após entrega"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Informações adicionais sobre a proposta"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/propostas')}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-[#f88910] hover:bg-[#e07800] gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Criar Proposta
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}