## Publicar os 5 Glimers canônicos na Loja

Substituição total do catálogo de Glimers: os 12 genéricos atuais saem da Loja e dão lugar aos 5 personagens canônicos — **Nox, Trix, Kiki, Jipo e Jinx** — todos como Épicos por 300 tokens.

### O que vai acontecer

1. **Você envia 5 PNGs** (um por Glimer, fundo transparente, formato quadrado recomendado ~512×512).
   - Nomes de arquivo sugeridos: `nox.png`, `trix.png`, `kiki.png`, `jipo.png`, `jinx.png`.
   - Após você enviar, eu faço o upload via `lovable-assets` e gero os pointers `.asset.json`.

2. **Mapeamento das personalidades** (vou usar isto nas descrições da Loja — ajuste se quiser):
   - **Nox** — o Misterioso. Aura sombria, observador silencioso das cavernas profundas.
   - **Trix** — o Curioso. Olhar atento, sempre investigando runas e relíquias.
   - **Kiki** — o Divertido. Energia luminosa, traz alegria às mesas.
   - **Jipo** — o Terroso. Conexão com a terra, raízes e pedras antigas.
   - **Jinx** — o Bagunceiro. Caos travesso, derruba o cenário do mestre só por diversão.

3. **Substituição no banco** (via migration + insert):
   - Desativar (`is_active = false`) os 12 Glimers genéricos atuais (wanderer, apprentice, ranger, bard, knight, druid, rogue, cleric, archmage, dragonborn, shadowblade, celestial). Quem já comprou continua com o item no inventário e pode equipar normalmente.
   - Inserir 5 novos `cosmetic_items` com `kind='glimer'`, `rarity='epic'`, `price_tokens=300`, `unlock_rule={"type":"purchase"}`, `sort_order` 1–5, e `image_url` apontando para o CDN dos PNGs.

4. **Resolver imagens no front**:
   - Adicionar os 5 novos slugs (`nox`, `trix`, `kiki`, `jipo`, `jinx`) ao `GLIMER_ASSETS` em `src/lib/glimers.ts` importando os `.asset.json`.
   - Remover os 12 imports genéricos de `src/lib/glimers.ts` e os PNGs em `src/assets/glimers/` (não são mais referenciados — usuários que já equiparam um genérico vão cair no fallback do `image_url` do banco, que ainda existe).
   - Alternativa segura: **manter os 12 imports** para preservar avatares de quem já equipou. Recomendo manter para evitar quebrar avatares antigos.

### Detalhes técnicos

**Arquivos novos:**
- `src/assets/glimers/nox.png.asset.json`
- `src/assets/glimers/trix.png.asset.json`
- `src/assets/glimers/kiki.png.asset.json`
- `src/assets/glimers/jipo.png.asset.json`
- `src/assets/glimers/jinx.png.asset.json`

**Arquivos editados:**
- `src/lib/glimers.ts` — adicionar 5 imports + 5 entradas em `GLIMER_ASSETS`.

**Migração (SQL):**
```sql
-- Desativa o catálogo genérico antigo
UPDATE public.cosmetic_items
   SET is_active = false
 WHERE kind = 'glimer'
   AND slug IN ('wanderer','apprentice','ranger','bard','knight','druid',
                'rogue','cleric','archmage','dragonborn','shadowblade','celestial');

-- Insere os 5 canônicos
INSERT INTO public.cosmetic_items
  (slug, kind, name, description, rarity, price_tokens, unlock_rule, sort_order, image_url, is_active)
VALUES
  ('nox',  'glimer', 'Nox',  '<descrição>', 'epic', 300, '{"type":"purchase"}'::jsonb, 1, '<cdn_url>', true),
  ('trix', 'glimer', 'Trix', '<descrição>', 'epic', 300, '{"type":"purchase"}'::jsonb, 2, '<cdn_url>', true),
  ('kiki', 'glimer', 'Kiki', '<descrição>', 'epic', 300, '{"type":"purchase"}'::jsonb, 3, '<cdn_url>', true),
  ('jipo', 'glimer', 'Jipo', '<descrição>', 'epic', 300, '{"type":"purchase"}'::jsonb, 4, '<cdn_url>', true),
  ('jinx', 'glimer', 'Jinx', '<descrição>', 'epic', 300, '{"type":"purchase"}'::jsonb, 5, '<cdn_url>', true);
```

> Esta operação é feita pela ferramenta de migração (não usa `UPDATE/INSERT` direto na ferramenta de dados, pois inclui inativação + inserções juntas e é mais seguro em uma única migração reversível).

### Próximo passo
Aprove o plano e **anexe os 5 PNGs na próxima mensagem** (Nox, Trix, Kiki, Jipo, Jinx). Sem as imagens, eu não consigo finalizar — o `image_url` dos novos itens precisa estar resolvido para a Loja exibir corretamente.