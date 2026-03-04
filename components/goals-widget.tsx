'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Target,
  TrendingUp,
  DollarSign,
  FileText,
  Briefcase,
  Users,
  Percent,
  Trophy,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  type: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  isAchieved: boolean;
  endDate: string;
}

const goalTypeIcons: Record<string, any> = {
  revenue: DollarSign,
  proposals: FileText,
  proposals_approved: CheckCircle2,
  jobs: Briefcase,
  clients: Users,
  conversion: Percent,
};

const goalTypeColors: Record<string, string> = {
  revenue: 'text-green-500',
  proposals: 'text-blue-500',
  proposals_approved: 'text-emerald-500',
  jobs: 'text-purple-500',
  clients: 'text-orange-500',
  conversion: 'text-pink-500',
};

export function GoalsWidget() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals?status=active');
      if (!response.ok) throw new Error('Erro');

      const data = await response.json();
      // Pega as 3 metas mais recentes/relevantes
      setGoals(data.slice(0, 3));
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (value: number, type: string) => {
    if (type === 'revenue') {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    if (type === 'conversion') {
      return `${value.toFixed(1)}%`;
    }
    return value.toString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-[#f88910]" />
            Metas em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-[#f88910]" />
            Metas em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Nenhuma meta ativa</p>
          <Link href="/dashboard/metas">
            <Button size="sm" variant="outline">
              Criar Meta
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-[#f88910]" />
            Metas em Andamento
          </CardTitle>
          <Link href="/dashboard/metas">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Ver todas
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const Icon = goalTypeIcons[goal.type] || Target;
          const colorClass = goalTypeColors[goal.type] || 'text-gray-500';

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <span className="text-sm font-medium truncate max-w-[150px]">
                    {goal.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {goal.isAchieved ? (
                    <Badge className="bg-green-500 text-[10px]">
                      <Trophy className="h-3 w-3 mr-1" />
                      100%
                    </Badge>
                  ) : (
                    <span className="text-sm font-semibold">{goal.progress}%</span>
                  )}
                </div>
              </div>
              <Progress
                value={goal.progress}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatValue(goal.currentValue, goal.type)}</span>
                <span>Meta: {formatValue(goal.targetValue, goal.type)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
