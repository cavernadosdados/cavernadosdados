import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const updatedAt = "24 de abril de 2026";

export default function Termos() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Button asChild variant="ghost" className="mb-8 px-0 text-muted-foreground hover:text-primary">
          <Link to="/">← Voltar</Link>
        </Button>

        <p className="mb-3 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
        <h1 className="mb-6 text-4xl font-bold tracking-normal text-foreground">Termos de Uso</h1>

        <div className="space-y-7 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">1. Aceite</h2>
            <p>
              Ao criar uma conta ou usar a Caverna dos Dados, você declara que leu e aceitou estes Termos de Uso e a
              Política de Privacidade. Se não concordar, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">2. Elegibilidade</h2>
            <p>
              A plataforma é permitida para usuários a partir de 13 anos. Conteúdos marcados como adultos ou sensíveis
              podem ser restritos a usuários maiores de 18 anos, conforme classificação e regras de segurança.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">3. Contas e responsabilidades</h2>
            <p>
              Você é responsável por manter sua conta segura, fornecer informações verdadeiras e não compartilhar acesso.
              Mestres e jogadores devem agir com respeito, boa-fé e transparência nas mesas, candidaturas e comunicações.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">4. Conduta proibida</h2>
            <p>
              É proibido assediar, discriminar, ameaçar, aplicar golpes, divulgar dados de terceiros sem autorização,
              burlar regras de segurança, publicar conteúdo ilegal ou violar direitos autorais e de personalidade.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">5. Conteúdo das mesas</h2>
            <p>
              Mestres devem descrever temas sensíveis com clareza e marcar conteúdo adulto quando aplicável. A plataforma
              pode moderar, ocultar ou remover mesas e contas que violem estes termos ou coloquem usuários em risco.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">6. Pagamentos futuros</h2>
            <p>
              Recursos pagos e repasses a mestres poderão depender de verificação de identidade, validação fiscal,
              prevenção a fraude e regras do provedor de pagamento. Taxas, comissões e prazos serão apresentados antes da contratação.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">7. Suspensão e moderação</h2>
            <p>
              Podemos restringir funcionalidades, suspender contas, revisar denúncias e remover conteúdo para proteger a
              comunidade, cumprir obrigações legais e manter a integridade do serviço.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">8. Alterações</h2>
            <p>
              Estes termos podem mudar. Alterações relevantes poderão exigir novo aceite para continuidade do uso da plataforma.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}