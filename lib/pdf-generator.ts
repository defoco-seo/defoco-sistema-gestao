import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_DEFOCO_BASE64 } from './logo-base64';
import { LOGO_MINI_BASE64 } from './logo-mini-base64';
import { CAPA_PADRAO_BASE64 } from './capa-padrao-base64';
import { getFileUrl } from './s3';
import { prisma } from './db';

const BRAND_COLOR = '#f88910';
const DARK_BG_RGB: [number, number, number] = [45, 45, 45];

export async function generateProposalPDF(proposal: any) {
  try {
    console.log('[PDF] Starting PDF generation for proposal:', proposal?.id);
    console.log('[PDF] Full proposal data:', JSON.stringify({
      id: proposal?.id,
      subtotal: proposal?.subtotal,
      tax: proposal?.tax,
      discountValue: proposal?.discountValue,
      discountType: proposal?.discountType,
      total: proposal?.total
    }, null, 2));

    // 🎨 Buscar configurações de layout do usuário
    let layoutConfig = null;
    try {
      layoutConfig = await prisma.layoutConfig.findFirst({
        where: { userId: proposal?.userId || proposal?.user?.id },
      });
      console.log('[PDF] Layout config loaded:', layoutConfig ? 'Yes' : 'No (using defaults)');
    } catch (error) {
      console.warn('[PDF] Could not load layout config, using defaults:', error);
    }

    // Usar valores do banco ou padrões - DESIGN MELHORADO
    const LAYOUT_CONFIG = {
      fontSize: {
        header: layoutConfig?.headerFontSize || 24,
        sectionTitle: layoutConfig?.sectionFontSize || 14,
        normalText: layoutConfig?.normalFontSize || 11,
        introText: layoutConfig?.introFontSize || 12,
        footer: layoutConfig?.footerFontSize || 8,
        pageNumber: 9,
        clientLabel: 10,
        clientValue: 11,
      },
      lineSpacing: {
        introText: layoutConfig?.introLineSpacing || 6,
        persuasiveText: layoutConfig?.persuasiveSpacing || 6,
        normalText: layoutConfig?.normalSpacing || 5.5,
      },
      pageBreak: {
        persuasiveText: 100,
        installments: 100,
        normalSection: 60,
      }
    };

    // Cores RGB do banco ou padrão
    let BRAND_ORANGE_RGB: [number, number, number] = [248, 137, 16];
    if (layoutConfig?.primaryColor) {
      const [r, g, b] = layoutConfig.primaryColor.split(',').map(Number);
      BRAND_ORANGE_RGB = [r, g, b];
    }
    
    // Cores secundárias derivadas
    const LIGHT_ORANGE_RGB: [number, number, number] = [255, 243, 230]; // Fundo claro
    const DARK_GRAY_RGB: [number, number, number] = [51, 51, 51]; // Texto escuro
    const MEDIUM_GRAY_RGB: [number, number, number] = [102, 102, 102]; // Texto secundário
    const LIGHT_GRAY_RGB: [number, number, number] = [245, 245, 245]; // Fundo alternativo

    // URLs das imagens customizadas (ou usar base64 padrão)
    let logoImage = LOGO_DEFOCO_BASE64;
    let miniLogoImage = LOGO_MINI_BASE64;
    let coverImage = CAPA_PADRAO_BASE64;

    // Buscar URLs das imagens se existirem
    if (layoutConfig?.logoPath) {
      try {
        const url = await getFileUrl(layoutConfig.logoPath, true);
        const response = await fetch(url);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = blob.type || 'image/png';
        logoImage = `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.warn('[PDF] Could not load custom logo, using default:', error);
      }
    }

    if (layoutConfig?.miniLogoPath) {
      try {
        const url = await getFileUrl(layoutConfig.miniLogoPath, true);
        const response = await fetch(url);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = blob.type || 'image/png';
        miniLogoImage = `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.warn('[PDF] Could not load custom mini logo, using default:', error);
      }
    }

    if (layoutConfig?.coverImagePath) {
      try {
        const url = await getFileUrl(layoutConfig.coverImagePath, true);
        const response = await fetch(url);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = blob.type || 'image/png';
        coverImage = `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.warn('[PDF] Could not load custom cover, using default:', error);
      }
    }
    
    const doc = new jsPDF({
      format: 'a4',
      unit: 'mm',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;

  // Função para formatar moeda COM PONTO DE MILHAR
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Helper function to add logo on top left of every page
  const addPageLogo = () => {
    try {
      doc.addImage(miniLogoImage, 'PNG', margin, 8, 16, 12.4);
    } catch (error) {
      console.error('Error adding page logo:', error);
    }
  };

  // Helper: desenhar retângulo com bordas arredondadas
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') => {
    doc.roundedRect(x, y, w, h, r, r, style);
  };

  // Helper: desenhar linha decorativa com gradiente visual
  const drawDecorativeLine = (y: number) => {
    const lineWidth = 60;
    const startX = (pageWidth - lineWidth) / 2;
    doc.setDrawColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    doc.setLineWidth(0.8);
    doc.line(startX, y, startX + lineWidth, y);
    // Círculo central decorativo
    doc.setFillColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    doc.circle(pageWidth / 2, y, 1.5, 'F');
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 75) {
      doc.addPage();
      yPosition = 35;
      addPageLogo();
      return true;
    }
    return false;
  };

  // Helper: Desenhar título de seção com design moderno
  const drawSectionTitle = (title: string, withIcon: boolean = false) => {
    doc.setFillColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    drawRoundedRect(margin, yPosition - 5, pageWidth - 2 * margin, 9, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(LAYOUT_CONFIG.fontSize.sectionTitle);
    doc.text(title, margin + 4, yPosition + 1);
    yPosition += 14;
    doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
    doc.setFont('helvetica', 'normal');
  };

  // ✅ CORREÇÃO 3: SIMPLIFICADO - Texto persuasivo SEMPRE aparece se houver desconto
  const generatePersuasiveText = () => {
    try {
      // Parse proposal data - SUPER ROBUSTO para Prisma Decimal
      const parseValue = (val: any): number => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val) || 0;
        // Prisma Decimal object has toNumber() or toString()
        if (val.toNumber) return val.toNumber();
        if (val.toString) return parseFloat(val.toString()) || 0;
        return Number(val) || 0;
      };
      
      const subtotal = parseValue(proposal?.subtotal);
      const tax = parseValue(proposal?.tax);
      const discountValue = parseValue(proposal?.discountValue);
      const discountType = proposal?.discountType;
      const total = parseValue(proposal?.total);

      console.log('[PDF] 📊 Checking discount:', { 
        raw_discountValue: proposal?.discountValue,
        parsed_discountValue: discountValue, 
        discountType, 
        subtotal,
        hasDiscount: discountValue > 0,
        hasType: !!discountType
      });

      // ✅ SIMPLIFICADO: SE NÃO HÁ DESCONTO, NÃO MOSTRA O TEXTO
      // Removida validação de discountType para permitir exibição mesmo sem tipo específico
      if (!discountValue || discountValue <= 0) {
        console.log('[PDF] ❌ No discount - skipping persuasive text');
        return null;
      }
      
      // Se não há discountType definido, assume 'percentage' como padrão
      const effectiveDiscountType = discountType || 'percentage';

      // Calculate discount amount
      let discountAmount = 0;
      let discountPercent = 0;

      if (effectiveDiscountType === 'percentage') {
        discountPercent = discountValue;
        discountAmount = (subtotal * discountValue) / 100;
      } else if (effectiveDiscountType === 'fixed') {
        discountAmount = discountValue;
        discountPercent = subtotal > 0 ? (discountValue / subtotal) * 100 : 0;
      }

      console.log('[PDF] ✅ SHOWING persuasive text:', { 
        discountAmount: discountAmount.toFixed(2), 
        discountPercent: discountPercent.toFixed(2) 
      });

      // Format values
      const discountText = discountPercent.toFixed(0) + '%';
      const savingsText = formatCurrency(discountAmount);
      const subtotalText = formatCurrency(subtotal);
      const totalText = formatCurrency(total);

      // 3 different variations of persuasive text
      const variations = [
        {
          title: 'Uma Oportunidade Única',
          template: () => 
            `Esta é uma oportunidade única de negócio de valor inestimável. Estamos oferecendo um desconto especial de ${discountText}, representando uma economia de ${savingsText} sobre o valor de ${subtotalText}. Este investimento de ${totalText} representa não apenas uma economia significativa, mas também a garantia de retorno através da nossa expertise e compromisso com a excelência. Esta oferta reflete nosso desejo genuíno de estabelecer uma parceria duradoura e bem-sucedida com sua empresa.`
        },
        {
          title: 'Investimento Estratégico',
          template: () =>
            `Reconhecemos o valor da parceria e, por isso, oferecemos um desconto de ${discountText} nesta proposta, sobre o valor base de ${subtotalText}. Isso significa uma economia direta de ${savingsText}, transformando este investimento de ${totalText} em uma decisão estratégica inteligente. Mais do que números, estamos oferecendo resultado, qualidade e a certeza de que cada centavo investido retornará em forma de crescimento e visibilidade para sua marca.`
        },
        {
          title: 'Condição Especial',
          template: () =>
            `Esta proposta traz uma condição especial: desconto de ${discountText} sobre o montante de ${subtotalText}, equivalente a ${savingsText} de economia. O investimento final de ${totalText} reflete nosso compromisso em tornar este projeto viável e extremamente vantajoso para você. Estamos confiantes de que esta parceria gerará resultados expressivos e duradouros para o crescimento da sua empresa.`
        }
      ];

      // Select variation based on proposal ID (for variation between proposals)
      const proposalId = typeof proposal?.id === 'string' ? parseInt(proposal.id) : (proposal?.id ?? 0);
      const index = proposalId % variations.length;
      const selected = variations[index];

      console.log('[PDF] Generated persuasive text variant:', selected.title);

      return {
        title: selected.title,
        text: selected.template()
      };
    } catch (error) {
      console.error('[PDF] Error generating persuasive text:', error);
      return null;
    }
  };

  // Add default cover page (always)
  try {
    doc.addImage(coverImage, 'PNG', 0, 0, pageWidth, pageHeight);
    doc.addPage();
  } catch (error) {
    console.error('Error adding cover image:', error);
  }

  // ========== HEADER SOFISTICADO ==========
  // Fundo do header com gradiente visual (simulado com retângulos)
  doc.setFillColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
  drawRoundedRect(0, 0, pageWidth, 45, 0, 'F');
  
  // Linha decorativa branca no topo
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(margin, 8, pageWidth - margin, 8);

  // Título principal centralizado
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(LAYOUT_CONFIG.fontSize.header);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA COMERCIAL', pageWidth / 2, 28, { align: 'center' });
  
  // Subtítulo com código da proposta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const proposalCode = proposal?.proposalCode || `#${proposal?.id}`;
  doc.text(`Referência: ${proposalCode}`, pageWidth / 2, 38, { align: 'center' });

  let yPosition = 58;

  // ========== CARD DE DADOS DO CLIENTE ==========
  // Fundo do card com borda arredondada
  doc.setFillColor(LIGHT_GRAY_RGB[0], LIGHT_GRAY_RGB[1], LIGHT_GRAY_RGB[2]);
  doc.setDrawColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
  doc.setLineWidth(0.5);
  drawRoundedRect(margin, yPosition - 3, pageWidth - 2 * margin, 44, 3, 'FD');

  // Título do card
  doc.setFillColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
  drawRoundedRect(margin + 3, yPosition, 50, 7, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DADOS DO CLIENTE', margin + 6, yPosition + 5);

  yPosition += 14;
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  
  // Layout em duas colunas para dados do cliente
  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 5;
  const labelWidth = 28;

  // Coluna 1
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientLabel);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('Empresa:', col1X, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientValue);
  doc.text(proposal?.clientName ?? '', col1X + labelWidth, yPosition);

  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientLabel);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('Responsável:', col2X, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientValue);
  doc.text(proposal?.responsibleName ?? '', col2X + labelWidth + 5, yPosition);

  yPosition += 8;

  // Linha 2
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientLabel);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('Email:', col1X, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientValue);
  doc.text(proposal?.clientEmail ?? '', col1X + labelWidth, yPosition);

  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientLabel);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('WhatsApp:', col2X, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientValue);
  doc.text(proposal?.clientWhatsapp ?? '', col2X + labelWidth + 5, yPosition);

  yPosition += 8;

  // Linha 3 - Datas
  const createdDate = new Date(proposal?.createdAt ?? Date.now()).toLocaleDateString('pt-BR');
  const validDate = new Date(proposal?.validUntil ?? Date.now()).toLocaleDateString('pt-BR');
  
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientLabel);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('Data:', col1X, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientValue);
  doc.text(createdDate, col1X + labelWidth, yPosition);

  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientLabel);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('Válida até:', col2X, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
  doc.setFontSize(LAYOUT_CONFIG.fontSize.clientValue);
  doc.text(validDate, col2X + labelWidth + 5, yPosition);

  yPosition += 18;

  // ========== LINHA DECORATIVA ==========
  drawDecorativeLine(yPosition);
  yPosition += 12;

  // ========== TEXTO INTRODUTÓRIO ==========
  doc.setFontSize(LAYOUT_CONFIG.fontSize.introText);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  
  const introText = 
    `É uma alegria atender ao seu pedido e participar do crescimento da ${proposal?.clientName ?? 'sua empresa'}. Agradeço pela confiança. ` +
    `Nosso compromisso é ir além da entrega de um serviço, buscando impacto real e fortalecendo a ${proposal?.clientName ?? 'sua empresa'}.\n\n` +
    `Esta proposta foi desenvolvida com foco total em resultados, unindo criatividade, estratégia e design de alto nível para garantir ` +
    `presença e destaque em um mercado competitivo. Marcas fortes nascem de uma comunicação clara, marcante e alinhada ao que o público deseja.\n\n` +
    `Com técnicas avançadas de design, visão publicitária estratégica e uma equipe experiente, traduzimos a essência da sua empresa em ` +
    `soluções que geram conexão, confiança e conversão. Se quiser ajustar algo ou tirar dúvidas, estamos à disposição para deixar o ` +
    `projeto exatamente como você precisa.`;

  const introLines = doc.splitTextToSize(introText, pageWidth - 2 * margin);
  doc.text(introLines, margin, yPosition);
  yPosition += introLines.length * LAYOUT_CONFIG.lineSpacing.introText + 8;

  // Assinatura estilizada
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('Atenciosamente,', margin, yPosition);
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
  doc.text('Paulo Lima', margin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('Diretor Criativo', margin + 25, yPosition);

  yPosition += 15;

  // Check page break
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 35;
    addPageLogo();
  }

  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);

  // Check page break before services
  checkPageBreak(50);

  // ========== SEÇÃO DE SERVIÇOS ==========
  drawSectionTitle('SERVIÇOS CONTRATADOS');

  // Tabela de serviços com design moderno
  const servicesData = (proposal?.services ?? []).map((ps: any) => {
    const service = ps?.service;
    const quantity = ps?.quantity ?? 1;
    const unitPrice = parseFloat(ps?.customPrice ?? service?.price ?? '0');
    const total = unitPrice * quantity;

    return [
      service?.title ?? '',
      quantity.toString(),
      formatCurrency(unitPrice),
      formatCurrency(total),
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Serviço', 'Qtd', 'Preço Unit.', 'Total']],
    body: servicesData,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: BRAND_ORANGE_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 4,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      textColor: DARK_GRAY_RGB,
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
  });

  // @ts-ignore
  yPosition = doc.lastAutoTable.finalY + 8;

  // ========== CARD DE RESUMO FINANCEIRO ==========
  const subtotal = parseFloat(proposal?.subtotal ?? '0');
  const tax = parseFloat(proposal?.tax ?? '0');
  const discountValue = parseFloat(proposal?.discountValue ?? '0');
  const total = parseFloat(proposal?.total ?? '0');
  
  const discountAmount = proposal?.discountType === 'percentage'
    ? (subtotal * discountValue) / 100
    : discountValue;

  // Check page break
  if (yPosition > pageHeight - 85) {
    doc.addPage();
    yPosition = 35;
    addPageLogo();
  }

  // Card do resumo financeiro
  const cardWidth = 80;
  const cardX = pageWidth - margin - cardWidth;
  const cardHeight = discountAmount > 0 ? 48 : 38;
  
  // Fundo do card
  doc.setFillColor(LIGHT_ORANGE_RGB[0], LIGHT_ORANGE_RGB[1], LIGHT_ORANGE_RGB[2]);
  doc.setDrawColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
  doc.setLineWidth(0.8);
  drawRoundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 'FD');

  let summaryY = yPosition + 8;
  const labelX = cardX + 5;
  const valueX = cardX + cardWidth - 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
  doc.text('Subtotal:', labelX, summaryY);
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  doc.text(formatCurrency(subtotal), valueX, summaryY, { align: 'right' });

  summaryY += 7;

  // Imposto - verifica se é isento
  const isTaxExempt = proposal?.taxExempt === true;
  if (isTaxExempt) {
    doc.setTextColor(34, 139, 34); // Verde para isento
    doc.text('Imposto:', labelX, summaryY);
    doc.text('Isento (À Vista)', valueX, summaryY, { align: 'right' });
  } else {
    doc.setTextColor(100, 100, 180);
    doc.text('Imposto (12%):', labelX, summaryY);
    doc.text(`+ ${formatCurrency(tax)}`, valueX, summaryY, { align: 'right' });
  }

  summaryY += 7;

  if (discountAmount > 0) {
    // Desconto em verde
    doc.setTextColor(34, 139, 34);
    const discountLabel = proposal?.discountType === 'percentage'
      ? `Desconto (${Math.round(discountValue)}%):`
      : 'Desconto:';
    doc.text(discountLabel, labelX, summaryY);
    doc.text(`- ${formatCurrency(discountAmount)}`, valueX, summaryY, { align: 'right' });
    summaryY += 8;
  }

  // Linha separadora
  doc.setDrawColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
  doc.setLineWidth(0.5);
  doc.line(labelX, summaryY, valueX, summaryY);
  summaryY += 6;

  // Total destacado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
  doc.text('TOTAL:', labelX, summaryY);
  doc.text(formatCurrency(total), valueX, summaryY, { align: 'right' });

  yPosition += cardHeight + 15;
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);

  // ========== TEXTO PERSUASIVO ==========
  const persuasiveContent = generatePersuasiveText();
  if (persuasiveContent) {
    console.log('[PDF] 🎯 Rendering persuasive text section:', persuasiveContent.title);
    
    if (yPosition > pageHeight - LAYOUT_CONFIG.pageBreak.persuasiveText) {
      doc.addPage();
      yPosition = 35;
      addPageLogo();
    }

    // Card com fundo claro para texto persuasivo
    const persuasiveLines = doc.splitTextToSize(persuasiveContent.text, pageWidth - 2 * margin - 10);
    const persuasiveHeight = persuasiveLines.length * LAYOUT_CONFIG.lineSpacing.persuasiveText + 18;
    
    doc.setFillColor(255, 250, 240); // Fundo creme suave
    doc.setDrawColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    doc.setLineWidth(0.8);
    drawRoundedRect(margin, yPosition - 5, pageWidth - 2 * margin, persuasiveHeight, 3, 'FD');
    
    // Título com ícone decorativo
    doc.setFillColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    doc.circle(margin + 8, yPosition + 2, 3, 'F');
    doc.setTextColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(persuasiveContent.title.toUpperCase(), margin + 15, yPosition + 4);

    yPosition += 14;
    doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(LAYOUT_CONFIG.fontSize.normalText);

    doc.text(persuasiveLines, margin + 5, yPosition);
    yPosition += persuasiveLines.length * LAYOUT_CONFIG.lineSpacing.persuasiveText + 15;
    
    console.log('[PDF] ✅ Persuasive text rendered successfully');
  }

  // ========== TABELA DE PARCELAMENTO ==========
  if (proposal?.installments && proposal.installments > 1) {
    if (yPosition > pageHeight - 120) {
      doc.addPage();
      yPosition = 35;
      addPageLogo();
    }

    drawSectionTitle('PLANO DE PARCELAMENTO');

    const installmentAmount = total / proposal.installments;
    const installmentDay = proposal.installmentDay || 10;
    const installmentsData = [];
    
    for (let i = 1; i <= proposal.installments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(installmentDay);
      
      installmentsData.push([
        `${i}/${proposal.installments}`,
        dueDate.toLocaleDateString('pt-BR'),
        formatCurrency(installmentAmount),
      ]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Parcela', 'Vencimento', 'Valor']],
      body: installmentsData,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: BRAND_ORANGE_RGB,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
        textColor: DARK_GRAY_RGB,
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252],
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'center' },
        1: { cellWidth: 50, halign: 'center' },
        2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      },
    });

    // @ts-ignore
    yPosition = doc.lastAutoTable.finalY + 12;
  }

  // ========== CONDIÇÕES DE PAGAMENTO ==========
  if (proposal?.paymentTerms) {
    checkPageBreak(50);
    drawSectionTitle('CONDIÇÕES DE PAGAMENTO');

    doc.setFontSize(LAYOUT_CONFIG.fontSize.normalText);
    doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);

    const paymentLines = doc.splitTextToSize(proposal.paymentTerms, pageWidth - 2 * margin);
    doc.text(paymentLines, margin, yPosition);
    yPosition += paymentLines.length * LAYOUT_CONFIG.lineSpacing.normalText + 12;
  }

  // ========== OBSERVAÇÕES ==========
  if (proposal?.observations) {
    checkPageBreak(50);
    drawSectionTitle('OBSERVAÇÕES ADICIONAIS');

    doc.setFontSize(LAYOUT_CONFIG.fontSize.normalText);
    doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);

    const observationLines = doc.splitTextToSize(proposal.observations, pageWidth - 2 * margin);
    doc.text(observationLines, margin, yPosition);
    yPosition += observationLines.length * LAYOUT_CONFIG.lineSpacing.normalText + 12;
  }

  // ========== ESCOPO DO SERVIÇO ==========
  checkPageBreak(80);
  drawSectionTitle('ESCOPO DO SERVIÇO E PRÓXIMOS PASSOS');

  doc.setFontSize(LAYOUT_CONFIG.fontSize.normalText);

  const scopeIntro = 'A entrega do serviço de design contempla um processo estruturado em etapas claras, pensado para garantir ' +
    'alinhamento, estratégia e um resultado final que realmente eleve o valor da sua marca.';
  
  const scopeIntroLines = doc.splitTextToSize(scopeIntro, pageWidth - 2 * margin);
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
  doc.text(scopeIntroLines, margin, yPosition);
  yPosition += scopeIntroLines.length * LAYOUT_CONFIG.lineSpacing.normalText + 8;

  // Etapas em formato de lista visual
  const etapas = [
    { num: '1', title: 'Entrevista com a Gestão', desc: 'Conversa estratégica de 90min para entender expectativas e objetivos.' },
    { num: '2', title: 'Análise de Mercado', desc: 'Investigação de mercado e concorrentes para soluções assertivas.' },
    { num: '3', title: 'Brainstorming Criativo', desc: 'Sessões colaborativas para explorar ideias e referências.' },
    { num: '4', title: 'Tendências de Design', desc: 'Pesquisa sobre tendências atuais para agregar inovação.' },
    { num: '5', title: 'Conceitos Iniciais', desc: 'Criação e apresentação dos primeiros conceitos de Key Visual.' },
    { num: '6', title: 'Feedback e Revisões', desc: 'Ajustes e refinamentos para alinhamento final.' },
  ];

  etapas.forEach((etapa) => {
    if (yPosition > pageHeight - 45) {
      doc.addPage();
      yPosition = 35;
      addPageLogo();
    }
    
    // Círculo com número
    doc.setFillColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    doc.circle(margin + 4, yPosition - 1, 3.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(etapa.num, margin + 4, yPosition + 0.5, { align: 'center' });
    
    // Título e descrição
    doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);
    doc.setFontSize(10);
    doc.text(etapa.title, margin + 12, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
    doc.text(etapa.desc, margin + 12, yPosition + 4.5);
    
    yPosition += 12;
  });

  yPosition += 8;

  // ========== EXCLUSÕES ==========
  checkPageBreak(60);
  drawSectionTitle('EXCLUSÕES');

  doc.setFontSize(LAYOUT_CONFIG.fontSize.normalText);
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);

  const exclusionsText = 
    'Não estão incluídos no valor de honorários: serviços de impressão de materiais, provas, aprovação de ' +
    'cores em máquina, serviços de terceiros, viagens, hospedagem e alimentação.\n\n' +
    'Esses serviços só serão realizados após aprovação dos valores em separado. Quando aprovados e ' +
    'ocorridos pela Defoco, deverão ser reembolsados pela ' + (proposal?.clientName ?? 'empresa') + ' mediante apresentação dos ' +
    'valores e notas de reembolso.';

  const exclusionsLines = doc.splitTextToSize(exclusionsText, pageWidth - 2 * margin);
  doc.text(exclusionsLines, margin, yPosition);
  yPosition += exclusionsLines.length * LAYOUT_CONFIG.lineSpacing.normalText + 12;

  // ========== TERMOS E CONDIÇÕES ==========
  checkPageBreak(80);
  drawSectionTitle('TERMOS E CONDIÇÕES');

  doc.setFontSize(LAYOUT_CONFIG.fontSize.normalText);
  doc.setTextColor(DARK_GRAY_RGB[0], DARK_GRAY_RGB[1], DARK_GRAY_RGB[2]);

  const termsText = 
    '• A quantidade de trabalhos não é cumulativa, sendo imprescindível especificação detalhada no cronograma.\n\n' +
    '• Não estão incluídos os arquivos abertos originais (PM, INDD, AI, etc.). Será cobrado 35% do valor total do contrato para envio dos arquivos editáveis.\n\n' +
    '• Propostas de design não aprovadas são propriedade exclusiva da Defoco. Uso indevido está sujeito a penalidades por direitos autorais.\n\n' +
    '• Após aprovação do conceito, são permitidas até 3 modificações. Alterações adicionais serão consideradas novo projeto.';

  const termsLines = doc.splitTextToSize(termsText, pageWidth - 2 * margin);
  doc.text(termsLines, margin, yPosition);
  yPosition += termsLines.length * LAYOUT_CONFIG.lineSpacing.normalText + 10;

  // ========== FOOTER MODERNO EM TODAS AS PÁGINAS ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i === 1) continue; // Skip cover page
    
    // Logo no topo de cada página de conteúdo
    if (i > 1) {
      addPageLogo();
    }
    
    // Footer com design melhorado
    const footerY = pageHeight - 22;
    
    // Linha decorativa
    doc.setDrawColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    
    // Informações de contato
    doc.setFontSize(7);
    doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
    const contactInfo1 = layoutConfig?.footerText1 || 'Defoco - Design de Resultados | Av. Paulista, 1471 - CONJ 275, CEP: 01.311-927 - Bela Vista';
    const contactInfo2 = layoutConfig?.footerText2 || 'Tel: (11) 97251-5822 | Fone: (11) 2452-1305 | defoco@defoco.com.br';
    
    doc.text(contactInfo1, margin, footerY + 2);
    doc.text(contactInfo2, margin, footerY + 6);
    
    // Website em laranja (à direita)
    doc.setTextColor(BRAND_ORANGE_RGB[0], BRAND_ORANGE_RGB[1], BRAND_ORANGE_RGB[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(layoutConfig?.footerWebsite || 'www.defoco.com.br', pageWidth - margin, footerY + 2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(layoutConfig?.footerInstagram || '@defoco', pageWidth - margin, footerY + 6, { align: 'right' });
    
    // Número da página centralizado
    doc.setFontSize(8);
    doc.setTextColor(MEDIUM_GRAY_RGB[0], MEDIUM_GRAY_RGB[1], MEDIUM_GRAY_RGB[2]);
    doc.text(`${i} / ${totalPages}`, pageWidth / 2, footerY + 10, { align: 'center' });
  }

    // Retornar o PDF como blob
    console.log('[PDF] PDF generated successfully');
    return doc.output('blob');
    
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    throw new Error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}