# Minha Coleção Gamer

App Next.js para organizar coleção gamer por plataforma, com suporte local e sincronização por usuário.

## Setup rápido

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente:

```bash
cp .env.example .env.local
```

3. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

4. Crie a tabela/políticas no Supabase usando:

```sql
-- arquivo: supabase/schema.sql
```

5. Rode em desenvolvimento:

```bash
npm run dev
```

## Fluxo de autenticação e migração

- Sem login: o app segue funcionando com `localStorage`.
- Com login: a coleção passa a carregar/salvar no Supabase por usuário.
- Primeiro login com dados locais existentes: aparece opção de importar para conta.

## Documentação de migração

Veja `docs/persistence-migration-plan.md`.
