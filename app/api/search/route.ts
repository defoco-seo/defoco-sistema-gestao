export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // all, proposals, clients, jobs

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.toLowerCase();
    const results: any = {
      proposals: [],
      clients: [],
      jobs: [],
    };

    // Busca em Propostas
    if (type === 'all' || type === 'proposals') {
      const proposals = await prisma.proposal.findMany({
        where: {
          OR: [
            { clientName: { contains: searchTerm, mode: 'insensitive' } },
            { clientEmail: { contains: searchTerm, mode: 'insensitive' } },
            { proposalNumber: { contains: searchTerm, mode: 'insensitive' } },
            { proposalCode: { contains: searchTerm, mode: 'insensitive' } },
            { demandName: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          proposalNumber: true,
          proposalCode: true,
          demandName: true,
          clientName: true,
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      results.proposals = proposals.map(p => ({
        ...p,
        total: Number(p.total),
      }));
    }

    // Busca em Clientes CRM
    if (type === 'all' || type === 'clients') {
      const clients = await prisma.cRMClient.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { company: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      results.clients = clients;
    }

    // Busca em Jobs Criativos
    if (type === 'all' || type === 'jobs') {
      const jobs = await prisma.creativeJob.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { jobNumber: { contains: searchTerm, mode: 'insensitive' } },
            { clientName: { contains: searchTerm, mode: 'insensitive' } },
            { clientEmail: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          jobNumber: true,
          title: true,
          clientName: true,
          status: true,
          priority: true,
          deadline: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      results.jobs = jobs;
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Erro na busca:', error);
    return NextResponse.json({ error: 'Erro ao realizar busca' }, { status: 500 });
  }
}
