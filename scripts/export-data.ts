import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function exportData() {
  console.log('🔄 Exportando dados do banco de dados...\n');

  const data: Record<string, any[]> = {};

  // Exportar todas as tabelas
  const tables = [
    'user',
    'service',
    'proposal',
    'proposalService',
    'crmClient',
    'crmInteraction',
    'crmFollowUp',
    'creativeJob',
    'jobAssignment',
    'jobComment',
    'jobAttachment',
    'jobChecklist',
    'jobHistory',
    'briefing',
    'briefingTemplate',
    'installment',
    'fixedCost',
    'hrContract',
    'teamMember',
    'teamAbsence',
    'goal',
    'alert',
    'auditLog',
    'loginHistory',
    'layoutConfig',
    'customPage',
  ];

  for (const table of tables) {
    try {
      // @ts-ignore - acesso dinâmico
      const records = await prisma[table].findMany();
      data[table] = records;
      console.log(`✅ ${table}: ${records.length} registros`);
    } catch (error: any) {
      console.log(`⚠️ ${table}: ${error.message}`);
      data[table] = [];
    }
  }

  // Salvar em arquivo JSON
  const exportPath = './data-export.json';
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Dados exportados para: ${exportPath}`);
  console.log(`📦 Tamanho: ${(fs.statSync(exportPath).size / 1024).toFixed(2)} KB`);

  await prisma.$disconnect();
}

exportData().catch(console.error);
