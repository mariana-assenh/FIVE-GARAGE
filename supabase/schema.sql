-- Five Garage — schema do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (Project > SQL Editor > New query > cole tudo > Run). Pode rodar de novo
-- sem problema se precisar reaplicar — os comandos são "idempotentes"
-- (recriam políticas em vez de falhar se elas já existirem).

create extension if not exists "pgcrypto";

-- ── Veículos ────────────────────────────────────────────────────────────

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  brand text not null,
  model text not null,
  year integer not null,
  price numeric not null,
  vehicle_type text not null check (vehicle_type in ('carro', 'moto')),
  mileage integer,
  description text,
  image_url text,
  likes integer not null default 0,
  status text not null default 'disponivel' check (status in ('disponivel', 'vendido'))
);

alter table public.vehicles enable row level security;

-- ── Perfis / administradores ───────────────────────────────────────────
-- Toda conta criada pelo site vira uma linha aqui (is_admin = false por
-- padrão). Só quem tem is_admin = true pode publicar, editar ou apagar
-- anúncios — veja a seção "Tornar alguém administrador" no fim do arquivo.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Cria a linha em profiles automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Função auxiliar usada pelas políticas abaixo para checar se quem está
-- fazendo a requisição é administrador.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- ── Políticas de veículos ──────────────────────────────────────────────

-- Qualquer visitante (mesmo deslogado) pode ver os anúncios.
drop policy if exists "Vehicles are viewable by everyone" on public.vehicles;
create policy "Vehicles are viewable by everyone"
  on public.vehicles for select
  using (true);

-- Só administradores podem publicar, editar ou apagar anúncios.
drop policy if exists "Authenticated users can insert vehicles" on public.vehicles;
drop policy if exists "Admins can insert vehicles" on public.vehicles;
create policy "Admins can insert vehicles"
  on public.vehicles for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Owners can update their vehicles" on public.vehicles;
drop policy if exists "Admins can update vehicles" on public.vehicles;
create policy "Admins can update vehicles"
  on public.vehicles for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Owners can delete their vehicles" on public.vehicles;
drop policy if exists "Admins can delete vehicles" on public.vehicles;
create policy "Admins can delete vehicles"
  on public.vehicles for delete
  to authenticated
  using (public.is_admin());

-- Curtidas: função com security definer, para não precisar de uma policy de
-- UPDATE aberta (que deixaria qualquer visitante editar preço, título etc.).
-- Continua liberada para qualquer visitante curtir, logado ou não.
create or replace function public.increment_vehicle_likes(vehicle_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_likes integer;
begin
  update public.vehicles
  set likes = likes + 1
  where id = vehicle_id
  returning likes into new_likes;
  return new_likes;
end;
$$;

grant execute on function public.increment_vehicle_likes(uuid) to anon, authenticated;

-- ── Fotos dos veículos ─────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;

drop policy if exists "Vehicle photos are publicly readable" on storage.objects;
create policy "Vehicle photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'vehicle-photos');

drop policy if exists "Authenticated users can upload vehicle photos" on storage.objects;
drop policy if exists "Admins can upload vehicle photos" on storage.objects;
create policy "Admins can upload vehicle photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vehicle-photos' and public.is_admin());

drop policy if exists "Admins can delete vehicle photos" on storage.objects;
create policy "Admins can delete vehicle photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vehicle-photos' and public.is_admin());

-- ── Tornar alguém administrador ────────────────────────────────────────
-- 1. Essa pessoa precisa criar uma conta pelo site (tela "Criar conta").
-- 2. Depois, rode o comando abaixo (troque o e-mail) para dar acesso de
--    administrador a ela. Pode rodar de novo para cada pessoa da equipe.
--
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'seu-email@exemplo.com');
