import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  FileText,
  PlusCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { RecentProposals } from '@/components/recent-proposals';
import { FinancialNotifications } from '@/components/financial-notifications';
import { GoalsWidget } from '@/components/goals-widget';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const [totalProposals, pendingProposals, approvedProposals, recentProposals] =
    await Promise.all([
      prisma.proposal.count({
        where: { userId: session.user.id },
      }),
      prisma.proposal.count({
        where: { userId: session.user.id, status: 'pending' },
      }),
      prisma.proposal.count({
        where: { userId: session.user.id, status: 'approved' },
      }),
      prisma.proposal.findMany({
        where: { userId: session.user.id },
        include: {
          services: {
            include: {
              service: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

  const stats = [
    {
      title: 'Total de Propostas',
      value: totalProposals,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Aguardando Aprovação',
      value: pendingProposals,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Aprovadas',
      value: approvedProposals,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {session.user.name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Bem-vindo ao sistema de propostas comerciais Defoco
          </p>
        </div>
        <Link href="/dashboard/propostas/criar">
          <Button
            className="bg-[#f88910] hover:bg-[#e07800] text-white gap-2 shadow-lg"
            size="lg"
          >
            <PlusCircle className="h-5 w-5" />
            Nova Proposta
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Propostas Recentes</CardTitle>
              <Link href="/dashboard/propostas">
                <Button variant="ghost" size="sm">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <RecentProposals proposals={recentProposals} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <GoalsWidget />
          <FinancialNotifications />
        </div>
      </div>
    </div>
  );
}