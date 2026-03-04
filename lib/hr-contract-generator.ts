import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LOGO_DEFOCO_BASE64 } from './logo-base64';
import { LOGO_MINI_BASE64 } from './logo-mini-base64';
import { CAPA_PADRAO_BASE64 } from './capa-padrao-base64';

interface HRContractData {
  contractNumber: string;
  contractorName: string;
  contractorCPF: string;
  contractorCNPJ?: string | null;
  contractorAddress: string;
  representativeName: string;
  representativeCPF: string;
  serviceScope?: string | null;
  monthlyValue: number;
  startDate: Date;
  duration: number;
}

export async function generateHRContractPDF(contractData: HRContractData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Cores
  const orangeColor: [number, number, number] = [248, 137, 16]; // #f88910
  const darkGray: [number, number, number] = [50, 50, 50];
  const lightGray: [number, number, number] = [100, 100, 100];

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // ==============================
  // PÁGINA 1: CAPA PADRÃO
  // ==============================
  try {
    doc.addImage(CAPA_PADRAO_BASE64, 'PNG', 0, 0, pageWidth, pageHeight);
  } catch (error) {
    console.error('Erro ao adicionar capa:', error);
  }

  // ==============================
  // PÁGINA 2: CONTEÚDO DO CONTRATO
  // ==============================
  doc.addPage();

  let yPos = 15;

  // Logo mini no topo
  try {
    doc.addImage(LOGO_MINI_BASE64, 'PNG', margin, yPos, 18, 13.9);
  } catch (error) {
    console.error('Erro ao adicionar logo mini:', error);
  }

  yPos += 25; // Aumentado de 20 para 25 para evitar sobreposição

  // Cabeçalho do contrato
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  doc.text('ENTRE PESSOAS JURÍDICAS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Corpo do contrato
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  // Função auxiliar para adicionar texto com quebra de linha
  const addText = (text: string, isBold: boolean = false, extraSpacing: number = 0) => {
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      if (yPos > pageHeight - 35) {
        addFooter();
        doc.addPage();
        // Logo mini no topo da nova página
        try {
          doc.addImage(LOGO_MINI_BASE64, 'PNG', margin, 15, 18, 13.9);
        } catch (error) {
          console.error('Erro ao adicionar logo mini:', error);
        }
        yPos = 42; // Posição após o logo (15 + 13.9 + 13 = 41.9, arredondado para 42)
      }
      doc.text(line, margin, yPos);
      yPos += 6 + extraSpacing; // Aumentado de 5.5 para 6
    }
  };

  // Função para adicionar rodapé
  const addFooter = () => {
    const footerY = pageHeight - 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text(
      'DEFOCO - Comunicação Visual | www.defoco.com.br | contato@defoco.com.br',
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
  };

  // Formatação de valores
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  // Texto do contrato
  addText(
    `YOUPUBLI COMUNICAÇÃO LTDA, com sede na Avenida Paulista, 1471, Conjunto 511, Bela Vista, CEP 01311-927, São Paulo, SP, inscrita no CNPJ sob nº 49.857.114/0001-58, neste ato representada por sua sócia administradora PAULA BERROCAL, CPF nº 431.791.378-00, doravante denominada CONTRATANTE; e, de outro lado,`
  );
  yPos += 1;

  // Dados da CONTRATADA
  const contractorInfo = contractData.contractorCNPJ
    ? `${contractData.contractorName}, pessoa jurídica de direito privado, com sede em ${contractData.contractorAddress}, inscrita no CNPJ sob nº ${formatCNPJ(contractData.contractorCNPJ)}, neste ato representada por seu sócio administrador ${contractData.representativeName}, CPF nº ${formatCPF(contractData.representativeCPF)}`
    : `${contractData.contractorName}, com endereço em ${contractData.contractorAddress}, portador(a) do CPF nº ${formatCPF(contractData.contractorCPF)}, neste ato representado(a) por ${contractData.representativeName}, CPF nº ${formatCPF(contractData.representativeCPF)}`;

  addText(contractorInfo + ', doravante denominada CONTRATADA, resolvem celebrar o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS, que se regerá pelas cláusulas e condições a seguir:');
  yPos += 6;

  // CLÁUSULA PRIMEIRA
  addText('CLÁUSULA PRIMEIRA – DO OBJETO', true);
  yPos += 2;
  addText(
    '1.1. O presente contrato tem por objeto a prestação de serviços especializados de Design Gráfico pela CONTRATADA à CONTRATANTE, com total autonomia técnica, administrativa e operacional, sem qualquer subordinação jurídica.'
  );
  addText(
    `1.2. Os serviços incluem, ${contractData.serviceScope || 'mas não se limitam a criação de identidades visuais, catálogos, rótulos, embalagens, layouts para materiais online e offline, diagramação, criação de vídeos, layout de sites, tratamento de imagens e demais demandas criativas solicitadas'}.`
  );
  addText(
    '1.3. A CONTRATADA declara possuir plena capacidade técnica, jurídica e operacional para a execução dos serviços.'
  );
  addText('1.4. Este contrato substitui integralmente qualquer ajuste anterior, verbal ou escrito.');
  yPos += 5;

  // CLÁUSULA SEGUNDA
  addText(
    'CLÁUSULA SEGUNDA – DA NATUREZA JURÍDICA E AUSÊNCIA DE VÍNCULO EMPREGATÍCIO',
    true
  );
  yPos += 2;
  addText(
    '2.1. As PARTES reconhecem expressamente que este contrato possui natureza exclusivamente civil e empresarial, firmado entre duas pessoas jurídicas, não gerando, em nenhuma hipótese, vínculo empregatício, societário ou equiparado.'
  );
  addText(
    '2.2. Fica expressamente afastada qualquer possibilidade de reconhecimento de subordinação, pessoalidade, habitualidade, exclusividade ou onerosidade nos moldes da CLT.'
  );
  addText(
    '2.3. A CONTRATADA possui plena liberdade na organização de sua rotina, métodos, prazos, equipes, estrutura, local de execução e meios de produção.'
  );
  addText(
    '2.4. Eventuais solicitações da CONTRATANTE não caracterizam comando hierárquico, mas apenas alinhamento técnico e contratual sobre resultados esperados.'
  );
  yPos += 5;

  // CLÁUSULA TERCEIRA
  addText('CLÁUSULA TERCEIRA – DO PRAZO', true);
  yPos += 2;
  addText(
    `3.1. O presente contrato terá vigência de ${contractData.duration} meses, contados da data de sua assinatura, podendo ser prorrogado automaticamente por iguais períodos, caso não haja manifestação expressa de rescisão por qualquer das PARTES.`
  );
  yPos += 5;

  // CLÁUSULA QUARTA
  addText('CLÁUSULA QUARTA – DO PREÇO E PAGAMENTO', true);
  yPos += 2;
  addText(
    `4.1. A CONTRATANTE pagará à CONTRATADA o valor mensal de ${formatCurrency(contractData.monthlyValue)}.`
  );
  addText(
    '4.2. O pagamento será efetuado até o quinto dia útil do mês subsequente, mediante apresentação de Nota Fiscal válida.'
  );
  addText(
    '4.3. A CONTRATADA é única e integralmente responsável por todos os tributos, encargos fiscais, previdenciários, trabalhistas, comerciais ou de qualquer natureza.'
  );
  addText(
    '4.4. O atraso na emissão da Nota Fiscal suspende automaticamente a obrigação de pagamento até sua regularização.'
  );
  yPos += 5;

  // CLÁUSULA QUINTA
  addText('CLÁUSULA QUINTA – DAS OBRIGAÇÕES DA CONTRATADA', true);
  yPos += 2;
  addText('A CONTRATADA obriga-se a:');
  yPos += 1;
  addText(
    'a) Executar os serviços com zelo, qualidade técnica e observância das boas práticas profissionais.'
  );
  addText(
    'b) Não terceirizar ou subcontratar os serviços sem autorização expressa da CONTRATANTE.'
  );
  addText(
    'c) Responder integralmente por qualquer violação de direitos autorais, imagem, propriedade intelectual ou uso indevido de material.'
  );
  addText('d) Manter absoluto sigilo, postura ética e lealdade comercial.');
  addText(
    'e) Não manter contato comercial direto com clientes da CONTRATANTE sem autorização formal.'
  );
  addText(
    'f) Não captar, assediar, atrair ou negociar diretamente com clientes, fornecedores ou parceiros apresentados pela CONTRATANTE.'
  );
  yPos += 5;

  // CLÁUSULA SEXTA
  addText('CLÁUSULA SEXTA – DA CONFIDENCIALIDADE E PROPRIEDADE INTELECTUAL', true);
  yPos += 2;
  addText('6.1. Todas as informações acessadas são confidenciais em caráter absoluto.');
  addText(
    '6.2. A violação de sigilo sujeitará a CONTRATADA à multa não compensatória equivalente a 50 vezes o valor da última remuneração mensal, além de perdas e danos.'
  );
  addText(
    '6.3. Todos os direitos patrimoniais das criações desenvolvidas pertencem exclusivamente à CONTRATANTE, de forma definitiva, total, irrevogável e irretratável.'
  );
  addText(
    '6.4. A CONTRATADA fica proibida de reutilizar, adaptar, revender, distribuir ou comercializar qualquer criação realizada sob este contrato.'
  );
  addText(
    '6.5. O uso em portfólio somente será permitido mediante autorização expressa e escrita da CONTRATANTE.'
  );
  yPos += 5;

  // CLÁUSULA SÉTIMA
  addText('CLÁUSULA SÉTIMA – DA RESCISÃO', true);
  yPos += 2;
  addText(
    '7.1. O contrato poderá ser rescindido por qualquer das PARTES mediante aviso prévio de 30 dias.'
  );
  addText(
    '7.2. A rescisão por descumprimento contratual sujeitará a parte infratora a perdas e danos.'
  );
  yPos += 5;

  // CLÁUSULA OITAVA
  addText('CLÁUSULA OITAVA – DA PROTEÇÃO DE DADOS', true);
  yPos += 2;
  addText(
    '8.1. Caso a execução dos serviços envolva tratamento de dados pessoais, a CONTRATANTE será a Controladora e a CONTRATADA a Operadora, nos termos da Lei nº 13.709/2018.'
  );
  yPos += 5;

  // CLÁUSULA NONA
  addText('CLÁUSULA NONA – DA NÃO CONCORRÊNCIA E NÃO ALICIAMENTO', true);
  yPos += 2;
  addText(
    '9.1. Durante a vigência do contrato e por 24 meses após seu término, a CONTRATADA fica proibida de:'
  );
  yPos += 1;
  addText(
    'a) Prestar serviços a qualquer cliente da CONTRATANTE ao qual teve acesso.'
  );
  addText(
    'b) Utilizar informações estratégicas da CONTRATANTE em benefício próprio ou de terceiros.'
  );
  addText(
    'c) Aliciar, contratar ou tentar contratar colaboradores, parceiros, fornecedores ou prestadores vinculados à CONTRATANTE.'
  );
  yPos += 1;
  addText(
    '9.2. O descumprimento implicará multa não compensatória equivalente a 24 remunerações mensais vigentes à época da infração, além de perdas e danos.'
  );
  yPos += 5;

  // CLÁUSULA DÉCIMA
  addText('CLÁUSULA DÉCIMA – DA LIMITAÇÃO DE RESPONSABILIDADE', true);
  yPos += 2;
  addText(
    '10.1. Salvo nos casos de dolo, culpa grave, violação de confidencialidade ou propriedade intelectual, a responsabilidade total ficará limitada ao valor pago nos últimos 6 meses.'
  );
  addText(
    '10.2. Não haverá responsabilidade por lucros cessantes, danos indiretos, incidentais ou consequenciais.'
  );
  yPos += 5;

  // CLÁUSULA DÉCIMA PRIMEIRA
  addText('CLÁUSULA DÉCIMA PRIMEIRA – DA VEDAÇÃO AO SUBORNO', true);
  yPos += 2;
  addText(
    '11.1. As PARTES declaram cumprir integralmente a Lei nº 12.846/2013 e demais normas anticorrupção.'
  );
  yPos += 5;

  // CLÁUSULA DÉCIMA SEGUNDA
  addText('CLÁUSULA DÉCIMA SEGUNDA – DO FORO', true);
  yPos += 2;
  addText(
    '12.1. Fica eleito o foro da Comarca de São Paulo, SP, com renúncia a qualquer outro, por mais privilegiado que seja.'
  );
  yPos += 5;

  // CLÁUSULA DÉCIMA TERCEIRA
  addText(
    'CLÁUSULA DÉCIMA TERCEIRA – CONTRA RECONHECIMENTO DE VÍNCULO EMPREGATÍCIO',
    true
  );
  yPos += 2;
  addText(
    '13.1. As PARTES reconhecem e declaram, de forma expressa, consciente e irrevogável, que inexistem, na presente relação contratual, os requisitos caracterizadores do vínculo empregatício previstos nos artigos 2º e 3º da Consolidação das Leis do Trabalho, notadamente subordinação jurídica, pessoalidade, habitualidade e exclusividade.'
  );
  addText(
    '13.2. A CONTRATADA declara possuir plena ciência de que presta serviços na condição de pessoa jurídica independente, assumindo integralmente os riscos de sua atividade econômica, nos termos do artigo 593 e seguintes do Código Civil.'
  );
  addText(
    '13.3. Na hipótese de a CONTRATADA, seus sócios, administradores, colaboradores ou eventuais sucessores ajuizarem ação trabalhista, previdenciária ou de qualquer natureza visando ao reconhecimento de vínculo empregatício com a CONTRATANTE, e sendo esta condenada, ainda que parcialmente, a CONTRATADA obriga-se a:'
  );
  yPos += 1;
  addText(
    'a) Reembolsar integralmente todos os valores pagos pela CONTRATANTE em decorrência da condenação, incluindo verbas trabalhistas, encargos previdenciários, fiscais, honorários advocatícios, custas processuais e quaisquer despesas correlatas.'
  );
  addText(
    'b) Pagar multa não compensatória equivalente a 100 vezes o valor da última remuneração mensal vigente à época do ajuizamento da ação, independentemente de apuração de perdas e danos.'
  );
  yPos += 1;
  addText(
    '13.4. A presente cláusula possui natureza de obrigação autônoma, sendo plenamente exigível independentemente do resultado final da demanda, bastando a comprovação da propositura da ação.'
  );
  addText(
    '13.5. A nulidade ou invalidade parcial desta cláusula não prejudicará sua eficácia quanto às demais disposições, permanecendo válidas e exigíveis as obrigações aqui assumidas.'
  );
  addText(
    '13.6. Esta cláusula permanecerá plenamente válida e eficaz mesmo após o término do presente contrato, por qualquer motivo, pelo prazo de 5 anos.'
  );
  yPos += 8;

  // Assinatura
  addText(
    'E por estarem justas e contratadas, firmam eletronicamente o presente instrumento.',
    false
  );
  yPos += 12;

  // Verifica se há espaço para assinaturas, senão cria nova página
  if (yPos > pageHeight - 60) {
    addFooter();
    doc.addPage();
    try {
      doc.addImage(LOGO_MINI_BASE64, 'PNG', margin, 15, 18, 13.9);
    } catch (error) {
      console.error('Erro ao adicionar logo mini:', error);
    }
    yPos = 40;
  }

  // Blocos de assinatura
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('CONTRATANTE', margin + 30, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('YOUPUBLI COMUNICAÇÃO LTDA', margin + 30, yPos);
  doc.line(margin, yPos + 2, margin + 80, yPos + 2);
  yPos += 15;

  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATADA', margin + 30, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(contractData.contractorName, margin + 30, yPos);
  doc.line(margin, yPos + 2, margin + 80, yPos + 2);

  // Rodapé da última página
  addFooter();

  // Retorna o PDF como Blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}
