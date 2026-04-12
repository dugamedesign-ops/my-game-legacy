# Migração para persistência por usuário (Supabase)

## 1) Stack escolhida

- **Supabase Auth (magic link por e-mail)** para autenticação simples, sem backend custom de senha.
- **Supabase Postgres** para persistência online.
- **RLS (Row Level Security)** para isolamento por usuário no banco.
- **Next.js App Router + cliente Supabase no browser** para manter as mudanças pequenas e sem quebrar o fluxo atual.

## 2) Esquema de dados

A tabela `collection_items` guarda `payload` em JSONB para preservar todos os campos atuais do item, sem perda durante a migração.

Campos:
- `id` (uuid, PK)
- `user_id` (uuid, FK para `auth.users`)
- `payload` (jsonb)
- `created_at`, `updated_at`

Políticas RLS:
- usuário só lê/escreve/deleta linhas com `user_id = auth.uid()`.

## 3) Plano de migração localStorage

1. Continuar carregando dados de `localStorage` (compatibilidade).
2. No primeiro login:
   - carregar coleção online do usuário;
   - se online estiver vazia e houver itens no localStorage, mostrar banner de importação.
3. Ao clicar em importar:
   - fazer `upsert` dos itens locais no banco;
   - associar `userId` ao usuário autenticado;
   - marcar banner como concluído/dispensado por usuário.
4. Manter `localStorage` como cache local para não quebrar experiência offline.

## 4) Implementação inicial entregue

- Provider de autenticação com sessão persistida.
- Painel de login/logout via magic link.
- Hook de coleção híbrida (local + online por usuário).
- Banner de primeiro login para importar dados locais.
