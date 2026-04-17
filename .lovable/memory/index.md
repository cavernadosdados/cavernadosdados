# Memory: index.md
Updated: now

# Project Memory

## Core
- Caverna dos Dados: RPG platform connecting Masters and Players.
- Stack: Supabase (PostgreSQL, Auth, Edge Functions) deployed on Lovable Cloud.
- Design: Dark cave aesthetic. Bg #0C0C0D, gold #CBA35C, copper #B84E1F, parchment #EAE0C8. Mystic glow, torch cursor.
- Roles: Player and Master profiles define dashboard views and permissions.
- Security Constraint: ALWAYS verify roles via `user_roles` table to prevent privilege escalation. NEVER use user metadata.

## Memories
- [Master Profile Schema](mem://banco-dados/schema-perfis) — Campos específicos para perfis de mestre, como experiência e ferramentas
- [Table Management](mem://funcionalidades/gerenciamento-mesas) — Regras de controle de mesas e sistema de candidaturas
- [Monetization](mem://negocio/monetizacao) — Plano PRO, Tokens de impulsionamento e sistema de comissões
- [Dashboard Layout](mem://ux/interface-pos-login) — Estrutura de navegação fixa e feeds de conteúdo por perfil
- [Tag Selection](mem://ux/padrao-selecao-tags) — Padrão de UI com dropdown e badges removíveis para seleção de itens
- [ChipSelector Pattern](mem://ux/chip-selector-pattern) — Chips de quick-fill (append/single) acima de Textarea para reduzir digitação do mestre no AdventurePanel
