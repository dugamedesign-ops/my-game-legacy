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

create table if not exists public.user_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  friend_code bigint generated always as identity unique,
  is_public boolean not null default false,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_public_profiles enable row level security;

create policy "Public can read public profiles"
  on public.user_public_profiles
  for select
  using (is_public = true);

create policy "Users can insert own public profile"
  on public.user_public_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own public profile"
  on public.user_public_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.ensure_public_profile(
  profile_name text default null,
  profile_avatar_url text default null
)
returns public.user_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  ensured_profile public.user_public_profiles;
begin
  insert into public.user_public_profiles (user_id, display_name, avatar_url)
  values (
    auth.uid(),
    nullif(trim(profile_name), ''),
    nullif(trim(profile_avatar_url), '')
  )
  on conflict (user_id)
  do update
  set
    display_name = coalesce(
      public.user_public_profiles.display_name,
      excluded.display_name
    ),
    avatar_url = coalesce(
      public.user_public_profiles.avatar_url,
      excluded.avatar_url
    ),
    updated_at = now()
  returning * into ensured_profile;

  return ensured_profile;
end;
$$;

revoke all on function public.ensure_public_profile(text, text) from public;
grant execute on function public.ensure_public_profile(text, text) to authenticated;

create or replace function public.get_public_collection_by_friend_code(
  target_friend_code bigint
)
returns table (
  profile_friend_code bigint,
  profile_display_name text,
  profile_avatar_url text,
  item jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    profile.friend_code as profile_friend_code,
    profile.display_name as profile_display_name,
    profile.avatar_url as profile_avatar_url,
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', collection.id,
        'type', collection.payload->>'type',
        'platform', collection.payload->>'platform',
        'title', collection.payload->>'title',
        'subtitle', collection.payload->>'subtitle',
        'ownershipStatus', collection.payload->>'ownershipStatus',
        'mediaFormats', collection.payload->'mediaFormats',
        'gameProgressStatus', collection.payload->>'gameProgressStatus',
        'purchasePriority', collection.payload->>'purchasePriority',
        'rarityTags', collection.payload->'rarityTags',
        'franchise', collection.payload->>'franchise',
        'genre', collection.payload->>'genre',
        'imageUrl', collection.payload->>'imageUrl',
        'purchaseDate', collection.payload->'purchaseDate',
        'releaseDate', collection.payload->>'releaseDate',
        'createdAt', collection.payload->>'createdAt',
        'updatedAt', collection.payload->>'updatedAt'
      )
    ) as item
  from public.user_public_profiles profile
  join public.collection_items collection
    on collection.user_id = profile.user_id
  where
    profile.is_public = true
    and profile.friend_code = target_friend_code
    and coalesce((collection.payload->>'isRemoved')::boolean, false) = false
  order by collection.updated_at desc;
$$;

revoke all on function public.get_public_collection_by_friend_code(bigint) from public;
grant execute on function public.get_public_collection_by_friend_code(bigint) to anon, authenticated;

create or replace function public.set_public_profile_visibility(
  target_is_public boolean
)
returns public.user_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.user_public_profiles;
begin
  update public.user_public_profiles
  set
    is_public = target_is_public,
    updated_at = now()
  where user_id = auth.uid()
  returning * into updated_profile;

  if updated_profile is null then
    insert into public.user_public_profiles (user_id, is_public)
    values (auth.uid(), target_is_public)
    returning * into updated_profile;
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.set_public_profile_visibility(boolean) from public;
grant execute on function public.set_public_profile_visibility(boolean) to authenticated;
