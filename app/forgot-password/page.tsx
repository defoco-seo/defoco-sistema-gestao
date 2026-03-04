'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Digite seu email');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Digite um email válido');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (response.status === 429) {
        toast.error(data.error || 'Muitas tentativas. Aguarde antes de tentar novamente.');
        return;
      }

      if (!response.ok) {
        toast.error(data.error || 'Erro ao processar solicitação');
        return;
      }

      setSent(true);
      toast.success('Verifique seu email!');

    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative w-40 h-16">
              <Image
                src="/logo-defoco.png"
                alt="Defoco"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">
              {sent ? 'Email Enviado!' : 'Esqueci minha senha'}
            </CardTitle>
            <CardDescription className="mt-2">
              {sent 
                ? 'Verifique sua caixa de entrada e spam'
                : 'Digite seu email para receber o link de recuperação'
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-center text-gray-600">
                  Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
                </p>
                <p className="text-center text-sm text-gray-500 mt-2">
                  O link expira em <strong>1 hora</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setEmail('');
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar para outro email
                </Button>
                
                <Link href="/login" className="block">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#f88910] hover:bg-[#e67e0f]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar link de recuperação
                  </>
                )}
              </Button>

              <Link href="/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao login
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}