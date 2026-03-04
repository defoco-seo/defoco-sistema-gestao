"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Email ou senha inválidos');
        setIsLoading(false);
        return;
      }

      toast.success('Login realizado com sucesso!');
      router.replace('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-40 h-20">
              <Image
                src="/logo-defoco.png"
                alt="Defoco Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-600 mt-1">
                Acesse o sistema de propostas
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link 
                  href="/esqueci-senha" 
                  className="text-sm text-[#f88910] hover:text-[#e07800] hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#f88910] hover:bg-[#e07800] text-white font-semibold py-6 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

          </form>

          <div className="text-center text-sm text-gray-600 mt-6">
            Não tem uma conta?{' '}
            <Link
              href="/signup"
              className="text-[#f88910] hover:text-[#e07800] font-semibold"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}