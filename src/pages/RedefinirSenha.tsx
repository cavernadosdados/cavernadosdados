import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import logoDragon from '@/assets/logo-dragon.png';
import logoText from '@/assets/logo-text.png';
import { Eye, EyeOff } from 'lucide-react';

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
      .max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

const RedefinirSenha = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Detectar sessão de recuperação enviada pelo Supabase via URL hash
  useEffect(() => {
    let resolved = false;

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        resolved = true;
        setRecoveryReady(true);
      }
    });

    // Fallback: se já existe sessão (link já consumido) permite redefinir
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        resolved = true;
        setRecoveryReady(true);
      }
    });

    // Se nada acontecer em 2s e não houver sessão, considere link inválido
    const timeout = setTimeout(() => {
      if (!resolved) setLinkInvalid(true);
    }, 2500);

    return () => {
      clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    try {
      passwordSchema.parse({ password, confirmPassword });

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi atualizada com sucesso.',
      });
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao redefinir senha',
          description: 'O link pode ter expirado. Solicite um novo e tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-green-deep/20 to-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={logoDragon} alt="Dragon Logo" className="h-16 w-auto animate-float" />
            <img src={logoText} alt="Caverna dos Dados" className="h-10 w-auto" />
          </div>
          <p className="text-muted-foreground">Defina uma nova senha</p>
        </div>

        <Card className="border-2 border-primary/30 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Redefinir senha</CardTitle>
            <CardDescription className="text-center">
              Escolha uma nova senha para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linkInvalid && !recoveryReady ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Este link de redefinição é inválido ou expirou. Solicite um novo link
                  para continuar.
                </p>
                <Button
                  onClick={() => navigate('/esqueci-senha')}
                  variant="hero"
                  className="w-full"
                >
                  Solicitar novo link
                </Button>
              </div>
            ) : !recoveryReady ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      required
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isLoading}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      required
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      disabled={isLoading}
                      aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                  {isLoading ? 'Atualizando...' : 'Redefinir senha'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RedefinirSenha;