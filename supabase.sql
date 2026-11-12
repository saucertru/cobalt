-- ============================================================
-- cobalt: database setup for Supabase
-- Paste ALL of this into Supabase → SQL Editor → New query → Run.
-- Safe to run again later (for example after you set your owner ID).
-- ============================================================

-- 1. One table holds profiles, chat and game requests.
create table if not exists public.docs (
  collection text not null check (collection in ('profiles', 'chat', 'requests')),
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.docs enable row level security;
alter table public.docs replica identity full;

-- 2. YOUR USER ID: on your site go to Settings → Copy ID, paste it below
--    (replace dae5f3b4-a537-4c93-92a3-2823762ff82c), and run this file again.
--    The owner can delete any chat message and see all game requests.
create or replace function public.is_owner() returns boolean
language sql stable as $$
  select coalesce(auth.uid()::text = 'dae5f3b4-a537-4c93-92a3-2823762ff82c', false)
$$;

-- 3. Who can read and change what.
drop policy if exists "read docs" on public.docs;
drop policy if exists "add own docs" on public.docs;
drop policy if exists "edit own docs" on public.docs;
drop policy if exists "delete own docs" on public.docs;
create policy "read docs" on public.docs for select
  using (collection in ('profiles', 'chat') or id = auth.uid()::text or public.is_owner());
create policy "add own docs" on public.docs for insert
  with check (id = auth.uid()::text);
create policy "edit own docs" on public.docs for update
  using (id = auth.uid()::text or public.is_owner())
  with check (id = auth.uid()::text or public.is_owner());
create policy "delete own docs" on public.docs for delete
  using (id = auth.uid()::text or public.is_owner());

-- 4. Checks on every save. Coins and items can only change through the functions below.
create or replace function public.check_doc() returns trigger
language plpgsql as $$
begin
  if pg_column_size(new.data) > 200000 then raise exception 'too big'; end if;
  if new.collection = 'profiles' then
    if coalesce(current_setting('cobalt.trusted', true), '') <> 'on' and not public.is_owner() then
      if tg_op = 'INSERT' then
        new.data := new.data || jsonb_build_object('coins', 50, 'owned', '[]'::jsonb, 'lastEarn', 0, 'lastDailyAt', 0);
      else
        new.data := new.data || jsonb_build_object(
          'coins', coalesce(old.data->'coins', '0'::jsonb),
          'owned', coalesce(old.data->'owned', '[]'::jsonb),
          'lastEarn', coalesce(old.data->'lastEarn', '0'::jsonb),
          'lastDailyAt', coalesce(old.data->'lastDailyAt', '0'::jsonb));
      end if;
    end if;
    if coalesce(new.data->>'name', '') !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'bad username'; end if;
    if length(coalesce(new.data->>'bio', '')) > 160 then raise exception 'bio too long'; end if;
    if length(coalesce(new.data->>'title', '')) > 24 then raise exception 'title too long'; end if;
    if coalesce(new.data->>'pfp', '') <> '' and (length(new.data->>'pfp') > 60000
       or new.data->>'pfp' !~ '^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$') then raise exception 'bad profile picture'; end if;
    if coalesce(new.data->>'bannerImg', '') <> '' and (length(new.data->>'bannerImg') > 120000
       or new.data->>'bannerImg' !~ '^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$') then raise exception 'bad banner'; end if;
    if coalesce(new.data->>'pColor', '') !~ '^(#[0-9a-fA-F]{6})?$' or coalesce(new.data->>'pAccent', '') !~ '^(#[0-9a-fA-F]{6})?$' then raise exception 'bad colour'; end if;
  elsif new.collection = 'chat' then
    if jsonb_array_length(coalesce(new.data->'msgs', '[]'::jsonb)) > 40 then raise exception 'too many messages'; end if;
  elsif new.collection = 'requests' then
    if jsonb_array_length(coalesce(new.data->'list', '[]'::jsonb)) > 20 then raise exception 'too many requests'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists check_doc on public.docs;
create trigger check_doc before insert or update on public.docs
  for each row execute function public.check_doc();

-- 5. Partial updates (the site sends only the fields that changed).
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb) returns jsonb
language plpgsql immutable as $$
declare k text; result jsonb;
begin
  if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(b) is distinct from 'object' then return b; end if;
  result := a;
  for k in select jsonb_object_keys(b) loop
    result := jsonb_set(result, array[k], public.jsonb_deep_merge(a->k, b->k));
  end loop;
  return result;
end $$;

create or replace function public.merge_doc(p_collection text, p_id text, p_patch jsonb) returns void
language plpgsql security invoker as $$
begin
  update public.docs set data = public.jsonb_deep_merge(data, p_patch)
   where collection = p_collection and id = p_id;
  if not found then raise exception 'not found'; end if;
end $$;

-- 6. Coins: earned by chatting (+5, max once per ~15 s, only right after you post).
create or replace function public.earn_coins() returns integer
language plpgsql security definer set search_path = public as $$
declare p jsonb; c jsonb; now_ms bigint := (extract(epoch from now()) * 1000)::bigint; coins int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select data into p from docs where collection = 'profiles' and id = auth.uid()::text for update;
  if p is null then raise exception 'no profile'; end if;
  if now_ms - coalesce((p->>'lastEarn')::bigint, 0) < 14000 then return 0; end if;
  select data into c from docs where collection = 'chat' and id = auth.uid()::text;
  if c is null or coalesce((c->'msgs'->-1->>'t')::bigint, 0) < now_ms - 60000 then return 0; end if;
  coins := coalesce((p->>'coins')::int, 0) + 5;
  perform set_config('cobalt.trusted', 'on', true);
  update docs set data = data || jsonb_build_object('coins', coins, 'lastEarn', now_ms)
   where collection = 'profiles' and id = auth.uid()::text;
  perform set_config('cobalt.trusted', 'off', true);
  return coins;
end $$;

-- 7. Daily bonus: +25, once every 20 hours.
create or replace function public.claim_daily() returns integer
language plpgsql security definer set search_path = public as $$
declare p jsonb; now_ms bigint := (extract(epoch from now()) * 1000)::bigint; coins int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select data into p from docs where collection = 'profiles' and id = auth.uid()::text for update;
  if p is null then raise exception 'no profile'; end if;
  if now_ms - coalesce((p->>'lastDailyAt')::bigint, 0) < 72000000 then raise exception 'already claimed'; end if;
  coins := coalesce((p->>'coins')::int, 0) + 25;
  perform set_config('cobalt.trusted', 'on', true);
  update docs set data = data || jsonb_build_object('coins', coins, 'lastDailyAt', now_ms)
   where collection = 'profiles' and id = auth.uid()::text;
  perform set_config('cobalt.trusted', 'off', true);
  return coins;
end $$;

-- 8. Shop: prices live here, so nobody can buy for less.
create or replace function public.buy_item(item text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  prices jsonb := '{"c-gold": 40, "c-pink": 40, "c-sky": 40, "c-lime": 60, "c-red": 60, "e-glow": 120, "e-wave": 150, "e-sparkle": 200, "e-rainbow": 250, "e-glitch": 300, "f-neon": 100, "f-ice": 160, "f-fire": 220, "f-gold": 350, "b-gamer": 50, "b-music": 50, "b-cobalt": 80, "b-fire": 120, "b-diamond": 300, "b-crown": 500, "bn-aurora": 90, "bn-sunset": 90, "bn-ocean": 90, "bn-galaxy": 150, "bn-gold": 250}';
  cats jsonb := '{"c-gold": "color", "c-pink": "color", "c-sky": "color", "c-lime": "color", "c-red": "color", "e-glow": "effect", "e-wave": "effect", "e-sparkle": "effect", "e-rainbow": "effect", "e-glitch": "effect", "f-neon": "frame", "f-ice": "frame", "f-fire": "frame", "f-gold": "frame", "b-gamer": "badge", "b-music": "badge", "b-cobalt": "badge", "b-fire": "badge", "b-diamond": "badge", "b-crown": "badge", "bn-aurora": "banner", "bn-sunset": "banner", "bn-ocean": "banner", "bn-galaxy": "banner", "bn-gold": "banner"}';
  p jsonb; price int; coins int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  price := (prices->>item)::int;
  if price is null then raise exception 'unknown item'; end if;
  select data into p from docs where collection = 'profiles' and id = auth.uid()::text for update;
  if p is null then raise exception 'no profile'; end if;
  if coalesce(p->'owned', '[]'::jsonb) ? item then raise exception 'already owned'; end if;
  coins := coalesce((p->>'coins')::int, 0);
  if coins < price then raise exception 'not enough coins'; end if;
  perform set_config('cobalt.trusted', 'on', true);
  update docs set data = public.jsonb_deep_merge(data, jsonb_build_object(
      'coins', coins - price,
      'owned', coalesce(p->'owned', '[]'::jsonb) || to_jsonb(item),
      'equip', jsonb_build_object(cats->>item, item)))
   where collection = 'profiles' and id = auth.uid()::text;
  perform set_config('cobalt.trusted', 'off', true);
  return coins - price;
end $$;

revoke execute on function public.earn_coins(), public.claim_daily(), public.buy_item(text) from anon;
grant execute on function public.earn_coins(), public.claim_daily(), public.buy_item(text) to authenticated;
grant execute on function public.merge_doc(text, text, jsonb) to authenticated;

-- 9. Live updates for chat and profiles.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
