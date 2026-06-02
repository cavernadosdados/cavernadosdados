## Auditoria de bugs — plano de correção

Auditoria rápida revelou 15 problemas. Este plano cobre os **8 mais relevantes** (alta + média gravidade). Os 7 itens de baixa gravidade (acessibilidade, deps menores, console.error, IDs com Date.now) ficam de fora para manter o escopo enxuto — podemos abrir um segundo passe depois se desejar.

### 🔴 Alta prioridade

**1. Glimer não atualiza no avatar após equipar** — `src/components/GlimerPicker.tsx:49`
- `invalidateQueries({ queryKey: ["equipped-cosmetics"] })` não casa com a key real `["equipped-cosmetics", userId]`.
- Corrigir incluindo `user?.id` na queryKey de invalidação.

**2. Auto-scroll do chat da mesa quebrado** — `src/components/MesaChat.tsx:64`
- `ref` em `<ScrollArea>` do Radix não aponta para o viewport com overflow, então `scrollTo` não funciona.
- Trocar para o ref do viewport interno (`ScrollAreaPrimitive.Viewport` ou query via `[data-radix-scroll-area-viewport]`) e rolar para o fim quando `messages.length` muda.

### 🟡 Média prioridade

**3. Dialog do Worldbuilding fecha sem animação** — `src/components/worldbuilding/LoreDetailDialog.tsx:81`
- `if (!item) return null` impede `<Dialog>` de receber `open={false}`.
- Renderizar sempre o `<Dialog>`; usar `item &&` apenas no conteúdo interno, ou manter um `lastItem` em ref para o frame de fechamento.

**4. `EditProfileDialog` pode abrir com `userId=""`** — `src/pages/Perfil.tsx:610`
- Passar `user?.id || ''` causa query inválida em race condition.
- Não renderizar o dialog enquanto `!user?.id`, ou guardar o botão de abrir com `disabled` até auth carregar.

**5. Pendências da mesa contadas com `as any` silencioso** — `src/components/CampaignDashboard.tsx:102`
- Validar se `session_presence` existe nos types gerados; se sim, remover `as any`. Se não, ajustar para a tabela/coluna correta e tratar `error` retornando do Supabase para evitar contagem `0` falsa.

**6. Stale closure em `AdventurePanel` ao limpar `next_session_date`** — `src/pages/AdventurePanel.tsx:251–288`
- Adicionar `tableId` e `refetchCampaign` às deps do `useEffect` (e remover o `eslint-disable`), ou capturar `tableId` em variável local no início do efeito e usar via promise encadeada com checagem.
- Tratar `error` retornado pelo `.update` com `toast` para não falhar em silêncio.

**7. `useUserType` esconde erros de RLS/timeout** — `src/hooks/useUserType.ts:41–54`
- Desestruturar `error` dos resultados do `Promise.all`; em caso de erro, retornar `undefined`/lançar para o React Query marcar como erro (em vez de tratar como `0`).

**8. `AnyRow = Record<string, any>` em todo o Worldbuilding** — `src/components/worldbuilding/WorldbuildingTab.tsx`
- Mudança grande (2200 linhas). Proposta cirúrgica: criar tipos mínimos (`LoreNpc`, `LoreFaction`, `LoreLocation`, `LoreDeity`, `LoreItem`, `LoreTimelineEvent`, `LoreCodex`) em `src/components/worldbuilding/types.ts` baseados em `Database['public']['Tables']['lore_*']['Row']` dos types gerados, e usar nas listas/setters principais. Não reescrever tudo — só substituir `AnyRow` em pontos onde acessamos colunas (evita futuros bugs de nome de coluna).

### Fora do escopo (baixa prioridade — posso fazer num segundo passe)
- `aria-label` no `GlimerAvatar` clicável.
- `console.error` esquecido no `AdventurePanel`.
- IDs de checklist via `Date.now()` no `MasterPrepSection`.
- Cleanup do `getSession` no `useAuth`.
- Deps menores em `EditProfileDialog` e `markChatRead`.

### Validação após implementar
- Abrir `/dashboard/perfil` → equipar Glimer → confirmar que o avatar muda sem reload.
- Abrir uma mesa com chat → enviar mensagem → confirmar scroll automático.
- Abrir um NPC no Worldbuilding e fechar → animação suave.
- Build limpo (sem novos warnings TS).
