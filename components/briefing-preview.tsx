'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, CheckCircle2, AlertCircle, Calendar, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BriefingField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
}

interface BriefingSection {
  title: string;
  questions: BriefingField[];
}

interface BriefingPreviewProps {
  briefingType: string;
  briefingData: Record<string, any>;
  template: {
    name: string;
    structure: BriefingSection[];
  };
  clientName?: string;
  jobTitle?: string;
  deadline?: Date | string;
  showCompleteness?: boolean;
}

export function BriefingPreview({
  briefingType,
  briefingData,
  template,
  clientName,
  jobTitle,
  deadline,
  showCompleteness = true,
}: BriefingPreviewProps) {
  // Calcula completude do briefing
  const completeness = useMemo(() => {
    let totalRequired = 0;
    let filledRequired = 0;
    let totalOptional = 0;
    let filledOptional = 0;

    template.structure.forEach((section) => {
      section.questions.forEach((question) => {
        const value = briefingData[question.id];
        const isFilled = value !== undefined && value !== null && value !== '';

        if (question.required) {
          totalRequired++;
          if (isFilled) filledRequired++;
        } else {
          totalOptional++;
          if (isFilled) filledOptional++;
        }
      });
    });

    const requiredPercent = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 100;
    const totalPercent = (totalRequired + totalOptional) > 0
      ? Math.round(((filledRequired + filledOptional) / (totalRequired + totalOptional)) * 100)
      : 100;

    return {
      requiredPercent,
      totalPercent,
      filledRequired,
      totalRequired,
      filledOptional,
      totalOptional,
      isComplete: requiredPercent === 100,
    };
  }, [briefingData, template]);

  const formatValue = (value: any, type: string): string => {
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    if (type === 'date' && value) {
      try {
        return format(new Date(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const briefingTypeLabels: Record<string, string> = {
    branding: 'Branding',
    embalagem: 'Embalagem',
    social_media: 'Social Media',
    campanha: 'Campanha',
    video: 'Vídeo/Animação',
    landing_page: 'Landing Page',
    paginas_site: 'Páginas de Site',
    outros: 'Outros',
  };

  return (
    <Card className="border-[#f88910]/20">
      <CardHeader className="bg-gradient-to-r from-[#f88910]/10 to-transparent pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#f88910]" />
              <CardTitle className="text-lg">
                Briefing: {template.name}
              </CardTitle>
              <Badge variant="outline" className="border-[#f88910] text-[#f88910]">
                {briefingTypeLabels[briefingType] || briefingType}
              </Badge>
            </div>
            
            {(clientName || jobTitle) && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                {clientName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {clientName}
                  </span>
                )}
                {jobTitle && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {jobTitle}
                  </span>
                )}
                {deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(deadline), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
            )}
          </div>

          {showCompleteness && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                {completeness.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <span className={`text-lg font-bold ${
                  completeness.isComplete ? 'text-green-500' : 'text-amber-500'
                }`}>
                  {completeness.totalPercent}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {completeness.filledRequired}/{completeness.totalRequired} obrigatórios
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {template.structure.map((section, sectionIndex) => {
              // Verifica se a seção tem algum campo preenchido
              const hasFilledFields = section.questions.some(
                (q) => briefingData[q.id] !== undefined && briefingData[q.id] !== '' && briefingData[q.id] !== null
              );

              if (!hasFilledFields) return null;

              return (
                <div key={sectionIndex}>
                  <h4 className="font-semibold text-sm text-[#f88910] mb-3">
                    {section.title}
                  </h4>
                  <div className="space-y-3">
                    {section.questions.map((question) => {
                      const value = briefingData[question.id];
                      if (value === undefined || value === '' || value === null) return null;

                      return (
                        <div key={question.id} className="grid grid-cols-3 gap-2">
                          <div className="text-sm text-muted-foreground">
                            {question.label}
                            {question.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </div>
                          <div className="col-span-2 text-sm">
                            {question.type === 'textarea' ? (
                              <p className="whitespace-pre-wrap bg-muted/50 rounded p-2">
                                {formatValue(value, question.type)}
                              </p>
                            ) : (
                              <span className="font-medium">
                                {formatValue(value, question.type)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sectionIndex < template.structure.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Componente compacto para listagem
export function BriefingBadge({
  briefingType,
  completeness,
}: {
  briefingType: string;
  completeness: number;
}) {
  const briefingTypeLabels: Record<string, string> = {
    branding: 'Branding',
    embalagem: 'Embalagem',
    social_media: 'Social Media',
    campanha: 'Campanha',
    video: 'Vídeo',
    landing_page: 'Landing Page',
    paginas_site: 'Site',
    outros: 'Outros',
  };

  return (
    <Badge 
      variant="outline" 
      className={`gap-1 ${
        completeness === 100 
          ? 'border-green-500 text-green-600' 
          : completeness >= 50 
            ? 'border-amber-500 text-amber-600' 
            : 'border-red-500 text-red-600'
      }`}
    >
      <FileText className="h-3 w-3" />
      {briefingTypeLabels[briefingType] || briefingType}
      <span className="ml-1 text-xs">{completeness}%</span>
    </Badge>
  );
}
