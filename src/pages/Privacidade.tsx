import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const updatedAt = "24 de abril de 2026";

export default function Privacidade() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Button asChild variant="ghost" className="mb-8 px-0 text-muted-foreground hover:text-primary">
          <Link to="/">← Voltar</Link>
        </Button>

        <p className="mb-3 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
        <h1 className="mb-6 text-4xl font-bold tracking-normal text-foreground">Política de Privacidade</h1>

        <div className="space-y-7 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">1. Dados que coletamos</h2>
            <p>
              Coletamos dados fornecidos no cadastro e no uso da plataforma, como nome, e-mail, tipo de perfil,
              preferências de jogo, mensagens, candidaturas, avaliações, denúncias e dados técnicos essenciais para
              autenticação, segurança e funcionamento do serviço.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">2. Finalidades de uso</h2>
            <p>
              Usamos os dados para criar e proteger contas, conectar mestres e jogadores, operar mesas, notificações,
              chat, moderação, prevenção a abuso, cumprimento de obrigações legais e melhoria da experiência.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">3. Crianças e adolescentes</h2>
            <p>
              A Caverna dos Dados não é destinada a menores de 13 anos. Para cumprir a LGPD e normas brasileiras de
              proteção de crianças e adolescentes, poderemos solicitar confirmação de idade, limitar recursos sensíveis
              e restringir acesso a conteúdos marcados como adultos.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">4. Compartilhamento</h2>
            <p>
              Não vendemos dados pessoais. Podemos compartilhar dados com provedores necessários para hospedagem,
              autenticação, comunicação, pagamentos futuros, prevenção a fraude, suporte e cumprimento de solicitações
              legais, sempre no limite necessário.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">5. Segurança</h2>
            <p>
              Aplicamos controles de acesso, autenticação, regras de banco de dados e medidas de moderação. Nenhum
              sistema é totalmente imune a riscos; por isso, recomendamos senha forte e cuidado ao compartilhar dados em chats.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">6. Seus direitos</h2>
            <p>
              Você pode solicitar acesso, correção, exclusão, portabilidade, revisão de decisões automatizadas e
              informações sobre uso dos seus dados. Para exercer direitos, entre em contato pelos canais oficiais da plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">7. Retenção e exclusão</h2>
            <p>
              Mantemos dados enquanto sua conta estiver ativa ou enquanto forem necessários para segurança, auditoria,
              resolução de disputas, cumprimento legal e prevenção a fraudes. Dados podem ser anonimizados quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">8. Alterações</h2>
            <p>
              Esta política pode ser atualizada. Mudanças relevantes poderão exigir novo aceite ou comunicação destacada dentro da plataforma.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}