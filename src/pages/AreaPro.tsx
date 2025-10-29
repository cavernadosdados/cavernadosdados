import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, BookOpen, TrendingUp, Calendar, Award } from "lucide-react";

const AreaPro = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold flex items-center gap-3">
            <Crown className="h-8 w-8 text-primary" />
            Área PRO
          </h1>
          <p className="text-muted-foreground mt-2">
            Recursos exclusivos para mestres profissionais
          </p>
        </div>

        {/* Pro Status Card */}
        <Card className="bg-gradient-to-br from-primary/20 to-card border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Status PRO
            </CardTitle>
            <CardDescription>Torne-se um mestre profissional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Você ainda não é um membro PRO. Desbloqueie recursos avançados, cursos de capacitação,
              e ferramentas profissionais para levar suas mesas ao próximo nível.
            </p>
            <div className="flex gap-4">
              <Button className="flex-1">
                Assinar PRO - R$ 49,90/mês
              </Button>
              <Button variant="outline" className="flex-1">
                Saber Mais
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pro Features */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card border-border hover:border-primary transition-mystical">
            <CardHeader>
              <BookOpen className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Curso de Capacitação</CardTitle>
              <CardDescription>Aprimore suas habilidades como mestre</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Acesso completo aos cursos exclusivos com mestres experientes
              </p>
              <Button variant="outline" disabled>
                <Crown className="h-4 w-4 mr-2" />
                Requer PRO
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary transition-mystical">
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Estatísticas Avançadas</CardTitle>
              <CardDescription>Análise detalhada de performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Gráficos, métricas e insights sobre suas mesas
              </p>
              <Button variant="outline" disabled>
                <Crown className="h-4 w-4 mr-2" />
                Requer PRO
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary transition-mystical">
            <CardHeader>
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Eventos e Workshops</CardTitle>
              <CardDescription>Participe de eventos exclusivos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Networking com outros mestres PRO e palestras especiais
              </p>
              <Button variant="outline" disabled>
                <Crown className="h-4 w-4 mr-2" />
                Requer PRO
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary transition-mystical">
            <CardHeader>
              <Award className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Biblioteca de Recursos</CardTitle>
              <CardDescription>Templates, mapas e materiais</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Acesso a centenas de recursos profissionais para suas mesas
              </p>
              <Button variant="outline" disabled>
                <Crown className="h-4 w-4 mr-2" />
                Requer PRO
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Benefits List */}
        <Card>
          <CardHeader>
            <CardTitle>Benefícios do Plano PRO</CardTitle>
            <CardDescription>Tudo que você ganha com a assinatura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium">Selo PRO Permanente</p>
                  <p className="text-sm text-muted-foreground">Destaque-se como mestre profissional</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium">Prioridade em Buscas</p>
                  <p className="text-sm text-muted-foreground">Suas mesas aparecem primeiro</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium">10% de Desconto em Tokens</p>
                  <p className="text-sm text-muted-foreground">Economize em todos os pacotes</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium">Suporte Prioritário</p>
                  <p className="text-sm text-muted-foreground">Atendimento VIP 24/7</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AreaPro;
