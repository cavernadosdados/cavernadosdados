import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { User, Bell, CreditCard, Shield, Link as LinkIcon } from "lucide-react";

const Configuracoes = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas preferências e configurações da conta
          </p>
        </div>

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Atualize suas informações básicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <Input 
                  id="displayName" 
                  defaultValue={user?.user_metadata?.display_name}
                  placeholder="Como você quer ser chamado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  defaultValue={user?.email}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <Button>Salvar Alterações</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure suas preferências de notificação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Convites para mesas</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações quando for convidado para uma mesa
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mensagens</Label>
                <p className="text-sm text-muted-foreground">
                  Notificações de novas mensagens
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Avaliações</Label>
                <p className="text-sm text-muted-foreground">
                  Quando receber uma nova avaliação
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Newsletter</Label>
                <p className="text-sm text-muted-foreground">
                  Novidades e atualizações da plataforma
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Métodos de Pagamento
            </CardTitle>
            <CardDescription>
              Gerencie suas formas de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Nenhum método de pagamento cadastrado
            </p>
            <Button variant="outline">Adicionar Método</Button>
          </CardContent>
        </Card>

        {/* External Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Conexões Externas
            </CardTitle>
            <CardDescription>
              Conecte com plataformas de RPG
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="font-medium">Discord</p>
                <p className="text-sm text-muted-foreground">Não conectado</p>
              </div>
              <Button variant="outline" size="sm">Conectar</Button>
            </div>
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="font-medium">Roll20</p>
                <p className="text-sm text-muted-foreground">Não conectado</p>
              </div>
              <Button variant="outline" size="sm">Conectar</Button>
            </div>
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="font-medium">Alchemy RPG</p>
                <p className="text-sm text-muted-foreground">Não conectado</p>
              </div>
              <Button variant="outline" size="sm">Conectar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança e Login
            </CardTitle>
            <CardDescription>
              Gerencie a segurança da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Alterar Senha</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Atualize sua senha regularmente para manter sua conta segura
              </p>
              <Button variant="outline">Alterar Senha</Button>
            </div>
            <Separator />
            <div>
              <Label>Autenticação em Dois Fatores</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Adicione uma camada extra de segurança
              </p>
              <Button variant="outline">Configurar 2FA</Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            <CardDescription>
              Ações irreversíveis na conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full">
              Excluir Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;
