
## Multi-Select Chips para Facilitar a Vida do Mestre

Vou adicionar **chips de seleção rápida** nos campos onde mestres mais escrevem hoje, mantendo o `Textarea` para quem quiser personalizar. As tags clicadas viram texto pré-preenchido (e podem ser editadas). Visual seguindo o padrão Dark/Gold já usado nos elogios "Uber Style".

### Campos que receberão chips

**1. Painel da Aventura → aba "Regras & Limites"**
- `house_rules` — Regras da Casa (ex.: "Inspiração heroica", "Crítico = dano máximo + rolagem", "Ponto de heroísmo", "Flanqueamento", "Sem multiclasse", "HP máximo no nível 1")
- `combat_rules` — Combate (ex.: "Iniciativa em grupo", "Iniciativa lateral", "Ataques de oportunidade simplificados", "Morte instantânea em -CON", "Healing surges")
- `pvp_rules` — PVP (ex.: "PVP proibido", "PVP só com consenso", "PVP em arenas específicas", "PVP narrativo apenas")
- `safety_lines` — Linhas (ex.: "Violência sexual", "Tortura gráfica", "Abuso infantil", "Automutilação", "Racismo explícito", "Violência contra animais")
- `safety_veils` — Véus (ex.: "Cenas românticas", "Violência gráfica", "Drogas/vícios", "Terror psicológico", "Doenças graves", "Morte de NPCs próximos")
- `restricted_races` — Raças proibidas (lista do D&D 5e + Tormenta20: "Drow", "Tiefling", "Aasimar", "Goliath", "Kender", "Warforged", etc.)
- `restricted_classes` — Classes proibidas (ex.: "Bruxo", "Feiticeiro", "Monge", "Artífice", "Bárbaro Berserker")
- `restricted_spells` — Magias proibidas (ex.: "Ressurreição", "Desejo", "Bola de Fogo", "Conjurar Elemental", "Teleporte", "Meteoros")

**2. Painel da Aventura → aba "Logística"**
- `frequency` — vira **chips de seleção única** ("Semanal", "Quinzenal", "Mensal", "Esporádico")
- `absence_policy` — chips ("NPC controlado pelo mestre", "Personagem fica em background", "Sessão cancelada se >2 faltas", "Aviso com 24h de antecedência", "Tolerância máxima de 3 faltas")
- `lateness_policy` — chips ("Tolerância de 15min", "Tolerância de 30min", "Sessão começa no horário", "Resumo rápido para atrasados", "Sem tolerância")

**3. Painel da Aventura → aba "Visão Geral"**
- `campaign_objectives` — chips de tom ("Salvar o reino", "Vingança pessoal", "Exploração de ruínas", "Política e intriga", "Sobrevivência", "Ascensão ao poder", "Mistério/investigação")
- `progression_expectation` — chips ("XP por sessão", "XP por marcos", "Subida lenta", "Subida rápida", "Nível máximo 10", "Nível máximo 20", "Sem level cap")

### Como funciona o componente (UX)

Cada campo terá esse layout vertical:

```text
[ Label do campo ]
[ chip ] [ chip selecionado ★ ] [ chip ] [ chip ] [ chip ]
[ chip ] [ chip ] [ chip ]
─────────────────────────────────────
[ Textarea: pode editar / adicionar texto livre ]
```

- Chips em cinza escuro (`bg-muted`); ao clicar **brilham em dourado** (`bg-cavern-gold/20 border-cavern-gold text-cavern-gold`) — mesmo padrão dos elogios.
- Ao clicar num chip, o texto é **adicionado/removido** do `Textarea` como uma linha (ex.: `• Inspiração heroica`).
- O `Textarea` continua editável — o mestre pode refinar ou escrever do zero.
- Para os campos de **seleção única** (`frequency`), clicar num chip **substitui** o valor.
- Jogadores continuam vendo só o texto final (não veem chips).

### Componente novo: `ChipSelector`

Arquivo: `src/components/ChipSelector.tsx`

Props:
- `label: string`
- `chips: string[]` (presets sugeridos)
- `value: string` (texto atual do textarea)
- `onChange: (value: string) => void`
- `placeholder?: string`
- `mode?: "append" | "single"` (append = adiciona linhas; single = substitui valor)
- `prefix?: string` (default `"• "` para o modo append)

Lógica:
- Detecta chips "ativos" verificando se o texto contém aquela string.
- Click toggle: se ativo, remove a linha do texto; se inativo, adiciona.

### Mudanças de arquivo

1. **Criar** `src/components/ChipSelector.tsx` — componente reutilizável.
2. **Editar** `src/pages/AdventurePanel.tsx`:
   - Importar `ChipSelector`.
   - Substituir os `Textarea` dos 11 campos listados (apenas no modo `isMaster`) por `ChipSelector`.
   - Manter o render somente-leitura para jogadores intacto.
3. **Não alterar** o `CreateTableDialog` por enquanto (já usa Selects rápidos — sem digitação pesada). Caso queira incluir, me avise.

### Por que essa abordagem

- **Zero perda de flexibilidade** — quem quer escrever continua podendo.
- **Onboarding instantâneo para mestres novatos** — eles veem exemplos de boas práticas (especialmente "Linhas e Véus", que muitos nem sabem o que escrever).
- **Consistência visual** — reaproveita o padrão dourado dos elogios, mantendo a identidade Dark/Gold.
- **Sem mudança de schema** — os campos continuam sendo `text`, então nada quebra.
