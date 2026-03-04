import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create MASTER user (Paulo Lima)
  const masterPassword = await bcrypt.hash('Defoco131420', 10);
  const now = new Date();
  const passwordExpiresAt = new Date(now);
  passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90); // 90 dias
  
  const masterUser = await prisma.user.upsert({
    where: { email: 'paulo@defoco.com.br' },
    update: {
      password: masterPassword,
      role: 'master',
      isActive: true,
      passwordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      permissions: JSON.stringify([
        'manage_users',
        'view_proposals',
        'create_proposals',
        'edit_proposals',
        'approve_proposals',
        'generate_contracts',
        'view_audit_logs',
        'manage_system_settings'
      ]),
    },
    create: {
      email: 'paulo@defoco.com.br',
      password: masterPassword,
      name: 'Paulo Lima',
      role: 'master',
      isActive: true,
      passwordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      forcePasswordChange: false,
      permissions: JSON.stringify([
        'manage_users',
        'view_proposals',
        'create_proposals',
        'edit_proposals',
        'approve_proposals',
        'generate_contracts',
        'view_audit_logs',
        'manage_system_settings'
      ]),
    },
  });

  console.log('✅ Master user created:', masterUser.email);

  // Create test user
  const hashedPassword = await bcrypt.hash('defoco123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'teste@defoco.com' },
    update: {
      password: hashedPassword,
      role: 'user',
      isActive: true,
      passwordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      permissions: JSON.stringify([
        'view_proposals',
        'create_proposals'
      ]),
    },
    create: {
      email: 'teste@defoco.com',
      password: hashedPassword,
      name: 'Usuário Teste',
      role: 'user',
      isActive: true,
      passwordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      permissions: JSON.stringify([
        'view_proposals',
        'create_proposals'
      ]),
    },
  });

  console.log('✅ Test user created:', user.email);

  // Create system test user (required for automated testing)
  const testSystemPassword = await bcrypt.hash('johndoe123', 10);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {
      password: testSystemPassword,
      role: 'admin',
      isActive: true,
      passwordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
    },
    create: {
      email: 'john@doe.com',
      password: testSystemPassword,
      name: 'John Doe',
      role: 'admin',
      isActive: true,
      passwordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      forcePasswordChange: false,
      permissions: JSON.stringify([
        'manage_users',
        'view_proposals',
        'create_proposals',
        'edit_proposals',
        'approve_proposals',
      ]),
    },
  });

  // Limpar serviços existentes
  console.log('🗑️  Removing existing services...');
  await prisma.service.deleteMany({});

  // Lista completa de 149 serviços na ordem correta
  const services = [
    { title: 'EMBALAGEM CONCEITO', description: 'Criação de conceito gráfico para linha de embalagens, explorando forma, impacto visual e diferenciação no ponto de venda, com até 3 alterações inclusas.', price: 2900.00, active: true },
    { title: 'EMBALAGEM VARIAÇÃO DE MODELO', description: 'Criação de variação de embalagem ou adaptação de modelo, mantendo a identidade da linha e ajustando comunicação e layout conforme a necessidade.', price: 850.00, active: true },
    { title: 'BRANDING', description: 'Desenvolvimento de estratégia de branding, definindo posicionamento, valores e diretrizes para fortalecer a reputação e a conexão da marca com o público.', price: 3500.00, active: true },
    { title: 'LOGOMARCA CORPORATIVA', description: 'Criação de logomarca corporativa, desenho tipográfico do nome da empresa que traduz o posicionamento e a personalidade da marca.', price: 1700.00, active: true },
    { title: 'CAPA DE CATÁLOGO', description: 'Criação da capa de catálogo com foco em impacto visual e coerência com a identidade da marca, valorizando o material de vendas e apresentação.', price: 700.00, active: true },
    { title: 'CATÁLOGO (POR PÁGINA)', description: 'Criação de páginas de catálogo de produtos, estruturando oferta, informações e imagens para apoiar o time comercial e facilitar a decisão de compra.', price: 400.00, active: true },
    { title: 'SITE INSTITUCIONAL', description: 'Criação de site institucional com até 7 páginas, incluindo identidade visual, estrutura de navegação, SEO básico, integração com Analytics e versão responsiva.', price: 5500.00, active: true },
    { title: 'SITE INSTITUCIONAL - PÁGINA ADICIONAL', description: 'Criação de página adicional para site institucional, expandindo conteúdos, áreas ou campanhas específicas.', price: 500.00, active: true },
    { title: 'NAMING', description: 'Criação de nome de marca, unindo visão estratégica, linguagem, mercado e viabilidade legal.', price: 1800.00, active: true },
    { title: 'ADESIVO SIMPLES', description: 'Adesivos criados para vitrines, pontos de venda, eventos e decoração, reforçam a presença da sua marca no dia a dia e ajudam o público a lembrar de você de forma rápida e positiva.', price: 600.00, active: true },
    { title: 'ADESIVO PARA GELADEIRA', description: 'Adesivos personalizados para geladeiras, transformam um espaço comum em um ponto de destaque da marca, comunicando com clareza o propósito da empresa no ambiente de vendas.', price: 200.00, active: true },
    { title: 'ADESIVO DE CHÃO', description: 'Adesivos de chão para PDV e eventos, guiando o olhar e o caminho do consumidor, reforçando a mensagem da marca diretamente no fluxo das pessoas.', price: 350.00, active: true },
    { title: 'ANÚNCIO PARA REVISTA / JORNAL (1 PÁG)', description: 'Criação de anúncio de página inteira para revista ou jornal, pensado para despertar emoção, desejo e reação imediata no público, aproximando a marca do consumidor.', price: 1200.00, active: true },
    { title: 'ANÚNCIO REVISTA / JORNAL (1/2 PÁG)', description: 'Criação de anúncio de meia página em revista ou jornal, alinhado ao conceito da campanha, ideal para reforçar posicionamento e gerar lembrança de marca.', price: 990.00, active: true },
    { title: 'ANÚNCIO REVISTA / JORNAL (1/3 PÁG)', description: 'Criação de anúncio de 1/3 de página, focado em destacar produto, serviço ou ideia de forma direta, ajudando a posicionar a marca e influenciar hábitos de consumo.', price: 800.00, active: true },
    { title: 'ANÚNCIO REVISTA / JORNAL (1/4 PÁG)', description: 'Criação de anúncio de 1/4 de página, solução enxuta e estratégica para reforçar presença da marca, comunicar benefícios e apoiar campanhas já em andamento.', price: 650.00, active: true },
    { title: 'ANÚNCIO REVISTA / JORNAL PÁG. DUPLA', description: 'Criação de anúncio em página dupla, ideal para grandes lançamentos e campanhas de impacto, combinando conceito, imagem e texto para vender, posicionar e fortalecer a marca.', price: 1500.00, active: true },
    { title: 'BACKLIGHT', description: 'Criação de arte para painel backlight em material translúcido, pensado para estruturas iluminadas que chamam atenção em pontos de grande fluxo, como ruas e pontos de ônibus.', price: 300.00, active: true },
    { title: 'CARTAZ', description: 'Criação de cartaz para PDV, com composição estratégica de imagem, slogan e texto para destacar ofertas, lançamentos e campanhas de maneira clara e atrativa.', price: 400.00, active: true },
    { title: 'BONÉ', description: 'Personalização de boné promocional, ideal para ações com funcionários, parceiros e clientes, reforçando a marca de forma útil, cotidiana e memorável.', price: 250.00, active: true },
    { title: 'BOTTON', description: 'Criação de botton promocional, brinde de alta lembrança e longa duração que mantém a marca perto do público no dia a dia.', price: 250.00, active: true },
    { title: 'BROADSIDE ELABORADO (POR DOBRA)', description: 'Criação de material impresso elaborado para lançamento de produto, apresentando conceito, benefícios e campanha para público interno, distribuidores e varejistas.', price: 950.00, active: true },
    { title: 'BROADSIDE SIMPLES (POR DOBRA)', description: 'Criação de material impresso simples para lançamento de produto, ideal para apresentar novidades de forma objetiva a times internos, distribuidores e varejistas.', price: 650.00, active: true },
    { title: 'BROADSIDE (FORMATO A3 COM VINCO)', description: 'Criação de broadside em formato A3 com vinco, pensado para lançamento de produto com apresentação clara da linha e da campanha para o trade.', price: 950.00, active: true },
    { title: 'CAMISETA PROMOCIONAL', description: 'Criação da estampa para camisetas, camisas ou uniformes, fortalecendo a identidade da marca em eventos, PDV e no ambiente interno da empresa.', price: 250.00, active: true },
    { title: 'CANETA', description: 'Personalização de caneta promocional com simulação em mockup 3D, brinde funcional que mantém a marca presente no dia a dia do cliente.', price: 190.00, active: true },
    { title: 'CAPA CADERNO', description: 'Criação de capa de caderno personalizada, ideal para ações promocionais, kits institucionais e fortalecimento da marca em ambientes corporativos ou educacionais.', price: 350.00, active: true },
    { title: 'CARDÁPIO / MENU DEGUSTAÇÃO (POR PÁGINA)', description: 'Criação de página de cardápio ou menu degustação para restaurantes e empresas do ramo, apresentando produtos com clareza, apelo visual e organização.', price: 150.00, active: true },
    { title: 'CINTA / FAIXA', description: 'Criação de cinta ou faixa institucional ou conceitual, ideal para lançamentos, campanhas de trade, embalagens e decoração de pontos estratégicos.', price: 150.00, active: true },
    { title: 'CONVITE', description: 'Criação de convite impresso para eventos e festas, com linguagem atrativa e visual alinhado ao estilo da ocasião, facilitando a comunicação das informações importantes.', price: 150.00, active: true },
    { title: 'COPOS', description: 'Criação de arte para copos decorativos, perfeitos para eventos, ativações de marca e ações promocionais, ampliando a presença da marca no contato com o público.', price: 150.00, active: true },
    { title: 'CRACHÁ', description: 'Criação de arte para crachá, pensado para eventos, equipes internas e ações promocionais, reforçando a organização e a identidade visual da marca.', price: 150.00, active: true },
    { title: 'DISPLAY PORTA TAKE ONE', description: 'Criação de arte para mini display porta take one, peça de balcão que convida o cliente a levar material de comunicação, ampliando o alcance da mensagem.', price: 390.00, active: true },
    { title: 'DISPLAY DE MESA', description: 'Criação de display de mesa para balcões e superfícies de atendimento, ideal para divulgar promoções, campanhas e produtos em destaque.', price: 350.00, active: true },
    { title: 'ENCARTE (1 DOBRA)', description: 'Criação de encarte com 1 dobra, formato tradicional e eficiente para divulgar ofertas, campanhas e novidades diretamente no ponto de venda.', price: 500.00, active: true },
    { title: 'ENCARTE (2 DOBRAS)', description: 'Criação de encarte com 2 dobras, permitindo mais espaço para produtos, ofertas e conteúdo visual, mantendo a comunicação prática e direta.', price: 300.00, active: true },
    { title: 'ETIQUETA', description: 'Criação de etiqueta com informações de produto e identidade da marca, garantindo padronização, organização e comunicação clara na embalagem.', price: 150.00, active: true },
    { title: 'FAIXA DE GÔNDOLA', description: 'Criação de faixa de gôndola para PDV, destacando produtos na prateleira e reforçando preço, promoção e mensagem da marca no ponto de decisão de compra.', price: 650.00, active: true },
    { title: 'FLYER OU FOLHETO A5', description: 'Criação de flyer A5, com visual marcante e informações objetivas, ideal para lançamentos, eventos e campanhas de divulgação local.', price: 750.00, active: true },
    { title: 'FOLDER A4 - ELABORADO (POR PÁGINA)', description: 'Criação de páginas de folder A4 dobrado, indicado para apresentar serviços, linhas de produtos ou campanhas de forma mais detalhada e elegante.', price: 500.00, active: true },
    { title: 'FOLHETO ELABORADO (POR PÁGINA)', description: 'Criação de folheto elaborado por página, com texto e visual pensados para explicar, convencer e incentivar o público a conhecer ou comprar.', price: 550.00, active: true },
    { title: 'FOLHETO SIMPLES (POR PÁGINA)', description: 'Criação de folheto simples por página, solução enxuta e direta para apresentar produtos, serviços ou campanhas com boa relação custo benefício.', price: 400.00, active: true },
    { title: 'GUARDA SOL', description: 'Criação de arte para guarda sol institucional ou promocional, ampliando a visibilidade da marca em ambientes externos com percepção de valor.', price: 150.00, active: true },
    { title: 'GUARDANAPO', description: 'Criação de arte para guardanapo personalizado, detalhe que reforça o cuidado com a marca e melhora a experiência do cliente em bares, eventos e restaurantes.', price: 100.00, active: true },
    { title: 'AVENTAL OU JALECO', description: 'Criação de arte para avental ou jaleco personalizado, fortalecendo a imagem profissional da marca em pontos de contato diretos com o público.', price: 100.00, active: true },
    { title: 'LÂMINA DE VENDAS (FRENTE E VERSO)', description: 'Criação de lâmina de vendas frente e verso, ideal para feiras, visitas comerciais e apresentações rápidas de produtos ou serviços.', price: 800.00, active: true },
    { title: 'LIVRO DE RECEITA (POR PÁGINA)', description: 'Criação e diagramação de páginas de livro de receitas, organizando textos e imagens tratadas com qualidade para valorizar o conteúdo gastronômico.', price: 200.00, active: true },
    { title: 'LOGOTIPO PARA CAMPANHA', description: 'Criação de logotipo exclusivo para campanha, conectando conceito, nome e identidade visual em uma marca forte para ações temporárias ou sazonais.', price: 1300.00, active: true },
    { title: 'MÓBILE', description: 'Criação de móbile para PDV, peça suspensa que chama atenção do consumidor e reforça lançamentos, promoções ou mensagens institucionais.', price: 300.00, active: true },
    { title: 'OUTDOOR', description: 'Criação de layout para outdoor, painel de grande impacto visual para campanhas de alta exposição em ruas, avenidas e rodovias.', price: 1500.00, active: true },
    { title: 'PAINEL', description: 'Criação de painel impresso para comunicação interna ou externa, ideal para fachadas, eventos e áreas de grande visibilidade.', price: 900.00, active: true },
    { title: 'BACKDROP', description: 'Criação de backdrop com repetição de logos ou identidade visual, perfeito para fotos, eventos, entrevistas e gravações.', price: 350.00, active: true },
    { title: 'TESTEIRA', description: 'Criação de testeira para gôndolas, destacando a marca e a categoria no PDV e facilitando a identificação da linha de produtos.', price: 300.00, active: true },
    { title: 'PAPEL FORRAÇÃO', description: 'Criação de papel de forração para ilhas, mesas e espaços no PDV, aumentando a atratividade e organizando visualmente a exposição dos produtos.', price: 500.00, active: true },
    { title: 'PORTA GUARDANAPO', description: 'Criação de arte para porta guardanapo, peça que agrega sofisticação à mesa e reforça a identidade visual da marca em bares e restaurantes.', price: 250.00, active: true },
    { title: 'PRECIFICADOR', description: 'Criação de precificador para PDV, destacando preços e promoções com clareza e ajudando a direcionar a atenção do consumidor no ponto de venda.', price: 250.00, active: true },
    { title: 'RÉGUA PARA PDV', description: 'Criação de régua de preço para prateleiras, reforçando organização e visibilidade dos produtos no ponto de venda.', price: 500.00, active: true },
    { title: 'CRIAÇÃO DE RÓTULO', description: 'Criação de rótulo completo com informações de produto e identidade visual, focado em atrair o olhar e facilitar a escolha na gôndola, com até 3 alterações inclusas.', price: 900.00, active: true },
    { title: 'PAPEL FORRAÇÃO OU SAIA DE MESA', description: 'Criação de papel forração ou saia de mesa para eventos e PDV, dando unidade visual ao espaço e valorizando a presença da marca.', price: 500.00, active: true },
    { title: 'SELO', description: 'Criação de selo impresso com identidade da marca, ideal para destacar atributos como qualidade, sustentabilidade, datas especiais ou campanhas comemorativas.', price: 500.00, active: true },
    { title: 'STOPPER', description: 'Criação de stopper para PDV, peça que se projeta da gôndola para literalmente parar o consumidor e destacar ofertas, diferenciais ou ações promocionais.', price: 500.00, active: true },
    { title: 'STORYBOARD (QUADRO)', description: 'Criação de storyboard ilustrado, quadro a quadro, para planejar vídeos com clareza, otimizar a produção e alinhar expectativas de direção e fotografia.', price: 500.00, active: true },
    { title: 'TABELA DE PREÇOS (POR LÂMINA)', description: 'Criação de tabela de preços impressa ou digital, organizada de forma clara para facilitar consulta de produtos, serviços e condições comerciais.', price: 500.00, active: true },
    { title: 'TABLÓIDE DE OFERTA (PÁG)', description: 'Criação de página de tablóide de ofertas, ideal para mercados, redes de varejo e estabelecimentos que desejam destacar promoções de maneira direta.', price: 400.00, active: true },
    { title: 'TAKE ONE', description: 'Criação de peça tipo take one, material de uma lâmina, sem dobra, pensado para ser retirado pelo cliente e levar a mensagem da marca para além do PDV.', price: 450.00, active: true },
    { title: 'TEMPLATE (PÁGINA)', description: 'Criação de templates editáveis para documentos ou páginas, permitindo que a marca publique conteúdos com rapidez, consistência visual e profissionalismo.', price: 700.00, active: true },
    { title: 'WOBBLER', description: 'Criação de wobbler para prateleiras e gôndolas, peça móvel que chama atenção pelo movimento e destaca produtos e promoções.', price: 700.00, active: true },
    { title: 'TOPO DE ILHA', description: 'Criação de arte para topo de ilha, estrutura que sinaliza e valoriza espaços especiais de exposição de produtos no varejo.', price: 500.00, active: true },
    { title: 'TOTEM', description: 'Criação de totem publicitário, peça vertical de alto impacto que funciona como ponto de contato direto com o cliente em eventos e PDV.', price: 900.00, active: true },
    { title: 'ICONE VETOR', description: 'Criação de ícone vetorial, imagem simples e funcional que representa visualmente ideias, funções ou categorias em materiais digitais e impressos.', price: 250.00, active: true },
    { title: 'BANDEIROLA', description: 'Criação de bandeirola para eventos, inaugurações e campanhas, solução de baixo custo com grande alcance visual em ambientes internos e externos.', price: 350.00, active: true },
    { title: 'BANNER SIMPLES', description: 'Criação de banner simples para PDV, com equilíbrio entre slogan, imagem e texto para comunicar promoções e campanhas com clareza.', price: 500.00, active: true },
    { title: 'BANNER ELABORADO', description: 'Criação de banner elaborado para PDV, com visual mais trabalhado e foco em impacto e valorização da mensagem da marca.', price: 500.00, active: true },
    { title: 'LOGOMARCA PARA PRODUTO', description: 'Criação de logomarca específica para produto, fortalecendo a identidade da linha e diferenciando-a dentro do portfólio da marca.', price: 1200.00, active: true },
    { title: 'LOGOMARCA PARA CAMPANHA', description: 'Criação de logomarca para campanha, ideal para ações temporárias e sazonais que pedem uma identidade visual própria.', price: 600.00, active: true },
    { title: 'ILUSTRAÇÃO SIMPLES 2D', description: 'Criação de ilustração publicitária simples em 2D, para complementar peças visuais e tornar a comunicação mais leve, criativa e atraente.', price: 500.00, active: true },
    { title: 'ILUSTRAÇÃO MÉDIA 2D', description: 'Criação de ilustração publicitária média em 2D, com mais detalhes e elementos, ideal para campanhas que pedem personalidade e diferenciação.', price: 590.00, active: true },
    { title: 'ILUSTRAÇÃO ELABORADA 2D', description: 'Criação de ilustração publicitária elaborada em 2D, com alto nível de detalhe para campanhas que exigem um visual forte e impactante.', price: 650.00, active: true },
    { title: 'PLANOGRAMA', description: 'Criação de planograma para PDV, desenho técnico que orienta a melhor forma de expor produtos em gôndolas, prateleiras e expositores para maximizar vendas.', price: 800.00, active: true },
    { title: 'MANUAL IDENTIDADE VISUAL', description: 'Criação de manual de identidade visual, documento que define regras de uso da marca e garante consistência em todas as aplicações.', price: 3500.00, active: true },
    { title: 'CAMPANHA PROMOCIONAL', description: 'Criação de conceito de campanha promocional, incluindo ideias, linguagem e planejamento das ações para promover marca, produto ou serviço.', price: 2500.00, active: true },
    { title: 'KEY VISUAL (CRIAÇÃO)', description: 'Criação de key visual da campanha, peça guia que define a cara visual das demais peças e garante coerência em todos os pontos de contato.', price: 2000.00, active: true },
    { title: 'MOCKUPS (SEM CUSTOS DE TERCEIROS)', description: 'Criação de mockup para apresentação de projetos, simulando o produto ou peça no mundo real para facilitar aprovação e tomada de decisão.', price: 150.00, active: true },
    { title: 'BALCÃO PARA DEGUSTAÇÃO', description: 'Criação de arte para balcão de degustação, móvel pensado para expor produtos alimentícios e gerar experimentação no ponto de venda.', price: 900.00, active: true },
    { title: 'DISPLAY DE CHÃO', description: 'Criação de display de chão, estrutura personalizada que se destaca no PDV e leva o consumidor até a sua marca.', price: 1800.00, active: true },
    { title: 'DISPLAY DE BALCÃO', description: 'Criação de display de balcão, peça personalizada para exposição próxima ao caixa ou atendimento, ideal para produtos de impulso.', price: 1500.00, active: true },
    { title: 'DISPLAY PONTA DE GÔNDOLA', description: 'Criação de display de ponta de gôndola, área nobre do varejo utilizada para destacar linhas estratégicas e aumentar a conversão.', price: 1300.00, active: true },
    { title: 'MANUAL DE MERCHANDISING (POR PÁGINA)', description: 'Criação de páginas de manual de merchandising, com diretrizes para melhor exposição dos produtos e aumento de vendas no PDV.', price: 290.00, active: true },
    { title: 'CATÁLOGO-REEDIÇÃO (POR PÁGINA)', description: 'Adaptação e reedição de páginas de catálogo já existente, atualizando informações, layout e identidade sem partir do zero.', price: 150.00, active: true },
    { title: 'CUPOM', description: 'Criação de cupom para urnas de campanhas e promoções, pensado para incentivar participação e gerar base de dados de clientes.', price: 150.00, active: true },
    { title: 'FINALIZAÇÃO DE ARQUIVOS', description: 'Finalização de arquivos para impressão, garantindo que fontes, imagens e configurações estejam corretas para produção sem surpresas.', price: 190.00, active: true },
    { title: 'CONCEITO GRÁFICO PARA VARIANTE', description: 'Criação de conceito gráfico para variantes de embalagem, mantendo coerência com a linha principal e ajudando a comunicar diferenças entre produtos, com até 3 alterações.', price: 1800.00, active: true },
    { title: 'LOGOTIPO PARA EMPRESA', description: 'Criação de logotipo para empresa, unindo símbolo e tipografia para representar o nome e o conceito da marca de forma memorável.', price: 1500.00, active: true },
    { title: 'PAPELARIA', description: 'Criação de kit de papelaria com 3 peças, como cartão de visita, crachá e envelope, garantindo uma primeira impressão profissional e alinhada à marca.', price: 700.00, active: true },
    { title: 'CAIXA DE EMBARQUE', description: 'Criação de arte para caixa de embarque, transformando a embalagem de transporte em mídia para reforçar a experiência de marca.', price: 350.00, active: true },
    { title: 'BRINDE PROMOCIONAL', description: 'Criação de conceito e arte para brinde promocional, pensado para gerar valor, lembrança e vínculo emocional entre marca e cliente.', price: 250.00, active: true },
    { title: 'MOLESKINE', description: 'Criação de arte para moleskine personalizado, item de alto valor percebido para kits, agradecimentos e ações de relacionamento.', price: 550.00, active: true },
    { title: 'TRADUÇÃO PARA INGLÊS', description: 'Tradução de texto para inglês com diagramação atualizada, mantendo clareza, profissionalismo e coerência com o material original.', price: 150.00, active: true },
    { title: 'TRADUÇÃO PARA O ESPANHOL', description: 'Tradução de texto para espanhol com diagramação ajustada, pronta para uso em materiais impressos ou digitais.', price: 190.00, active: true },
    { title: 'E-MAIL MKT SIMPLES', description: 'Criação de e-mail marketing simples, voltado para gerar relacionamento, tráfego e oportunidades de venda, sem envio incluso.', price: 350.00, active: true },
    { title: 'ILUSTRAÇÃO VETOR (SIMPLES)', description: 'Criação de ilustração vetorial simples, pronta para uso em diversos formatos com alta qualidade de reprodução.', price: 190.00, active: true },
    { title: 'E-MAIL MKT ELABORADO (HTML)', description: 'Criação de e-mail marketing em HTML, com layout mais elaborado e foco em conversão e engajamento, sem envio incluso.', price: 600.00, active: true },
    { title: 'E-MAIL ANIMADO (RICH, FLASH, ETC)', description: 'Criação de e-mail marketing animado, explorando movimento e interatividade para aumentar atenção e cliques, sem envio incluso.', price: 800.00, active: true },
    { title: 'HOTSITE', description: 'Criação de hotsite para campanhas, lançamentos e promoções, página temporária com foco em conversão e destaque da ação.', price: 1800.00, active: true },
    { title: 'ILUSTRAÇÃO 3D', description: 'Criação de ilustração publicitária em 3D, dando volume, realismo e impacto às peças de comunicação.', price: 1990.00, active: true },
    { title: 'E-COMMERCE', description: 'Criação de e-commerce na plataforma Tray com setup completo, incluindo cadastro inicial de produtos, categorias, páginas institucionais, integração com redes sociais, meios de pagamento, frete, analytics, pixel e suporte por 3 meses.', price: 9000.00, active: true },
    { title: 'CATÁLOGO NO INSTAGRAM/FACEBOOK (CONEXÃO TRAY)', description: 'Configuração de catálogo no Instagram e Facebook integrado à Tray, permitindo marcações de produtos e criação de vitrine social, sujeito à aprovação das plataformas.', price: 750.00, active: true },
    { title: 'TREINAMENTO ONLINE - PLATAFORMA TRAY', description: 'Treinamento online de 1 a 2 horas para operar a plataforma Tray, com foco em cadastro de produtos, pedidos, clientes e configurações básicas, para até 2 pessoas.', price: 700.00, active: true },
    { title: 'LAYOUT CUSTOMIZADO PARA E-COMMERCE', description: 'Criação de layout customizado para e-commerce, pensado exclusivamente para a marca, incluindo estrutura de páginas principais, instalação e adaptação para mobile.', price: 3900.00, active: true },
    { title: 'SETUP ERP - SEM INTEGRAÇÃO COM MARKETPLACE', description: 'Configuração de ERP para emissão de NFe, controle de estoque, clientes, fornecedores, finanças e etiquetas dos Correios, com suporte por 3 meses.', price: 2500.00, active: true },
    { title: 'MARKETING MENSAL PARA E-COMMERCE', description: 'Assessoria mensal de marketing para e-commerce com foco em SEO, Google Ads, Facebook e Instagram Ads, definição de KPIs, relatórios, reuniões mensais e criação de até 10 artes para anúncios, mídia paga não inclusa.', price: 1700.00, active: true },
    { title: 'FILTRO EM REALIDADE AUMENTADA', description: 'Criação e publicação de filtro em 3D para redes sociais, com acompanhamento de todo o processo, ajustes até aprovação da plataforma e otimização para resultados.', price: 2500.00, active: true },
    { title: 'BLOG', description: 'Criação de blog em WordPress, estruturado para apoiar estratégias de conteúdo e melhorar o ranqueamento nos mecanismos de busca.', price: 800.00, active: true },
    { title: 'CONTEÚDO PARA BLOG', description: 'Criação de conteúdo para 1 postagem de blog, focado em autoridade, SEO e educação do público para apoiar vendas.', price: 280.00, active: true },
    { title: 'PLANEJAMENTO ESTRATÉGICO', description: 'Criação de planejamento estratégico de marca, definindo objetivos, direções e prioridades para crescimento e diferenciação no mercado.', price: 2900.00, active: true },
    { title: 'IDENTIDADE VISUAL', description: 'Criação de nova identidade visual para a marca, com cores, tipografias e elementos que traduzem a essência e a missão da empresa.', price: 2900.00, active: true },
    { title: 'APRESENTAÇÃO INSTITUCIONAL (POWERPOINT)', description: 'Criação de páginas de apresentação institucional em PowerPoint, para apresentar a empresa de forma clara, profissional e envolvente, valor por página.', price: 190.00, active: true },
    { title: 'MODELAGEM - DESENHO PARA MOLDE EM 3D', description: 'Criação de sugestão estrutural de molde em 3D para frascos, potes, tampas ou personagens, aproximando o projeto do produto final.', price: 2900.00, active: true },
    { title: 'FOTO INDIVIDUAL - STILL', description: 'Produção de foto de produto com fundo branco, focada em clareza, nitidez e destaque dos atributos do item.', price: 180.00, active: true },
    { title: 'FOTO INDIVIDUAL - STILL COM FUNDO', description: 'Produção de foto de produto com fundo decorado, criando ambientação e narrativa visual para valorizar a marca e o item.', price: 300.00, active: true },
    { title: 'FOTO PACKSHOT', description: 'Criação de composição fotográfica de produto em packshot, com foco total na embalagem, marca e percepção de qualidade.', price: 550.00, active: true },
    { title: 'RELATÓRIO WEB ANALYTICS', description: 'Criação e envio de relatório de análise web, interpretando dados de acesso ao site para apoiar decisões e otimizar resultados digitais.', price: 250.00, active: true },
    { title: 'RELATÓRIO REDES SOCIAIS', description: 'Criação de relatório de desempenho em redes sociais, apresentando principais resultados, métricas e aprendizados em período definido.', price: 330.00, active: true },
    { title: 'PERFIL PARA AS REDES SOCIAIS', description: 'Criação de perfil e identidade básica para redes sociais, alinhando imagem, descrição e posicionamento da marca nos canais escolhidos.', price: 290.00, active: true },
    { title: 'PLANO EDITORIAL', description: 'Criação de plano editorial para 6 meses, definindo temas, formatos e linhas de conteúdo para blog e redes sociais.', price: 550.00, active: true },
    { title: 'POST NO BLOG', description: 'Criação e publicação de post no blog, com foco em SEO, relevância e utilidade para o público.', price: 250.00, active: true },
    { title: 'POST NAS REDES SOCIAIS', description: 'Criação de post para redes sociais, pensado para engajar, comunicar ofertas ou fortalecer a marca em Instagram, Facebook e LinkedIn.', price: 150.00, active: true },
    { title: 'VÍDEO INSTITUCIONAL', description: 'Criação, captação e edição de vídeo institucional de cerca de 1 minuto, com storytelling, roteirização e motion design para apresentar a marca de forma clara e inspiradora.', price: 9000.00, active: true },
    { title: 'VÍDEO CURTO', description: 'Criação e produção de vídeo curto de até 15 segundos para redes sociais, com linguagem dinâmica e foco em impacto rápido e memorável.', price: 500.00, active: true },
    { title: 'ATENDIMENTO REDES SOCIAIS', description: 'Atendimento e resposta aos clientes nas redes sociais em horário comercial, com abordagem humanizada, rápida e orientada à reputação da marca.', price: 500.00, active: true },
    { title: 'PLANEJAMENTO ESTRATÉGICO REDES SOCIAIS E INFLUENCERS', description: 'Criação de planejamento estratégico para atuação com influencers, incluindo seleção de perfis, sugestão de press-kit e acompanhamento de resultados nas redes.', price: 3400.00, active: true },
    { title: 'DIAGNÓSTICO PARA MARKETING DIGITAL', description: 'Diagnóstico estratégico de marketing digital com análise de mercado, concorrência, canais, mídia e definição de objetivos, KPIs e metas.', price: 1500.00, active: true },
    { title: 'FERRAMENTA PARA AUTOMAÇÃO DO ATENDIMENTO', description: 'Implantação e configuração de ferramentas de automação de atendimento, com análise de experiência, pesquisa com clientes, automação de respostas e relatórios.', price: 790.00, active: true },
    { title: 'ASSESSORIA EM CAMPANHAS DE ADS', description: 'Acompanhamento estratégico de campanhas em SEO, Google Ads, TikTok, Pinterest, Facebook e Instagram Ads, com definição de metas, relatórios e reuniões mensais, mídia paga não inclusa.', price: 1950.00, active: true },
    { title: 'CRIAÇÃO DE LANDING PAGE', description: 'Criação de landing page focada em conversão, com identidade visual, SEO básico, versão responsiva e integração com Analytics, hospedagem e domínio não inclusos.', price: 2800.00, active: true },
    { title: 'FASHION FILM', description: 'Criação de fashion film, vídeo de moda com conceito, trilha, clima e narrativa alinhados à coleção e à identidade da marca, sem custos de modelos e produção externa inclusos.', price: 3900.00, active: true },
    { title: 'ESTUDO DE MERCADO E CONCORRENTES', description: 'Estudo de mercado e concorrência para entender cenário, comportamento de consumo e posicionamento dos concorrentes, apoiando decisões de marketing e vendas.', price: 1900.00, active: true },
    { title: 'CRIAÇÃO DE MASCOTE EM 2D', description: 'Criação de mascote em 2D alinhado à personalidade da marca, pensado para fortalecer identificação e proximidade com o público.', price: 750.00, active: true },
    { title: 'CRIAÇÃO DE MASCOTE EM 3D', description: 'Criação de mascote em 3D com volume e presença, ideal para campanhas, embalagens, vídeos e materiais digitais.', price: 1500.00, active: true },
    { title: 'CARD WHATSAPP', description: 'Criação de cards para WhatsApp, peças visuais rápidas e diretas para reforçar mensagens, convites, campanhas e conteúdos em conversas.', price: 150.00, active: true },
    { title: 'FIGURINHA WHATSAPP', description: 'Criação de figurinhas personalizadas para WhatsApp, aproximando a marca do público de forma leve, divertida e atual.', price: 150.00, active: true },
    { title: 'WALLPAPER', description: 'Criação de wallpaper personalizado para celulares ou computadores, reforçando o visual corporativo e a presença da marca no dia a dia.', price: 150.00, active: true },
    { title: 'CONTEÚDO EM TEXTO PUBLICITÁRIO PARA SITE', description: 'Redação publicitária para site, com foco em venda, autoridade, SEO e clareza na comunicação com o público.', price: 290.00, active: true },
    { title: 'MANUTENÇÃO DE SITE (MENSAL)', description: 'Manutenção mensal de site, com revisão de conteúdo, velocidade, responsividade, backups e verificação de temas e plugins.', price: 350.00, active: true },
    { title: 'DESIGNER ALOCADO + SUPORTE AGÊNCIA DEFOCO', description: 'Disponibilização de designer gráfico dedicado com estrutura de agência, equipamentos, softwares e suporte da equipe Defoco para atuar internamente na empresa contratante.', price: 6690.00, active: true },
    { title: 'BROADSIDE VIRTUAL ELABORADO', description: 'Adaptação de broadside impresso para versão virtual de lançamento de produto, direcionado a público interno, distribuidores e varejistas.', price: 950.00, active: true },
    { title: 'CAPTAÇÃO DE FOTOS', description: 'Acompanhamento e suporte profissional em captação de fotos e vídeos com influenciadores, garantindo qualidade técnica e alinhamento da marca com o conteúdo gerado. Inclui produção executiva, equipe técnica, 1 diária de filmagem de 6 horas, criação de roteiro técnico e acompanhamento. Serviços extras como trilha original, locução, maquiagem, figurino, estúdio e outros itens de produção não estão inclusos. O cliente fornece os produtos usados na captação.', price: 12500.00, active: true },
    { title: 'DESENVOLVIMENTO DE E-COMMERCE (SHOPIFY)', description: 'Desenvolvimento completo da loja Shopify com foco em alta performance. Inclui design customizado, páginas de produto, carrinho e checkout configuradas, SEO técnico otimizado, integração com meios de pagamento e logística, até 5 landing pages internas e checklist técnico com suporte pós-lançamento por 15 dias. Uma estrutura profissional pensada para transformar visitantes em compradores. Prazo estimado: 30 dias úteis.', price: 13000.00, active: true },
    { title: 'ACELERAÇÃO DE VENDAS (META, GOOGLE E TIKTOK)', description: 'Gestão completa de tráfego pago para escalar vendas com previsibilidade. Inclui campanhas em Meta Ads, Google Ads e TikTok Ads, criação de copys e criativos estáticos, estratégias de funil e remarketing, além de reuniões de acompanhamento e relatórios de performance. Perfeito para marcas que querem crescer de forma consistente. Contrato: 3 meses, sem multa, renovável.', price: 9000.00, active: true },
  ];

  console.log(`📦 Creating ${services.length} services...`);

  for (const service of services) {
    await prisma.service.create({
      data: service,
    });
  }

  console.log('✅ All 149 services created successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
