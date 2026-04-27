import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import logoDragon from '@/assets/logo-dragon.png';
import logoText from '@/assets/logo-text.png';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { issuePasswordResetNonce } from '@/lib/passwordResetNonce';

const emailSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255),
});

const EsqueciSenha = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      emailSchema.parse({ email });

      // Emite um nonce anti-CSRF/anti-replay neste browser ANTES de disparar
      // o e-mail. A página de redefinição exige que o nonce esteja presente
      // e válido, garantindo que o link só funcione no mesmo dispositivo que
      // o solicitou.
      issuePasswordResetNonce();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) throw error;

      // Sempre mostrar sucesso (evita revelar se o e-mail existe)
      setSent(true);
      toast({
        title: 'Verifique seu e-mail',
        description: 'Se houver uma conta com esse e-mail, enviamos um link de redefinição.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        // Mesmo em erro genérico, não revelar existência de conta
        setSent(true);
        toast({
          title: 'Verifique seu e-mail',
          description: 'Se houver uma conta com esse e-mail, enviamos um link de redefinição.',
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
          <p className="text-muted-foreground">Recupere o acesso à sua conta</p>
        </div>

        <Card className="border-2 border-primary/30 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Esqueci minha senha</CardTitle>
            <CardDescription className="text-center">
              {sent
                ? 'Confira sua caixa de entrada para continuar'
                : 'Digite seu e-mail e enviaremos um link para redefinir sua senha'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <MailCheck className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Se houver uma conta associada a esse e-mail, você receberá um link em
                  instantes. Não esqueça de verificar a pasta de spam.
                </p>
                <Button asChild variant="hero" className="w-full">
                  <Link to="/auth">Voltar ao login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>
                <Link
                  to="/auth"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EsqueciSenha;