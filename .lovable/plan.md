# Estudo: Perfil Unificado (Mestre + Jogador)

Hoje cada usuário escolhe ser `master` OU `player` no cadastro (`profiles.user_type`), e isso define dashboard, sidebar, onboarding, edição de perfil, fluxo de candidatura, tokens, etc. A proposta é eliminar essa dicotomia: **todo usuário pode mestrar e jogar**, alternando contextos sem trocar de conta.

## O que muda no banco

1. `**profiles.user_type` deixa de ser fonte de verdade de papel.**
  - Manter coluna por compatibilidade temporária, mas tratar como "preferência inicial" (ou remover em migração futura).
  - Toda checagem de "é mestre desta mesa?" passa a ser **contextual**: `tables.master_id = auth.uid()`. Já é assim em `AdventurePanel`.
2. **RLS / funções que leem `user_type`:**
  - `handle_new_user` (default `'player'`) → manter, mas irrelevante.
  - `admin_list_users` retorna `user_type` → trocar por flags derivadas (`has_created_tables`, `has_played`).
  - `get_admin_metrics` conta masters/players → trocar por "usuários que criaram mesa" vs "usuários com candidatura aceita".
3. **Novo conceito: "modo ativo"** (apenas UI, não no banco). Persistido em `localStorage` ou em coluna nova `profiles.active_mode` ('master'|'player') só para lembrar a última visão.
4. **Campos hoje exclusivos de mestre** (`master_systems`, `experience_years`, `preferred_themes`, `apps_used`, `plays_in_person`, `availability_*`) passam a ser **todos opcionais para qualquer usuário**. Sem migração de schema — só de UX.

## O que muda no código


| Área                  | Mudança                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useUserType`         | Substituir por `useUserCapabilities` → retorna `{ hasMasteredTables, hasPlayedTables, activeMode, setActiveMode }`.                                                                        |
| `AppSidebar`          | Mostrar **todos** os itens (Mesas que mestro, Minhas candidaturas, Financeiro, etc.) ou agrupar por modo ativo com toggle no topo.                                                         |
| `Dashboard`           | Renderizar **ambas** as visões (MasterView + PlayerView) condicionadas a ter dados, ou alternar pelo modo ativo.                                                                           |
| `Perfil`              | Unificar — sempre mostrar bio + avaliações recebidas; seções "Como mestre" (mesas, sistemas que domina) e "Como jogador" (sistemas de interesse, disponibilidade) aparecem se preenchidas. |
| `EditProfileDialog`   | Remover branch `isMaster`; mostrar todas as seções, marcando opcionais.                                                                                                                    |
| `Auth` (cadastro)     | Remover seleção obrigatória de tipo. Pode pedir "qual seu interesse principal?" só para personalizar onboarding.                                                                           |
| `OnboardingChecklist` | Unificar passos: criar 1 mesa **ou** se candidatar a 1 mesa concedem recompensas independentes.                                                                                            |
| `ApplyTableDialog`    | Remover bloqueio "mestres não podem se candidatar".                                                                                                                                        |
| `Tokens`/`Financeiro` | Mostrar abas de gasto (impulsionar mesa) e ganho (recebimento) sempre — ocultar widget só se zero atividade.                                                                               |
| `Mesas`               | Já é "minhas mesas como mestre" — manter, mas acessível a qualquer um que tenha criado.                                                                                                    |
| `AdminModeracao`      | Trocar gráficos master/player por "criadores ativos" / "jogadores ativos" (não mutuamente exclusivos).                                                                                     |


## Vantagens

- **Menos fricção no cadastro** — usuário não precisa decidir "quem é" antes de explorar.
- **Mais liquidez** — qualquer mestre vira jogador em outra mesa (e vice-versa), aumentando matchmaking.
- **Reputação unificada** — feedback de mestre e de jogador convivem no mesmo perfil, dando visão completa de confiabilidade.
- **Código mais simples a longo prazo** — autoridade vira "é dono desta mesa?" em vez de papel global.

## Desvantagens / Riscos

1. **Identidade de marca diluída** — perfis hoje "se vendem" como mestres. Solução: destacar **badges contextuais** ("Mestre de 3 mesas", "Jogador em 5 campanhas").
2. **UI mais densa** — sidebar/dashboard com mais itens. Solução: **toggle de modo ativo** no topo (Mestre ↔ Jogador) que filtra a visão.
3. **Onboarding pode parecer vago** — sem escolha inicial, o checklist precisa cobrir os dois caminhos. Solução: pergunta opcional "por onde quer começar?" no primeiro acesso.
4. **Migração de usuários atuais** — todos já têm `user_type` definido. Solução: usar como `active_mode` inicial; nada quebra.
5. **Métricas de admin perdem granularidade** — não dá mais para falar "X masters / Y players". Solução: novas métricas baseadas em comportamento (criou mesa, foi aceito em mesa).
6. **Conflito de interesse em avaliação** — mestre que também joga pode trocar reviews. Já mitigado pela função `can_create_session_feedback` (só participantes da mesa avaliam).
7. **RLS revisitada** — qualquer policy que use `profiles.user_type` precisa virar checagem por participação. Hoje a maioria já é por `master_id`/`table_applications` — auditar uma vez é suficiente.

## Possíveis problemas e soluções

- **Quebra de telas legadas que assumem `isMaster` global**: substituir por `useUserCapabilities` num único PR coordenado.
- **Sessões antigas com `user_metadata.user_type**`: já não usamos mais (refator anterior). OK.
- **Perfis "vazios" em ambos os lados**: card de perfil mostra CTA "Crie sua primeira mesa" / "Encontre uma mesa" baseado no que falta.
- **Filtros de busca por papel**: trocar "buscar mestres" por "buscar pessoas que mestram &nbsp;".

## Plano de execução sugerido (3 fases)

**Fase 1 — Backend leve (sem breaking)**

- Adicionar `profiles.active_mode` (text, default 'player').
- Atualizar `admin_list_users` e `get_admin_metrics` para flags derivadas.
- Manter `user_type` por compatibilidade.

**Fase 2 — UI unificada**

- Criar `useUserCapabilities` + toggle de modo no `AppSidebar`.
- Refatorar `Dashboard`, `Perfil`, `EditProfileDialog`, `OnboardingChecklist`, `Tokens`, `Financeiro`, `ApplyTableDialog`.
- Remover seleção de papel no `Auth` (manter como pergunta opcional pós-cadastro).

**Fase 3 — Limpeza**

- Remover `useUserType` e leituras de `profiles.user_type` no client.
- Eventualmente remover a coluna (migração futura).

## Decisões que preciso de você

1. **Toggle Mestre/Jogador no header** ou **visão unificada sempre** (tudo junto)?
2. No cadastro: **remover totalmente** a escolha de papel, ou manter como **preferência opcional** para personalizar onboarding?
3. Manter coluna `user_type` para compatibilidade ou **remover já** na fase 1?
4. Avaliações no perfil: separar em **abas "Como mestre" / "Como jogador"** ou misturar tudo com tag de papel?