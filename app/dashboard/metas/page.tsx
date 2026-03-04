'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Target,
  Plus,
  TrendingUp,
  DollarSign,
  FileText,
  Briefcase,
  Users,
  Percent,
  Trash2,
  Calendar,
  CheckCircle2,
  Loader2,
  Trophy,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Goal {
  id: string;
  title: string;
  description?: string;
  type: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  period: string;
  startDate: string;
  endDate: string;
  status: string;
  isAchieved: boolean;
  isPublic: boolean;
}

const goalTypes = [
  { value: 'revenue', label: 'Faturamento', icon: DollarSign, color: 'text-green-500' },
  { value: 'proposals', label: 'Propostas Criadas', icon: FileText, color: 'text-blue-500' },
  { value: 'proposals_approved', label: 'Propostas Aprovadas', icon: CheckCircle2, color: 'text-emerald-500' },
  { value: 'jobs', label: 'Jobs Concluídos', icon: Briefcase, color: 'text-purple-500' },
  { value: 'clients', label: 'Novos Clientes', icon: Users, color: 'text-orange-500' },
  { value: 'conversion', label: 'Taxa de Conversão (%)', icon: Percent, color: 'text-pink-500' },
];

const periodOptions = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Período Personalizado' },
];

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'revenue',
    targetValue: '',
    period: 'monthly',
    startDate: '',
    endDate: '',
    isPublic: false,
  });

  useEffect(() => {
    fetchGoals();
  }, [filter]);

  const fetchGoals = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);

      const response = await fetch(`/api/goals?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar metas');

      const data = await response.json();
      setGoals(data);
    } catch (error) {
      toast.error('Erro ao carregar metas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!formData.title || !formData.targetValue) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          targetValue: parseFloat(formData.targetValue),
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar meta');

      toast.success('Meta criada com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        type: 'revenue',
        targetValue: '',
        period: 'monthly',
        startDate: '',
        endDate: '',
        isPublic: false,
      });
      fetchGoals();
    } catch (error) {
      toast.error('Erro ao criar meta');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      const response = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir');

      toast.success('Meta excluída');
      fetchGoals();
    } catch (error) {
      toast.error('Erro ao excluir meta');
    }
  };

  const getGoalTypeInfo = (type: string) => {
    return goalTypes.find((t) => t.value === type) || goalTypes[0];
  };

  const formatValue = (value: number, type: string) => {
    if (type === 'revenue') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    if (type === 'conversion') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString('pt-BR');
  };

  const getProgressColor = (progress: number, isAchieved: boolean) => {
    if (isAchieved) return 'bg-green-500';
    if (progress >= 75) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const achievedGoals = goals.filter((g) => g.isAchieved).length;
  const activeGoals = goals.filter((g) => g.status === 'active' && !g.isAchieved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7 text-[#f88910]" />
            Metas e KPIs
          </h1>
          <p className="text-muted-foreground">
            Defina e acompanhe suas metas de desempenho
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#f88910] hover:bg-[#e07d0e]">
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Meta</DialogTitle>
              <DialogDescription>
                Defina uma meta para acompanhar seu progresso
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Faturamento de Fevereiro"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Opcional: descreva a meta..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Meta *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goalTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor Alvo *</Label>
                  <Input
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    placeholder={formData.type === 'revenue' ? '10000' : '10'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={formData.period}
                  onValueChange={(v) => setFormData({ ...formData, period: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.period === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateGoal}
                disabled={isSaving}
                className="bg-[#f88910] hover:bg-[#e07d0e]"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Meta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-[#f88910]/10 p-3">
                <Target className="h-6 w-6 text-[#f88910]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{goals.length}</p>
                <p className="text-sm text-muted-foreground">Total de Metas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{achievedGoals}</p>
                <p className="text-sm text-muted-foreground">Metas Alcançadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{activeGoals}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todas
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Ativas
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Concluídas
        </Button>
      </div>

      {/* Lista de Metas */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Nenhuma meta encontrada</h3>
            <p className="text-muted-foreground">Crie sua primeira meta para começar a acompanhar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const typeInfo = getGoalTypeInfo(goal.type);
            const Icon = typeInfo.icon;

            return (
              <Card key={goal.id} className={goal.isAchieved ? 'border-green-500/50 bg-green-50/30' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 bg-muted`}>
                        <Icon className={`h-5 w-5 ${typeInfo.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {goal.title}
                          {goal.isAchieved && (
                            <Badge className="bg-green-500">
                              <Trophy className="h-3 w-3 mr-1" />
                              Alcançada!
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(goal.startDate), 'dd/MM', { locale: ptBR })} -{' '}
                          {format(new Date(goal.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{goal.progress}%</span>
                    </div>
                    <Progress
                      value={goal.progress}
                      className="h-2"
                    />
                    <div className="flex justify-between text-sm">
                      <span>
                        Atual: <strong>{formatValue(goal.currentValue, goal.type)}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Meta: {formatValue(goal.targetValue, goal.type)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
