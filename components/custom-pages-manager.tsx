'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Trash2, Plus, Eye } from 'lucide-react';
import Image from 'next/image';
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

interface CustomPage {
  id: string;
  imagePath: string;
  pagePosition: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function CustomPagesManager() {
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  
  // New page form
  const [newPagePosition, setNewPagePosition] = useState<number>(1);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    loadCustomPages();
  }, []);

  const loadCustomPages = async () => {
    try {
      const response = await fetch('/api/custom-pages');
      if (response.ok) {
        const data = await response.json();
        setCustomPages(data);
      }
    } catch (error) {
      console.error('Error loading custom pages:', error);
      toast.error('Erro ao carregar páginas customizadas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/custom-pages/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer upload');
      }

      const data = await response.json();
      setUploadedImagePath(data.cloud_storage_path);
      
      // Show preview via API (server-side)
      const previewResponse = await fetch('/api/layout-config/preview-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path: data.cloud_storage_path, isPublic: true }),
      });
      if (previewResponse.ok) {
        const { url } = await previewResponse.json();
        setImagePreview(url);
      }
      
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPage = async () => {
    if (!uploadedImagePath) {
      toast.error('Por favor, faça upload de uma imagem primeiro');
      return;
    }

    if (!newPagePosition || newPagePosition < 1) {
      toast.error('Posição da página deve ser maior que 0');
      return;
    }

    try {
      const response = await fetch('/api/custom-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath: uploadedImagePath,
          pagePosition: newPagePosition,
          active: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar página');
      }

      toast.success('Página customizada adicionada!');
      
      // Reset form
      setUploadedImagePath(null);
      setImagePreview(null);
      setNewPagePosition(1);
      
      // Reload pages
      loadCustomPages();
    } catch (error) {
      console.error('Error adding page:', error);
      toast.error('Erro ao adicionar página');
    }
  };

  const handleDeleteClick = (pageId: string) => {
    setSelectedPageId(pageId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPageId) return;

    setDeletingId(selectedPageId);
    try {
      const response = await fetch(`/api/custom-pages/${selectedPageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar página');
      }

      toast.success('Página customizada deletada!');
      setDeleteDialogOpen(false);
      loadCustomPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Erro ao deletar página');
    } finally {
      setDeletingId(null);
      setSelectedPageId(null);
    }
  };

  const handleToggleActive = async (pageId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/custom-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar página');
      }

      toast.success('Status atualizado!');
      loadCustomPages();
    } catch (error) {
      console.error('Error toggling active:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#f88910]">Páginas Customizadas de Propaganda</CardTitle>
        <CardDescription>
          Adicione páginas de propaganda que serão inseridas em posições específicas no PDF.
          Posição 1 = após a capa, Posição 2 = segunda página após a capa, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Page Form */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Adicionar Nova Página</h3>
          
          <div className="space-y-2">
            <Label htmlFor="custom-page-upload">Upload da Imagem (A4, máx 10MB)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="custom-page-upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              {imagePreview && (
                <div className="relative w-20 h-28 border rounded">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover rounded"
                  />
                </div>
              )}
            </div>
            {isUploading && <p className="text-sm text-gray-500">Fazendo upload...</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-position">Posição da Página</Label>
            <Input
              id="page-position"
              type="number"
              min="1"
              value={newPagePosition}
              onChange={(e) => setNewPagePosition(parseInt(e.target.value) || 1)}
              placeholder="1"
            />
            <p className="text-xs text-gray-500">
              1 = Logo após a capa, 2 = Segunda página após a capa, etc.
            </p>
          </div>

          <Button
            onClick={handleAddPage}
            disabled={!uploadedImagePath || isUploading}
            className="bg-[#f88910] hover:bg-[#e67d0f]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Página
          </Button>
        </div>

        {/* List of Custom Pages */}
        <div className="space-y-2">
          <h3 className="font-semibold">Páginas Configuradas</h3>
          
          {customPages.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nenhuma página customizada adicionada.</p>
          ) : (
            <div className="space-y-2">
              {customPages.map((page) => (
                <PageItem
                  key={page.id}
                  page={page}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDeleteClick}
                  isDeleting={deletingId === page.id}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta página? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={!!deletingId}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PageItem({
  page,
  onToggleActive,
  onDelete,
  isDeleting,
}: {
  page: CustomPage;
  onToggleActive: (id: string, currentActive: boolean) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [page.imagePath]);

  const loadPreview = async () => {
    try {
      // Generate preview URL via API (server-side)
      const response = await fetch('/api/layout-config/preview-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path: page.imagePath, isPublic: true }),
      });
      if (response.ok) {
        const { url } = await response.json();
        setPreview(url);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg">
      <div className="relative w-16 h-20 border rounded">
        {preview && (
          <Image
            src={preview}
            alt={`Página ${page.pagePosition}`}
            fill
            className="object-cover rounded"
          />
        )}
      </div>
      
      <div className="flex-1">
        <p className="font-medium">Posição: {page.pagePosition}</p>
        <p className="text-xs text-gray-500">
          Status: {page.active ? 'Ativa' : 'Inativa'}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggleActive(page.id, page.active)}
        >
          {page.active ? 'Desativar' : 'Ativar'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(page.id)}
          disabled={isDeleting}
          className="text-red-600 border-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview Modal */}
      {showPreview && preview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-4xl max-h-screen p-4">
            <Image
              src={preview}
              alt={`Página ${page.pagePosition}`}
              width={800}
              height={1000}
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
