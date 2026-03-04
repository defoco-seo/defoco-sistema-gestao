'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Search, Calendar, User, Clock, ChevronRight, GripVertical,
  MessageSquare, CheckSquare, FileText, History, AlertCircle, Trash2,
  Edit, MoreVertical, ExternalLink, X, ChevronDown, ChevronUp,
  Briefcase, Send, RefreshCw, Users, UserPlus, Save, Paperclip,
  Image, File, Download, Upload, CalendarDays
} from 'lucide-react';

// Tipos
interface Assignee {
  id: string;
  userId: string;
  userName: string;
  role: string;
}

interface Service {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  status: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedByName?: string;
  assignedToId?: string;
  assignedToName?: string;
  dueDate?: string;
  order: number;
}

interface HistoryEntry {
  id: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  description: string;
  createdAt: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  attachment?: {
    id: string;
    fileName: string;
    fileType: string;
    cloudStoragePath: string;
  };
}

interface Attachment {
  id: string;
  userId: string;
  userName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  cloudStoragePath: string;
  category: string;
  description?: string;
  createdAt: string;
  url?: string;
}

interface Briefing {
  id: string;
  briefingType: string;
  content: any;
  isComplete: boolean;
}

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientWhatsapp?: string;
  clientCompany?: string;
  notifyClient: boolean;
  status: string;
  priority: string;
  deadline?: string;
  assignedTo?: string;
  assignedName?: string;
  assignees?: Assignee[];
  internalNotes?: string;
  services: Service[];
  checklist: ChecklistItem[];
  briefings: Briefing[];
  history?: HistoryEntry[];
  proposal?: {
    id: string;
    proposalCode?: string;
    proposalNumber: string;
  };
  _count?: { history: number };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

interface BriefingTemplate {
  id: string;
  briefingType: string;
  name: string;
  structure: Array<{
    title: string;
    questions: Array<{
      id: string;
      label: string;
      type: string;
    }>;
  }>;
}

// Colunas do Kanban
const STATUS_COLUMNS = [
  { id: 'briefing', label: 'Briefing Recebido', color: 'bg-blue-500' },
  { id: 'analysis', label: 'Em Análise', color: 'bg-purple-500' },
  { id: 'creation', label: 'Em Criação', color: 'bg-yellow-500' },
  { id: 'adjustments', label: 'Em Ajustes', color: 'bg-orange-500' },
  { id: 'approval', label: 'Aguard. Aprovação', color: 'bg-cyan-500' },
  { id: 'completed', label: 'Finalizado', color: 'bg-green-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function CreativePage() {
  const { data: session } = useSession() || {};
  
  // Estados principais
  const [jobs, setJobs] = useState<Job[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [templates, setTemplates] = useState<BriefingTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de diálogos
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailTab, setDetailTab] = useState('info');
  
  // Estado do formulário de criação/edição
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    clientEmail: '',
    clientWhatsapp: '',
    clientCompany: '',
    priority: 'normal',
    deadline: '',
    assignedTo: '',
    assignedName: '',
    internalNotes: '',
    briefingType: '',
  });
  
  // Estado de múltiplos responsáveis
  const [selectedAssignees, setSelectedAssignees] = useState<{userId: string, userName: string, role: string}[]>([]);
  
  // Estado do checklist
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newChecklistAssignee, setNewChecklistAssignee] = useState('');
  const [newChecklistDueDate, setNewChecklistDueDate] = useState('');
  const [editingChecklistItem, setEditingChecklistItem] = useState<string | null>(null);
  
  // Estado do briefing
  const [selectedBriefingType, setSelectedBriefingType] = useState('');
  const [briefingAnswers, setBriefingAnswers] = useState<Record<string, string>>({});
  
  // Estado de comentários
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
  // Estado de anexos
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentCategory, setAttachmentCategory] = useState('general');
  
  // Estado de visualização
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline'>('kanban');
  
  // Drag and drop
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Buscar dados
  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/creative/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Erro ao buscar jobs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchTeam = useCallback(async () => {
    try {
      const response = await fetch('/api/creative/team');
      if (response.ok) {
        const data = await response.json();
        setTeam(data);
      }
    } catch (error) {
      console.error('Erro ao buscar equipe:', error);
    }
  }, []);
  
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/creative/briefing-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    }
  }, []);
  
  // Buscar comentários de um job
  const fetchComments = async (jobId: string) => {
    try {
      setIsLoadingComments(true);
      const response = await fetch(`/api/creative/jobs/${jobId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };
  
  // Buscar anexos de um job
  const fetchAttachments = async (jobId: string) => {
    try {
      const response = await fetch(`/api/creative/jobs/${jobId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar anexos:', error);
    }
  };
  
  // Adicionar comentário
  const handleAddComment = async () => {
    if (!selectedJob || !newComment.trim()) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      
      if (response.ok) {
        const comment = await response.json();
        setComments(prev => [comment, ...prev]);
        setNewComment('');
        toast.success('Comentário adicionado!');
      } else {
        toast.error('Erro ao adicionar comentário');
      }
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    }
  };
  
  // Deletar comentário
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedJob) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast.success('Comentário removido!');
      }
    } catch (error) {
      toast.error('Erro ao remover comentário');
    }
  };
  
  // Upload de anexo
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedJob || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', attachmentCategory);
    
    try {
      setIsUploadingAttachment(true);
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/attachments`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const attachment = await response.json();
        setAttachments(prev => [attachment, ...prev]);
        toast.success('Arquivo anexado!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao anexar arquivo');
      }
    } catch (error) {
      toast.error('Erro ao anexar arquivo');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };
  
  // Deletar anexo
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedJob) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
        toast.success('Anexo removido!');
      }
    } catch (error) {
      toast.error('Erro ao remover anexo');
    }
  };
  
  // Formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Obter ícone do arquivo
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    return File;
  };
  
  useEffect(() => {
    fetchJobs();
    fetchTeam();
    fetchTemplates();
  }, [fetchJobs, fetchTeam, fetchTemplates]);
  
  // Agrupar jobs por status
  const jobsByStatus = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.id] = jobs.filter(job => {
      const matchesStatus = job.status === col.id;
      const matchesSearch = !searchTerm || 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
    return acc;
  }, {} as Record<string, Job[]>);
  
  // Resetar formulário
  const resetForm = () => {
    setFormData({
      title: '',
      clientName: '',
      clientEmail: '',
      clientWhatsapp: '',
      clientCompany: '',
      priority: 'normal',
      deadline: '',
      assignedTo: '',
      assignedName: '',
      internalNotes: '',
      briefingType: '',
    });
    setSelectedAssignees([]);
    setIsEditMode(false);
  };
  
  // Criar novo job
  const handleCreateJob = async () => {
    if (!formData.title || !formData.clientName) {
      toast.error('Título e nome do cliente são obrigatórios');
      return;
    }
    
    try {
      const response = await fetch('/api/creative/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedName: team.find(m => m.id === formData.assignedTo)?.name || '',
          assignees: selectedAssignees,
          briefingType: formData.briefingType || undefined,
        }),
      });
      
      if (response.ok) {
        const job = await response.json();
        setJobs(prev => [job, ...prev]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success('Job criado com sucesso!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar job');
      }
    } catch (error) {
      console.error('Erro ao criar job:', error);
      toast.error('Erro ao criar job');
    }
  };
  
  // Atualizar status do job (drag and drop)
  const handleDragStart = (job: Job) => {
    setDraggedJob(job);
  };
  
  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };
  
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };
  
  const handleDrop = async (columnId: string) => {
    if (!draggedJob || draggedJob.status === columnId) {
      setDraggedJob(null);
      setDragOverColumn(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/creative/jobs/${draggedJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: columnId }),
      });
      
      if (response.ok) {
        setJobs(prev => prev.map(job => 
          job.id === draggedJob.id ? { ...job, status: columnId } : job
        ));
        const statusLabel = STATUS_COLUMNS.find(c => c.id === columnId)?.label;
        toast.success(`Job movido para "${statusLabel}"`);
      }
    } catch (error) {
      console.error('Erro ao mover job:', error);
      toast.error('Erro ao mover job');
    }
    
    setDraggedJob(null);
    setDragOverColumn(null);
  };
  
  // Abrir detalhes do job
  const openJobDetail = async (job: Job) => {
    try {
      const response = await fetch(`/api/creative/jobs/${job.id}`);
      if (response.ok) {
        const fullJob = await response.json();
        setSelectedJob(fullJob);
        setIsJobDetailOpen(true);
        setDetailTab('info');
        setIsEditMode(false);
        
        // Carregar comentários e anexos
        fetchComments(job.id);
        fetchAttachments(job.id);
        
        // Preencher form com dados do job
        setFormData({
          title: fullJob.title,
          clientName: fullJob.clientName,
          clientEmail: fullJob.clientEmail || '',
          clientWhatsapp: fullJob.clientWhatsapp || '',
          clientCompany: fullJob.clientCompany || '',
          priority: fullJob.priority,
          deadline: fullJob.deadline ? format(new Date(fullJob.deadline), 'yyyy-MM-dd') : '',
          assignedTo: fullJob.assignedTo || '',
          assignedName: fullJob.assignedName || '',
          internalNotes: fullJob.internalNotes || '',
          briefingType: '',
        });
        setSelectedAssignees(fullJob.assignees?.map((a: Assignee) => ({
          userId: a.userId,
          userName: a.userName,
          role: a.role
        })) || []);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      toast.error('Erro ao carregar detalhes');
    }
  };
  
  // Salvar edição do job
  const handleSaveEdit = async () => {
    if (!selectedJob) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail || null,
          clientWhatsapp: formData.clientWhatsapp || null,
          clientCompany: formData.clientCompany || null,
          priority: formData.priority,
          deadline: formData.deadline || null,
          assignedTo: formData.assignedTo || null,
          assignedName: team.find(m => m.id === formData.assignedTo)?.name || null,
          assignees: selectedAssignees,
          internalNotes: formData.internalNotes || null,
        }),
      });
      
      if (response.ok) {
        const updatedJob = await response.json();
        setSelectedJob(updatedJob);
        setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
        setIsEditMode(false);
        toast.success('Job atualizado com sucesso!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar job');
      }
    } catch (error) {
      console.error('Erro ao atualizar job:', error);
      toast.error('Erro ao atualizar job');
    }
  };
  
  // Atualizar status do job
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedJob) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        const updatedJob = await response.json();
        setSelectedJob(updatedJob);
        setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
        const statusLabel = STATUS_COLUMNS.find(c => c.id === newStatus)?.label;
        toast.success(`Status alterado para "${statusLabel}"`);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar');
    }
  };
  
  // Adicionar/Remover responsáveis
  const addAssignee = (userId: string) => {
    const member = team.find(m => m.id === userId);
    if (member && !selectedAssignees.find(a => a.userId === userId)) {
      setSelectedAssignees(prev => [
        ...prev,
        { userId, userName: member.name || member.email, role: 'member' }
      ]);
    }
  };
  
  const removeAssignee = (userId: string) => {
    setSelectedAssignees(prev => prev.filter(a => a.userId !== userId));
  };
  
  const toggleAssigneeRole = (userId: string) => {
    setSelectedAssignees(prev => prev.map(a => 
      a.userId === userId 
        ? { ...a, role: a.role === 'lead' ? 'member' : 'lead' }
        : a
    ));
  };
  
  // Checklist
  const handleAddChecklistItem = async () => {
    if (!selectedJob || !newChecklistItem.trim()) return;
    
    const assignee = team.find(m => m.id === newChecklistAssignee);
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newChecklistItem,
          assignedToId: newChecklistAssignee || null,
          assignedToName: assignee?.name || null,
          dueDate: newChecklistDueDate || null,
        }),
      });
      
      if (response.ok) {
        const item = await response.json();
        setSelectedJob(prev => prev ? {
          ...prev,
          checklist: [...prev.checklist, item]
        } : null);
        setNewChecklistItem('');
        setNewChecklistAssignee('');
        setNewChecklistDueDate('');
        toast.success('Tarefa adicionada!');
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
    }
  };
  
  const handleToggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    if (!selectedJob) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isCompleted }),
      });
      
      if (response.ok) {
        const updatedItem = await response.json();
        setSelectedJob(prev => prev ? {
          ...prev,
          checklist: prev.checklist.map(i => i.id === itemId ? updatedItem : i)
        } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
    }
  };
  
  const handleUpdateChecklistItem = async (itemId: string, updates: any) => {
    if (!selectedJob) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ...updates }),
      });
      
      if (response.ok) {
        const updatedItem = await response.json();
        setSelectedJob(prev => prev ? {
          ...prev,
          checklist: prev.checklist.map(i => i.id === itemId ? updatedItem : i)
        } : null);
        setEditingChecklistItem(null);
        toast.success('Tarefa atualizada!');
      }
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
    }
  };
  
  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!selectedJob) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/checklist?itemId=${itemId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSelectedJob(prev => prev ? {
          ...prev,
          checklist: prev.checklist.filter(i => i.id !== itemId)
        } : null);
        toast.success('Tarefa removida!');
      }
    } catch (error) {
      console.error('Erro ao remover item:', error);
    }
  };
  
  // Briefing
  const handleSaveBriefing = async () => {
    if (!selectedJob || !selectedBriefingType) return;
    
    try {
      const response = await fetch(`/api/creative/jobs/${selectedJob.id}/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefingType: selectedBriefingType,
          content: briefingAnswers,
          isComplete: Object.keys(briefingAnswers).length > 0,
        }),
      });
      
      if (response.ok) {
        const briefing = await response.json();
        setSelectedJob(prev => {
          if (!prev) return null;
          const existingIndex = prev.briefings.findIndex(b => b.briefingType === selectedBriefingType);
          if (existingIndex >= 0) {
            const newBriefings = [...prev.briefings];
            newBriefings[existingIndex] = briefing;
            return { ...prev, briefings: newBriefings };
          }
          return { ...prev, briefings: [...prev.briefings, briefing] };
        });
        toast.success('Briefing salvo!');
      }
    } catch (error) {
      console.error('Erro ao salvar briefing:', error);
      toast.error('Erro ao salvar briefing');
    }
  };
  
  // Carregar briefing existente quando selecionar tipo
  useEffect(() => {
    if (selectedJob && selectedBriefingType) {
      const existingBriefing = selectedJob.briefings?.find(b => b.briefingType === selectedBriefingType);
      if (existingBriefing) {
        try {
          const content = typeof existingBriefing.content === 'string' 
            ? JSON.parse(existingBriefing.content) 
            : existingBriefing.content;
          setBriefingAnswers(content || {});
        } catch {
          setBriefingAnswers({});
        }
      } else {
        setBriefingAnswers({});
      }
    }
  }, [selectedJob, selectedBriefingType]);
  
  // Renderizar card do job
  const renderJobCard = (job: Job) => {
    const isOverdue = job.deadline && new Date(job.deadline) < new Date() && job.status !== 'completed';
    const completedChecklist = job.checklist?.filter(c => c.isCompleted).length || 0;
    const totalChecklist = job.checklist?.length || 0;
    
    // Determina o responsável principal (líder ou primeiro assignee)
    const leader = job.assignees?.find(a => a.role === 'lead');
    const primaryAssignee = leader || job.assignees?.[0];
    const otherAssignees = job.assignees?.filter(a => a.userId !== primaryAssignee?.userId) || [];
    
    return (
      <div
        key={job.id}
        draggable
        onDragStart={() => handleDragStart(job)}
        onClick={() => openJobDetail(job)}
        className={`bg-white rounded-lg shadow-sm border p-3 cursor-pointer hover:shadow-md transition-shadow ${
          draggedJob?.id === job.id ? 'opacity-50' : ''
        } ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 font-mono">{job.jobNumber}</span>
              <Badge className={PRIORITY_COLORS[job.priority]} variant="secondary">
                {PRIORITY_LABELS[job.priority]}
              </Badge>
            </div>
            <h4 className="font-medium text-sm text-gray-900 truncate">{job.title}</h4>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>
        
        <p className="text-sm text-gray-600 mb-2 truncate">{job.clientName}</p>
        
        {/* Seção do Profissional Responsável - destaque */}
        {(primaryAssignee || job.assignedName) && (
          <div className="flex items-center gap-2 mb-2 p-1.5 bg-orange-50 rounded border border-orange-200">
            <div className="w-6 h-6 bg-[#f88910] rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-orange-700 font-medium truncate">
                {primaryAssignee?.userName || job.assignedName}
                {leader && <span className="ml-1 text-[10px] text-orange-500">(Líder)</span>}
              </div>
              {otherAssignees.length > 0 && (
                <div className="text-[10px] text-orange-600">
                  +{otherAssignees.length} {otherAssignees.length === 1 ? 'membro' : 'membros'}
                </div>
              )}
            </div>
          </div>
        )}
        
        {!primaryAssignee && !job.assignedName && (
          <div className="flex items-center gap-2 mb-2 p-1.5 bg-gray-50 rounded border border-gray-200 border-dashed">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400 italic">Sem responsável</span>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {job.deadline && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="h-3 w-3" />
              {format(new Date(job.deadline), 'dd/MM', { locale: ptBR })}
              {isOverdue && <span className="text-[10px]">⚠️</span>}
            </div>
          )}
          
          {totalChecklist > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {completedChecklist}/{totalChecklist}
            </div>
          )}
          
          {job.briefings?.length > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <FileText className="h-3 w-3" />
              Briefing
            </div>
          )}
          
          {job.proposal && (
            <div className="flex items-center gap-1 text-[#f88910]">
              <Briefcase className="h-3 w-3" />
              {job.proposal.proposalCode || job.proposal.proposalNumber}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#f88910]" />
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão Criativa</h1>
          <p className="text-sm text-gray-500">Acompanhe e gerencie as demandas de design</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Alertas de deadline */}
          {jobs.filter(j => j.deadline && new Date(j.deadline) < new Date() && j.status !== 'completed').length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
              <AlertCircle className="h-3 w-3" />
              {jobs.filter(j => j.deadline && new Date(j.deadline) < new Date() && j.status !== 'completed').length} atrasados
            </Badge>
          )}
          
          {/* Botões de visualização */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className={viewMode === 'kanban' ? 'bg-[#f88910] hover:bg-[#e07800]' : ''}
            >
              <GripVertical className="h-4 w-4 mr-1" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className={viewMode === 'timeline' ? 'bg-[#f88910] hover:bg-[#e07800]' : ''}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Timeline
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="bg-[#f88910] hover:bg-[#e07800]">
            <Plus className="h-4 w-4 mr-2" />
            Nova Demanda
          </Button>
        </div>
      </div>
      
      {/* Visualização Kanban */}
      {viewMode === 'kanban' && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-h-[calc(100vh-200px)] pb-4">
            {STATUS_COLUMNS.map(column => (
              <div
                key={column.id}
                className={`flex-shrink-0 w-72 bg-gray-50 rounded-lg ${
                  dragOverColumn === column.id ? 'ring-2 ring-[#f88910]' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(column.id)}
              >
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.color}`} />
                    <h3 className="font-medium text-gray-900 text-sm">{column.label}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {jobsByStatus[column.id]?.length || 0}
                    </Badge>
                  </div>
                </div>
                
                <ScrollArea className="h-[calc(100vh-280px)] p-2">
                  <div className="space-y-2">
                    {jobsByStatus[column.id]?.map(job => renderJobCard(job))}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Visualização Timeline */}
      {viewMode === 'timeline' && (
        <div className="flex-1 overflow-auto">
          {/* Jobs Atrasados */}
          {jobs.filter(j => j.deadline && new Date(j.deadline) < new Date() && j.status !== 'completed').length > 0 && (
            <Card className="mb-4 border-red-200 bg-red-50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Jobs Atrasados
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex flex-wrap gap-2">
                  {jobs.filter(j => j.deadline && new Date(j.deadline) < new Date() && j.status !== 'completed').map(job => (
                    <div 
                      key={job.id}
                      className="p-2 bg-white rounded-lg border border-red-200 cursor-pointer hover:border-red-400 transition-colors"
                      onClick={() => openJobDetail(job)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={PRIORITY_COLORS[job.priority]} variant="secondary">
                          {PRIORITY_LABELS[job.priority]}
                        </Badge>
                        <span className="text-xs font-mono text-gray-500">{job.jobNumber}</span>
                      </div>
                      <p className="font-medium text-sm mt-1 line-clamp-1">{job.title}</p>
                      <p className="text-xs text-red-600 mt-1">
                        Prazo: {format(new Date(job.deadline!), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Timeline por Data */}
          <div className="space-y-4">
            {/* Agrupar jobs por deadline */}
            {(() => {
              const jobsWithDeadline = jobs.filter(j => j.deadline && j.status !== 'completed');
              const grouped = jobsWithDeadline.reduce((acc, job) => {
                const dateKey = format(new Date(job.deadline!), 'yyyy-MM-dd');
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(job);
                return acc;
              }, {} as Record<string, Job[]>);
              
              const sortedDates = Object.keys(grouped).sort();
              const today = format(new Date(), 'yyyy-MM-dd');
              
              return sortedDates.filter(date => date >= today).map(date => {
                const isToday = date === today;
                const dateObj = new Date(date + 'T12:00:00');
                
                return (
                  <Card key={date} className={isToday ? 'border-[#f88910] bg-orange-50/50' : ''}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className={`h-4 w-4 ${isToday ? 'text-[#f88910]' : 'text-gray-400'}`} />
                        {format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        {isToday && <Badge className="bg-[#f88910]">Hoje</Badge>}
                        <Badge variant="secondary" className="ml-auto">{grouped[date].length} jobs</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {grouped[date].map(job => {
                          const statusCol = STATUS_COLUMNS.find(c => c.id === job.status);
                          const leader = job.assignees?.find(a => a.role === 'lead');
                          
                          return (
                            <div 
                              key={job.id}
                              className="p-3 bg-white rounded-lg border hover:border-[#f88910] cursor-pointer transition-colors"
                              onClick={() => openJobDetail(job)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono text-gray-500">{job.jobNumber}</span>
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${statusCol?.color || 'bg-gray-300'}`} />
                                  <span className="text-xs text-gray-500">{statusCol?.label}</span>
                                </div>
                              </div>
                              <p className="font-medium text-sm line-clamp-1">{job.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{job.clientName}</p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge className={PRIORITY_COLORS[job.priority]} variant="secondary">
                                  {PRIORITY_LABELS[job.priority]}
                                </Badge>
                                {leader && (
                                  <span className="text-xs text-[#f88910]">{leader.userName}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
            
            {/* Jobs sem deadline */}
            {jobs.filter(j => !j.deadline && j.status !== 'completed').length > 0 && (
              <Card className="border-gray-200">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-gray-500">
                    <Clock className="h-4 w-4" />
                    Sem Prazo Definido
                    <Badge variant="secondary" className="ml-auto">{jobs.filter(j => !j.deadline && j.status !== 'completed').length} jobs</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {jobs.filter(j => !j.deadline && j.status !== 'completed').map(job => (
                      <div 
                        key={job.id}
                        className="p-3 bg-white rounded-lg border hover:border-[#f88910] cursor-pointer transition-colors"
                        onClick={() => openJobDetail(job)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-gray-500">{job.jobNumber}</span>
                          <Badge className={PRIORITY_COLORS[job.priority]} variant="secondary">
                            {PRIORITY_LABELS[job.priority]}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm line-clamp-1">{job.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{job.clientName}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Diálogo de Criar Job */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Demanda Criativa</DialogTitle>
            <DialogDescription>Preencha os dados da nova demanda de trabalho</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Tipo de Briefing */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Label className="font-medium text-[#f88910]">Tipo de Trabalho *</Label>
              <Select
                value={formData.briefingType}
                onValueChange={(v) => setFormData(prev => ({ ...prev, briefingType: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione o tipo de serviço" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.briefingType} value={t.briefingType}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">O briefing específico será liberado após a criação</p>
            </div>
            
            <div>
              <Label htmlFor="title">Título do Trabalho *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Identidade Visual - Nome da Marca"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Cliente *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="clientCompany">Empresa</Label>
                <Input
                  id="clientCompany"
                  value={formData.clientCompany}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientCompany: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientEmail">E-mail</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="clientWhatsapp">WhatsApp</Label>
                <Input
                  id="clientWhatsapp"
                  value={formData.clientWhatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientWhatsapp: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deadline">Prazo</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Múltiplos Responsáveis */}
            <div>
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Equipe Responsável
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedAssignees.map(a => (
                  <Badge 
                    key={a.userId} 
                    variant="secondary" 
                    className={`cursor-pointer ${a.role === 'lead' ? 'bg-[#f88910] text-white' : ''}`}
                    onClick={() => toggleAssigneeRole(a.userId)}
                  >
                    {a.userName}
                    {a.role === 'lead' && ' (Líder)'}
                    <X 
                      className="h-3 w-3 ml-1 hover:text-red-500" 
                      onClick={(e) => { e.stopPropagation(); removeAssignee(a.userId); }}
                    />
                  </Badge>
                ))}
              </div>
              <Select
                value=""
                onValueChange={addAssignee}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Adicionar membro à equipe" />
                </SelectTrigger>
                <SelectContent>
                  {team.filter(m => !selectedAssignees.find(a => a.userId === m.id)).map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Clique em um membro para definir como líder</p>
            </div>
            
            <div>
              <Label htmlFor="internalNotes">Observações Internas</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateJob} className="bg-[#f88910] hover:bg-[#e07800]">
              Criar Demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Detalhes do Job */}
      <Dialog open={isJobDetailOpen} onOpenChange={(open) => { setIsJobDetailOpen(open); if (!open) setIsEditMode(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedJob && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 font-mono">{selectedJob.jobNumber}</span>
                      <Badge className={PRIORITY_COLORS[selectedJob.priority]} variant="secondary">
                        {PRIORITY_LABELS[selectedJob.priority]}
                      </Badge>
                      {selectedJob.proposal && (
                        <Badge variant="outline" className="text-[#f88910] border-[#f88910]">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {selectedJob.proposal.proposalCode || selectedJob.proposal.proposalNumber}
                        </Badge>
                      )}
                    </div>
                    {isEditMode ? (
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-2 text-xl font-semibold"
                      />
                    ) : (
                      <DialogTitle className="text-xl mt-1">{selectedJob.title}</DialogTitle>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditMode ? (
                      <>
                        <Button variant="outline" onClick={() => setIsEditMode(false)}>Cancelar</Button>
                        <Button onClick={handleSaveEdit} className="bg-[#f88910] hover:bg-[#e07800]">
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" onClick={() => setIsEditMode(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    <Select
                      value={selectedJob.status}
                      onValueChange={handleUpdateStatus}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_COLUMNS.map(col => (
                          <SelectItem key={col.id} value={col.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${col.color}`} />
                              {col.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogHeader>
              
              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="checklist">Tarefas</TabsTrigger>
                  <TabsTrigger value="comments" className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span className="hidden sm:inline">Chat</span>
                    {comments.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-xs">{comments.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    <span className="hidden sm:inline">Anexos</span>
                    {attachments.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-xs">{attachments.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="briefing">Briefing</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                </TabsList>
                
                <ScrollArea className="flex-1 mt-4">
                  {/* Tab Informações */}
                  <TabsContent value="info" className="space-y-4 m-0">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 space-y-2">
                          {isEditMode ? (
                            <>
                              <div>
                                <Label className="text-xs text-gray-500">Nome *</Label>
                                <Input
                                  value={formData.clientName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Empresa</Label>
                                <Input
                                  value={formData.clientCompany}
                                  onChange={(e) => setFormData(prev => ({ ...prev, clientCompany: e.target.value }))}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">E-mail</Label>
                                <Input
                                  value={formData.clientEmail}
                                  onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">WhatsApp</Label>
                                <Input
                                  value={formData.clientWhatsapp}
                                  onChange={(e) => setFormData(prev => ({ ...prev, clientWhatsapp: e.target.value }))}
                                  className="h-8"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <Label className="text-xs text-gray-500">Nome</Label>
                                <p className="font-medium">{selectedJob.clientName}</p>
                              </div>
                              {selectedJob.clientCompany && (
                                <div>
                                  <Label className="text-xs text-gray-500">Empresa</Label>
                                  <p>{selectedJob.clientCompany}</p>
                                </div>
                              )}
                              {selectedJob.clientEmail && (
                                <div>
                                  <Label className="text-xs text-gray-500">E-mail</Label>
                                  <p>{selectedJob.clientEmail}</p>
                                </div>
                              )}
                              {selectedJob.clientWhatsapp && (
                                <div>
                                  <Label className="text-xs text-gray-500">WhatsApp</Label>
                                  <p>{selectedJob.clientWhatsapp}</p>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">Detalhes</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 space-y-2">
                          {isEditMode ? (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs text-gray-500">Prioridade</Label>
                                  <Select
                                    value={formData.priority}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">Prazo</Label>
                                  <Input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-gray-500">Prioridade</Label>
                                <Badge className={PRIORITY_COLORS[selectedJob.priority]}>
                                  {PRIORITY_LABELS[selectedJob.priority]}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Prazo</Label>
                                <p>{selectedJob.deadline ? format(new Date(selectedJob.deadline), 'dd/MM/yyyy') : 'Não definido'}</p>
                              </div>
                            </div>
                          )}
                          <div>
                            <Label className="text-xs text-gray-500">Criado em</Label>
                            <p>{format(new Date(selectedJob.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Equipe Responsável */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Equipe Responsável
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        {isEditMode ? (
                          <>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {selectedAssignees.map(a => (
                                <Badge 
                                  key={a.userId} 
                                  variant="secondary" 
                                  className={`cursor-pointer ${a.role === 'lead' ? 'bg-[#f88910] text-white' : ''}`}
                                  onClick={() => toggleAssigneeRole(a.userId)}
                                >
                                  {a.userName}
                                  {a.role === 'lead' && ' (Líder)'}
                                  <X 
                                    className="h-3 w-3 ml-1 hover:text-red-500" 
                                    onClick={(e) => { e.stopPropagation(); removeAssignee(a.userId); }}
                                  />
                                </Badge>
                              ))}
                              {selectedAssignees.length === 0 && (
                                <span className="text-gray-400 text-sm">Nenhum responsável</span>
                              )}
                            </div>
                            <Select value="" onValueChange={addAssignee}>
                              <SelectTrigger>
                                <SelectValue placeholder="Adicionar membro" />
                              </SelectTrigger>
                              <SelectContent>
                                {team.filter(m => !selectedAssignees.find(a => a.userId === m.id)).map(member => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name || member.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedJob.assignees?.map(a => (
                              <Badge 
                                key={a.id} 
                                variant="secondary"
                                className={a.role === 'lead' ? 'bg-[#f88910] text-white' : ''}
                              >
                                <User className="h-3 w-3 mr-1" />
                                {a.userName}
                                {a.role === 'lead' && ' (Líder)'}
                              </Badge>
                            ))}
                            {selectedJob.assignedTo && !selectedJob.assignees?.find(a => a.userId === selectedJob.assignedTo) && (
                              <Badge variant="secondary">
                                <User className="h-3 w-3 mr-1" />
                                {selectedJob.assignedName}
                              </Badge>
                            )}
                            {!selectedJob.assignees?.length && !selectedJob.assignedTo && (
                              <span className="text-gray-400 text-sm">Nenhum responsável definido</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {selectedJob.services && selectedJob.services.length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">Serviços Vinculados</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <div className="space-y-2">
                            {selectedJob.services?.map(service => (
                              <div key={service.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span>{service.serviceName}</span>
                                <Badge variant="secondary">Qtd: {service.quantity}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Observações Internas</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        {isEditMode ? (
                          <Textarea
                            value={formData.internalNotes}
                            onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                            rows={4}
                            placeholder="Adicione observações internas sobre o trabalho..."
                          />
                        ) : (
                          <p className="text-gray-600 whitespace-pre-wrap">
                            {selectedJob.internalNotes || 'Nenhuma observação'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Tab Checklist/Tarefas */}
                  <TabsContent value="checklist" className="space-y-4 m-0">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Nova Tarefa</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 space-y-2">
                        <Input
                          placeholder="Descrição da tarefa..."
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={newChecklistAssignee} onValueChange={setNewChecklistAssignee}>
                            <SelectTrigger>
                              <SelectValue placeholder="Responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Sem responsável</SelectItem>
                              {team.map(member => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name || member.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            value={newChecklistDueDate}
                            onChange={(e) => setNewChecklistDueDate(e.target.value)}
                            placeholder="Prazo"
                          />
                        </div>
                        <Button 
                          onClick={handleAddChecklistItem} 
                          className="w-full bg-[#f88910] hover:bg-[#e07800]"
                          disabled={!newChecklistItem.trim()}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Tarefa
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <div className="space-y-2">
                      {(!selectedJob.checklist || selectedJob.checklist.length === 0) ? (
                        <p className="text-center text-gray-500 py-8">Nenhuma tarefa cadastrada</p>
                      ) : (
                        selectedJob.checklist?.map(item => (
                          <Card
                            key={item.id}
                            className={`${
                              item.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'
                            }`}
                          >
                            <CardContent className="py-3">
                              {editingChecklistItem === item.id ? (
                                <div className="space-y-2">
                                  <Input
                                    defaultValue={item.title}
                                    id={`edit-title-${item.id}`}
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Select
                                      defaultValue={item.assignedToId || ''}
                                      onValueChange={(v) => {
                                        const member = team.find(m => m.id === v);
                                        handleUpdateChecklistItem(item.id, {
                                          assignedToId: v || null,
                                          assignedToName: member?.name || null,
                                        });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Responsável" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="">Sem responsável</SelectItem>
                                        {team.map(member => (
                                          <SelectItem key={member.id} value={member.id}>
                                            {member.name || member.email}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="date"
                                      defaultValue={item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : ''}
                                      onChange={(e) => {
                                        handleUpdateChecklistItem(item.id, {
                                          dueDate: e.target.value || null,
                                        });
                                      }}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const input = document.getElementById(`edit-title-${item.id}`) as HTMLInputElement;
                                        handleUpdateChecklistItem(item.id, { title: input.value });
                                      }}
                                      className="bg-[#f88910] hover:bg-[#e07800]"
                                    >
                                      Salvar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingChecklistItem(null)}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={item.isCompleted}
                                    onCheckedChange={(checked) => handleToggleChecklistItem(item.id, !!checked)}
                                  />
                                  <div className="flex-1">
                                    <p className={item.isCompleted ? 'line-through text-gray-500' : ''}>
                                      {item.title}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                      {item.assignedToName && (
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          {item.assignedToName}
                                        </span>
                                      )}
                                      {item.dueDate && (
                                        <span className={`flex items-center gap-1 ${
                                          new Date(item.dueDate) < new Date() && !item.isCompleted ? 'text-red-500' : ''
                                        }`}>
                                          <Calendar className="h-3 w-3" />
                                          {format(new Date(item.dueDate), 'dd/MM')}
                                        </span>
                                      )}
                                      {item.completedAt && (
                                        <span className="text-green-600">
                                          Concluído {item.completedByName ? `por ${item.completedByName}` : ''} em {format(new Date(item.completedAt), 'dd/MM HH:mm')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingChecklistItem(item.id)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() => handleDeleteChecklistItem(item.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Tab Comentários */}
                  <TabsContent value="comments" className="space-y-4 m-0">
                    {/* Novo comentário */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Escreva um comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1"
                        rows={2}
                      />
                      <Button 
                        onClick={handleAddComment} 
                        disabled={!newComment.trim()}
                        className="bg-[#f88910] hover:bg-[#e07800]"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Lista de comentários */}
                    <div className="space-y-3">
                      {isLoadingComments ? (
                        <div className="flex justify-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-[#f88910]/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-[#f88910]">
                                {comment.userName?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{comment.userName}</span>
                                  {comment.isEdited && (
                                    <span className="text-xs text-gray-400">(editado)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">
                                    {format(new Date(comment.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-400 hover:text-red-500"
                                    onClick={() => handleDeleteComment(comment.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
                              {comment.attachment && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                  <Paperclip className="h-3 w-3" />
                                  {comment.attachment.fileName}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">Nenhum comentário ainda. Seja o primeiro!</p>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Tab Anexos */}
                  <TabsContent value="attachments" className="space-y-4 m-0">
                    {/* Upload de anexo */}
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                          <Select value={attachmentCategory} onValueChange={setAttachmentCategory}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">Geral</SelectItem>
                              <SelectItem value="reference">Referência</SelectItem>
                              <SelectItem value="delivery">Entrega</SelectItem>
                              <SelectItem value="feedback">Feedback</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <label className="flex-1">
                            <div className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
                              isUploadingAttachment ? 'bg-gray-100' : 'hover:border-[#f88910] hover:bg-orange-50'
                            }`}>
                              {isUploadingAttachment ? (
                                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                              ) : (
                                <>
                                  <Upload className="h-5 w-5 text-gray-400" />
                                  <span className="text-sm text-gray-500">Clique para anexar arquivo (máx 50MB)</span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              onChange={handleUploadAttachment}
                              disabled={isUploadingAttachment}
                            />
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Lista de anexos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attachments.length > 0 ? (
                        attachments.map((attachment) => {
                          const FileIcon = getFileIcon(attachment.fileType);
                          return (
                            <Card key={attachment.id} className="group">
                              <CardContent className="pt-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    {attachment.fileType.startsWith('image/') ? (
                                      <Image className="h-5 w-5 text-blue-500" />
                                    ) : (
                                      <FileIcon className="h-5 w-5 text-gray-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{attachment.fileName}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                      <span>{formatFileSize(attachment.fileSize)}</span>
                                      <span>•</span>
                                      <Badge variant="outline" className="text-xs">
                                        {attachment.category === 'general' ? 'Geral' : 
                                         attachment.category === 'reference' ? 'Referência' :
                                         attachment.category === 'delivery' ? 'Entrega' : 'Feedback'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Por {attachment.userName} • {format(new Date(attachment.createdAt), "dd/MM 'às' HH:mm")}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {attachment.url && (
                                      <a 
                                        href={attachment.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        download={attachment.fileName}
                                      >
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </a>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-red-500"
                                      onClick={() => handleDeleteAttachment(attachment.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      ) : (
                        <div className="col-span-2 text-center text-gray-500 py-8">
                          <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>Nenhum arquivo anexado</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Tab Briefing */}
                  <TabsContent value="briefing" className="space-y-4 m-0">
                    <div>
                      <Label>Tipo de Briefing</Label>
                      <Select
                        value={selectedBriefingType}
                        onValueChange={setSelectedBriefingType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(t => (
                            <SelectItem key={t.briefingType} value={t.briefingType}>
                              {t.name}
                              {selectedJob.briefings?.find(b => b.briefingType === t.briefingType) && (
                                <span className="text-green-600 ml-2">✓</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedBriefingType && (
                      <div className="space-y-6">
                        {templates.find(t => t.briefingType === selectedBriefingType)?.structure.map((section, sIdx) => (
                          <Card key={sIdx}>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm">{section.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {section.questions.map(q => (
                                <div key={q.id}>
                                  <Label className="text-sm">{q.label}</Label>
                                  {q.type === 'textarea' ? (
                                    <Textarea
                                      value={briefingAnswers[q.id] || ''}
                                      onChange={(e) => setBriefingAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                      rows={3}
                                      className="mt-1"
                                    />
                                  ) : (
                                    <Input
                                      value={briefingAnswers[q.id] || ''}
                                      onChange={(e) => setBriefingAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                      className="mt-1"
                                    />
                                  )}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                        
                        <Button onClick={handleSaveBriefing} className="w-full bg-[#f88910] hover:bg-[#e07800]">
                          Salvar Briefing
                        </Button>
                      </div>
                    )}
                    
                    {!selectedBriefingType && (selectedJob.briefings?.length || 0) > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-500">Briefings Preenchidos:</Label>
                        {selectedJob.briefings?.map(b => (
                          <div
                            key={b.id}
                            className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100"
                            onClick={() => setSelectedBriefingType(b.briefingType)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {templates.find(t => t.briefingType === b.briefingType)?.name || b.briefingType}
                              </span>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                {b.isComplete ? 'Completo' : 'Em preenchimento'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {!selectedBriefingType && (!selectedJob.briefings || selectedJob.briefings.length === 0) && (
                      <p className="text-center text-gray-500 py-8">Selecione um tipo de briefing para começar</p>
                    )}
                  </TabsContent>
                  
                  {/* Tab Histórico */}
                  <TabsContent value="history" className="space-y-2 m-0">
                    {selectedJob.history && selectedJob.history.length > 0 ? (
                      selectedJob.history.map((entry: HistoryEntry) => (
                        <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <History className="h-4 w-4 text-gray-400 mt-1" />
                          <div className="flex-1">
                            <p className="text-sm">{entry.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">Nenhum histórico disponível</p>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
