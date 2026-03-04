export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { clientId, messageType, channel, customContext } = body;

    if (!clientId || !messageType) {
      return NextResponse.json(
        { error: 'Cliente e tipo de mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar dados do cliente
    const client = await prisma.cRMClient.findFirst({
      where: { id: clientId, userId: user.id },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Buscar proposta vinculada se houver
    let proposal = null;
    if (client.proposalId) {
      proposal = await prisma.proposal.findUnique({
        where: { id: client.proposalId },
        include: {
          services: {
            include: { service: true },
          },
        },
      });
    }

    // Construir contexto para a IA
    const clientContext = {
      nome: client.name,
      empresa: client.company || 'Não informado',
      email: client.email,
      status: client.status,
      ultimoContato: client.lastContactAt?.toISOString() || 'Nunca',
      totalInteracoes: client.totalInteractions,
      proposta: proposal ? {
        codigo: proposal.proposalCode || proposal.proposalNumber,
        demanda: proposal.demandName,
        valor: parseFloat(proposal.total.toString()),
        status: proposal.status,
        servicos: proposal.services.map(s => s.service.title).join(', '),
        dataEnvio: proposal.createdAt.toISOString(),
      } : null,
      interacoesRecentes: client.interactions.map(i => ({
        tipo: i.type,
        data: i.createdAt.toISOString(),
        resumo: i.content.substring(0, 100),
      })),
    };

    // Determinar o prompt baseado no tipo de mensagem
    const prompts: Record<string, string> = {
      follow_up_proposal: `Você é um especialista em comunicação comercial da Defoco, uma agência criativa.

Gere uma mensagem de follow-up para um cliente que recebeu uma proposta mas ainda não respondeu.

Contexto do cliente:
${JSON.stringify(clientContext, null, 2)}

A mensagem deve:
- Ser cordial e profissional
- Mencionar a proposta enviada
- Perguntar se há dúvidas
- Oferecer uma conversa para esclarecer pontos
- Criar senso de oportunidade sem ser insistente
- Ser adequada para ${channel === 'whatsapp' ? 'WhatsApp (curta e direta)' : 'email (mais elaborada)'}`,

      reactivation: `Você é um especialista em comunicação comercial da Defoco, uma agência criativa.

Gere uma mensagem de reativação para um cliente que não teve contato recente.

Contexto do cliente:
${JSON.stringify(clientContext, null, 2)}

A mensagem deve:
- Relembrar o relacionamento anterior
- Mostrar interesse genuino no negócio do cliente
- Oferecer novidades ou serviços relevantes
- Convidar para uma conversa
- Ser adequada para ${channel === 'whatsapp' ? 'WhatsApp (curta e direta)' : 'email (mais elaborada)'}`,

      thank_you: `Você é um especialista em comunicação comercial da Defoco, uma agência criativa.

Gere uma mensagem de agradecimento para um cliente.

Contexto do cliente:
${JSON.stringify(clientContext, null, 2)}

A mensagem deve:
- Agradecer de forma genuina
- Reforçar a parceria
- Mencionar próximos passos se aplicável
- Ser adequada para ${channel === 'whatsapp' ? 'WhatsApp (curta e direta)' : 'email (mais elaborada)'}`,

      check_in: `Você é um especialista em comunicação comercial da Defoco, uma agência criativa.

Gere uma mensagem de check-in para manter o relacionamento com o cliente.

Contexto do cliente:
${JSON.stringify(clientContext, null, 2)}
${customContext ? `\nContexto adicional: ${customContext}` : ''}

A mensagem deve:
- Ser cordial e não comercial
- Mostrar interesse no bem-estar/negócio do cliente
- Manter a Defoco na mente do cliente
- Ser adequada para ${channel === 'whatsapp' ? 'WhatsApp (curta e direta)' : 'email (mais elaborada)'}`,

      custom: `Você é um especialista em comunicação comercial da Defoco, uma agência criativa.

Gere uma mensagem personalizada com base no contexto fornecido.

Contexto do cliente:
${JSON.stringify(clientContext, null, 2)}

Instruções específicas: ${customContext || 'Crie uma mensagem cordial e profissional'}

A mensagem deve ser adequada para ${channel === 'whatsapp' ? 'WhatsApp (curta e direta)' : 'email (mais elaborada)'}`,
    };

    const prompt = prompts[messageType] || prompts.custom;

    // Chamar a IA
    const aiResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `Gere a mensagem ${channel === 'whatsapp' ? 'para WhatsApp' : 'para email'}. Responda em JSON com o formato: { "subject": "assunto (apenas para email)", "message": "conteúdo da mensagem" }. Responda APENAS com o JSON válido, sem markdown.`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      console.error('Erro na API de IA:', await aiResponse.text());
      return NextResponse.json(
        { error: 'Erro ao gerar mensagem' },
        { status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = JSON.parse(aiData.choices[0].message.content);

    return NextResponse.json({
      subject: generatedContent.subject || '',
      message: generatedContent.message,
      promptUsed: prompt,
      clientContext,
    });
  } catch (error) {
    console.error('Erro ao gerar mensagem:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
