-- EvoluiFit: execute uma vez no SQL Editor do projeto.
-- Não altera nem importa registros que já existem nos navegadores.
begin;
create schema if not exists evoluifit_private;
revoke all on schema evoluifit_private from public, anon, authenticated;

create or replace function evoluifit_private.valid_cpf(value text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare i integer; total integer; digit integer;
begin
  if value !~ '^[0-9]{11}$' or value = repeat(substr(value,1,1),11) then return false; end if;
  total := 0;
  for i in 1..9 loop total := total + substr(value,i,1)::integer * (11-i); end loop;
  digit := (total * 10) % 11;
  if digit = 10 then digit := 0; end if;
  if digit <> substr(value,10,1)::integer then return false; end if;
  total := 0;
  for i in 1..10 loop total := total + substr(value,i,1)::integer * (12-i); end loop;
  digit := (total * 10) % 11;
  if digit = 10 then digit := 0; end if;
  return digit = substr(value,11,1)::integer;
end;
$$;
revoke all on function evoluifit_private.valid_cpf(text) from public, anon, authenticated;

create table public.evoluifit_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 2 and 40),
  gender text not null check (gender in ('homem','mulher')),
  phone text not null check (phone ~ '^[0-9]{10,11}$'),
  birth_date date not null check (birth_date >= date '1900-01-01'),
  initial_weight numeric(5,2) not null check (initial_weight between 1 and 500),
  initial_height numeric(5,2) not null check (initial_height between 30 and 280),
  avatar_path text,
  created_at timestamptz not null default now(),
  constraint own_avatar_path check (avatar_path is null or avatar_path = id::text || '/profile.webp')
);
alter table public.evoluifit_profiles enable row level security;
revoke all on public.evoluifit_profiles from anon, authenticated;
grant select on public.evoluifit_profiles to authenticated;
grant all on public.evoluifit_profiles to service_role;
create policy "Read own EvoluiFit profile" on public.evoluifit_profiles
  for select to authenticated using ((select auth.uid()) = id);

create table evoluifit_private.account_identifiers (
  user_id uuid primary key references public.evoluifit_profiles(id) on delete cascade,
  cpf text not null unique check (evoluifit_private.valid_cpf(cpf))
);
alter table evoluifit_private.account_identifiers enable row level security;
revoke all on evoluifit_private.account_identifiers from public, anon, authenticated;

-- Somente a função de servidor pode vincular CPF e criar o perfil.
create or replace function public.evoluifit_provision_account(
  p_user_id uuid, p_cpf text, p_phone text, p_birth_date date,
  p_weight numeric, p_height numeric, p_nickname text, p_gender text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_birth_date is null or p_birth_date > current_date or
     p_birth_date < (current_date - interval '120 years')::date then
    raise exception 'Data de nascimento inválida';
  end if;
  insert into public.evoluifit_profiles(id,phone,birth_date,initial_weight,initial_height,nickname,gender)
    values(p_user_id,p_phone,p_birth_date,p_weight,p_height,p_nickname,p_gender);
  insert into evoluifit_private.account_identifiers(user_id,cpf) values(p_user_id,p_cpf);
end;
$$;
revoke all on function public.evoluifit_provision_account(uuid,text,text,date,numeric,numeric,text,text) from public, anon, authenticated;
grant execute on function public.evoluifit_provision_account(uuid,text,text,date,numeric,numeric,text,text) to service_role;

-- Nunca disponibilizar essa consulta diretamente ao navegador.
create or replace function public.evoluifit_email_for_cpf(p_cpf text)
returns text language sql security definer set search_path = '' as $$
  select u.email from auth.users u
  join evoluifit_private.account_identifiers a on a.user_id = u.id
  where a.cpf = p_cpf limit 1;
$$;
revoke all on function public.evoluifit_email_for_cpf(text) from public, anon, authenticated;
grant execute on function public.evoluifit_email_for_cpf(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('evoluifit-avatars','evoluifit-avatars',false,2097152,array['image/webp']);
create policy "Read own EvoluiFit avatar" on storage.objects for select to authenticated
using(bucket_id = 'evoluifit-avatars' and name = (select auth.uid())::text || '/profile.webp');
create policy "Upload own EvoluiFit avatar" on storage.objects for insert to authenticated
with check(bucket_id = 'evoluifit-avatars' and name = (select auth.uid())::text || '/profile.webp');
create policy "Replace own EvoluiFit avatar" on storage.objects for update to authenticated
using(bucket_id = 'evoluifit-avatars' and name = (select auth.uid())::text || '/profile.webp')
with check(bucket_id = 'evoluifit-avatars' and name = (select auth.uid())::text || '/profile.webp');
create policy "Delete own EvoluiFit avatar" on storage.objects for delete to authenticated
using(bucket_id = 'evoluifit-avatars' and name = (select auth.uid())::text || '/profile.webp');
-- Contadores privados para limitar tentativas no servidor.
create table evoluifit_private.auth_limits (
  key text primary key check (char_length(key) <= 256),
  attempts integer not null,
  expires_at timestamptz not null
);
alter table evoluifit_private.auth_limits enable row level security;
revoke all on evoluifit_private.auth_limits from public, anon, authenticated;
create or replace function public.evoluifit_consume_limit(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare count_now integer; moment timestamptz := clock_timestamp();
begin
  if p_limit not between 1 and 1000 or p_seconds not between 1 and 86400 then
    raise exception 'Limite inválido';
  end if;
  delete from evoluifit_private.auth_limits where expires_at < moment;
  insert into evoluifit_private.auth_limits(key,attempts,expires_at)
    values(p_key,1,moment + make_interval(secs => p_seconds))
    on conflict(key) do update set attempts = evoluifit_private.auth_limits.attempts + 1
    returning attempts into count_now;
  return count_now <= p_limit;
end;
$$;
revoke all on function public.evoluifit_consume_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.evoluifit_consume_limit(text,integer,integer) to service_role;
commit;
