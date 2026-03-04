'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  UserPlus,
  Calendar,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Edit,
  Trash2,
  Plus,
  Loader2,
  CalendarDays,
  BarChart3,
  Building,
  Shield,
  UserCog,
  Power,
  PowerOff,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image: string | null;
  isActive?: boolean;
  createdAt: string;
  activeJobs: number;
  teamMember: {
    id: string;
    jobTitle: string | null;
    department: string | null;
    skills: string | null;
    weeklyHours: number;
    maxConcurrentJobs: number;
    phone: string | null;
    whatsapp: string | null;
    startDate: string;
    color: string;
    absences: Absence[];
  } | null;
}

interface Absence {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  isApproved: boolean;
  memberName?: string;
  memberEmail?: string;
}

interface TeamStats {
  overview: {
    totalMembers: number;
    configuredMembers: number;
    activeAbsences: number;
    pendingAbsences: number;
    activeJobs: number;
    completedThisMonth: number;
  };
  jobsByStatus: Record<string, number>;
  workloadByMember: { userId: string; name: string; jobs: number }[];
  upcomingAbsences: Absence[];
  departments: { name: string; count: number }[];
}

const ABSENCE_TYPES: Record<string, { label: string; color: string }> = {
  vacation: { label: 'Férias', color: 'bg-blue-500' },
  sick_leave: { label: 'Atestado', color: 'bg-red-500' },
  personal: { label: 'Pessoal', color: 'bg-purple-500' },
  holiday: { label: 'Feriado', color: 'bg-green-500' },
  other: { label: 'Outro', color: 'bg-gray-500' },
};

const DEPARTMENTS = [
  'Criação',
  'Atendimento',
  'Planejamento',
  'Mídia',
  'Produção',
  'Desenvolvimento',
  'Administrativo',
];

const ROLES = [
  { value: 'master', label: 'Master', description: 'Acesso total ao sistema', color: 'bg-red-500' },
  { value: 'admin', label: 'Admin', description: 'Gerencia usuários e configurações', color: 'bg-orange-500' },
  { value: 'financeiro', label: 'Financeiro', description: 'Acesso ao módulo financeiro', color: 'bg-green-500' },
  { value: 'user', label: 'Usuário', description: 'Acesso básico', color: 'bg-blue-500' },
];

const COLORS = ['#f88910', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function EquipePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAbsenceDialogOpen, setIsAbsenceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  
  // Form states - Perfil de Equipe
  const [editForm, setEditForm] = useState({
    jobTitle: '',
    department: '',
    skills: '',
    weeklyHours: 40,
    maxConcurrentJobs: 5,
    phone: '',
    whatsapp: '',
    color: '#f88910',
  });
  
  // Form states - Usuário (Master only)
  const [userForm, setUserForm] = useState({
    name: '',
    role: 'user',
    isActive: true,
  });
  
  const [absenceForm, setAbsenceForm] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [membersRes, statsRes] = await Promise.all([
        fetch('/api/team/members'),
        fetch('/api/team/stats'),
      ]);
      
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados da equipe');
    } finally {
      setLoading(false);
    }
  };

  // Abrir dialog de perfil de equipe
  const openEditDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setEditForm({
      jobTitle: member.teamMember?.jobTitle || '',
      department: member.teamMember?.department || '',
      skills: member.teamMember?.skills ? JSON.parse(member.teamMember.skills).join(', ') : '',
      weeklyHours: member.teamMember?.weeklyHours || 40,
      maxConcurrentJobs: member.teamMember?.maxConcurrentJobs || 5,
      phone: member.teamMember?.phone || '',
      whatsapp: member.teamMember?.whatsapp || '',
      color: member.teamMember?.color || '#f88910',
    });
    setIsEditDialogOpen(true);
  };

  // Abrir dialog de usuário (Master only)
  const openUserDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setUserForm({
      name: member.name || '',
      role: member.role,
      isActive: member.isActive !== false,
    });
    setIsUserDialogOpen(true);
  };

  const openAbsenceDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setAbsenceForm({
      type: 'vacation',
      startDate: '',
      endDate: '',
      reason: '',
    });
    setIsAbsenceDialogOpen(true);
  };

  const openDeleteDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  // Salvar perfil de equipe
  const handleSaveMember = async () => {
    if (!selectedMember) return;
    setSaving(true);
    
    try {
      const response = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember.id,
          ...editForm,
          skills: editForm.skills ? editForm.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
      });
      
      if (response.ok) {
        toast.success('Perfil atualizado com sucesso!');
        setIsEditDialogOpen(false);
        fetchData();
      } else {
        toast.error('Erro ao salvar perfil');
      }
    } catch (error) {
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  // Salvar dados do usuário (Master only)
  const handleSaveUser = async () => {
    if (!selectedMember) return;
    setSaving(true);
    
    try {
      const response = await fetch(`/api/team/members/${selectedMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      
      if (response.ok) {
        toast.success('Usuário atualizado com sucesso!');
        setIsUserDialogOpen(false);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao salvar usuário');
      }
    } catch (error) {
      toast.error('Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  // Desativar usuário
  const handleDeactivateUser = async () => {
    if (!selectedMember) return;
    setSaving(true);
    
    try {
      const response = await fetch(`/api/team/members/${selectedMember.id}?action=deactivate`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Usuário desativado com sucesso!');
        setIsDeleteDialogOpen(false);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao desativar usuário');
      }
    } catch (error) {
      toast.error('Erro ao desativar usuário');
    } finally {
      setSaving(false);
    }
  };

  // Reativar usuário
  const handleReactivateUser = async (member: TeamMember) => {
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      
      if (response.ok) {
        toast.success('Usuário reativado com sucesso!');
        fetchData();
      } else {
        toast.error('Erro ao reativar usuário');
      }
    } catch (error) {
      toast.error('Erro ao reativar usuário');
    }
  };

  const handleSaveAbsence = async () => {
    if (!selectedMember) return;
    
    if (!absenceForm.startDate || !absenceForm.endDate) {
      toast.error('Preencha as datas');
      return;
    }
    
    setSaving(true);
    
    try {
      const response = await fetch(`/api/team/members/${selectedMember.id}/absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(absenceForm),
      });
      
      if (response.ok) {
        toast.success('Ausência registrada com sucesso!');
        setIsAbsenceDialogOpen(false);
        fetchData();
      } else {
        toast.error('Erro ao registrar ausência');
      }
    } catch (error) {
      toast.error('Erro ao registrar ausência');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAbsence = async (absenceId: string, approve: boolean) => {
    try {
      const response = await fetch(`/api/team/members/x/absences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ absenceId, isApproved: approve }),
      });
      
      if (response.ok) {
        toast.success(approve ? 'Ausência aprovada!' : 'Ausência rejeitada');
        fetchData();
      }
    } catch (error) {
      toast.error('Erro ao processar ausência');
    }
  };

  const isMaster = session?.user?.role === 'master';
  const isAdmin = session?.user?.role === 'master' || session?.user?.role === 'admin';

  // Filtrar membros (ativos/inativos)
  const filteredMembers = showInactive 
    ? members 
    : members.filter(m => m.isActive !== false);

  const getRoleBadge = (role: string) => {
    const roleInfo = ROLES.find(r => r.value === role);
    return roleInfo ? (
      <Badge className={`${roleInfo.color} text-white text-[10px]`}>
        {roleInfo.label}
      </Badge>
    ) : null;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#f88910]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 md:h-7 md:w-7 text-[#f88910]" />
            Gestão de Equipe
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie membros, ausências e carga de trabalho
          </p>
        </div>
        
        {/* Controles Master */}
        {isMaster && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
                Mostrar inativos
              </Label>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#f88910]" />
                <span className="text-xs text-muted-foreground">Membros</span>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.overview.totalMembers}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Jobs Ativos</span>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.overview.activeJobs}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Concluídos/Mês</span>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.overview.completedThisMonth}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">Ausentes Hoje</span>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.overview.activeAbsences}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-muted-foreground">Pend. Aprovação</span>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.overview.pendingAbsences}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-600" />
                <span className="text-xs text-muted-foreground">Departamentos</span>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.departments.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="members" className="text-xs md:text-sm">
            <Users className="h-4 w-4 mr-1 md:mr-2" />
            Membros
          </TabsTrigger>
          <TabsTrigger value="absences" className="text-xs md:text-sm">
            <CalendarDays className="h-4 w-4 mr-1 md:mr-2" />
            Ausências
          </TabsTrigger>
          <TabsTrigger value="workload" className="text-xs md:text-sm">
            <BarChart3 className="h-4 w-4 mr-1 md:mr-2" />
            Carga
          </TabsTrigger>
        </TabsList>

        {/* Membros */}
        <TabsContent value="members" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <Card 
                key={member.id} 
                className={`relative overflow-hidden ${member.isActive === false ? 'opacity-60' : ''}`}
              >
                <div 
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: member.teamMember?.color || '#f88910' }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold relative"
                        style={{ backgroundColor: member.teamMember?.color || '#f88910' }}
                      >
                        {member.name?.charAt(0).toUpperCase() || 'U'}
                        {member.isActive === false && (
                          <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
                            <PowerOff className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          {member.name || 'Sem nome'}
                          {getRoleBadge(member.role)}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {member.teamMember?.jobTitle || 'Sem cargo definido'}
                        </CardDescription>
                      </div>
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex gap-1">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(member)}
                          title="Editar Perfil de Equipe"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {isMaster && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openUserDialog(member)}
                            title="Configurações do Usuário"
                          >
                            <UserCog className="h-4 w-4 text-blue-600" />
                          </Button>
                          {member.isActive === false ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleReactivateUser(member)}
                              title="Reativar Usuário"
                            >
                              <Power className="h-4 w-4 text-green-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openDeleteDialog(member)}
                              title="Desativar Usuário"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  
                  {member.teamMember?.department && (
                    <Badge variant="secondary" className="text-xs">
                      {member.teamMember.department}
                    </Badge>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Jobs ativos:</span>
                    <span className="font-medium">
                      {member.activeJobs} / {member.teamMember?.maxConcurrentJobs || 5}
                    </span>
                  </div>
                  
                  <Progress 
                    value={(member.activeJobs / (member.teamMember?.maxConcurrentJobs || 5)) * 100} 
                    className="h-1.5"
                  />
                  
                  {member.teamMember?.absences && member.teamMember.absences.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Próximas ausências:</p>
                      {member.teamMember.absences.slice(0, 2).map((absence) => (
                        <div key={absence.id} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${ABSENCE_TYPES[absence.type]?.color || 'bg-gray-400'}`} />
                          <span>
                            {format(new Date(absence.startDate), 'dd/MM')} - {format(new Date(absence.endDate), 'dd/MM')}
                          </span>
                          {!absence.isApproved && (
                            <Badge variant="outline" className="text-[10px] px-1">Pendente</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {member.isActive !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openAbsenceDialog(member)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Registrar Ausência
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Ausências */}
        <TabsContent value="absences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximas Ausências</CardTitle>
              <CardDescription>Ausências aprovadas nos próximos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.upcomingAbsences && stats.upcomingAbsences.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingAbsences.map((absence) => (
                    <div 
                      key={absence.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${ABSENCE_TYPES[absence.type]?.color || 'bg-gray-400'}`} />
                        <div>
                          <p className="text-sm font-medium">{absence.memberName}</p>
                          <p className="text-xs text-muted-foreground">
                            {ABSENCE_TYPES[absence.type]?.label || absence.type} • 
                            {format(new Date(absence.startDate), ' dd/MM')} a {format(new Date(absence.endDate), 'dd/MM')}
                            <span className="text-muted-foreground/70">
                              {' '}({differenceInDays(new Date(absence.endDate), new Date(absence.startDate)) + 1} dias)
                            </span>
                          </p>
                        </div>
                      </div>
                      {absence.reason && (
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {absence.reason}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma ausência programada
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pendências de Aprovação */}
          {isAdmin && stats && stats.overview.pendingAbsences > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Pendentes de Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {stats.overview.pendingAbsences} solicitações aguardando aprovação
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Carga de Trabalho */}
        <TabsContent value="workload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carga de Trabalho por Membro</CardTitle>
              <CardDescription>Jobs ativos atribuídos a cada membro</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.workloadByMember && stats.workloadByMember.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.workloadByMember} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar dataKey="jobs" name="Jobs" radius={[0, 4, 4, 0]}>
                        {stats.workloadByMember.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum job atribuído
                </p>
              )}
            </CardContent>
          </Card>

          {stats?.departments && stats.departments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Membros por Departamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.departments.map((dept, index) => (
                    <div 
                      key={dept.name} 
                      className="p-3 rounded-lg text-center"
                      style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
                    >
                      <p className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                        {dept.count}
                      </p>
                      <p className="text-xs text-muted-foreground">{dept.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Editar Perfil de Equipe */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil - {selectedMember?.name}</DialogTitle>
            <DialogDescription>Configure as informações do membro da equipe</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cargo</Label>
                <Input
                  value={editForm.jobTitle}
                  onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                  placeholder="Ex: Designer Sênior"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Departamento</Label>
                <Select
                  value={editForm.department}
                  onValueChange={(v) => setEditForm({ ...editForm, department: v })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Habilidades (separadas por vírgula)</Label>
              <Input
                value={editForm.skills}
                onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                placeholder="Design, Illustrator, Photoshop"
                className="text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Horas Semanais</Label>
                <Input
                  type="number"
                  value={editForm.weeklyHours}
                  onChange={(e) => setEditForm({ ...editForm, weeklyHours: parseInt(e.target.value) || 40 })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Máx. Jobs Simultâneos</Label>
                <Input
                  type="number"
                  value={editForm.maxConcurrentJobs}
                  onChange={(e) => setEditForm({ ...editForm, maxConcurrentJobs: parseInt(e.target.value) || 5 })}
                  className="text-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="text-sm"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Cor do Perfil</Label>
              <div className="flex gap-2 mt-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      editForm.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditForm({ ...editForm, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMember} disabled={saving} className="bg-[#f88910] hover:bg-[#e07d0e]">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Configurações do Usuário (Master Only) */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#f88910]" />
              Configurações do Usuário
            </DialogTitle>
            <DialogDescription>Gerencie permissões e status do usuário</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{selectedMember?.name}</p>
              <p className="text-xs text-muted-foreground">{selectedMember?.email}</p>
            </div>
            
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Nome completo"
                className="text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs">Função (Role)</Label>
              <Select
                value={userForm.role}
                onValueChange={(v) => setUserForm({ ...userForm, role: v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${role.color}`} />
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground">- {role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {ROLES.find(r => r.value === userForm.role)?.description}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="text-sm">Status do Usuário</Label>
                <p className="text-xs text-muted-foreground">
                  {userForm.isActive ? 'Usuário ativo no sistema' : 'Usuário desativado'}
                </p>
              </div>
              <Switch
                checked={userForm.isActive}
                onCheckedChange={(v) => setUserForm({ ...userForm, isActive: v })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={saving} className="bg-[#f88910] hover:bg-[#e07d0e]">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Ausência */}
      <Dialog open={isAbsenceDialogOpen} onOpenChange={setIsAbsenceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Ausência - {selectedMember?.name}</DialogTitle>
            <DialogDescription>Registre férias, atestados ou outras ausências</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Tipo de Ausência</Label>
              <Select
                value={absenceForm.type}
                onValueChange={(v) => setAbsenceForm({ ...absenceForm, type: v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ABSENCE_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${value.color}`} />
                        {value.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={absenceForm.startDate}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, startDate: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={absenceForm.endDate}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, endDate: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Motivo (opcional)</Label>
              <Textarea
                value={absenceForm.reason}
                onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                placeholder="Descreva o motivo..."
                className="text-sm"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAbsenceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAbsence} disabled={saving} className="bg-[#f88910] hover:bg-[#e07d0e]">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Confirmar Desativação */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a desativar o usuário <strong>{selectedMember?.name}</strong>.
              <br /><br />
              O usuário não poderá mais fazer login, mas seus dados e histórico serão mantidos.
              Você pode reativar a conta a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
