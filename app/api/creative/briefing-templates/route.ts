export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// Templates padrão de briefing baseados nos documentos fornecidos
// Cada template inclui campos cruciais para o desenvolvimento do trabalho pelo designer
const DEFAULT_TEMPLATES = {
  landing_page: {
    name: 'Landing Page',
    sections: [
      {
        title: '1. Informações Gerais',
        questions: [
          { id: 'nome_projeto', label: 'Nome do projeto/campanha', type: 'text', required: true },
          { id: 'objetivo', label: 'Qual o objetivo principal da Landing Page?', type: 'textarea', required: true, placeholder: 'Ex: Captar leads, vender produto, apresentar serviço, evento...' },
          { id: 'url_destino', label: 'URL de destino ou domínio', type: 'text' },
          { id: 'prazo_entrega', label: 'Prazo de entrega desejado', type: 'date', required: true },
        ]
      },
      {
        title: '2. Público-Alvo e Conversão',
        questions: [
          { id: 'publico', label: 'Quem é o público-alvo?', type: 'textarea', required: true, placeholder: 'Idade, gênero, interesses, profissão, poder aquisitivo...' },
          { id: 'dor_cliente', label: 'Qual a principal dor/problema do público?', type: 'textarea', required: true },
          { id: 'solucao', label: 'Como seu produto/serviço resolve essa dor?', type: 'textarea', required: true },
          { id: 'cta_principal', label: 'Ação principal (CTA) que o visitante deve realizar', type: 'text', required: true, placeholder: 'Ex: Comprar agora, Solicitar orçamento, Baixar e-book...' },
          { id: 'ofertas', label: 'Ofertas, promoções ou gatilhos de urgência?', type: 'textarea', placeholder: 'Desconto, bônus, tempo limitado...' },
        ]
      },
      {
        title: '3. Conteúdo e Estrutura',
        questions: [
          { id: 'headline', label: 'Headline/título principal (se já definido)', type: 'text' },
          { id: 'texto_pronto', label: 'Já possui textos prontos? Se sim, onde estão?', type: 'textarea' },
          { id: 'secoes_obrigatorias', label: 'Seções obrigatórias na página', type: 'textarea', placeholder: 'Ex: Hero, Benefícios, Depoimentos, FAQ, Formulário...' },
          { id: 'depoimentos', label: 'Possui depoimentos/cases para incluir?', type: 'textarea' },
          { id: 'faq', label: 'Perguntas frequentes (FAQ) a incluir', type: 'textarea' },
        ]
      },
      {
        title: '4. Identidade Visual',
        questions: [
          { id: 'manual_marca', label: 'Possui manual de marca/identidade visual?', type: 'text', placeholder: 'Se sim, como acessar?' },
          { id: 'cores', label: 'Cores principais da marca', type: 'text', required: true },
          { id: 'fontes', label: 'Tipografia/fontes utilizadas', type: 'text' },
          { id: 'logo_arquivo', label: 'Logo em alta resolução está disponível? Onde?', type: 'text', required: true },
          { id: 'estilo_visual', label: 'Estilo visual desejado', type: 'textarea', placeholder: 'Ex: Moderno, minimalista, corporativo, jovem, luxuoso...' },
        ]
      },
      {
        title: '5. Materiais e Arquivos',
        questions: [
          { id: 'imagens_produto', label: 'Imagens do produto/serviço disponíveis?', type: 'textarea', placeholder: 'Descreva quais imagens tem e onde acessar' },
          { id: 'fotos_equipe', label: 'Fotos da equipe/empresa (se aplicável)', type: 'text' },
          { id: 'videos', label: 'Possui vídeos para incorporar?', type: 'text' },
          { id: 'icones', label: 'Ícones específicos necessários?', type: 'textarea' },
          { id: 'banco_imagens', label: 'Podemos usar banco de imagens? Qual?', type: 'text', placeholder: 'Ex: Sim, Shutterstock / Apenas imagens próprias' },
        ]
      },
      {
        title: '6. Especificações Técnicas',
        questions: [
          { id: 'plataforma', label: 'Plataforma de hospedagem/construção', type: 'text', placeholder: 'Ex: WordPress, Webflow, código próprio, RD Station...' },
          { id: 'integracao_form', label: 'Integração do formulário com qual ferramenta?', type: 'text', placeholder: 'Ex: RD Station, HubSpot, e-mail, WhatsApp...' },
          { id: 'pixel_tracking', label: 'Pixels de rastreamento a implementar', type: 'text', placeholder: 'Ex: Facebook Pixel, Google Analytics, Google Ads...' },
          { id: 'responsivo', label: 'Precisa ser responsivo (mobile)?', type: 'text', placeholder: 'Sim/Não' },
          { id: 'velocidade', label: 'Requisitos de velocidade/performance?', type: 'textarea' },
        ]
      },
      {
        title: '7. Referências',
        questions: [
          { id: 'ref_positivas', label: 'Landing pages de referência que você gosta (URLs)', type: 'textarea', required: true },
          { id: 'ref_negativas', label: 'O que NÃO fazer? Exemplos negativos', type: 'textarea' },
          { id: 'concorrentes', label: 'Landing pages de concorrentes', type: 'textarea' },
        ]
      },
      {
        title: '8. Aprovação e Entrega',
        questions: [
          { id: 'quem_aprova', label: 'Quem vai aprovar o layout?', type: 'text', required: true },
          { id: 'formato_entrega', label: 'Formato de entrega desejado', type: 'text', placeholder: 'Ex: Figma, PSD, HTML, implementado...' },
          { id: 'rodadas_revisao', label: 'Quantas rodadas de revisão inclusas?', type: 'text' },
          { id: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
        ]
      },
    ]
  },
  paginas_site: {
    name: 'Páginas de Site',
    sections: [
      {
        title: '1. Escopo do Projeto',
        questions: [
          { id: 'nome_empresa', label: 'Nome da empresa/projeto', type: 'text', required: true },
          { id: 'url_atual', label: 'URL do site atual (se existir)', type: 'text' },
          { id: 'tipo_projeto', label: 'Tipo do projeto', type: 'text', required: true, placeholder: 'Site novo, redesign, páginas adicionais...' },
          { id: 'paginas_lista', label: 'Liste todas as páginas necessárias', type: 'textarea', required: true, placeholder: 'Ex: Home, Sobre, Serviços, Contato, Blog, Produtos...' },
          { id: 'prazo_entrega', label: 'Prazo de entrega', type: 'date', required: true },
        ]
      },
      {
        title: '2. Sobre a Empresa',
        questions: [
          { id: 'descricao_empresa', label: 'Descrição da empresa e o que faz', type: 'textarea', required: true },
          { id: 'diferenciais', label: 'Principais diferenciais competitivos', type: 'textarea', required: true },
          { id: 'produtos_servicos', label: 'Produtos/serviços oferecidos', type: 'textarea', required: true },
          { id: 'publico_alvo', label: 'Público-alvo do site', type: 'textarea', required: true },
          { id: 'tom_comunicacao', label: 'Tom de comunicação da marca', type: 'text', placeholder: 'Formal, descontraído, técnico, jovem...' },
        ]
      },
      {
        title: '3. Estrutura por Página',
        questions: [
          { id: 'home_estrutura', label: 'HOME: O que deve conter?', type: 'textarea', placeholder: 'Banner, serviços, depoimentos, CTA, etc...' },
          { id: 'sobre_estrutura', label: 'SOBRE: Informações a destacar', type: 'textarea' },
          { id: 'servicos_estrutura', label: 'SERVIÇOS: Como organizar os serviços?', type: 'textarea', placeholder: 'Categorias, cards, páginas individuais...' },
          { id: 'contato_estrutura', label: 'CONTATO: Campos do formulário e integrações', type: 'textarea' },
          { id: 'outras_paginas', label: 'Outras páginas: detalhes específicos', type: 'textarea' },
        ]
      },
      {
        title: '4. Identidade Visual',
        questions: [
          { id: 'manual_marca', label: 'Possui manual de marca? Onde está?', type: 'text' },
          { id: 'cores_primarias', label: 'Cores primárias da marca (hex)', type: 'text', required: true },
          { id: 'cores_secundarias', label: 'Cores secundárias/apoio', type: 'text' },
          { id: 'tipografia', label: 'Fontes/tipografia da marca', type: 'text' },
          { id: 'logo_formatos', label: 'Logo disponível em quais formatos?', type: 'text', required: true, placeholder: 'PNG, SVG, AI, versão clara/escura...' },
          { id: 'estilo_desejado', label: 'Estilo visual desejado para o site', type: 'textarea', placeholder: 'Moderno, clean, arrojado, institucional...' },
        ]
      },
      {
        title: '5. Conteúdo e Materiais',
        questions: [
          { id: 'textos_prontos', label: 'Os textos das páginas já estão prontos?', type: 'text', placeholder: 'Sim/Não - Se sim, onde acessar?' },
          { id: 'quem_redige', label: 'Quem vai redigir os textos que faltam?', type: 'text' },
          { id: 'fotos_empresa', label: 'Possui fotos profissionais? Onde estão?', type: 'textarea' },
          { id: 'fotos_equipe', label: 'Fotos da equipe/colaboradores', type: 'text' },
          { id: 'fotos_ambiente', label: 'Fotos do ambiente/escritório/loja', type: 'text' },
          { id: 'banco_imagens', label: 'Pode usar banco de imagens?', type: 'text', placeholder: 'Sim/Não - Qual?' },
          { id: 'videos', label: 'Vídeos institucionais para incorporar?', type: 'text' },
        ]
      },
      {
        title: '6. Funcionalidades',
        questions: [
          { id: 'blog', label: 'O site terá blog? Frequência de posts?', type: 'text' },
          { id: 'ecommerce', label: 'Terá loja virtual/e-commerce?', type: 'text' },
          { id: 'area_cliente', label: 'Área restrita/login de clientes?', type: 'text' },
          { id: 'chat', label: 'Chat online ou WhatsApp integrado?', type: 'text' },
          { id: 'newsletter', label: 'Captura de e-mails/newsletter?', type: 'text' },
          { id: 'outras_funcoes', label: 'Outras funcionalidades necessárias', type: 'textarea' },
        ]
      },
      {
        title: '7. Especificações Técnicas',
        questions: [
          { id: 'plataforma', label: 'Plataforma desejada/existente', type: 'text', required: true, placeholder: 'WordPress, Wix, código próprio, Webflow...' },
          { id: 'hospedagem', label: 'Já possui hospedagem? Qual?', type: 'text' },
          { id: 'dominio', label: 'Domínio já registrado?', type: 'text' },
          { id: 'seo', label: 'Requisitos de SEO', type: 'textarea', placeholder: 'Palavras-chave, meta tags, velocidade...' },
          { id: 'integracao_crm', label: 'Integração com CRM/ferramentas?', type: 'text' },
          { id: 'analytics', label: 'Google Analytics e outras métricas?', type: 'text' },
          { id: 'lgpd', label: 'Conformidade com LGPD necessária?', type: 'text' },
        ]
      },
      {
        title: '8. Referências',
        questions: [
          { id: 'sites_gosta', label: 'Sites que você gosta e por quê (URLs)', type: 'textarea', required: true },
          { id: 'sites_nao_gosta', label: 'Sites que NÃO gosta e por quê', type: 'textarea' },
          { id: 'concorrentes', label: 'Sites dos principais concorrentes', type: 'textarea' },
        ]
      },
      {
        title: '9. Aprovação e Entrega',
        questions: [
          { id: 'quem_aprova', label: 'Quem vai aprovar o layout?', type: 'text', required: true },
          { id: 'formato_entrega', label: 'Formato de entrega', type: 'text', placeholder: 'Figma, PSD, HTML, site publicado...' },
          { id: 'rodadas_revisao', label: 'Rodadas de revisão inclusas', type: 'text' },
          { id: 'suporte_pos', label: 'Precisa de suporte pós-lançamento?', type: 'text' },
          { id: 'observacoes', label: 'Observações e informações adicionais', type: 'textarea' },
        ]
      },
    ]
  },
  branding: {
    name: 'Branding / Posicionamento de Marca',
    sections: [
      {
        title: '1. Informações do Projeto',
        questions: [
          { id: 'nome_marca', label: 'Nome da marca/empresa', type: 'text', required: true },
          { id: 'tipo_projeto', label: 'Tipo do projeto', type: 'text', required: true, placeholder: 'Criação de marca nova, redesign, refresh...' },
          { id: 'prazo_entrega', label: 'Prazo de entrega', type: 'date', required: true },
          { id: 'urgencia', label: 'Nível de urgência (1-5)', type: 'text' },
        ]
      },
      {
        title: '2. Histórico da Marca',
        questions: [
          { id: 'tempo_existencia', label: 'Tempo de existência da marca', type: 'text' },
          { id: 'evolucao', label: 'Principais fases e evoluções', type: 'textarea' },
          { id: 'marcos', label: 'Eventos ou marcos significativos', type: 'textarea' },
          { id: 'logo_atual', label: 'Logo atual disponível? Onde acessar?', type: 'text' },
        ]
      },
      {
        title: '3. Produtos/Serviços',
        questions: [
          { id: 'produtos_atuais', label: 'Quais produtos/serviços oferece?', type: 'textarea', required: true },
          { id: 'mercados', label: 'Em quais mercados está presente?', type: 'text' },
          { id: 'diferenciais', label: 'Principais diferenciais competitivos', type: 'textarea', required: true },
        ]
      },
      {
        title: '4. Público-Alvo',
        questions: [
          { id: 'publico', label: 'Quem é o público-alvo? (idade, gênero, localização, poder aquisitivo)', type: 'textarea', required: true },
          { id: 'valores_publico', label: 'Quais valores e interesses do público?', type: 'textarea' },
          { id: 'persona', label: 'Descreva uma persona típica do cliente ideal', type: 'textarea' },
        ]
      },
      {
        title: '5. Concorrência',
        questions: [
          { id: 'concorrentes', label: 'Quem são os principais concorrentes?', type: 'textarea', required: true },
          { id: 'posicionamento', label: 'Como quer se posicionar vs concorrentes?', type: 'textarea' },
          { id: 'tendencias', label: 'Principais tendências no mercado', type: 'textarea' },
        ]
      },
      {
        title: '6. Identidade Visual Desejada',
        questions: [
          { id: 'cores_desejadas', label: 'Cores desejadas ou que representam a marca', type: 'text' },
          { id: 'cores_evitar', label: 'Cores a EVITAR', type: 'text' },
          { id: 'estilo', label: 'Estilo visual (minimalista, ousado, clássico, moderno...)', type: 'text', required: true },
          { id: 'simbolo', label: 'Prefere logo com símbolo, tipográfico ou combinado?', type: 'text' },
          { id: 'evitar', label: 'O que EVITAR no design?', type: 'textarea' },
        ]
      },
      {
        title: '7. Personalidade da Marca',
        questions: [
          { id: 'adjetivos', label: 'Liste 5 adjetivos que descrevem a marca', type: 'text', required: true },
          { id: 'personalidade', label: 'Como a marca quer ser percebida?', type: 'textarea' },
          { id: 'valores_marca', label: 'Valores corporativos', type: 'textarea' },
          { id: 'tom_voz', label: 'Tom de voz da marca', type: 'text', placeholder: 'Formal, descontraído, técnico, amigável...' },
        ]
      },
      {
        title: '8. Aplicações',
        questions: [
          { id: 'aplicacoes', label: 'Onde a marca será aplicada?', type: 'textarea', required: true, placeholder: 'Cartão de visita, site, redes sociais, fachada, uniformes, veículos...' },
          { id: 'papelaria', label: 'Precisa de papelaria completa?', type: 'text' },
          { id: 'redes_sociais', label: 'Precisa de templates para redes sociais?', type: 'text' },
        ]
      },
      {
        title: '9. Referências',
        questions: [
          { id: 'ref_positivas', label: 'Marcas/logos que você gosta e por quê (URLs)', type: 'textarea', required: true },
          { id: 'ref_negativas', label: 'O que NÃO agrada? Por quê?', type: 'textarea' },
        ]
      },
      {
        title: '10. Aprovação e Entrega',
        questions: [
          { id: 'quem_aprova', label: 'Quem vai aprovar o projeto?', type: 'text', required: true },
          { id: 'formato_entrega', label: 'Formatos de entrega necessários', type: 'text', placeholder: 'AI, EPS, PDF, PNG, JPG...' },
          { id: 'manual_marca', label: 'Precisa de manual de marca?', type: 'text' },
          { id: 'rodadas_revisao', label: 'Rodadas de revisão inclusas', type: 'text' },
          { id: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
        ]
      },
    ]
  },
  embalagem: {
    name: 'Embalagens',
    sections: [
      {
        title: '1. Informações do Projeto',
        questions: [
          { id: 'nome_produto', label: 'Nome do produto', type: 'text', required: true },
          { id: 'quantidade_skus', label: 'Quantos SKUs/variações?', type: 'text', required: true },
          { id: 'prazo_entrega', label: 'Prazo de entrega', type: 'date', required: true },
          { id: 'grafica', label: 'Qual gráfica vai produzir?', type: 'text' },
        ]
      },
      {
        title: '2. Produto',
        questions: [
          { id: 'tipo_produto', label: 'Que produto a embalagem conterá?', type: 'textarea', required: true },
          { id: 'peso_volume', label: 'Peso/volume do produto', type: 'text', required: true },
          { id: 'canais_venda', label: 'Canais de venda (e-commerce, lojas, supermercados)?', type: 'text', required: true },
          { id: 'posicao_gondola', label: 'Posição na gôndola (se aplicável)', type: 'text' },
        ]
      },
      {
        title: '3. Objetivos',
        questions: [
          { id: 'funcao_principal', label: 'Função principal da embalagem', type: 'textarea', required: true },
          { id: 'diferenciais', label: 'Atributos a comunicar (luxo, sustentabilidade, etc)', type: 'textarea', required: true },
          { id: 'percepcao', label: 'Qual percepção deve gerar no consumidor?', type: 'textarea' },
        ]
      },
      {
        title: '4. Público e Concorrência',
        questions: [
          { id: 'consumidor', label: 'Quem é o consumidor-alvo?', type: 'textarea', required: true },
          { id: 'concorrentes', label: 'Embalagens concorrentes (fotos/descrições)', type: 'textarea' },
          { id: 'diferencial_visual', label: 'Como se diferenciar visualmente?', type: 'textarea' },
        ]
      },
      {
        title: '5. Especificações Técnicas',
        questions: [
          { id: 'tipo_embalagem', label: 'Tipo de embalagem (caixa, sacola, pote, etc)', type: 'text', required: true },
          { id: 'dimensoes', label: 'Dimensões exatas (largura x altura x profundidade)', type: 'text', required: true },
          { id: 'material', label: 'Material (papel, papelão, plástico, vidro...)', type: 'text', required: true },
          { id: 'acabamento', label: 'Acabamentos especiais (verniz, hot stamp, relevo...)', type: 'text' },
          { id: 'cores_impressao', label: 'Número de cores de impressão', type: 'text' },
          { id: 'normas', label: 'Normas obrigatórias (ANVISA, INMETRO, etc)', type: 'textarea' },
          { id: 'info_obrigatorias', label: 'Informações obrigatórias por lei', type: 'textarea', placeholder: 'Tabela nutricional, código de barras, SAC...' },
        ]
      },
      {
        title: '6. Identidade Visual',
        questions: [
          { id: 'manual_marca', label: 'Possui manual de marca? Onde acessar?', type: 'text' },
          { id: 'logo_arquivo', label: 'Logo em alta resolução disponível?', type: 'text', required: true },
          { id: 'cores_marca', label: 'Cores da marca (CMYK/Pantone)', type: 'text', required: true },
          { id: 'elementos_visuais', label: 'Elementos visuais obrigatórios', type: 'textarea' },
        ]
      },
      {
        title: '7. Conteúdo',
        questions: [
          { id: 'textos_prontos', label: 'Textos já estão aprovados? Onde acessar?', type: 'text', required: true },
          { id: 'fotos_produto', label: 'Possui fotos do produto? Onde?', type: 'text' },
          { id: 'codigo_barras', label: 'Código de barras disponível?', type: 'text' },
        ]
      },
      {
        title: '8. Referências',
        questions: [
          { id: 'ref_positivas', label: 'Embalagens que inspiram o design (fotos/links)', type: 'textarea', required: true },
          { id: 'ref_negativas', label: 'O que evitar? Por quê?', type: 'textarea' },
        ]
      },
      {
        title: '9. Aprovação e Entrega',
        questions: [
          { id: 'quem_aprova', label: 'Quem vai aprovar?', type: 'text', required: true },
          { id: 'formato_entrega', label: 'Formato de entrega para gráfica', type: 'text', placeholder: 'PDF aberto, AI, com faca...' },
          { id: 'faca_existente', label: 'Já possui faca de corte? Arquivo?', type: 'text' },
          { id: 'prova', label: 'Precisa de prova física antes de aprovar?', type: 'text' },
          { id: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
        ]
      },
    ]
  },
  social_media: {
    name: 'Social Media',
    sections: [
      {
        title: '1. Informações do Projeto',
        questions: [
          { id: 'cliente', label: 'Nome do cliente/marca', type: 'text', required: true },
          { id: 'periodo', label: 'Período/mês de referência', type: 'text', required: true },
          { id: 'quantidade_posts', label: 'Quantidade de posts no período', type: 'text', required: true },
          { id: 'prazo_entrega', label: 'Prazo de entrega do pacote', type: 'date', required: true },
        ]
      },
      {
        title: '2. Plataformas e Formatos',
        questions: [
          { id: 'plataformas', label: 'Quais plataformas? (Instagram, Facebook, LinkedIn, TikTok...)', type: 'text', required: true },
          { id: 'formatos_feed', label: 'Formatos para Feed (1080x1080, 1080x1350, etc)', type: 'text', required: true },
          { id: 'formatos_stories', label: 'Formatos para Stories (1080x1920)', type: 'text' },
          { id: 'formatos_reels', label: 'Formatos para Reels/TikTok', type: 'text' },
          { id: 'carroseis', label: 'Haverá carrosséis? Quantos slides?', type: 'text' },
        ]
      },
      {
        title: '3. Objetivo e Público',
        questions: [
          { id: 'objetivo', label: 'Objetivo principal do conteúdo', type: 'textarea', required: true, placeholder: 'Engajamento, vendas, awareness, educação...' },
          { id: 'publico', label: 'Quem é o público-alvo?', type: 'textarea', required: true },
          { id: 'tom', label: 'Tom de voz (formal, descontraído, técnico, jovem...)', type: 'text', required: true },
        ]
      },
      {
        title: '4. Conteúdo',
        questions: [
          { id: 'temas', label: 'Temas/pautas para os posts', type: 'textarea', required: true },
          { id: 'textos_prontos', label: 'As legendas já estão prontas?', type: 'text', placeholder: 'Sim/Não - Se sim, onde?' },
          { id: 'datas_comemorativas', label: 'Datas comemorativas a contemplar', type: 'textarea' },
          { id: 'cta', label: 'Call-to-action padrão', type: 'text' },
          { id: 'hashtags', label: 'Hashtags a utilizar', type: 'textarea' },
        ]
      },
      {
        title: '5. Identidade Visual',
        questions: [
          { id: 'manual_marca', label: 'Possui manual de marca/templates?', type: 'text' },
          { id: 'cores', label: 'Cores da marca (hex)', type: 'text', required: true },
          { id: 'fontes', label: 'Fontes permitidas', type: 'text' },
          { id: 'logo', label: 'Logo em alta resolução disponível?', type: 'text', required: true },
          { id: 'estilo', label: 'Estilo visual desejado', type: 'textarea', required: true },
        ]
      },
      {
        title: '6. Materiais Disponíveis',
        questions: [
          { id: 'fotos_produto', label: 'Fotos de produto disponíveis? Onde?', type: 'text' },
          { id: 'fotos_ambiente', label: 'Fotos do ambiente/lifestyle', type: 'text' },
          { id: 'fotos_equipe', label: 'Fotos da equipe', type: 'text' },
          { id: 'banco_imagens', label: 'Pode usar banco de imagens?', type: 'text', placeholder: 'Sim/Não - Qual?' },
          { id: 'videos_brutos', label: 'Possui vídeos brutos para edição?', type: 'text' },
        ]
      },
      {
        title: '7. Referências',
        questions: [
          { id: 'perfis_referencia', label: 'Perfis de referência que você gosta (@perfil)', type: 'textarea', required: true },
          { id: 'posts_referencia', label: 'Posts específicos de referência (links)', type: 'textarea' },
          { id: 'evitar', label: 'O que evitar?', type: 'textarea' },
        ]
      },
      {
        title: '8. Aprovação e Entrega',
        questions: [
          { id: 'quem_aprova', label: 'Quem vai aprovar os posts?', type: 'text', required: true },
          { id: 'formato_entrega', label: 'Formato de entrega', type: 'text', placeholder: 'JPG, PNG, Figma, Canva...' },
          { id: 'agendamento', label: 'Precisa agendar as publicações?', type: 'text' },
          { id: 'rodadas_revisao', label: 'Rodadas de revisão inclusas', type: 'text' },
          { id: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
        ]
      },
    ]
  },
  campanha: {
    name: 'Campanha Publicitária',
    sections: [
      {
        title: '1. Informações do Projeto',
        questions: [
          { id: 'nome_campanha', label: 'Nome/tema da campanha', type: 'text', required: true },
          { id: 'cliente', label: 'Cliente', type: 'text', required: true },
          { id: 'periodo', label: 'Período da campanha (de/até)', type: 'text', required: true },
          { id: 'prazo_materiais', label: 'Prazo para entrega dos materiais', type: 'date', required: true },
          { id: 'budget', label: 'Budget disponível (se relevante)', type: 'text' },
        ]
      },
      {
        title: '2. Briefing Geral',
        questions: [
          { id: 'produto_servico', label: 'Produto/serviço a ser divulgado', type: 'textarea', required: true },
          { id: 'objetivo', label: 'Objetivo da campanha', type: 'textarea', required: true, placeholder: 'Lançamento, vendas, awareness, reposicionamento...' },
          { id: 'meta', label: 'Meta específica (se houver)', type: 'text', placeholder: 'Ex: Aumentar vendas em 20%, X leads...' },
        ]
      },
      {
        title: '3. Público e Mercado',
        questions: [
          { id: 'publico', label: 'Público-alvo detalhado', type: 'textarea', required: true },
          { id: 'regiao', label: 'Região geográfica', type: 'text' },
          { id: 'concorrencia', label: 'Concorrência e diferenciais', type: 'textarea' },
          { id: 'contexto', label: 'Contexto de mercado relevante', type: 'textarea' },
        ]
      },
      {
        title: '4. Mensagem e Conceito',
        questions: [
          { id: 'mensagem_principal', label: 'Mensagem principal a comunicar', type: 'textarea', required: true },
          { id: 'beneficios', label: 'Benefícios a destacar', type: 'textarea', required: true },
          { id: 'prova', label: 'Provas/argumentos de suporte', type: 'textarea' },
          { id: 'tom', label: 'Tom da comunicação', type: 'text', required: true },
          { id: 'slogan', label: 'Slogan/tagline (se já definido)', type: 'text' },
        ]
      },
      {
        title: '5. Mídias e Formatos',
        questions: [
          { id: 'midias_offline', label: 'Mídias offline (outdoor, revista, TV, rádio...)', type: 'textarea' },
          { id: 'midias_online', label: 'Mídias online (Google, Meta, programática...)', type: 'textarea' },
          { id: 'formatos_lista', label: 'Liste TODOS os formatos necessários com medidas', type: 'textarea', required: true, placeholder: 'Ex: Banner 300x250, outdoor 9x3m, post 1080x1080...' },
          { id: 'pdv', label: 'Materiais de PDV necessários?', type: 'textarea' },
        ]
      },
      {
        title: '6. Identidade e Materiais',
        questions: [
          { id: 'manual_marca', label: 'Manual de marca disponível?', type: 'text' },
          { id: 'assets', label: 'Assets disponíveis (fotos, vídeos, logo)', type: 'textarea', required: true },
          { id: 'producao', label: 'Haverá produção de fotos/vídeos?', type: 'text' },
        ]
      },
      {
        title: '7. Referências',
        questions: [
          { id: 'campanhas_ref', label: 'Campanhas de referência (links/exemplos)', type: 'textarea', required: true },
          { id: 'evitar', label: 'O que evitar?', type: 'textarea' },
        ]
      },
      {
        title: '8. Aprovação e Entrega',
        questions: [
          { id: 'quem_aprova', label: 'Quem vai aprovar a campanha?', type: 'text', required: true },
          { id: 'etapas_aprovacao', label: 'Etapas de aprovação (conceito, layout, arte final)', type: 'textarea' },
          { id: 'formato_entrega', label: 'Formatos de entrega por peça', type: 'textarea' },
          { id: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
        ]
      },
    ]
  },
  video: {
    name: 'Vídeo / Animação',
    sections: [
      {
        title: '1. Informações do Projeto',
        questions: [
          { id: 'nome_projeto', label: 'Nome do projeto', type: 'text', required: true },
          { id: 'cliente', label: 'Cliente', type: 'text', required: true },
          { id: 'prazo_entrega', label: 'Prazo de entrega', type: 'date', required: true },
          { id: 'budget', label: 'Budget disponível', type: 'text' },
        ]
      },
      {
        title: '2. Objetivo e Veiculação',
        questions: [
          { id: 'objetivo', label: 'Objetivo do vídeo', type: 'textarea', required: true },
          { id: 'onde_veicular', label: 'Onde será veiculado?', type: 'text', required: true, placeholder: 'YouTube, Instagram, TV, evento, site...' },
          { id: 'duracao', label: 'Duração desejada', type: 'text', required: true },
          { id: 'formato_video', label: 'Formato (16:9, 9:16, 1:1, etc)', type: 'text', required: true },
        ]
      },
      {
        title: '3. Tipo e Estilo',
        questions: [
          { id: 'tipo', label: 'Tipo de vídeo', type: 'text', required: true, placeholder: 'Animação 2D, 3D, motion graphics, live action, misto...' },
          { id: 'estilo', label: 'Estilo visual desejado', type: 'textarea', required: true },
          { id: 'ritmo', label: 'Ritmo/dinâmica do vídeo', type: 'text', placeholder: 'Rápido, calmo, crescente...' },
        ]
      },
      {
        title: '4. Roteiro e Conteúdo',
        questions: [
          { id: 'roteiro', label: 'Já existe roteiro? Se sim, onde?', type: 'textarea' },
          { id: 'quem_escreve', label: 'Quem vai escrever o roteiro?', type: 'text' },
          { id: 'mensagem', label: 'Mensagem principal', type: 'textarea', required: true },
          { id: 'cta', label: 'Call-to-action', type: 'text' },
          { id: 'locucao', label: 'Terá locução? Masculina/feminina/neutra?', type: 'text' },
          { id: 'texto_tela', label: 'Textos que aparecem na tela', type: 'textarea' },
        ]
      },
      {
        title: '5. Áudio',
        questions: [
          { id: 'trilha', label: 'Preferência de trilha sonora', type: 'text' },
          { id: 'efeitos', label: 'Efeitos sonoros necessários?', type: 'text' },
          { id: 'audio_existente', label: 'Possui áudio/locução gravada?', type: 'text' },
        ]
      },
      {
        title: '6. Materiais Disponíveis',
        questions: [
          { id: 'logo', label: 'Logo em alta resolução e/ou vetorial?', type: 'text', required: true },
          { id: 'imagens', label: 'Imagens/fotos disponíveis', type: 'textarea' },
          { id: 'videos_brutos', label: 'Vídeos brutos para edição', type: 'textarea' },
          { id: 'graficos', label: 'Gráficos/dados a incluir', type: 'textarea' },
          { id: 'cores_fontes', label: 'Cores e fontes da marca', type: 'text', required: true },
        ]
      },
      {
        title: '7. Referências',
        questions: [
          { id: 'referencias', label: 'Vídeos de referência (URLs)', type: 'textarea', required: true },
          { id: 'evitar', label: 'O que evitar?', type: 'textarea' },
        ]
      },
      {
        title: '8. Especificações Técnicas',
        questions: [
          { id: 'resolucao', label: 'Resolução (Full HD, 4K...)', type: 'text', required: true },
          { id: 'fps', label: 'Frame rate (24, 30, 60fps)', type: 'text' },
          { id: 'codec', label: 'Codec/formato de entrega', type: 'text', placeholder: 'MP4 H.264, ProRes, etc...' },
          { id: 'legendas', label: 'Precisa de legendas? Em quais idiomas?', type: 'text' },
        ]
      },
      {
        title: '9. Aprovação e Entrega',
        questions: [
          { id: 'quem_aprova', label: 'Quem vai aprovar?', type: 'text', required: true },
          { id: 'etapas', label: 'Etapas de aprovação (roteiro, storyboard, animatic, final)', type: 'textarea' },
          { id: 'rodadas_revisao', label: 'Rodadas de revisão inclusas', type: 'text' },
          { id: 'versoes', label: 'Versões diferentes necessárias (cortes, formatos)', type: 'textarea' },
          { id: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
        ]
      },
    ]
  },
  outros: {
    name: 'Outros Serviços',
    sections: [
      {
        title: '1. Informações do Projeto',
        questions: [
          { id: 'nome_projeto', label: 'Nome do projeto', type: 'text', required: true },
          { id: 'cliente', label: 'Cliente', type: 'text', required: true },
          { id: 'prazo_entrega', label: 'Prazo de entrega', type: 'date', required: true },
        ]
      },
      {
        title: '2. Descrição',
        questions: [
          { id: 'descricao', label: 'Descreva detalhadamente o que precisa ser desenvolvido', type: 'textarea', required: true },
          { id: 'objetivo', label: 'Qual o objetivo?', type: 'textarea', required: true },
          { id: 'contexto', label: 'Contexto e justificativa', type: 'textarea' },
        ]
      },
      {
        title: '3. Especificações',
        questions: [
          { id: 'dimensoes', label: 'Dimensões/medidas', type: 'text' },
          { id: 'especificacoes', label: 'Especificações técnicas ou requisitos', type: 'textarea', required: true },
          { id: 'formatos', label: 'Formatos de entrega necessários', type: 'text', required: true },
          { id: 'material', label: 'Material (se aplicável)', type: 'text' },
        ]
      },
      {
        title: '4. Identidade Visual',
        questions: [
          { id: 'manual_marca', label: 'Possui manual de marca?', type: 'text' },
          { id: 'logo', label: 'Logo disponível? Onde?', type: 'text' },
          { id: 'cores', label: 'Cores da marca', type: 'text' },
          { id: 'fontes', label: 'Fontes da marca', type: 'text' },
        ]
      },
      {
        title: '5. Materiais',
        questions: [
          { id: 'materiais_disponiveis', label: 'Materiais/conteúdos disponíveis', type: 'textarea' },
          { id: 'textos', label: 'Textos já estão prontos?', type: 'text' },
          { id: 'imagens', label: 'Imagens disponíveis', type: 'text' },
        ]
      },
      {
        title: '6. Referências',
        questions: [
          { id: 'referencias', label: 'Referências visuais (links/descrições)', type: 'textarea', required: true },
          { id: 'evitar', label: 'O que evitar?', type: 'textarea' },
        ]
      },
      {
        title: '7. Aprovação e Entrega',
        questions: [
          { id: 'quem_aprova', label: 'Quem vai aprovar?', type: 'text', required: true },
          { id: 'rodadas_revisao', label: 'Rodadas de revisão inclusas', type: 'text' },
          { id: 'observacoes', label: 'Observações adicionais', type: 'textarea' },
        ]
      },
    ]
  },
};

// GET - Listar templates de briefing
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Buscar templates do banco
    let templates = await prisma.briefingTemplate.findMany({
      where: { isActive: true }
    });
    
    // Verificar e adicionar templates que estão faltando
    const existingTypes = templates.map((t: any) => t.briefingType);
    for (const [type, data] of Object.entries(DEFAULT_TEMPLATES)) {
      if (!existingTypes.includes(type)) {
        try {
          await prisma.briefingTemplate.create({
            data: {
              briefingType: type,
              name: data.name,
              structure: JSON.stringify(data.sections),
              isActive: true,
            }
          });
          console.log(`Template ${type} criado com sucesso`);
        } catch (e) {
          // Pode falhar se outro processo criou ao mesmo tempo
          console.log(`Template ${type} já existe ou erro:`, e);
        }
      }
    }
    
    // Buscar templates atualizados
    templates = await prisma.briefingTemplate.findMany({
      where: { isActive: true }
    });
    
    // Parse as estruturas
    const parsedTemplates = templates.map((t: any) => ({
      ...t,
      structure: JSON.parse(t.structure)
    }));
    
    return NextResponse.json(parsedTemplates);
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
