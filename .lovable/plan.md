

## Scaffolding de Mesas Comissionadas

Preparação do banco de dados para suportar mesas pagas com sistema de comissão e escrow, sem integrar gateway de pagamento ainda. Quando o Stripe for ativado no futuro (com split payments via Connect), a estrutura já estará pronta.

### O que será feito

**1. Atualização da tabela `tables`**
- `price_cents` (integer, default 0): preço da vaga em centavos. `0` = mesa gratuita.
- `commission_pct` (numeric(5,2), default 15.00): % da plataforma sobre cada vaga paga (configurável por mesa, padrão 15%).
- Validação via trigger: `commission_pct` entre 0 e 100; `price_cents >= 0`.

**2. Nova tabela `payments`**

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `table_id` | uuid | mesa relacionada |
| `application_id` | uuid | candidatura (vaga paga) |
| `payer_id` | uuid | jogador que paga |
| `master_id` | uuid | mestre que recebe |
| `amount_cents` | integer | valor pago pelo jogador |
| `commission_cents` | integer | parte da plataforma |
| `master_payout_cents` | integer | parte do mestre |
| `currency` | text default `'BRL'` | |
| `status` | text default `'pending'` | `pending` / `escrow` / `released` / `refunded` / `failed` |
| `provider` | text | placeholder (`stripe`, etc.) — null por enquanto |
| `provider_payment_id` | text | id externo (vazio até integrar) |
| `provider_metadata` | jsonb default `'{}'` | dados adicionais do gateway |
| `escrow_at`, `released_at`, `refunded_at` | timestamptz | marcos do ciclo |
| `created_at`, `updated_at` | timestamptz | |

Trigger `update_updated_at` para `updated_at`.

**3. Status do pagamento (ciclo)**

```text
pending  ──►  escrow  ──►  released
                 │
                 └────►  refunded
         ──►  failed
```

- `pending`: registro criado, aguardando confirmação do gateway.
- `escrow`: pago pelo jogador, retido pela plataforma.
- `released`: liberado ao mestre (após sessão / janela de garantia).
- `refunded`: estornado ao jogador.
- `failed`: falha no processamento.

**4. RLS da tabela `payments`**
- **SELECT:** `payer_id = auth.uid()` OU `master_id = auth.uid()` OU admin.
- **INSERT/UPDATE/DELETE:** bloqueado para usuários (apenas via funções `SECURITY DEFINER` ou service role no futuro). Sem políticas permissivas — operações financeiras nunca devem vir do cliente.
- Índices em `payer_id`, `master_id`, `table_id`, `status`.

**5. Sem mudanças no frontend agora**
Apenas scaffolding de schema. Os tipos TypeScript de Supabase serão regenerados automaticamente, então `tables.price_cents` e `payments` ficam disponíveis para futuras telas (formulário de criação/edição de mesa com preço, painel financeiro do mestre, checkout do jogador).

### Detalhes técnicos

- Migração SQL única adicionando colunas em `tables`, criando `payments`, trigger de `updated_at`, trigger de validação (`price_cents >= 0`, `commission_pct BETWEEN 0 AND 100`), índices e políticas RLS.
- `commission_pct` armazenado como `numeric(5,2)` para suportar valores como `12.50`.
- Não vamos usar `CHECK` constraints com expressões mutáveis — validação fica em trigger `BEFORE INSERT OR UPDATE` para flexibilidade futura.
- Coluna `provider` como `text` nullable para permitir adicionar Stripe / Pix / outros sem nova migração.
- `master_payout_cents` é redundante com `amount_cents - commission_cents`, mas é gravado para auditoria (caso a regra mude no futuro, pagamentos antigos preservam o valor original).
- Componentes existentes (`CreateTableDialog`, `EditTableDialog`, `Explorar`, `MesaDetalhes`) continuam funcionando: o filtro `price` em `Explorar` que já existe (`ANY` / `free` / `paid`) poderá usar `price_cents` em uma próxima iteração.

### O que NÃO entra agora
- Integração com Stripe / Connect / split payments.
- UI para definir preço ao criar/editar mesa.
- Checkout, webhooks de pagamento, página financeira do mestre.
- Lógica de release automático após sessão.

Tudo isso será construído por cima deste schema quando você decidir ativar pagamentos.

