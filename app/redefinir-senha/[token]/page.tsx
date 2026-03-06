'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, Lock } from 'lucide-react';

export default function RedefinirSenhaPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validação de senha
  const passwordValidation = {
    length: password.length >= 6,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    matches: password === confirmPassword && password.length > 0
  };

  const isPasswordValid = passwordValidation.length && 
                          passwordValidation.hasLetter && 
                          passwordValidation.hasNumber && 
                          passwordValidation.matches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error('Verifique os requisitos da senha');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao redefinir senha');
        return;
      }

      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');

      // Redirecionar após 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);

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
              {success ? 'Senha Redefinida!' : 'Redefinir Senha'}
            </CardTitle>
            <CardDescription className="mt-2">
              {success 
                ? 'Você será redirecionado para o login'
                : 'Digite sua nova senha'
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-center text-gray-600">
                  Sua senha foi alterada com sucesso.
                </p>
                <p className="text-center text-sm text-gray-500 mt-2">
                  Redirecionando para o login...
                </p>
              </div>

              <Link href="/login" className="block">
                <Button className="w-full bg-[#f88910] hover:bg-[#e67e0f]">
                  Ir para o Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nova Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Requisitos da Senha */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Requisitos da senha:</p>
                <ul className="space-y-1">
                  <li className={`text-sm flex items-center gap-2 ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordValidation.length ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {passwordValidation.length ? '✓' : ''}
                    </span>
                    Mínimo 6 caracteres
                  </li>
                  <li className={`text-sm flex items-center gap-2 ${passwordValidation.hasLetter ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordValidation.hasLetter ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {passwordValidation.hasLetter ? '✓' : ''}
                    </span>
                    Pelo menos uma letra
                  </li>
                  <li className={`text-sm flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordValidation.hasNumber ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {passwordValidation.hasNumber ? '✓' : ''}
                    </span>
                    Pelo menos um número
                  </li>
                  <li className={`text-sm flex items-center gap-2 ${passwordValidation.matches ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordValidation.matches ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {passwordValidation.matches ? '✓' : ''}
                    </span>
                    Senhas coincidem
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#f88910] hover:bg-[#e67e0f]"
                disabled={loading || !isPasswordValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Redefinir Senha
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