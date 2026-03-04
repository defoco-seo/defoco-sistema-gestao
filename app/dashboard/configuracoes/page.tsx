'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Upload, Save, Trash2, Eye, Download } from 'lucide-react';
import Image from 'next/image';
import { CustomPagesManager } from '@/components/custom-pages-manager';

interface LayoutConfig {
  id: string;
  logoPath?: string | null;
  miniLogoPath?: string | null;
  coverImagePath?: string | null;
  headerFontSize: number;
  sectionFontSize: number;
  normalFontSize: number;
  introFontSize: number;
  footerFontSize: number;
  introLineSpacing: number;
  persuasiveSpacing: number;
  normalSpacing: number;
  primaryColor: string;
  footerText1?: string | null;
  footerText2?: string | null;
  footerWebsite: string;
  footerInstagram: string;
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<LayoutConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  // Preview URLs for images
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [miniLogoPreview, setMiniLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Load image previews when config changes
  useEffect(() => {
    if (config) {
      loadImagePreviews();
    }
  }, [config]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/layout-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const loadImagePreviews = async () => {
    if (!config) return;

    try {
      // Generate preview URLs via API (server-side)
      if (config.logoPath) {
        const response = await fetch('/api/layout-config/preview-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cloud_storage_path: config.logoPath, isPublic: true }),
        });
        if (response.ok) {
          const { url } = await response.json();
          setLogoPreview(url);
        }
      }
      if (config.miniLogoPath) {
        const response = await fetch('/api/layout-config/preview-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cloud_storage_path: config.miniLogoPath, isPublic: true }),
        });
        if (response.ok) {
          const { url } = await response.json();
          setMiniLogoPreview(url);
        }
      }
      if (config.coverImagePath) {
        const response = await fetch('/api/layout-config/preview-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cloud_storage_path: config.coverImagePath, isPublic: true }),
        });
        if (response.ok) {
          const { url } = await response.json();
          setCoverPreview(url);
        }
      }
    } catch (error) {
      console.error('Error loading image previews:', error);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/layout-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Configurações salvas com sucesso!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'miniLogo' | 'cover') => {
    setUploadingType(type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/layout-config/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer upload');
      }

      const data = await response.json();

      // Update config with new image path
      setConfig((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (type === 'logo') updated.logoPath = data.cloud_storage_path;
        if (type === 'miniLogo') updated.miniLogoPath = data.cloud_storage_path;
        if (type === 'cover') updated.coverImagePath = data.cloud_storage_path;
        return updated;
      });

      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Erro ao fazer upload da imagem');
    } finally {
      setUploadingType(null);
    }
  };

  const handleColorChange = (color: string) => {
    // Convert hex to RGB string
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    setConfig((prev) => prev ? { ...prev, primaryColor: `${r},${g},${b}` } : prev);
  };

  const getCurrentColor = () => {
    if (!config) return '#f88910';
    const [r, g, b] = config.primaryColor.split(',').map(Number);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const removeImage = (type: 'logo' | 'miniLogo' | 'cover') => {
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (type === 'logo') {
        updated.logoPath = null;
        setLogoPreview(null);
      }
      if (type === 'miniLogo') {
        updated.miniLogoPath = null;
        setMiniLogoPreview(null);
      }
      if (type === 'cover') {
        updated.coverImagePath = null;
        setCoverPreview(null);
      }
      return updated;
    });
    toast.success('Imagem removida');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f88910] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Erro ao carregar configurações</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações de Layout</h1>
          <p className="text-gray-600 mt-2">Personalize a aparência das suas propostas em PDF</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="bg-[#f88910] hover:bg-[#e07805]">
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imagens */}
        <Card>
          <CardHeader>
            <CardTitle>Imagens</CardTitle>
            <CardDescription>
              Defina as imagens padrão que serão usadas nas propostas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Principal */}
            <div>
              <Label className="text-base font-semibold">Logo Principal</Label>
              <p className="text-sm text-gray-500 mb-3">Usado no cabeçalho do PDF</p>
              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                    <Image
                      src={logoPreview}
                      alt="Logo"
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                    disabled={uploadingType === 'logo'}
                    className="text-sm"
                  />
                  {logoPreview && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage('logo')}
                      disabled={uploadingType === 'logo'}>
                      <Trash2 className="h-3 w-3 mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Logo Mini */}
            <div>
              <Label className="text-base font-semibold">Logo Mini</Label>
              <p className="text-sm text-gray-500 mb-3">Usado no topo das páginas internas</p>
              <div className="flex items-start gap-4">
                {miniLogoPreview ? (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                    <Image
                      src={miniLogoPreview}
                      alt="Logo Mini"
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'miniLogo')}
                    disabled={uploadingType === 'miniLogo'}
                    className="text-sm"
                  />
                  {miniLogoPreview && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage('miniLogo')}
                      disabled={uploadingType === 'miniLogo'}>
                      <Trash2 className="h-3 w-3 mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Capa Padrão */}
            <div>
              <Label className="text-base font-semibold">Capa Padrão</Label>
              <p className="text-sm text-gray-500 mb-3">Imagem da capa A4 das propostas</p>
              <div className="flex items-start gap-4">
                {coverPreview ? (
                  <div className="relative w-32 h-44 border rounded-lg overflow-hidden bg-gray-50">
                    <Image
                      src={coverPreview}
                      alt="Capa"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-44 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                    disabled={uploadingType === 'cover'}
                    className="text-sm"
                  />
                  {coverPreview && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage('cover')}
                      disabled={uploadingType === 'cover'}>
                      <Trash2 className="h-3 w-3 mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tamanhos de Fonte */}
        <Card>
          <CardHeader>
            <CardTitle>Tamanhos de Fonte</CardTitle>
            <CardDescription>
              Ajuste o tamanho dos textos no PDF (em pontos)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headerFontSize">Título Principal</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="headerFontSize"
                  type="number"
                  min="14"
                  max="32"
                  value={config.headerFontSize}
                  onChange={(e) => setConfig({ ...config, headerFontSize: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">{config.headerFontSize}pt</span>
                <input
                  type="range"
                  min="14"
                  max="32"
                  value={config.headerFontSize}
                  onChange={(e) => setConfig({ ...config, headerFontSize: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sectionFontSize">Títulos de Seção</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="sectionFontSize"
                  type="number"
                  min="12"
                  max="20"
                  value={config.sectionFontSize}
                  onChange={(e) => setConfig({ ...config, sectionFontSize: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">{config.sectionFontSize}pt</span>
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={config.sectionFontSize}
                  onChange={(e) => setConfig({ ...config, sectionFontSize: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="normalFontSize">Texto Normal</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="normalFontSize"
                  type="number"
                  min="10"
                  max="16"
                  value={config.normalFontSize}
                  onChange={(e) => setConfig({ ...config, normalFontSize: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">{config.normalFontSize}pt</span>
                <input
                  type="range"
                  min="10"
                  max="16"
                  value={config.normalFontSize}
                  onChange={(e) => setConfig({ ...config, normalFontSize: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="introFontSize">Texto de Introdução</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="introFontSize"
                  type="number"
                  min="10"
                  max="18"
                  value={config.introFontSize}
                  onChange={(e) => setConfig({ ...config, introFontSize: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">{config.introFontSize}pt</span>
                <input
                  type="range"
                  min="10"
                  max="18"
                  value={config.introFontSize}
                  onChange={(e) => setConfig({ ...config, introFontSize: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="footerFontSize">Texto do Rodapé</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="footerFontSize"
                  type="number"
                  min="7"
                  max="12"
                  value={config.footerFontSize}
                  onChange={(e) => setConfig({ ...config, footerFontSize: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">{config.footerFontSize}pt</span>
                <input
                  type="range"
                  min="7"
                  max="12"
                  value={config.footerFontSize}
                  onChange={(e) => setConfig({ ...config, footerFontSize: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Espaçamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Espaçamentos</CardTitle>
            <CardDescription>
              Ajuste o espaçamento entre linhas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="introLineSpacing">Introdução</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="introLineSpacing"
                  type="number"
                  min="5"
                  max="12"
                  value={config.introLineSpacing}
                  onChange={(e) => setConfig({ ...config, introLineSpacing: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">×{config.introLineSpacing}</span>
                <input
                  type="range"
                  min="5"
                  max="12"
                  value={config.introLineSpacing}
                  onChange={(e) => setConfig({ ...config, introLineSpacing: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="persuasiveSpacing">Texto Persuasivo</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="persuasiveSpacing"
                  type="number"
                  min="5"
                  max="12"
                  value={config.persuasiveSpacing}
                  onChange={(e) => setConfig({ ...config, persuasiveSpacing: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">×{config.persuasiveSpacing}</span>
                <input
                  type="range"
                  min="5"
                  max="12"
                  value={config.persuasiveSpacing}
                  onChange={(e) => setConfig({ ...config, persuasiveSpacing: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="normalSpacing">Texto Normal</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="normalSpacing"
                  type="number"
                  min="4"
                  max="10"
                  value={config.normalSpacing}
                  onChange={(e) => setConfig({ ...config, normalSpacing: parseInt(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">×{config.normalSpacing}</span>
                <input
                  type="range"
                  min="4"
                  max="10"
                  value={config.normalSpacing}
                  onChange={(e) => setConfig({ ...config, normalSpacing: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cores */}
        <Card>
          <CardHeader>
            <CardTitle>Cores</CardTitle>
            <CardDescription>
              Personalize as cores usadas no PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="primaryColor">Cor Primária (Laranja Defoco)</Label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="color"
                  id="primaryColor"
                  value={getCurrentColor()}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-20 h-12 rounded border cursor-pointer"
                />
                <div className="flex-1">
                  <Input
                    type="text"
                    value={getCurrentColor()}
                    readOnly
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    RGB: {config.primaryColor}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Textos do Rodapé */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Textos do Rodapé</CardTitle>
            <CardDescription>
              Personalize os textos que aparecem no rodapé de todas as páginas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="footerText1">Linha 1 (Endereço e Informações)</Label>
              <Textarea
                id="footerText1"
                value={config.footerText1 || ''}
                onChange={(e) => setConfig({ ...config, footerText1: e.target.value })}
                rows={2}
                className="mt-2"
                placeholder="Defoco - Design de Resultados | Av. Paulista, 1471 - CONJ 275, CEP: 01.311-927 - Bela Vista"
              />
            </div>

            <div>
              <Label htmlFor="footerText2">Linha 2 (Contatos)</Label>
              <Textarea
                id="footerText2"
                value={config.footerText2 || ''}
                onChange={(e) => setConfig({ ...config, footerText2: e.target.value })}
                rows={2}
                className="mt-2"
                placeholder="Tel: (11) 97251-5822 | Fone: (11) 2452-1305 | defoco@defoco.com.br"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="footerWebsite">Website</Label>
                <Input
                  id="footerWebsite"
                  value={config.footerWebsite}
                  onChange={(e) => setConfig({ ...config, footerWebsite: e.target.value })}
                  className="mt-2"
                  placeholder="www.defoco.com.br"
                />
              </div>

              <div>
                <Label htmlFor="footerInstagram">Instagram</Label>
                <Input
                  id="footerInstagram"
                  value={config.footerInstagram}
                  onChange={(e) => setConfig({ ...config, footerInstagram: e.target.value })}
                  className="mt-2"
                  placeholder="Instagram: https://www.instagram.com/defoco/"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Páginas Customizadas */}
        <div className="lg:col-span-2">
          <CustomPagesManager />
        </div>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-8 right-8">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="bg-[#f88910] hover:bg-[#e07805] shadow-lg">
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
