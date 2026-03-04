'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  UserPlus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  forcePasswordChange: boolean;
  passwordChangedAt: Date | null;
  passwordExpiresAt: Date | null;
  createdAt: Date;
  _count: {
    proposals: number;
    loginHistory: number;
  };
}

const AVAILABLE_PERMISSIONS = [
  { id: 'view_proposals', label: 'Visualizar Propostas' },
  { id: 'create_proposals', label: 'Criar Propostas' },
  { id: 'edit_proposals', label: 'Editar Propostas' },
  { id: 'approve_proposals', label: 'Aprovar Propostas' },
  { id: 'generate_contracts', label: 'Gerar Contratos' },
  { id: 'view_reports', label: 'Visualizar Relatórios' },
];

export default function UsersManagementPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    permissions: [] as string[],
    isActive: true,
    forcePasswordChange: true,
  });

  // Verifica se é Master User
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'master') {
      router.push('/dashboard');
      toast.error('Acesso negado. Apenas o Usuário Master pode acessar esta página.');
    }
  }, [session, status, router]);

  // Carrega usuários
  useEffect(() => {
    if (session?.user?.role === 'master') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
      } else {
        toast.error(data.error || 'Erro ao carregar usuários');
      }
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Usuário criado com sucesso!');
        setShowCreateDialog(false);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      toast.error('Erro ao criar usuário');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !formData.name || !formData.email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const updatePayload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permissions: formData.permissions,
        isActive: formData.isActive,
        forcePasswordChange: formData.forcePasswordChange,
      };

      // Só envia senha se foi preenchida
      if (formData.password) {
        updatePayload.password = formData.password;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Usuário atualizado com sucesso!');
        setShowEditDialog(false);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.error || 'Erro ao atualizar usuário');
      }
    } catch (error) {
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Usuário removido com sucesso!');
        setShowDeleteDialog(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Erro ao remover usuário');
      }
    } catch (error) {
      toast.error('Erro ao remover usuário');
    }
  };

  const handleResetLockout = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetFailedAttempts: true }),
      });

      if (response.ok) {
        toast.success('Bloqueio removido com sucesso!');
        fetchUsers();
      } else {
        toast.error('Erro ao remover bloqueio');
      }
    } catch (error) {
      toast.error('Erro ao remover bloqueio');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      permissions: [],
      isActive: true,
      forcePasswordChange: true,
    });
    setSelectedUser(null);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      forcePasswordChange: user.forcePasswordChange,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const togglePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f88910] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">
            Controle completo sobre usuários e permissões do sistema
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="bg-[#f88910] hover:bg-[#e67e0f]"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Users List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {user.name}
                    {user.role === 'master' && (
                      <Shield className="h-4 w-4 text-[#f88910]" />
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                </div>
                <Badge
                  variant={user.isActive ? 'default' : 'secondary'}
                  className={user.isActive ? 'bg-green-500' : 'bg-gray-400'}
                >
                  {user.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {user.role === 'master' ? 'Master' : user.role === 'admin' ? 'Admin' : 'Usuário'}
                </Badge>
                {user.twoFactorEnabled && (
                  <Badge variant="outline" className="border-blue-500 text-blue-700">
                    2FA Ativo
                  </Badge>
                )}
                {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                  <Badge variant="outline" className="border-red-500 text-red-700">
                    <Lock className="mr-1 h-3 w-3" />
                    Bloqueado
                  </Badge>
                )}
                {user.forcePasswordChange && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                    <Clock className="mr-1 h-3 w-3" />
                    Trocar Senha
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="text-sm text-gray-600 space-y-1">
                <p>Propostas: {user._count.proposals}</p>
                <p>Logins: {user._count.loginHistory}</p>
                {user.failedLoginAttempts > 0 && (
                  <p className="text-red-600">
                    Tentativas falhadas: {user.failedLoginAttempts}/5
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
              
              
                {/* Permite editar qualquer usuário, incluindo o próprio master */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(user)}
                      className="flex-1"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    {/* Botão de deletar apenas para usuários não-master */}
                    {user.role !== 'master' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeleteDialog(user)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}


                {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResetLockout(user.id)}
                    className="flex-1"
                  >
                    <Unlock className="mr-1 h-3 w-3" />
                    Desbloquear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha * (mínimo 8 caracteres)</Label>
              <Input
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="space-y-2 border rounded-lg p-4">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`create-perm-${permission.id}`}
                      checked={formData.permissions.includes(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                    <label
                      htmlFor={`create-perm-${permission.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {permission.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="create-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="create-active">Conta ativa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="create-force-password"
                checked={formData.forcePasswordChange}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, forcePasswordChange: checked })
                }
              />
              <Label htmlFor="create-force-password">Forçar troca de senha no primeiro acesso</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} className="bg-[#f88910] hover:bg-[#e67e0f]">
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">
                Nova Senha (deixe em branco para não alterar)
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="space-y-2 border rounded-lg p-4">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-perm-${permission.id}`}
                      checked={formData.permissions.includes(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                    <label
                      htmlFor={`edit-perm-${permission.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {permission.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-active">Conta ativa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-force-password"
                checked={formData.forcePasswordChange}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, forcePasswordChange: checked })
                }
              />
              <Label htmlFor="edit-force-password">Forçar troca de senha</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} className="bg-[#f88910] hover:bg-[#e67e0f]">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário <strong>{selectedUser?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
