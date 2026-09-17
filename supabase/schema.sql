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

-- Faltava esta (o bucket team-photos, mais abaixo, já tinha o equivalente).
-- Uploads retomáveis (TUS) podem reenviar o mesmo objeto em caso de retry,
-- o que o Storage trata como um UPDATE — sem esta policy, um retry de uma
-- foto grande falharia mesmo com o INSERT liberado acima.
drop policy if exists "Admins can update vehicle photos" on storage.objects;
create policy "Admins can update vehicle photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'vehicle-photos' and public.is_admin())
  with check (bucket_id = 'vehicle-photos' and public.is_admin());

drop policy if exists "Admins can delete vehicle photos" on storage.objects;
create policy "Admins can delete vehicle photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vehicle-photos' and public.is_admin());

-- Limite real do bucket, aplicado pelo próprio Supabase Storage antes mesmo
-- de qualquer código do site rodar — mesmo que a validação do navegador seja
-- contornada, o Storage rejeita qualquer arquivo maior que 10MB ou fora
-- desses 4 formatos, com erro 413/415 direto da API.
update storage.buckets
set file_size_limit = 10485760, -- 10 MB, em bytes (10 * 1024 * 1024)
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
where id = 'vehicle-photos';

-- ── Múltiplas fotos por anúncio (até 20, até 200MB no total) ───────────
-- Tabela nova: guarda só o necessário para localizar cada imagem no Storage
-- (bucket vehicle-photos). O arquivo em si (binário) fica só no Storage —
-- nunca em base64 nem como bytea dentro desta tabela ou de public.vehicles.

create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_name text,
  file_size bigint not null default 0,
  mime_type text,
  ordem integer not null default 0,
  is_cover boolean not null default false
);

alter table public.vehicle_photos enable row level security;

-- Mesmo motivo do GRANT em team_members/reviews acima: tabela nova precisa
-- desse GRANT explícito, senão o Postgres bloqueia antes de chegar nas
-- policies abaixo.
grant select on public.vehicle_photos to anon;
grant select, insert, update, delete on public.vehicle_photos to authenticated;

drop policy if exists "Vehicle photo rows are viewable by everyone" on public.vehicle_photos;
create policy "Vehicle photo rows are viewable by everyone"
  on public.vehicle_photos for select
  using (true);

-- Mesmo modelo de permissão já usado em vehicles: quem pode editar um
-- anúncio (administrador) é quem pode mexer nas fotos dele. O site atual
-- não tem "dono do anúncio" com permissão de edição — só administradores
-- editam qualquer anúncio — então as fotos seguem a mesma regra.
drop policy if exists "Admins can insert vehicle photo rows" on public.vehicle_photos;
create policy "Admins can insert vehicle photo rows"
  on public.vehicle_photos for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update vehicle photo rows" on public.vehicle_photos;
create policy "Admins can update vehicle photo rows"
  on public.vehicle_photos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete vehicle photo rows" on public.vehicle_photos;
create policy "Admins can delete vehicle photo rows"
  on public.vehicle_photos for delete
  to authenticated
  using (public.is_admin());

create index if not exists idx_vehicle_photos_vehicle_id on public.vehicle_photos(vehicle_id);

-- Trava real no banco para o limite de 20 fotos / 200MB por anúncio — não
-- depende do JavaScript do navegador nem do frontend obedecer a regra.
-- Mesmo uma requisição feita direto pela API do Supabase (contornando o
-- site) é barrada aqui.
create or replace function public.check_vehicle_photo_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_count integer;
  total_size bigint;
begin
  select count(*), coalesce(sum(file_size), 0)
  into photo_count, total_size
  from public.vehicle_photos
  where vehicle_id = new.vehicle_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  photo_count := photo_count + 1;
  total_size := total_size + coalesce(new.file_size, 0);

  if photo_count > 20 then
    raise exception 'Limite de 20 fotos por anúncio excedido (seriam % fotos)', photo_count;
  end if;

  if total_size > 209715200 then -- 200 MB em bytes (200 * 1024 * 1024)
    raise exception 'Limite de 200MB por anúncio excedido (total seria % bytes)', total_size;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_vehicle_photo_limits on public.vehicle_photos;
create trigger trg_check_vehicle_photo_limits
  before insert or update on public.vehicle_photos
  for each row execute function public.check_vehicle_photo_limits();

-- Garante só uma foto de capa (is_cover = true) por anúncio: ao marcar uma
-- nova capa, desmarca automaticamente a antiga.
create or replace function public.enforce_single_cover_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_cover then
    update public.vehicle_photos
    set is_cover = false
    where vehicle_id = new.vehicle_id
      and id <> new.id
      and is_cover = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_single_cover_photo on public.vehicle_photos;
create trigger trg_enforce_single_cover_photo
  before insert or update on public.vehicle_photos
  for each row execute function public.enforce_single_cover_photo();

-- Mantém vehicles.image_url sempre igual à foto de capa atual. É por isso
-- que o worker.js (prévia do link no WhatsApp) e o VehicleCard.jsx (card na
-- vitrine) não precisam de nenhuma alteração: continuam lendo só
-- vehicles.image_url, sem saber que agora existem várias fotos por trás.
create or replace function public.sync_vehicle_cover_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_vehicle_id uuid;
  cover_url text;
begin
  target_vehicle_id := coalesce(new.vehicle_id, old.vehicle_id);

  select public_url into cover_url
  from public.vehicle_photos
  where vehicle_id = target_vehicle_id and is_cover = true
  order by ordem asc
  limit 1;

  if cover_url is null then
    select public_url into cover_url
    from public.vehicle_photos
    where vehicle_id = target_vehicle_id
    order by ordem asc, created_at asc
    limit 1;
  end if;

  update public.vehicles
  set image_url = cover_url
  where id = target_vehicle_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_vehicle_cover_photo on public.vehicle_photos;
create trigger trg_sync_vehicle_cover_photo
  after insert or update or delete on public.vehicle_photos
  for each row execute function public.sync_vehicle_cover_photo();

-- Migra as fotos antigas (uma por anúncio, guardada só em vehicles.image_url)
-- para a tabela nova, recuperando o tamanho e o tipo reais do arquivo a
-- partir do próprio storage.objects (não inventa esses valores). Só roda
-- para anúncios que ainda não têm nenhuma linha em vehicle_photos, então é
-- seguro rodar este arquivo de novo sem duplicar nada.
insert into public.vehicle_photos
  (vehicle_id, storage_path, public_url, file_name, file_size, mime_type, ordem, is_cover)
select
  v.id,
  regexp_replace(v.image_url, '^.*/vehicle-photos/', ''),
  v.image_url,
  regexp_replace(v.image_url, '^.*/', ''),
  coalesce((so.metadata->>'size')::bigint, 0),
  coalesce(so.metadata->>'mimetype', 'image/jpeg'),
  0,
  true
from public.vehicles v
left join storage.objects so
  on so.bucket_id = 'vehicle-photos'
  and so.name = regexp_replace(v.image_url, '^.*/vehicle-photos/', '')
where v.image_url is not null
  and not exists (
    select 1 from public.vehicle_photos vp where vp.vehicle_id = v.id
  );

-- ── Novos campos e limites de texto do anúncio ─────────────────────────

alter table public.vehicles add column if not exists observacoes text;

-- "not valid" faz o Postgres exigir o limite em qualquer inserção ou edição
-- daqui pra frente, sem quebrar a migração caso já exista algum anúncio
-- antigo com um texto maior que o novo limite (esse aqui nunca fica
-- inválido por causa de dado já existente).
alter table public.vehicles drop constraint if exists vehicles_title_length_check;
alter table public.vehicles
  add constraint vehicles_title_length_check
  check (char_length(title) <= 120) not valid;

alter table public.vehicles drop constraint if exists vehicles_description_length_check;
alter table public.vehicles
  add constraint vehicles_description_length_check
  check (description is null or char_length(description) <= 5000) not valid;

alter table public.vehicles drop constraint if exists vehicles_observacoes_length_check;
alter table public.vehicles
  add constraint vehicles_observacoes_length_check
  check (observacoes is null or char_length(observacoes) <= 2000) not valid;

-- ── Equipe ──────────────────────────────────────────────────────────────
-- Mostrada na sessão "Nossa equipe" do site. Qualquer visitante pode ver;
-- só administradores podem adicionar, editar ou remover integrantes (a
-- edição é feita direto pelo site, sem precisar do SQL Editor).

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  role text,
  bio text,
  photo_url text,
  sort_order integer not null default 0
);

alter table public.team_members enable row level security;

-- As tabelas novas (diferente de vehicles/profiles, que já vinham com isso
-- configurado) precisam desse GRANT explícito — sem ele, o Postgres bloqueia
-- o acesso antes mesmo de chegar a checar as policies abaixo.
grant select on public.team_members to anon;
grant select, insert, update, delete on public.team_members to authenticated;

drop policy if exists "Team members are viewable by everyone" on public.team_members;
create policy "Team members are viewable by everyone"
  on public.team_members for select
  using (true);

drop policy if exists "Admins can insert team members" on public.team_members;
create policy "Admins can insert team members"
  on public.team_members for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update team members" on public.team_members;
create policy "Admins can update team members"
  on public.team_members for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can delete team members" on public.team_members;
create policy "Admins can delete team members"
  on public.team_members for delete
  to authenticated
  using (public.is_admin());

-- Fotos da equipe (mesmo padrão do bucket vehicle-photos acima).
insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

drop policy if exists "Team photos are publicly readable" on storage.objects;
create policy "Team photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'team-photos');

drop policy if exists "Admins can upload team photos" on storage.objects;
create policy "Admins can upload team photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'team-photos' and public.is_admin());

drop policy if exists "Admins can update team photos" on storage.objects;
create policy "Admins can update team photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'team-photos' and public.is_admin());

drop policy if exists "Admins can delete team photos" on storage.objects;
create policy "Admins can delete team photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'team-photos' and public.is_admin());

-- ── Avaliações de clientes ──────────────────────────────────────────────
-- Qualquer visitante (logado ou não) pode enviar uma avaliação (nota de
-- estrelas + texto curto), mas ela só aparece no site depois que um
-- administrador aprovar — enquanto isso fica "pendente" e só o admin
-- consegue vê-la.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author_name text,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  approved boolean not null default false
);

alter table public.reviews enable row level security;

-- Mesmo motivo do GRANT em team_members acima: sem isso, nem visitante
-- anônimo consegue ler as aprovadas nem enviar uma avaliação nova.
grant select, insert on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;

drop policy if exists "Approved reviews are viewable by everyone" on public.reviews;
create policy "Approved reviews are viewable by everyone"
  on public.reviews for select
  using (approved = true or public.is_admin());

-- Envio liberado pra qualquer um, mas sempre como pendente — ninguém
-- consegue se auto-aprovar mandando approved = true na requisição, porque
-- essa condição abaixo bloquearia a inserção.
drop policy if exists "Anyone can submit a review" on public.reviews;
create policy "Anyone can submit a review"
  on public.reviews for insert
  to anon, authenticated
  with check (approved = false);

drop policy if exists "Admins can update reviews" on public.reviews;
create policy "Admins can update reviews"
  on public.reviews for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete reviews" on public.reviews;
create policy "Admins can delete reviews"
  on public.reviews for delete
  to authenticated
  using (public.is_admin());

-- ── Tornar alguém administrador ────────────────────────────────────────
-- 1. Essa pessoa precisa criar uma conta pelo site (tela "Criar conta").
-- 2. Depois, rode o comando abaixo (troque o e-mail) para dar acesso de
--    administrador a ela. Pode rodar de novo para cada pessoa da equipe.
--
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'seu-email@exemplo.com');
