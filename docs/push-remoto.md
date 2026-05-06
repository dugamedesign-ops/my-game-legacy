# Push remoto desktop → celular

Para o botão **Teste** enviar uma notificação do desktop para o celular, o celular precisa estar inscrito no Web Push e o servidor precisa guardar essa inscrição.

## 1. Criar tabela no Supabase

Execute no SQL Editor do Supabase:

```sql
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own push subscriptions"
  on public.push_subscriptions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own push subscriptions"
  on public.push_subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions
  for delete
  using (auth.uid() = user_id);
```

A API do app usa `SUPABASE_SERVICE_ROLE_KEY` no servidor para enviar e limpar inscrições expiradas.

## 2. Gerar chaves VAPID

Use:

```bash
npx web-push generate-vapid-keys
```

Configure no ambiente de produção:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:seu-email@example.com
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Cadastrar o celular

1. Entre na mesma conta no celular.
2. Abra a sidebar.
3. Toque em **Teste** e permita as notificações.
4. O app salva a inscrição push do celular.

## 4. Enviar pelo desktop

1. Entre na mesma conta no desktop.
2. Clique em **Teste** na sidebar.
3. A API envia uma notificação remota para todos os aparelhos inscritos nessa conta, incluindo o celular.

> Observação: iOS só recebe Web Push de PWAs instaladas na tela inicial em versões compatíveis. Android/Chrome funciona em abas ou PWA, desde que a permissão seja concedida.
