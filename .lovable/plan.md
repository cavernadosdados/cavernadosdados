
## Análise da sua ideia + plano

### 1. Chat global com janela de 50 mensagens — análise

**Gostei muito.** É enxuto, social, viraliza ("praça da taverna") e o custo fica praticamente fixo. Pontos fortes e cuidados:

**Por que funciona para custo:**
- Tabela `global_chat` com no máximo ~50 linhas vivas a qualquer momento → storage praticamente zero.
- Trigger `AFTER INSERT` que apaga o excedente (`DELETE WHERE id NOT IN (SELECT id FROM global_chat ORDER BY created_at DESC LIMIT 50)`) → autolimpeza, sem cron job.
- Realtime do Supabase já está incluso no plano — só precisa habilitar a tabela na publicação.

**Riscos reais (e como mitigar desde o dia 1):**
- **Spam / flood**: rate limit por usuário (ex: 1 msg a cada 5s) via trigger checando `MAX(created_at) WHERE user_id = auth.uid()`.
- **Tamanho da mensagem**: `CHECK (char_length(content) <= 280)` — estilo Twitter, mantém leve.
- **Toxicidade**: botão de "denunciar" + soft-block (esconde mensagens de usuários reportados pelo próprio viewer). Modera depois quando crescer.
- **Custo de Realtime**: cada mensagem é broadcast para todos online. Se viralizar (500 online digitando), pode pesar. Mitigação: manter o chat só na página `/dashboard/mensagens` (não global no header) — só quem abre paga o custo de Realtime.

**Veredito:** ótima escolha para a fase atual. Faça assim.

---

### 2. Tokens como carro-chefe — análise

**Concordo com a direção, mas atenção ao gating de criação de mesa.**

**Cobrar tokens para CRIAR mesa:**
- ✅ Receita previsível, alinha incentivo (mestre só cria mesa que vai rodar).
- ⚠️ **Risco grande de matar o crescimento agora.** Você mesmo disse: quer viralizar. Se um mestre novo precisa pagar antes de testar, ele vai embora.

**Sugestão equilibrada (modelo freemium):**
- Todo mestre ganha **3 tokens grátis ao se cadastrar** (one-time, registrado em `profiles.signup_bonus_claimed`).
- Criar mesa custa **1 token**.
- Mesa fechada/concluída devolve **0 tokens** (sumidouro real).
- A partir daí precisa comprar.

Isso te dá: viralização (3 mesas grátis = experiência completa) + receita (mestre ativo precisa recarregar) + custo controlado (não tem mestre criando 50 mesas-fantasma porque é grátis).

**Como burlam (e defesa):**
| Burla | Defesa |
|---|---|
| Criar várias contas para ganhar 3 tokens cada | Bônus atrelado a email verificado + (depois) verificação por número/Discord |
| Mestre cria mesa, não roda, lota o feed | Token só é "consumido de verdade" quando 1º jogador é aceito; mesas sem aceite por 30 dias devolvem o token (cron simples) |
| Conta fake só pra inflar candidaturas | Jogador também precisa de algo "custoso" — ver próximo ponto |

**Token para jogador (sugestão):**
- Candidatar-se é grátis (precisa ser, senão ninguém entra).
- **Mas:** jogador só pode ter **3 candidaturas pendentes simultâneas**. Quer mais slots? **1 token = +3 slots por 7 dias.** Isso reduz "spray and pray" e melhora a qualidade das candidaturas que o mestre recebe — todo mundo ganha.
- Outras ideias futuras: destaque na candidatura, avatar animado, badge de perfil verificado.

---

### 3. Indicador de tokens no header

Concordo 100%. Componente `TokenBalance` no header (ao lado do sino):
- Mostra ícone de gema + saldo.
- Saldo `0` → botão pulsando "+" que leva a `/dashboard/tokens`.
- Saldo `>0` → clicável, abre popover com últimas transações + atalho para loja.

---

## Plano de implementação proposto (em fases — você aprova uma de cada vez)

### Fase A — Chat global enxuto (esta entrega)
**Banco:**
- Tabela `global_chat (id, user_id, content, created_at)` com `CHECK char_length(content) <= 280`.
- Trigger `enforce_chat_window`: após insert, deleta tudo além das 50 mais recentes.
- Trigger `enforce_rate_limit`: bloqueia insert se última msg do user < 5s.
- RLS: `SELECT` para todos autenticados; `INSERT` só com `auth.uid() = user_id`; sem update/delete.
- Adiciona `global_chat` à publicação `supabase_realtime`.

**Frontend (`Mensagens.tsx`):**
- Refaz a página: lista virtualizada das 50 msgs (avatar + display_name + texto + tempo relativo), input fixo no rodapé, contador de caracteres, botão enviar.
- Hook `useGlobalChat` com React Query + subscription Realtime.
- Avatar/nome clicáveis → `/dashboard/perfil/:userId`.
- Mensagens novas chegando: scroll automático se já estava no fim; senão, badge "novas mensagens ↓".

### Fase B — Sistema de tokens (próxima entrega, depois que A estiver no ar)
1. Coluna `tokens_balance int default 3` em `profiles` + `signup_bonus_claimed boolean`.
2. Tabela `token_transactions (user_id, delta, reason, related_table_id, created_at)` para auditoria.
3. Função `spend_tokens(amount, reason)` SECURITY DEFINER que decrementa atomicamente ou retorna erro.
4. Hook server-side em `CreateTableDialog`: chama `spend_tokens(1, 'create_table')` antes do insert; se falhar, mostra dialog "Sem tokens — Comprar".
5. Componente `TokenBalance` no `DashboardLayout` header.
6. Limite de 3 candidaturas pendentes por jogador (RLS check) + opção paga de aumentar.

### Fase C — Pagamentos reais (quando validar demanda)
- Integrar Stripe via tool nativa do Lovable. Webhook credita `token_transactions`.

---

### Detalhes técnicos (caso queira inspecionar)

```sql
-- Trigger janela de 50
CREATE FUNCTION trim_global_chat() RETURNS trigger AS $$
BEGIN
  DELETE FROM global_chat
  WHERE id IN (
    SELECT id FROM global_chat
    ORDER BY created_at DESC OFFSET 50
  );
  RETURN NULL;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trim_after_insert
AFTER INSERT ON global_chat
FOR EACH STATEMENT EXECUTE FUNCTION trim_global_chat();
```

```text
Header: [☰] [🔍 buscar...]                    [💎 12] [🔔 3] [👤]
                                                   ↑
                                          clicável → /dashboard/tokens
                                          se 0 → botão "+" pulsando
```

---

### Pergunta antes de implementar

Quer que eu comece **só pela Fase A (chat global)** agora, ou prefere que eu faça **A + indicador de tokens no header** (sem cobrar ainda, só mostrar saldo) na mesma entrega? A Fase B completa (cobrar token para criar mesa, limites, etc.) eu recomendo deixar pra próxima conversa pra não misturar muita coisa.
