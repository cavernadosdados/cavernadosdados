import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

const Mensagens = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold glow-gold">Mensagens</h1>
          <p className="text-muted-foreground mt-2">
            Converse com mestres e jogadores
          </p>
        </div>

        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Sistema de Mensagens
            </CardTitle>
            <CardDescription>
              Chat e comunicação entre jogadores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em breve! O sistema de mensagens estará disponível em breve para facilitar a comunicação entre mestres e jogadores.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Mensagens;
