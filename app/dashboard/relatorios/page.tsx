'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  Users,
  Briefcase,
  DollarSign,
  Loader2,
} from 'lucide-react';

type ReportType = 'propostas' | 'financeiro' | 'clientes' | 'jobs';

interface ReportConfig {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  statusOptions: { value: string; label: string }[];
}

const reportConfigs: ReportConfig[] = [
  {
    type: 'propostas',
    title: 'Propostas Comerciais',
    description: 'Exporta todas as propostas com valores, status e dados de clientes',
    icon: <FileText className="h-5 w-5" />,
    statusOptions: [
      { value: '', label: 'Todos os status' },
      { value: 'draft', label: 'Rascunho' },
      { value: 'sent', label: 'Enviada' },
      { value: 'approved', label: 'Aprovada' },
      { value: 'rejected', label: 'Rejeitada' },
    ],
  },
  {
    type: 'financeiro',
    title: 'Financeiro',
    description: 'Exporta parcelas, vencimentos e status de pagamentos',
    icon: <DollarSign className="h-5 w-5" />,
    statusOptions: [
      { value: '', label: 'Todos os status' },
      { value: 'pending', label: 'Pendente' },
      { value: 'paid', label: 'Pago' },
      { value: 'overdue', label: 'Atrasado' },
    ],
  },
  {
    type: 'clientes',
    title: 'CRM - Clientes',
    description: 'Exporta leads, prospects e clientes com histórico de interações',
    icon: <Users className="h-5 w-5" />,
    statusOptions: [
      { value: '', label: 'Todos os status' },
      { value: 'lead', label: 'Lead' },
      { value: 'prospect', label: 'Prospect' },
      { value: 'negotiation', label: 'Negociação' },
      { value: 'client', label: 'Cliente' },
      { value: 'inactive', label: 'Inativo' },
    ],
  },
  {
    type: 'jobs',
    title: 'Jobs Criativos',
    description: 'Exporta demandas criativas com briefings, prazos e responsáveis',
    icon: <Briefcase className="h-5 w-5" />,
    statusOptions: [
      { value: '', label: 'Todos os status' },
      { value: 'backlog', label: 'Backlog' },
      { value: 'todo', label: 'A Fazer' },
      { value: 'in_progress', label: 'Em Andamento' },
      { value: 'review', label: 'Revisão' },
      { value: 'done', label: 'Concluído' },
    ],
  },
];

export default function RelatoriosPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('propostas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  const currentConfig = reportConfigs.find((c) => c.type === selectedType)!;

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: selectedType,
        format: 'json',
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(status && { status }),
      });

      const response = await fetch(`/api/reports?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar dados');

      const result = await response.json();
      setPreviewData(result.data);
      toast.success(`${result.count} registros encontrados`);
    } catch (error) {
      toast.error('Erro ao carregar pré-visualização');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: selectedType,
        format: format === 'excel' ? 'excel' : 'json',
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(status && { status }),
      });

      const response = await fetch(`/api/reports?${params}`);
      if (!response.ok) throw new Error('Erro ao gerar relatório');

      if (format === 'excel') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${selectedType}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Excel exportado com sucesso!');
      } else {
        // PDF é gerado no cliente usando os dados JSON
        const result = await response.json();
        generatePDFReport(result.data, currentConfig.title);
        toast.success('PDF exportado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDFReport = (data: any[], title: string) => {
    // Cria uma janela de impressão com tabela formatada
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - Defoco</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #f88910;
          }
          .header h1 {
            color: #f88910;
            margin: 0;
            font-size: 24px;
          }
          .header .date {
            color: #666;
            font-size: 14px;
          }
          .filters {
            background: #f5f5f5;
            padding: 10px 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            background: #f88910;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #666;
          }
          .total {
            margin-top: 20px;
            font-weight: bold;
            font-size: 14px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório: ${title}</h1>
          <div class="date">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        
        <div class="filters">
          <strong>Filtros aplicados:</strong>
          ${startDate ? `Período: ${startDate} a ${endDate || 'atual'}` : 'Todos os períodos'}
          ${status ? ` | Status: ${status}` : ''}
        </div>

        <table>
          <thead>
            <tr>
              ${columns.map((col) => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                ${columns
                  .map((col) => {
                    const value = row[col];
                    const formatted =
                      typeof value === 'number' && col.toLowerCase().includes('valor')
                        ? value.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : value;
                    return `<td>${formatted}</td>`;
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="total">Total de registros: ${data.length}</div>

        <div class="footer">
          Defoco - Gestão Criativa | Este relatório foi gerado automaticamente pelo sistema.
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatus('');
    setPreviewData(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Exporte dados do sistema em Excel ou PDF
          </p>
        </div>
        <BarChart3 className="h-8 w-8 text-[#f88910]" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Painel de Configuração */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Configuração
            </CardTitle>
            <CardDescription>Selecione o tipo e filtros</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select
                value={selectedType}
                onValueChange={(v) => {
                  setSelectedType(v as ReportType);
                  setStatus('');
                  setPreviewData(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportConfigs.map((config) => (
                    <SelectItem key={config.type} value={config.type}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        {config.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {currentConfig.statusOptions.map((opt) => (
                    <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handlePreview}
                disabled={isLoading}
                className="flex-1"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Pré-visualizar'
                )}
              </Button>
              <Button onClick={clearFilters} variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Painel de Exportação e Preview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentConfig.icon}
              {currentConfig.title}
            </CardTitle>
            <CardDescription>{currentConfig.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="export" className="space-y-4">
              <TabsList>
                <TabsTrigger value="export">Exportar</TabsTrigger>
                <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
              </TabsList>

              <TabsContent value="export" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card
                    className="cursor-pointer transition-all hover:border-green-500 hover:shadow-md"
                    onClick={() => handleExport('excel')}
                  >
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="rounded-lg bg-green-100 p-3">
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Exportar Excel</h3>
                        <p className="text-sm text-muted-foreground">
                          Arquivo .xlsx editável
                        </p>
                      </div>
                      <Download className="ml-auto h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer transition-all hover:border-red-500 hover:shadow-md"
                    onClick={() => handleExport('pdf')}
                  >
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="rounded-lg bg-red-100 p-3">
                        <FileText className="h-8 w-8 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Exportar PDF</h3>
                        <p className="text-sm text-muted-foreground">
                          Relatório formatado para impressão
                        </p>
                      </div>
                      <Download className="ml-auto h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </div>

                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
                    <span className="ml-2">Gerando relatório...</span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview">
                {previewData === null ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4" />
                    <p>Clique em &quot;Pré-visualizar&quot; para ver os dados</p>
                  </div>
                ) : previewData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4" />
                    <p>Nenhum registro encontrado com os filtros aplicados</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-auto rounded border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#f88910] text-white">
                        <tr>
                          {Object.keys(previewData[0]).map((key) => (
                            <th key={key} className="p-2 text-left font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b hover:bg-muted/50">
                            {Object.values(row).map((value, j) => (
                              <td key={j} className="p-2">
                                {typeof value === 'number' &&
                                Object.keys(row)[j].toLowerCase().includes('valor')
                                  ? (value as number).toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })
                                  : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.length > 50 && (
                      <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                        Mostrando 50 de {previewData.length} registros. Exporte para ver todos.
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
