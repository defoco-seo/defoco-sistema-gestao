require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { generateContractPDF } = require('../lib/contract-generator');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const proposalId = process.argv[2];

if (!proposalId) {
  console.error('❌ Forneça o ID da proposta como argumento');
  console.log('Uso: node generate-test-contract.js <PROPOSAL_ID>');
  process.exit(1);
}

async function generateContract() {
  try {
    console.log('\n📄 Buscando proposta ID:', proposalId);

    // Buscar proposta com serviços
    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    if (!proposal) {
      console.error('❌ Proposta não encontrada');
      process.exit(1);
    }

    console.log('✅ Proposta encontrada:', proposal.proposalCode);
    console.log('Cliente:', proposal.clientName);
    console.log('CNPJ:', proposal.clientCNPJ);
    console.log('Endereço:', proposal.clientAddress);

    // Dados do contrato
    const contractData = {
      representativeName: 'João da Silva',
      representativeNationality: 'brasileiro',
      representativeMaritalStatus: 'casado',
      representativeProfession: 'empresário',
      representativeCPF: '123.456.789-00',
      representativeRG: '12.345.678-9',
      contractForumCity: 'São Paulo',
      contractForumState: 'SP',
      contractSignatureDate: new Date().toISOString(),
      contractSignatureMethod: 'govbr',
      contractSignaturePlatform: null
    };

    console.log('\n📝 Atualizando proposta com dados do contrato...');

    // Atualizar proposta com dados do representante
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        representativeName: contractData.representativeName,
        representativeNationality: contractData.representativeNationality,
        representativeMaritalStatus: contractData.representativeMaritalStatus,
        representativeProfession: contractData.representativeProfession,
        representativeCPF: contractData.representativeCPF,
        representativeRG: contractData.representativeRG,
        contractForumCity: contractData.contractForumCity,
        contractForumState: contractData.contractForumState,
        contractSignatureDate: new Date(contractData.contractSignatureDate),
        contractSignatureMethod: contractData.contractSignatureMethod,
        contractSignaturePlatform: contractData.contractSignaturePlatform,
        contractGenerated: true,
        contractGeneratedAt: new Date()
      }
    });

    console.log('✅ Dados do contrato salvos no banco de dados');

    // Buscar proposta atualizada
    const updatedProposal = await prisma.proposal.findFirst({
      where: { id: proposalId },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    console.log('\n📝 Gerando PDF do contrato...');

    // Gerar PDF
    const pdfBlob = await generateContractPDF(updatedProposal, null);

    // Salvar PDF
    const outputPath = path.join(__dirname, '../../Downloads', `Contrato_Teste_${proposal.proposalCode}.pdf`);
    fs.writeFileSync(outputPath, Buffer.from(pdfBlob));

    console.log('✅ PDF gerado com sucesso!');
    console.log('Arquivo salvo em:', outputPath);

    console.log('\n🔍 Verificando dados no banco:');
    console.log('CNPJ salvo:', updatedProposal.clientCNPJ);
    console.log('Endereço salvo:', updatedProposal.clientAddress);
    console.log('Representante:', updatedProposal.representativeName);
    console.log('CPF:', updatedProposal.representativeCPF);
    console.log('RG:', updatedProposal.representativeRG);
    console.log('Método de assinatura:', updatedProposal.contractSignatureMethod);

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('\nAbra o PDF e verifique:');
    console.log('1. Se os dados do CONTRATANTE aparecem (CNPJ, endereço, representante)');
    console.log('2. Se a CLÁUSULA DÉCIMA QUINTA aparece como "NÃO ALICIAMENTO" apenas');
    console.log('3. Se a assinatura Gov.br aparece corretamente');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateContract();
