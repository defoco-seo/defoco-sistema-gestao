// Script para importar dados no Prisma Postgres da Vercel
// Execute: npx tsx scripts/import-data.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importData() {
  console.log('🔄 Importando dados para Prisma Postgres...\n');

  // Ler arquivo exportado
  const dataPath = './data-export.json';
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Arquivo data-export.json não encontrado!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // 1. Importar usuários
  if (data.user?.length) {
    console.log(`📥 Importando ${data.user.length} usuários...`);
    for (const user of data.user) {
      try {
        await prisma.user.upsert({
          where: { id: user.id },
          create: user,
          update: user,
        });
      } catch (e: any) {
        console.log(`  ⚠️ Usuário ${user.email}: ${e.message}`);
      }
    }
    console.log('✅ Usuários importados');
  }

  // 2. Importar serviços
  if (data.service?.length) {
    console.log(`📥 Importando ${data.service.length} serviços...`);
    for (const service of data.service) {
      try {
        await prisma.service.upsert({
          where: { id: service.id },
          create: service,
          update: service,
        });
      } catch (e: any) {
        console.log(`  ⚠️ Serviço ${service.title}: ${e.message}`);
      }
    }
    console.log('✅ Serviços importados');
  }

  // 3. Importar briefing templates
  if (data.briefingTemplate?.length) {
    console.log(`📥 Importando ${data.briefingTemplate.length} templates...`);
    for (const template of data.briefingTemplate) {
      try {
        await prisma.briefingTemplate.upsert({
          where: { id: template.id },
          create: template,
          update: template,
        });
      } catch (e: any) {
        console.log(`  ⚠️ Template ${template.name}: ${e.message}`);
      }
    }
    console.log('✅ Templates importados');
  }

  // 4. Importar layout config
  if (data.layoutConfig?.length) {
    console.log(`📥 Importando ${data.layoutConfig.length} configs...`);
    for (const config of data.layoutConfig) {
      try {
        await prisma.layoutConfig.upsert({
          where: { id: config.id },
          create: config,
          update: config,
        });
      } catch (e: any) {
        console.log(`  ⚠️ Config: ${e.message}`);
      }
    }
    console.log('✅ Configs importados');
  }

  // 5. Importar creative jobs
  if (data.creativeJob?.length) {
    console.log(`📥 Importando ${data.creativeJob.length} jobs...`);
    for (const job of data.creativeJob) {
      try {
        await prisma.creativeJob.upsert({
          where: { id: job.id },
          create: job,
          update: job,
        });
      } catch (e: any) {
        console.log(`  ⚠️ Job: ${e.message}`);
      }
    }
    console.log('✅ Jobs importados');
  }

  console.log('\n🎉 Importação concluída!');
  await prisma.$disconnect();
}

importData().catch(console.error);
