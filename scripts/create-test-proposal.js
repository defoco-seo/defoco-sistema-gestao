require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function createTestProposal() {
  try {
    // Buscar o usuário master
    const user = await prisma.user.findUnique({
      where: { email: 'paulo@defoco.com.br' }
    });

    if (!user) {
      console.error('Usuário não encontrado');
      process.exit(1);
    }

    // Buscar um serviço
    const service = await prisma.service.findFirst({
      where: { active: true }
    });

    if (!service) {
      console.error('Nenhum serviço ativo encontrado');
      process.exit(1);
    }

    console.log('✅ Usuário:', user.email);
    console.log('✅ Serviço:', service.title, '- Preço: R$', service.price.toString());

    // Calcular valores
    const subtotal = service.price;
    const tax = subtotal.mul(new Decimal(0.12));
    const total = subtotal.plus(tax);

    // Gerar número de proposta único
    const proposalNumber = `2025-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    // Data de validade (60 dias)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 60);

    console.log('\n📝 Criando proposta de teste...');
    console.log('CNPJ: 12.345.678/0001-90');
    console.log('Endereço: Rua das Flores, 123 - Centro - São Paulo/SP - CEP 01234-567');

    // Criar proposta
    const proposal = await prisma.proposal.create({
      data: {
        proposalNumber,
        proposalCode: `PD${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`,
        demandName: 'Identidade Visual Completa - TESTE',
        clientName: 'Empresa Teste Ltda',
        clientEmail: 'contato@empresateste.com.br',
        clientCNPJ: '12.345.678/0001-90',
        clientAddress: 'Rua das Flores, 123 - Centro - São Paulo/SP - CEP 01234-567',
        responsibleName: 'Maria Silva',
        clientWhatsapp: '(11) 98765-4321',
        subtotal,
        tax,
        total,
        validUntil,
        userId: user.id,
        observations: 'Proposta de teste criada automaticamente para verificar dados do contratante',
        paymentTerms: 'À vista',
        services: {
          create: {
            serviceId: service.id,
            quantity: 1
          }
        }
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    console.log('\n✅ Proposta criada com sucesso!');
    console.log('ID:', proposal.id);
    console.log('Número:', proposal.proposalNumber);
    console.log('Código:', proposal.proposalCode);
    console.log('Cliente:', proposal.clientName);
    console.log('CNPJ:', proposal.clientCNPJ);
    console.log('Endereço:', proposal.clientAddress);
    console.log('Total: R$', proposal.total.toString());

    // Retornar o ID para uso posterior
    console.log('\n🔑 PROPOSAL_ID=' + proposal.id);
    
    return proposal.id;

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestProposal();
