create table if not exists public.collection_items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collection_items enable row level security;

create policy "Users can read own items"
  on public.collection_items
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own items"
  on public.collection_items
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own items"
  on public.collection_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own items"
  on public.collection_items
  for delete
  using (auth.uid() = user_id);
