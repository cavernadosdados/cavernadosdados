# Plano: Caverna dos Dados → Glimer

Rebrand completo + sistema de personalização (Glimers, temas, molduras, capas).

## Fase 0 — Rebrand de identidade

**Marca**
- Renomear em `index.html` (title, meta, og), `README`, `package.json`, sidebar, footer, emails transacionais, copy de boas-vindas/onboarding.
- Novo logo + favicon (precisa que você envie a arte, ou geramos uma proposta).
- Atualizar `mem://index.md` Core: nome, paleta, tom.

**Design tokens (`index.css` + `tailwind.config.ts`)**
- Substituir paleta cavern (gold/copper/parchment) por nova identidade Glimer. Manter sistema HSL + tokens semânticos (`--primary`, `--accent`, `--background`, sidebar tokens).
- Remover `torch-cursor`, `glow-gold`, `glow-copper` ou renomear para tokens neutros (`--accent-glow`, etc.) para que temas futuros reaproveitem.
- Introduzir a noção de **tema** como um conjunto de overrides desses tokens (ver Fase 3).

**Reorganização leve de UX (escopo cirúrgico, sem refazer telas)**
- Header/sidebar: novo logo, novo nome, slot para avatar Glimer com moldura.
- Página Perfil: adicionar área de capa (banner) acima do avatar.
- Loja: nova aba/página `/loja` (ou expandir `Tokens.tsx`) com 3 categorias.

## Fase 1 — Banco de dados

Novas tabelas (todas com RLS):

- **`cosmetic_items`** — catálogo único de itens cosméticos.
  - Campos: `kind` ('glimer' | 'frame' | 'cover' | 'theme'), `name`, `description`, `image_url`/`preview_url`, `rarity` ('common'|'rare'|'epic'|'legendary'), `price_tokens` (nullable), `unlock_rule` (jsonb: `{type:'free'|'xp'|'achievement'|'tokens'|'season', value:...}`), `theme_slug` (FK lógico p/ glimer ligado a tema), `season`, `is_active`.
  - SELECT público (authenticated). Sem INSERT/UPDATE/DELETE de usuário (admin via service role).

- **`user_cosmetics`** — itens que cada usuário possui.
  - Campos: `user_id`, `item_id`, `acquired_via` ('signup'|'xp'|'achievement'|'purchase'|'admin'), `acquired_at`.
  - SELECT/INSERT próprios; INSERT validado por trigger `grant_cosmetic` (verifica regra de desbloqueio ou desconta tokens).

- **`user_cosmetic_equipped`** — o que está em uso (1 por slot).
  - Campos: `user_id` (PK), `glimer_id`, `frame_id`, `cover_id`, `theme_id`.
  - SELECT público (para mostrar perfis), UPDATE próprio.

- **Triggers**
  - `grant_cosmetic(item_id)` SECURITY DEFINER: valida regra, debita tokens (reusa lógica existente), insere em `user_cosmetics`.
  - `auto_grant_cosmetics_on_xp/achievement`: ao subir XP ou desbloquear conquista, libera glimers com `unlock_rule.type='xp'`/`'achievement'`.

- **Migração de avatares atuais**
  - `profiles.avatar_url` continua existindo (upload livre permanece como opção). Quando o usuário equipar um Glimer, o `avatar_url` derivado vem da view ou do client (sem perder upload custom).

## Fase 2 — Glimers (avatares)

**Catálogo inicial**
- ~12 Glimers free + ~12 desbloqueáveis (XP/conquista) + ~8 premium (tokens).
- Você envia as imagens iniciais; cadastramos via seed SQL ou painel admin (a definir — recomendo seed no migration).

**UI**
- Novo componente `<GlimerPicker>` no `EditProfileDialog` (aba "Aparência"): grid com filtros (Possuídos / Bloqueados), badge de raridade, CTA "Equipar" / "Desbloquear por X tokens" / "Bloqueado: alcance nível N".
- `<GlimerAvatar>` wrapper de `Avatar` que aplica moldura equipada por cima.

## Fase 3 — Temas (atrelados a Glimer/temporada)

- Cada `theme` é um JSON de overrides de tokens HSL (`--background`, `--primary`, etc.).
- Hook `useTheme` aplica `data-theme="<slug>"` no `<html>` e injeta CSS vars correspondentes.
- 3 temas grátis no lançamento (`glimer-default`, `glimer-light`, `glimer-noir`) + temas atrelados: cada Glimer "épico/lendário" libera o tema combinando (ex: Glimer Floresta → tema Verdejante).
- Seletor de tema em `Configuracoes.tsx` mostrando só temas desbloqueados.

## Fase 4 — Loja de tokens

Nova página `/loja` (ou refactor de `Tokens.tsx`) com tabs:
1. **Glimers premium** — grid com preço em tokens.
2. **Molduras** — overlay PNG/SVG ao redor do avatar (estáticas no v1; animadas em v2).
3. **Capas de perfil** — banner exibido em `Perfil.tsx` e `MesaPublica` do mestre.

Fluxo de compra: clica → confirma → chama RPC `purchase_cosmetic(item_id)` → trigger debita tokens (reusa `token_transactions`) e insere em `user_cosmetics`.

## Fase 5 — Integração nos pontos de exibição

- `AppSidebar`, `Header`, `NotificationsBell`, comentários do chat, cards de mestre, listagem de candidaturas → todos usam `<GlimerAvatar>` (avatar + moldura equipada).
- `Perfil.tsx` → mostra capa equipada no topo + avatar com moldura.
- Admin: nada (gestão de catálogo via migration por ora).

## Fase 6 — Limpeza / memory

- Atualizar `mem://index.md` com novo nome, paleta, e novas memórias (`cosmetics-schema`, `themes-system`).
- Remover referências a "caverna", "torch", "cavern-*" tokens não usados.

---

## Detalhes técnicos (resumo)

```text
profiles ──┐
           ├── user_cosmetics ──► cosmetic_items
           ├── user_cosmetic_equipped (1:1)
           └── token_transactions (reutilizado p/ compras)
```

- RLS: `cosmetic_items` leitura pública autenticada; `user_cosmetics` e `equipped` restritos ao dono (equipped tem SELECT público para renderizar perfis alheios).
- Edge function não necessária — toda a lógica de compra/desbloqueio cabe em triggers SECURITY DEFINER.
- Temas: pura camada client (CSS vars). Sem backend pesado.
- Compatibilidade: usuários atuais mantêm `avatar_url`; ganham automaticamente 3 Glimers free + tema padrão via backfill no migration.

## Ordem sugerida de execução

1. Migration: tabelas + RLS + triggers + seed catálogo inicial.
2. Rebrand visual (tokens + logo + textos) — sem mexer ainda em Glimers.
3. `<GlimerAvatar>` + `useTheme` + página/loja base.
4. Substituir avatares pelo `<GlimerAvatar>` em todos os pontos.
5. Polimento (animações de moldura, badges de raridade, capa no perfil).

## Pontos a decidir antes de implementar

1. **Imagens iniciais dos Glimers**: você manda agora ou geramos propostas com IA para você aprovar?
2. **Preço-base em tokens**: ex. Glimer premium 200, Moldura 100, Capa 150, Tema 300 — confirma ou ajusta?
3. **Backfill**: novos usuários ganham 3 Glimers gratuitos (quais slugs?) e usuários antigos ganham os mesmos retroativos?
4. **Nome/logo Glimer**: já tem arte ou quer que eu gere uma proposta?
