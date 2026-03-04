import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_MINI_BASE64 } from './logo-mini-base64';

interface ContractData {
  proposal: any;
  layoutConfig?: any;
}

const DEFOCO_ORANGE_RGB = [248, 137, 16];

export async function generateContractPDF(data: ContractData): Promise<Blob> {
  try {
    const { proposal, layoutConfig } = data;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = 35; // ✅ Aumentado de 20 para 35 - mais respiro após o logo

    // Helper para adicionar logo em cada página
    const addPageLogo = () => {
      try {
        // Logo no canto superior esquerdo (consistente com a proposta)
        doc.addImage(LOGO_MINI_BASE64, 'PNG', margin - 5, 10, 18, 13.9);
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    };

    // Helper para quebra de página
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - 30) {
        doc.addPage();
        yPosition = 35; // ✅ Mantém respiro consistente em novas páginas
        addPageLogo();
      }
    };

    // Helper para criar seções com fundo laranja (igual às propostas)
    const addSectionHeader = (title: string) => {
      checkPageBreak(20); // ✅ Aumentado de 15 para 20
      doc.setFillColor(DEFOCO_ORANGE_RGB[0], DEFOCO_ORANGE_RGB[1], DEFOCO_ORANGE_RGB[2]);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F'); // ✅ Altura aumentada de 8 para 10
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15); // ✅ Aumentado de 12 para 15 (igual proposta)
      doc.text(title, margin + 3, yPosition + 2); // ✅ Ajuste vertical para centralizar melhor
      yPosition += 15; // ✅ Aumentado de 10 para 15
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13); // ✅ Aumentado de 11 para 13 (igual proposta)
    };

    // Logo no topo da primeira página
    addPageLogo();

    // TÍTULO
    doc.setFontSize(18); // ✅ Aumentado de 16 para 18
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DEFOCO_ORANGE_RGB[0], DEFOCO_ORANGE_RGB[1], DEFOCO_ORANGE_RGB[2]);
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 9; // ✅ Aumentado de 8 para 9
    
    doc.setFontSize(16); // ✅ Aumentado de 14 para 16
    doc.text('DE COMUNICAÇÃO E DESIGN', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 18; // ✅ Aumentado de 15 para 18 - mais respiro

    // Reset para texto normal
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13); // ✅ Aumentado de 11 para 13 (igual proposta)

    // PARTES DO CONTRATO
    // Intro
    const introText = 'Pelo presente instrumento, de um lado,';
    doc.text(introText, margin, yPosition);
    yPosition += 8; // ✅ Aumentado de 7 para 8

    // CONTRATADA (YOUPUBLI) - conforme documento, vem primeiro
    doc.setFont('helvetica', 'bold');
    doc.text('YOUPUBLI COMUNICAÇÃO LTDA,', margin, yPosition);
    yPosition += 7; // ✅ Aumentado de 6 para 7
    doc.setFont('helvetica', 'normal');
    
    const contratadaText = 'CNPJ nº 49.857.114/0001-58, Inscrição Estadual e Municipal nº 336905177111, com sede na Av. Paulista, 1471, Conj. 511, CEP 01311-927, Bela Vista, São Paulo/SP, representada por sua administradora Paula Berrocal, brasileira, casada sob o regime de comunhão parcial de bens, inscrita no CPF nº 431.791.378-00, residente na Avenida Vereador Emílio Granato, 6.000, CEP 11602-170, Enseada, Casa 8, Bloco 5, Condomínio Sun Beach, São Sebastião/SP, doravante denominada CONTRATADA,';
    const contratadaLines = doc.splitTextToSize(contratadaText, pageWidth - 2 * margin);
    doc.text(contratadaLines, margin, yPosition);
    yPosition += contratadaLines.length * 7 + 10; // ✅ Aumentado espaçamento de linha de 6 para 7, e espaço final de 8 para 10

    // CONTRATANTE
    const introContratante = 'e, de outro lado doravante denominada CONTRATANTE,';
    doc.text(introContratante, margin, yPosition);
    yPosition += 7; // ✅ Aumentado de 6 para 7
    
    // Debug log
    console.log('[CONTRACT] Proposal data:', {
      clientName: proposal?.clientName,
      clientCNPJ: proposal?.clientCNPJ,
      clientAddress: proposal?.clientAddress,
      representativeName: proposal?.representativeName,
      representativeCPF: proposal?.representativeCPF,
    });
    
    const clientePlaceholder = proposal?.clientName || '"cliente"';
    doc.setFont('helvetica', 'bold');
    doc.text(`${clientePlaceholder},`, margin, yPosition);
    yPosition += 7; // ✅ Aumentado de 6 para 7
    doc.setFont('helvetica', 'normal');
    
    const cnpj = proposal?.clientCNPJ || '"cnpj"';
    const address = proposal?.clientAddress || '"endereço cliente"';
    
    // Dados do representante legal
    const repName = proposal?.representativeName || '"nome do representante"';
    const repNationality = proposal?.representativeNationality || '"nacionalidade"';
    const repMaritalStatus = proposal?.representativeMaritalStatus || '"estado civil"';
    const repProfession = proposal?.representativeProfession || '"profissão"';
    const repCPF = proposal?.representativeCPF || '"cpf"';
    
    const contractanteText = `inscrita no CNPJ/MF sob o nº ${cnpj}, com sede à ${address}, neste ato representada por ${repName}, ${repNationality}, ${repMaritalStatus}, ${repProfession}, inscrito(a) no CPF nº ${repCPF}.`;
    const contractanteLines = doc.splitTextToSize(contractanteText, pageWidth - 2 * margin);
    doc.text(contractanteLines, margin, yPosition);
    yPosition += contractanteLines.length * 7 + 10; // ✅ Aumentado espaçamento de linha de 6 para 7, e espaço final de 8 para 10

    const partesText = 'As partes acima identificadas, doravante referidas em conjunto como PARTES e, isoladamente, como PARTE, têm entre si justo e contratado o que segue.';
    const partesLines = doc.splitTextToSize(partesText, pageWidth - 2 * margin);
    doc.text(partesLines, margin, yPosition);
    yPosition += partesLines.length * 7 + 15; // ✅ Aumentado espaçamento de linha de 6 para 7, e espaço final de 12 para 15

    checkPageBreak(80);

    // CLÁUSULA PRIMEIRA - OBJETO DO CONTRATO
    addSectionHeader('CLÁUSULA PRIMEIRA – OBJETO DO CONTRATO');
    
    doc.setFont('helvetica', 'bold');
    doc.text('1.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const obj1Text = `A CONTRATANTE contrata a CONTRATADA para a prestação de serviços especializados na área de estratégia, planejamento, comunicação, design e criatividade, conforme descrito no escopo do contrato e na proposta comercial aprovada, visando à promoção da marca da CONTRATANTE e à geração de novas oportunidades de negócio.`;
    const obj1Lines = doc.splitTextToSize(obj1Text, pageWidth - 2 * margin - 10);
    doc.text(obj1Lines, margin + 10, yPosition);
    yPosition += obj1Lines.length * 7 + 8; // ✅ Aumentado espaçamento de linha de 6 para 7, espaço final de 6 para 8

    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.text('1.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const obj2Text = 'Os serviços poderão incluir, dentre outros, criação de identidade visual, campanhas, materiais online e offline, embalagens, rótulos, peças para redes sociais, vídeos, apresentações comerciais, layouts de sites ou landing pages, consultoria de posicionamento de marca e demais atividades correlatas constantes da proposta aprovada.';
    const obj2Lines = doc.splitTextToSize(obj2Text, pageWidth - 2 * margin - 10);
    doc.text(obj2Lines, margin + 10, yPosition);
    yPosition += obj2Lines.length * 7 + 8; // ✅ Aumentado espaçamento de linha de 6 para 7, espaço final de 6 para 8

    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.text('1.3.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const obj3Text = 'A proposta comercial aprovada pela CONTRATANTE passa a integrar o presente contrato, para todos os fins, prevalecendo suas condições específicas sempre que forem mais detalhadas que as disposições gerais deste instrumento.';
    const obj3Lines = doc.splitTextToSize(obj3Text, pageWidth - 2 * margin - 10);
    doc.text(obj3Lines, margin + 10, yPosition);
    yPosition += obj3Lines.length * 7 + 15; // ✅ Aumentado espaçamento de linha de 6 para 7, espaço final de 12 para 15

    checkPageBreak(80);

    // CLÁUSULA SEGUNDA - OBRIGAÇÕES DAS PARTES
    addSectionHeader('CLÁUSULA SEGUNDA – OBRIGAÇÕES DAS PARTES');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); // ✅ Aumentado de 11 para 13
    doc.text('2.1. Obrigações da CONTRATADA', margin, yPosition);
    yPosition += 10; // ✅ Aumentado de 8 para 10

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13); // ✅ Garantir tamanho de fonte 13
    const obrigacoesContratada = [
      '(i) Prestar os serviços observando todas as normas técnicas e legais aplicáveis, buscando os mais altos padrões de qualidade, conforme as melhores práticas profissionais e éticas;',
      '(ii) Garantir a dedicação de equipe qualificada e apta para a execução dos serviços contratados;',
      '(iii) Manter a CONTRATANTE informada, de forma periódica e razoável, sobre o andamento dos trabalhos, quando solicitado;',
      '(iv) Comunicar prontamente à CONTRATANTE qualquer fato relevante ou irregularidade que possa impactar prazos, qualidade ou resultados;',
      '(v) Cumprir todas as obrigações trabalhistas, previdenciárias, fiscais e securitárias relativas a seus empregados, sócios, prestadores e subcontratados, isentando a CONTRATANTE de qualquer responsabilidade solidária ou subsidiária;',
      '(vi) Reexecutar, sem ônus adicional para a CONTRATANTE, os serviços que não estiverem em conformidade com o padrão de qualidade acordado, desde que os ajustes solicitados estejam dentro do escopo originalmente contratado;',
      '(vii) Zelar pela confidencialidade das informações da CONTRATANTE, nos termos da Cláusula Nona.'
    ];

    obrigacoesContratada.forEach((obrigacao) => {
      checkPageBreak(30);
      const lines = doc.splitTextToSize(obrigacao, pageWidth - 2 * margin - 5);
      doc.text(lines, margin + 5, yPosition);
      yPosition += lines.length * 7 + 3; // ✅ Aumentado espaçamento de linha de 6 para 7, espaço final de 2 para 3
    });

    yPosition += 8; // ✅ Aumentado de 6 para 8
    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); // ✅ Garantir tamanho de fonte 13
    doc.text('2.2. Obrigações da CONTRATANTE', margin, yPosition);
    yPosition += 10; // ✅ Aumentado de 8 para 10

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13); // ✅ Garantir tamanho de fonte 13
    const obrigacoesContratante = [
      '(i) Efetuar o pagamento dos valores devidos pelos serviços prestados, conforme prazos, formas e condições estabelecidos na Cláusula Quarta e na proposta comercial aprovada;',
      '(ii) Fornecer à CONTRATADA, em tempo hábil, todas as informações, conteúdos, materiais e acessos necessários para a correta execução dos serviços;',
      '(iii) Analisar, aprovar ou solicitar ajustes nas entregas em prazo razoável, de forma a não comprometer cronogramas;',
      '(iv) Responder integralmente pela veracidade, titularidade e licitude das informações, marcas, textos, imagens, bases de dados e demais materiais fornecidos à CONTRATADA.'
    ];

    obrigacoesContratante.forEach((obrigacao) => {
      checkPageBreak(20);
      const lines = doc.splitTextToSize(obrigacao, pageWidth - 2 * margin - 5);
      doc.text(lines, margin + 5, yPosition);
      yPosition += lines.length * 7 + 3; // ✅ Aumentado espaçamento de linha de 6 para 7, espaço final de 2 para 3
    });

    yPosition += 8; // ✅ Aumentado de 6 para 8
    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); // ✅ Garantir tamanho de fonte 13
    doc.text('2.3. Limitação de Responsabilidade', margin, yPosition);
    yPosition += 10; // ✅ Aumentado de 8 para 10

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13); // ✅ Garantir tamanho de fonte 13
    const limitacaoText = 'A CONTRATADA será responsável unicamente por danos diretos de caráter patrimonial que causar à CONTRATANTE por culpa grave ou dolo, diretamente relacionados aos serviços prestados. Em nenhuma hipótese a CONTRATADA será responsável por lucros cessantes, danos indiretos, danos especulativos, perda de chance ou quaisquer danos consequenciais, exceto em casos de dolo ou negligência grave comprovada.';
    const limitacaoLines = doc.splitTextToSize(limitacaoText, pageWidth - 2 * margin);
    doc.text(limitacaoLines, margin, yPosition);
    yPosition += limitacaoLines.length * 7 + 10; // ✅ Aumentado espaçamento de linha de 6 para 7, espaço final de 8 para 10

    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); // ✅ Garantir tamanho de fonte 13
    doc.text('2.4. Limite de Indenização', margin, yPosition);
    yPosition += 10; // ✅ Aumentado de 8 para 10

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13); // ✅ Garantir tamanho de fonte 13
    const limiteIndText = 'A responsabilidade global da CONTRATADA, sob qualquer fundamento e por todos os eventos relacionados a este contrato, ficará limitada ao valor equivalente à soma das remunerações efetivamente pagas pela CONTRATANTE à CONTRATADA nos três meses imediatamente anteriores ao evento que deu origem à alegada indenização.';
    const limiteIndLines = doc.splitTextToSize(limiteIndText, pageWidth - 2 * margin);
    doc.text(limiteIndLines, margin, yPosition);
    yPosition += limiteIndLines.length * 7 + 15; // ✅ Aumentado espaçamento de linha de 6 para 7, espaço final de 12 para 15

    checkPageBreak(80);

    // CLÁUSULA TERCEIRA - LOCAL E FORMA DE PRESTAÇÃO DOS SERVIÇOS
    addSectionHeader('CLÁUSULA TERCEIRA – LOCAL E FORMA DE PRESTAÇÃO DOS SERVIÇOS');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('3.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const local1Text = 'Os serviços serão prestados prioritariamente de acordo com os padrões operacionais da CONTRATADA, podendo ser executados em regime remoto (home office) ou presencial, conforme a natureza do trabalho e a necessidade específica de cada projeto.';
    const local1Lines = doc.splitTextToSize(local1Text, pageWidth - 2 * margin - 10);
    doc.text(local1Lines, margin + 10, yPosition);
    yPosition += local1Lines.length * 7 + 6;

    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.text('3.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const local2Text = 'Os serviços poderão ser executados nas dependências da CONTRATANTE, da CONTRATADA ou em outro local adequado, a critério da CONTRATADA, desde que atendidas as necessidades do projeto e respeitadas as diretrizes acordadas entre as PARTES.';
    const local2Lines = doc.splitTextToSize(local2Text, pageWidth - 2 * margin - 10);
    doc.text(local2Lines, margin + 10, yPosition);
    yPosition += local2Lines.length * 7 + 6;

    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.text('3.3.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const local3Text = 'Quando os serviços forem prestados nas dependências da CONTRATANTE, a CONTRATADA compromete-se a observar as normas de segurança, saúde e disciplina vigentes no local, aplicáveis a todos os profissionais envolvidos.';
    const local3Lines = doc.splitTextToSize(local3Text, pageWidth - 2 * margin - 10);
    doc.text(local3Lines, margin + 10, yPosition);
    yPosition += local3Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA QUARTA - VALOR, FORMA DE PAGAMENTO E DESPESAS
    addSectionHeader('CLÁUSULA QUARTA – VALOR, FORMA DE PAGAMENTO E DESPESAS');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('4.1. Serviços e Valor Final Acordado', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const valorText = 'A CONTRATANTE pagará à CONTRATADA, a título de remuneração pelos serviços prestados, o valor total indicado na proposta comercial previamente negociada, que passa a integrar este contrato como proposta aprovada.';
    const valorLines = doc.splitTextToSize(valorText, pageWidth - 2 * margin);
    doc.text(valorLines, margin, yPosition);
    yPosition += valorLines.length * 7 + 8;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('4.2. Forma de Pagamento', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const pagText = 'Os pagamentos serão efetuados conforme condições, prazos e meios previstos na proposta aprovada (parcelas, vencimentos, forma de pagamento e eventuais condições promocionais).';
    const pagLines = doc.splitTextToSize(pagText, pageWidth - 2 * margin);
    doc.text(pagLines, margin, yPosition);
    yPosition += pagLines.length * 7 + 8;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('4.3. Horas Excedentes e Serviços Adicionais', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const adicionalText = 'Qualquer trabalho, escopo, entrega ou serviço que exceda o objeto originalmente contratado deverá ser previamente informado pela CONTRATADA e aprovado pela CONTRATANTE. Tais serviços adicionais serão cobrados à parte, de acordo com a tabela de valores vigente da CONTRATADA, reajustável pelo IGPM/FGV após 12 meses de vigência contratual.';
    const adicionalLines = doc.splitTextToSize(adicionalText, pageWidth - 2 * margin);
    doc.text(adicionalLines, margin, yPosition);
    yPosition += adicionalLines.length * 7 + 8;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('4.4. Despesas e Ressarcimento', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const despesasText = 'Despesas extraordinárias diretamente relacionadas à execução dos serviços, tais como deslocamentos, viagens, hospedagens, diárias, locações de estúdio, modelos, elenco, compra de imagens, bancos de trilhas, entre outras, serão previamente aprovadas pela CONTRATANTE e ressarcidas à CONTRATADA mediante apresentação de relatório ou comprovantes idôneos.';
    const despesasLines = doc.splitTextToSize(despesasText, pageWidth - 2 * margin);
    doc.text(despesasLines, margin, yPosition);
    yPosition += despesasLines.length * 7 + 8;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('4.5. Penalidades por Atraso no Pagamento', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const atrasoText = 'O atraso no pagamento de qualquer valor devido pela CONTRATANTE acarretará: (i) multa moratória de 2% sobre o valor em atraso; (ii) juros de mora de 1% ao mês, calculados pro rata die; (iii) correção monetária pelo IGPM/FGV ou índice que vier a substituí-lo. Decorridos 10 dias de atraso, a CONTRATADA poderá suspender total ou parcialmente os serviços, mediante notificação prévia à CONTRATANTE com antecedência mínima de 5 dias, sem que isso constitua inadimplemento da CONTRATADA.';
    const atrasoLines = doc.splitTextToSize(atrasoText, pageWidth - 2 * margin);
    doc.text(atrasoLines, margin, yPosition);
    yPosition += atrasoLines.length * 7 + 8;

    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.text('4.6. Reajuste', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const reajusteText = 'Os valores previstos neste contrato e na proposta comercial serão reajustados anualmente, contado da data da assinatura deste instrumento ou da primeira emissão de cobrança, pelo IGPM/FGV ou por outro índice oficial que venha a substituí-lo.';
    const reajusteLines = doc.splitTextToSize(reajusteText, pageWidth - 2 * margin);
    doc.text(reajusteLines, margin, yPosition);
    yPosition += reajusteLines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA QUINTA - PRAZO DE VIGÊNCIA E RESCISÃO
    addSectionHeader('CLÁUSULA QUINTA – PRAZO DE VIGÊNCIA E RESCISÃO');

    doc.setFont('helvetica', 'bold');
    doc.text('5.1. Vigência', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const vig1Text = 'O contrato terá vigência inicial a partir da data do primeiro pagamento efetuado pela CONTRATANTE ou da assinatura deste instrumento, o que ocorrer primeiro, renovando-se automaticamente por iguais períodos de 12 meses, salvo manifestação contrária de qualquer das PARTES, comunicada por escrito com antecedência mínima de 60 dias do término do período em curso.';
    const vig1Lines = doc.splitTextToSize(vig1Text, pageWidth - 2 * margin);
    doc.text(vig1Lines, margin, yPosition);
    yPosition += vig1Lines.length * 7 + 8;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('5.2. Rescisão Imotivada', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const vig2Text = 'O contrato poderá ser rescindido imotivadamente por qualquer das PARTES, mediante notificação escrita à outra PARTE com antecedência mínima de 60 dias. Durante o período de aviso prévio, permanecerão devidas as obrigações de pagamento pelos serviços em andamento e/ou já realizados.';
    const vig2Lines = doc.splitTextToSize(vig2Text, pageWidth - 2 * margin);
    doc.text(vig2Lines, margin, yPosition);
    yPosition += vig2Lines.length * 7 + 8;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('5.3. Rescisão por Descumprimento', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const vig3Text = 'Em caso de descumprimento de qualquer obrigação contratual, a PARTE prejudicada notificará a outra, concedendo prazo de 10 dias corridos para saneamento. Persistindo o descumprimento, o contrato poderá ser rescindido de pleno direito, sem prejuízo da cobrança de valores devidos, perdas e danos.';
    const vig3Lines = doc.splitTextToSize(vig3Text, pageWidth - 2 * margin);
    doc.text(vig3Lines, margin, yPosition);
    yPosition += vig3Lines.length * 7 + 8;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('5.4. Efeitos Financeiros da Rescisão', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const vig4Text = 'Na hipótese de rescisão, seja imotivada ou motivada, a CONTRATANTE deverá pagar à CONTRATADA: (i) os valores devidos pelos serviços já executados e entregues até a data de término; (ii) eventuais custos irrecuperáveis assumidos pela CONTRATADA em razão de compromissos firmados especificamente para o projeto, desde que previamente aprovados pela CONTRATANTE.';
    const vig4Lines = doc.splitTextToSize(vig4Text, pageWidth - 2 * margin);
    doc.text(vig4Lines, margin, yPosition);
    yPosition += vig4Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA SEXTA - INEXISTÊNCIA DE VÍNCULO TRABALHISTA E USO DE IMAGEM
    addSectionHeader('CLÁUSULA SEXTA – INEXISTÊNCIA DE VÍNCULO TRABALHISTA E USO DE IMAGEM');

    doc.setFont('helvetica', 'bold');
    doc.text('6.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const vinc1Text = 'As PARTES reconhecem que a CONTRATADA atua como empresa independente, não havendo entre a CONTRATANTE e os empregados, sócios, prestadores ou subcontratados da CONTRATADA qualquer vínculo empregatício, sociedade, associação ou solidariedade de qualquer natureza.';
    const vinc1Lines = doc.splitTextToSize(vinc1Text, pageWidth - 2 * margin - 10);
    doc.text(vinc1Lines, margin + 10, yPosition);
    yPosition += vinc1Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('6.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const vinc2Text = 'A CONTRATADA é exclusivamente responsável por todas as obrigações trabalhistas, previdenciárias, fiscais e securitárias relativas aos seus profissionais, isentando a CONTRATANTE de responsabilidade solidária ou subsidiária.';
    const vinc2Lines = doc.splitTextToSize(vinc2Text, pageWidth - 2 * margin - 10);
    doc.text(vinc2Lines, margin + 10, yPosition);
    yPosition += vinc2Lines.length * 7 + 6;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('6.3. Responsabilidade pelo Uso de Imagem de Terceiros', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const vinc3Text = 'A CONTRATANTE será responsável por obter todas as autorizações, licenças e cessões necessárias para o uso de imagem, voz, nome, marca ou demais direitos de terceiros que forem utilizados nos materiais ou projetos decorrentes deste contrato, quando tais elementos forem fornecidos ou indicados pela própria CONTRATANTE. Qualquer ônus decorrente da utilização não autorizada de imagens ou conteúdos de terceiros fornecidos pela CONTRATANTE será de sua exclusiva responsabilidade.';
    const vinc3Lines = doc.splitTextToSize(vinc3Text, pageWidth - 2 * margin);
    doc.text(vinc3Lines, margin, yPosition);
    yPosition += vinc3Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA SÉTIMA - SUBCONTRATAÇÃO
    addSectionHeader('CLÁUSULA SÉTIMA – SUBCONTRATAÇÃO');

    doc.setFont('helvetica', 'bold');
    doc.text('7.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const sub1Text = 'A CONTRATADA poderá, sempre que julgar necessário, subcontratar terceiros especializados (ex.: fotógrafos, ilustradores, programadores, produtores, estúdios etc.) para executar etapas específicas dos serviços, permanecendo, entretanto, responsável pela coordenação e qualidade da entrega final.';
    const sub1Lines = doc.splitTextToSize(sub1Text, pageWidth - 2 * margin - 10);
    doc.text(sub1Lines, margin + 10, yPosition);
    yPosition += sub1Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('7.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const sub2Text = 'Quando os custos desses terceiros não estiverem contemplados na proposta original, a CONTRATADA deverá submeter previamente à aprovação da CONTRATANTE os valores correspondentes, que serão reembolsados ou pagos conforme ajuste entre as PARTES.';
    const sub2Lines = doc.splitTextToSize(sub2Text, pageWidth - 2 * margin - 10);
    doc.text(sub2Lines, margin + 10, yPosition);
    yPosition += sub2Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA OITAVA - DIREITOS AUTORAIS E PROPRIEDADE INTELECTUAL
    addSectionHeader('CLÁUSULA OITAVA – DIREITOS AUTORAIS E PROPRIEDADE INTELECTUAL');

    doc.setFont('helvetica', 'bold');
    doc.text('8.1. Cessão de Direitos sobre Produtos Desenvolvidos', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const dir1Text = 'Os direitos patrimoniais de autor sobre os materiais finais aprovados e integralmente pagos pela CONTRATANTE serão cedidos à CONTRATANTE de forma não exclusiva, irrevogável e irretratável, para os fins e meios especificados na proposta comercial, ressalvados direitos de terceiros (bancos de imagem, trilhas, fontes etc.) que possuam licenças próprias.';
    const dir1Lines = doc.splitTextToSize(dir1Text, pageWidth - 2 * margin);
    doc.text(dir1Lines, margin, yPosition);
    yPosition += dir1Lines.length * 7 + 8;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('8.2. Condição de Eficácia da Cessão', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const dir2Text = 'A cessão dos direitos patrimoniais prevista na cláusula anterior fica condicionada ao pagamento integral de todos os valores devidos à CONTRATADA em razão do respectivo projeto. Enquanto não houver quitação integral, a CONTRATADA permanecerá como titularexclusiva dos direitos patrimoniais das obras desenvolvidas.';
    const dir2Lines = doc.splitTextToSize(dir2Text, pageWidth - 2 * margin);
    doc.text(dir2Lines, margin, yPosition);
    yPosition += dir2Lines.length * 7 + 8;

    checkPageBreak(60);

    doc.setFont('helvetica', 'bold');
    doc.text('8.3. Uso de Propostas Não Aprovadas', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const dir3Text = 'As propostas, layouts, rascunhos, estudos, conceitos e alternativas criativas apresentadas e não aprovadas pela CONTRATANTE são de propriedade exclusiva da CONTRATADA, sendo vedado seu uso, total ou parcial, pela CONTRATANTE ou por terceiros a ela vinculados, sem autorização prévia e escrita da CONTRATADA. O uso indevido configurará violação de direitos autorais, sujeitando a CONTRATANTE ao pagamento de indenização e multa específica a ser arbitrada, sem prejuízo das medidas judiciais cabíveis.';
    const dir3Lines = doc.splitTextToSize(dir3Text, pageWidth - 2 * margin);
    doc.text(dir3Lines, margin, yPosition);
    yPosition += dir3Lines.length * 7 + 8;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('8.4. Envio de Arquivos Editáveis', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const dir4Text = 'Os arquivos abertos e editáveis (formatos proprietários de softwares gráficos, de edição, programação etc.) não estão incluídos no escopo padrão deste contrato. O eventual fornecimento de tais arquivos deverão ser negociado à parte, mediante remuneração adicional, e somente ocorrerá após quitação integral de todos os valores do projeto.';
    const dir4Lines = doc.splitTextToSize(dir4Text, pageWidth - 2 * margin);
    doc.text(dir4Lines, margin, yPosition);
    yPosition += dir4Lines.length * 7 + 8;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('8.5. Limitação de Alterações', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const dir5Text = 'Após a aprovação do conceito e da linha criativa pela CONTRATANTE, a CONTRATADA realizará até três rodadas de ajustes sem custo adicional, desde que dentro do escopo original. Alterações adicionais, mudanças de conceito ou de briefing após aprovação inicial serão consideradas novo escopo e poderão ser objeto de nova proposta e cobrança.';
    const dir5Lines = doc.splitTextToSize(dir5Text, pageWidth - 2 * margin);
    doc.text(dir5Lines, margin, yPosition);
    yPosition += dir5Lines.length * 7 + 8;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('8.6. Portfólio da CONTRATADA', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const dir6Text = 'A CONTRATANTE autoriza a CONTRATADA a utilizar, em seu portfólio (site, redes sociais, apresentações comerciais e materiais institucionais), as peças, campanhas, projetos e materiais desenvolvidos no âmbito deste contrato, desde que tal utilização não viole cláusulas de confidencialidade específicas ou embargos expressos da CONTRATANTE, comunicados por escrito.';
    const dir6Lines = doc.splitTextToSize(dir6Text, pageWidth - 2 * margin);
    doc.text(dir6Lines, margin, yPosition);
    yPosition += dir6Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA NONA - CONFIDENCIALIDADE
    addSectionHeader('CLÁUSULA NONA – CONFIDENCIALIDADE');

    doc.setFont('helvetica', 'bold');
    doc.text('9.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const conf1Text = 'As PARTES comprometem-se a manter sob sigilo todas as informações comerciais, estratégicas, técnicas, financeiras, de marketing, bases de dados, listas de clientes, valores, condições comerciais e quaisquer outros dados não públicos a que tenham acesso em razão deste contrato.';
    const conf1Lines = doc.splitTextToSize(conf1Text, pageWidth - 2 * margin - 10);
    doc.text(conf1Lines, margin + 10, yPosition);
    yPosition += conf1Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('9.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const conf2Text = 'Os valores, condições e estratégias constantes das propostas da CONTRATADA e deste contrato são confidenciais e não poderão ser divulgados a terceiros estranhos ao corpo diretivo ou societário da CONTRATANTE, salvo exigência legal ou judicial.';
    const conf2Lines = doc.splitTextToSize(conf2Text, pageWidth - 2 * margin - 10);
    doc.text(conf2Lines, margin + 10, yPosition);
    yPosition += conf2Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('9.3.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const conf3Text = 'A violação das obrigações de confidencialidade por qualquer das PARTES implicará, sem prejuízo da apuração de perdas e danos, no pagamento de multa não compensatória no valor de R$ 100.000,00 (cem mil reais), valor que poderá ser revisto ou majorado judicialmente se comprovada a insuficiência para recompor o dano causado.';
    const conf3Lines = doc.splitTextToSize(conf3Text, pageWidth - 2 * margin - 10);
    doc.text(conf3Lines, margin + 10, yPosition);
    yPosition += conf3Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA DÉCIMA - CASO FORTUITO E FORÇA MAIOR
    addSectionHeader('CLÁUSULA DÉCIMA – CASO FORTUITO E FORÇA MAIOR');

    doc.setFont('helvetica', 'bold');
    doc.text('10.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const fm1Text = 'A CONTRATADA não será responsabilizada por atrasos ou falhas na execução dos serviços decorrentes de caso fortuito ou força maior, assim entendidos eventos imprevisíveis ou inevitáveis, externos à sua vontade, tais como desastres naturais, greves gerais, falhas graves de infraestrutura, panes de larga escala em serviços de terceiros, entre outros.';
    const fm1Lines = doc.splitTextToSize(fm1Text, pageWidth - 2 * margin - 10);
    doc.text(fm1Lines, margin + 10, yPosition);
    yPosition += fm1Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('10.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const fm2Text = 'A ocorrência de caso fortuito ou força maior deverá ser comunicada à outra PARTE em até 5 dias úteis a contar da ciência do evento, sempre que possível documentando o fato.';
    const fm2Lines = doc.splitTextToSize(fm2Text, pageWidth - 2 * margin - 10);
    doc.text(fm2Lines, margin + 10, yPosition);
    yPosition += fm2Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('10.3.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const fm3Text = 'A suspensão das obrigações por motivo de força maior não poderá exceder 60 dias. Decorrido esse prazo, as PARTES poderão renegociar condições ou optar pela rescisão do contrato, sem ônus adicionais, resguardados os pagamentos pelos serviços já prestados.';
    const fm3Lines = doc.splitTextToSize(fm3Text, pageWidth - 2 * margin - 10);
    doc.text(fm3Lines, margin + 10, yPosition);
    yPosition += fm3Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA DÉCIMA PRIMEIRA - SERVIÇOS EXCLUÍDOS DO CONTRATO
    addSectionHeader('CLÁUSULA DÉCIMA PRIMEIRA – SERVIÇOS EXCLUÍDOS DO CONTRATO');

    doc.setFont('helvetica', 'bold');
    doc.text('11.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const exc1Text = 'Não estão incluídos no valor dos honorários deste contrato, salvo previsão expressa na proposta, os seguintes serviços, entre outros correlatos: impressão de materiais; provas físicas de impressão; aprovação de cores em máquina; custos de serviços de terceiros (estúdios, produtores, modelos, locutores etc.); viagens, hospedagem, alimentação e deslocamentos; aquisição de imagens, trilhas sonoras, fontes pagas, plug-ins ou licenças específicas.';
    const exc1Lines = doc.splitTextToSize(exc1Text, pageWidth - 2 * margin - 10);
    doc.text(exc1Lines, margin + 10, yPosition);
    yPosition += exc1Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('11.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const exc2Text = 'Tais serviços somente serão realizados ou contratados pela CONTRATADA após aprovação expressa da CONTRATANTE. As despesas decorrentes serão reembolsadas à CONTRATADA mediante apresentação dos valores e respectivos comprovantes e/ou notas fiscais, conforme combinado entre as PARTES.';
    const exc2Lines = doc.splitTextToSize(exc2Text, pageWidth - 2 * margin - 10);
    doc.text(exc2Lines, margin + 10, yPosition);
    yPosition += exc2Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA DÉCIMA SEGUNDA - DISPOSIÇÕES GERAIS E ASSINATURA DIGITAL
    addSectionHeader('CLÁUSULA DÉCIMA SEGUNDA – DISPOSIÇÕES GERAIS E ASSINATURA DIGITAL');

    doc.setFont('helvetica', 'bold');
    doc.text('12.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const dg1Text = 'O presente contrato representa a totalidade dos entendimentos e acordos entre as PARTES, substituindo qualquer negociação, comunicação ou acordo anterior, verbal ou escrito, referente ao mesmo objeto.';
    const dg1Lines = doc.splitTextToSize(dg1Text, pageWidth - 2 * margin - 10);
    doc.text(dg1Lines, margin + 10, yPosition);
    yPosition += dg1Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('12.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const dg2Text = 'Qualquer modificação, aditamento ou alteração ao presente contrato somente produzirá efeitos se formalizada por escrito e assinada por representantes legalmente habilitados de ambas as PARTES.';
    const dg2Lines = doc.splitTextToSize(dg2Text, pageWidth - 2 * margin - 10);
    doc.text(dg2Lines, margin + 10, yPosition);
    yPosition += dg2Lines.length * 7 + 6;

    checkPageBreak(60);

    doc.setFont('helvetica', 'bold');
    doc.text('12.3.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const dg3Text = 'Este contrato poderá ser assinado exclusivamente de forma digital pelas PARTES, utilizando-se de certificados digitais emitidos no âmbito da Infraestrutura de Chaves Públicas Brasileira (ICP-Brasil), na forma da Medida Provisória nº 2.200-2/2001, conferindo plena validade jurídica ao presente instrumento, dispensando assinatura física e reconhecimento de firma.';
    const dg3Lines = doc.splitTextToSize(dg3Text, pageWidth - 2 * margin - 10);
    doc.text(dg3Lines, margin + 10, yPosition);
    yPosition += dg3Lines.length * 7 + 6;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('12.4.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const dg4Text = 'A plataforma utilizada para a assinatura digital deverá ser compatível com as exigências legais vigentes, garantindo autenticidade, integridade e não repúdio do documento, de modo que qualquer alteração posterior à assinatura invalide a versão alterada.';
    const dg4Lines = doc.splitTextToSize(dg4Text, pageWidth - 2 * margin - 10);
    doc.text(dg4Lines, margin + 10, yPosition);
    yPosition += dg4Lines.length * 7 + 6;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('12.5.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const dg5Text = 'Nenhuma das PARTES poderá ceder ou transferir este contrato, total ou parcialmente, a terceiros, sem a prévia e expressa anuência por escrito da outra PARTE, exceto em casos de reestruturação societária que não implique prejuízo ao cumprimento das obrigações aqui previstas.';
    const dg5Lines = doc.splitTextToSize(dg5Text, pageWidth - 2 * margin - 10);
    doc.text(dg5Lines, margin + 10, yPosition);
    yPosition += dg5Lines.length * 7 + 6;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('12.6.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const dg6Text = 'A tolerância de qualquer das PARTES quanto ao eventual descumprimento de cláusulas ou condições deste contrato será considerada mera liberalidade, não implicando novação, renúncia de direitos ou alteração tácita das condições ora ajustadas.';
    const dg6Lines = doc.splitTextToSize(dg6Text, pageWidth - 2 * margin - 10);
    doc.text(dg6Lines, margin + 10, yPosition);
    yPosition += dg6Lines.length * 7 + 6;

    checkPageBreak(60);

    doc.setFont('helvetica', 'bold');
    doc.text('12.7.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const dg7Text = 'Se qualquer disposição deste contrato for considerada inválida, ilegal ou inexequível, as demais permanecerão em pleno vigor, obrigando-se as PARTES a negociar de boa-fé cláusula substitutiva que preserve o equilíbrio econômico-financeiro originalmente pactuado.';
    const dg7Lines = doc.splitTextToSize(dg7Text, pageWidth - 2 * margin - 10);
    doc.text(dg7Lines, margin + 10, yPosition);
    yPosition += dg7Lines.length * 7 + 6;

    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.text('12.8.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const dg8Text = 'Todas as comunicações e notificações relacionadas a este contrato deverão ser realizadas por escrito, preferencialmente por e-mail com comprovação de envio, para os endereços indicados no preâmbulo ou outros posteriormente informados por escrito.';
    const dg8Lines = doc.splitTextToSize(dg8Text, pageWidth - 2 * margin - 10);
    doc.text(dg8Lines, margin + 10, yPosition);
    yPosition += dg8Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA DÉCIMA TERCEIRA - DA VEDAÇÃO AO SUBORNO E ANTICORRUPÇÃO
    addSectionHeader('CLÁUSULA DÉCIMA TERCEIRA – DA VEDAÇÃO AO SUBORNO E ANTICORRUPÇÃO');

    doc.setFont('helvetica', 'bold');
    doc.text('13.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const ac1Text = 'As PARTES declaram conhecer e se obrigar a cumprir integralmente a legislação brasileira de prevenção e combate à corrupção, em especial a Lei nº 12.846/2013 (Lei Anticorrupção Empresarial), a Lei nº 8.429/1992 e demais normas correlatas.';
    const ac1Lines = doc.splitTextToSize(ac1Text, pageWidth - 2 * margin - 10);
    doc.text(ac1Lines, margin + 10, yPosition);
    yPosition += ac1Lines.length * 7 + 6;

    checkPageBreak(60);

    doc.setFont('helvetica', 'bold');
    doc.text('13.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const ac2Text = 'A CONTRATADA declara que não ofereceu, prometeu, autorizou ou concedeu, direta ou indiretamente, qualquer vantagem indevida a agente público ou a terceiros a ele relacionados, com vistas à celebração ou execução deste contrato, obrigando-se a manter a mesma conduta durante toda a vigência contratual.';
    const ac2Lines = doc.splitTextToSize(ac2Text, pageWidth - 2 * margin - 10);
    doc.text(ac2Lines, margin + 10, yPosition);
    yPosition += ac2Lines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA DÉCIMA QUARTA - DO FORO
    addSectionHeader('CLÁUSULA DÉCIMA QUARTA – DO FORO');

    doc.setFont('helvetica', 'bold');
    doc.text('14.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const foroText = 'Fica eleito o foro da Comarca de São Paulo/SP, local da sede da CONTRATADA, para dirimir quaisquer dúvidas, controvérsias ou litígios oriundos deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.';
    const foroLines = doc.splitTextToSize(foroText, pageWidth - 2 * margin - 10);
    doc.text(foroLines, margin + 10, yPosition);
    yPosition += foroLines.length * 7 + 12;

    checkPageBreak(80);

    // CLÁUSULA DÉCIMA QUINTA - NÃO ALICIAMENTO
    addSectionHeader('CLÁUSULA DÉCIMA QUINTA – NÃO ALICIAMENTO');

    doc.setFont('helvetica', 'bold');
    doc.text('15.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const na1Text = 'A CONTRATANTE se obriga a não aliciar, contratar, subcontratar, tentar contratar ou, por qualquer meio direto ou indireto, aproveitar em seu favor, pessoa física ou jurídica que seja sócio, empregado, estagiário, colaborador, prestador de serviços ou subcontratado da CONTRATADA, e que tenha participado, direta ou indiretamente, da execução dos serviços relacionados a este contrato.';
    const na1Lines = doc.splitTextToSize(na1Text, pageWidth - 2 * margin - 10);
    doc.text(na1Lines, margin + 10, yPosition);
    yPosition += na1Lines.length * 7 + 6;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('15.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const na2Text = 'A vedação prevista nesta cláusula vigorará durante toda a vigência deste contrato e pelo prazo adicional de 24 (vinte e quatro) meses contados do seu término, seja por conclusão, rescisão ou qualquer outra forma de extinção.';
    const na2Lines = doc.splitTextToSize(na2Text, pageWidth - 2 * margin - 10);
    doc.text(na2Lines, margin + 10, yPosition);
    yPosition += na2Lines.length * 7 + 6;

    checkPageBreak(70);

    doc.setFont('helvetica', 'bold');
    doc.text('15.3.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const na3Text = 'Considera-se aliciamento, para fins desta cláusula, qualquer forma de convite, proposta, incentivo ou abordagem, realizada diretamente pela CONTRATANTE ou por terceiros por ela interpostos, com o objetivo de desligar o profissional da CONTRATADA para que passe a prestar serviços, de forma direta ou indireta, à própria CONTRATANTE ou a empresas a ela coligadas, controladas, controladoras ou pertencentes ao mesmo grupo econômico.';
    const na3Lines = doc.splitTextToSize(na3Text, pageWidth - 2 * margin - 10);
    doc.text(na3Lines, margin + 10, yPosition);
    yPosition += na3Lines.length * 7 + 6;

    checkPageBreak(80);

    doc.setFont('helvetica', 'bold');
    doc.text('15.4.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const na4Text = 'O descumprimento desta cláusula sujeitará a CONTRATANTE ao pagamento, em favor da CONTRATADA, de multa não compensatória equivalente a 24 (vinte e quatro) vezes o valor médio mensal faturado pela CONTRATADA à CONTRATANTE nos últimos 12 (doze) meses, por profissional aliciado ou contratado em violação a esta cláusula, sem prejuízo da apuração e cobrança de perdas e danos suplementares.';
    const na4Lines = doc.splitTextToSize(na4Text, pageWidth - 2 * margin - 10);
    doc.text(na4Lines, margin + 10, yPosition);
    yPosition += na4Lines.length * 7 + 6;

    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.text('15.5.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const na5Text = 'A multa prevista nesta cláusula será devida independentemente de prova de prejuízo concreto, bastando a comprovação do aliciamento ou contratação indevida, sendo certo que eventual discussão sobre o valor de perdas e danos não suspende a exigibilidade da multa.';
    const na5Lines = doc.splitTextToSize(na5Text, pageWidth - 2 * margin - 10);
    doc.text(na5Lines, margin + 10, yPosition);
    yPosition += na5Lines.length * 7 + 15;

    checkPageBreak(80);

    // CLÁUSULA DÉCIMA SEXTA - TERMOS E CONDIÇÕES
    addSectionHeader('CLÁUSULA DÉCIMA SEXTA – TERMOS E CONDIÇÕES');

    doc.setFont('helvetica', 'bold');
    doc.text('16.1.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const tc1Text = 'Fica expressamente estabelecido que a quantidade de trabalhos contratados não possui caráter cumulativo, devendo cada demanda ser obrigatoriamente especificada de forma individualizada no cronograma, com a indicação do tempo médio necessário para a sua execução.';
    const tc1Lines = doc.splitTextToSize(tc1Text, pageWidth - 2 * margin - 10);
    doc.text(tc1Lines, margin + 10, yPosition);
    yPosition += tc1Lines.length * 7 + 6;

    checkPageBreak(60);

    doc.setFont('helvetica', 'bold');
    doc.text('16.2.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const tc2Text = 'Esclarece-se que não estão inclusos no objeto contratual o fornecimento dos arquivos abertos e editáveis dos trabalhos, em formatos tais como PM, INDD, QXD, AI, FH, entre outros. A liberação dos referidos arquivos ficará condicionada ao pagamento adicional correspondente a 35% do valor total do presente contrato.';
    const tc2Lines = doc.splitTextToSize(tc2Text, pageWidth - 2 * margin - 10);
    doc.text(tc2Lines, margin + 10, yPosition);
    yPosition += tc2Lines.length * 7 + 6;

    checkPageBreak(80);

    doc.setFont('helvetica', 'bold');
    doc.text('16.3.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const tc3Text = 'As propostas de design apresentadas e não aprovadas constituem propriedade intelectual exclusiva da Defoco, sendo terminantemente vedada a sua utilização por terceiros, no todo ou em parte, sem prévia e expressa autorização mediante negociação formal. O uso indevido de imagens, peças ou materiais não aprovados sujeitará o infrator às penalidades previstas na legislação vigente de direitos autorais, sem prejuízo das demais medidas cabíveis, uma vez que tais criações encontram-se protegidas por registros efetuados pela agência por meios próprios.';
    const tc3Lines = doc.splitTextToSize(tc3Text, pageWidth - 2 * margin - 10);
    doc.text(tc3Lines, margin + 10, yPosition);
    yPosition += tc3Lines.length * 7 + 6;

    checkPageBreak(70);

    doc.setFont('helvetica', 'bold');
    doc.text('16.4.', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const tc4Text = 'Após a aprovação do conceito e definição do modelo final, será permitido o limite máximo de três modificações. Ultrapassado esse quantitativo, quaisquer alterações adicionais serão consideradas como novo projeto, sujeitando-se à cobrança de valores complementares.';
    const tc4Lines = doc.splitTextToSize(tc4Text, pageWidth - 2 * margin - 10);
    doc.text(tc4Lines, margin + 10, yPosition);
    yPosition += tc4Lines.length * 7 + 15;

    checkPageBreak(80);

    // FINALIZAÇÃO DO CONTRATO
    const introFinal = 'E, por estarem assim justas e contratadas, as PARTES firmam eletronicamente o presente instrumento, em conformidade com a legislação vigente, reconhecendo sua validade jurídica e obrigacional.';
    const introFinalLines = doc.splitTextToSize(introFinal, pageWidth - 2 * margin);
    doc.text(introFinalLines, margin, yPosition);
    yPosition += introFinalLines.length * 7 + 15;

    checkPageBreak(50);

    // Data e local de assinatura
    const forumCity = proposal?.contractForumCity || 'São Paulo';
    const forumState = proposal?.contractForumState || 'SP';
    
    const signatureDate = proposal?.contractSignatureDate 
      ? new Date(proposal.contractSignatureDate)
      : new Date();
    const formattedDate = signatureDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    const localDataText = `${forumCity}, ${formattedDate}.`;
    doc.text(localDataText, margin, yPosition);
    yPosition += 15;

    // Assinaturas
    checkPageBreak(60);
    
    yPosition += 10;
    
    // Linha de assinatura CONTRATANTE
    doc.line(margin, yPosition, pageWidth / 2 - 10, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const contractanteName = proposal?.clientName?.toUpperCase() || 'CONTRATANTE';
    doc.text(contractanteName, margin, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CONTRATANTE', margin, yPosition);
    
    // Reset position para a segunda assinatura
    yPosition -= 11;
    
    // Linha de assinatura CONTRATADA
    doc.line(pageWidth / 2 + 10, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('YOUPUBLI COMUNICAÇÃO LTDA', pageWidth / 2 + 10, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CONTRATADA', pageWidth / 2 + 10, yPosition);
    
    yPosition += 15;

    checkPageBreak(60);
    
    // Testemunhas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Testemunhas:', margin, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Testemunha 1
    doc.text('1. _______________________________________', margin, yPosition);
    yPosition += 6;
    doc.text('Nome:', margin + 5, yPosition);
    yPosition += 5;
    doc.text('CPF:', margin + 5, yPosition);
    yPosition += 12;
    
    // Testemunha 2
    doc.text('2. _______________________________________', margin, yPosition);
    yPosition += 6;
    doc.text('Nome:', margin + 5, yPosition);
    yPosition += 5;
    doc.text('CPF:', margin + 5, yPosition);
    yPosition += 15;

    // Informação sobre método de assinatura digital
    if (proposal?.contractSignatureMethod) {
      checkPageBreak(20);
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      
      let platText = '';
      if (proposal.contractSignatureMethod === 'govbr') {
        platText = 'Assinatura Digital via Gov.br - Documento com validade jurídica conforme MP 2.200-2/2001 e ICP-Brasil';
      } else if (proposal.contractSignatureMethod === 'platform' && proposal.contractSignaturePlatform) {
        platText = `Assinatura Digital via ${proposal.contractSignaturePlatform} - Documento com validade jurídica conforme MP 2.200-2/2001`;
      }
      
      if (platText) {
        const platLines = doc.splitTextToSize(platText, pageWidth - 2 * margin);
        doc.text(platLines, margin, yPosition, { align: 'center', maxWidth: pageWidth - 2 * margin });
      }
    }

    // RODAPÉ EM TODAS AS PÁGINAS
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Adicionar logo (se não for a primeira página, já adicionamos)
      if (i > 1) {
        addPageLogo();
      }
      
      // Número da página
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    console.log('[CONTRACT] PDF generated successfully');
    return doc.output('blob');
    
  } catch (error) {
    console.error('[CONTRACT] Error generating PDF:', error);
    throw new Error(`Erro ao gerar contrato: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
