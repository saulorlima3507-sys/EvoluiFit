from pathlib import Path
import json
m=json.loads(Path('work/legal-18/documents.json').read_text());t=m['documents']['terms'];p=m['documents']['privacy'];quote=lambda x:"'"+x.replace("'","''")+"'"
s='''-- EvoluFit: registro de aceite de novos cadastros. Não apaga dados nem cria aceites retroativos.
-- Aplicar após 202610140001_accounts.sql. Ativação deliberada somente após revisão dos documentos.
begin;
create schema if not exists evoluifit_private;
revoke all on schema evoluifit_private from public, anon, authenticated;
create table if not exists evoluifit_private.legal_document_versions (
  kind text not null check(kind in ('terms','privacy')),
  version text not null,
  body_sha256 text not null check(body_sha256 ~ '^[a-f0-9]{64}$'),
  document_body text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(kind,version),
  check(body_sha256=encode(sha256(convert_to(document_body,'UTF8')),'hex'))
);
alter table evoluifit_private.legal_document_versions enable row level security;
revoke all on evoluifit_private.legal_document_versions from public,anon,authenticated,service_role;
'''
for kind,doc in [('terms',t),('privacy',p)]:
 s+=f"insert into evoluifit_private.legal_document_versions(kind,version,body_sha256,document_body) values({quote(kind)},{quote(doc['version'])},{quote(doc['sha256'])},$legalbody${doc['body']}$legalbody$) on conflict(kind,version) do nothing;\n"
 s+=f"do $$ begin if not exists(select 1 from evoluifit_private.legal_document_versions where kind={quote(kind)} and version={quote(doc['version'])} and body_sha256={quote(doc['sha256'])}) then raise exception 'Versão de documento já existe com outro conteúdo. Crie uma nova versão.';end if;end;$$;\n"
s+='''create table if not exists evoluifit_private.legal_configuration (
  id integer primary key check(id=1),
  active boolean not null default false,
  terms_version text not null,
  privacy_version text not null,
  health_consent_version text not null,
  acceptance_text text not null,
  health_consent_text text not null
);
alter table evoluifit_private.legal_configuration enable row level security;
revoke all on evoluifit_private.legal_configuration from public,anon,authenticated,service_role;
'''
s+=f"insert into evoluifit_private.legal_configuration(id,active,terms_version,privacy_version,health_consent_version,acceptance_text,health_consent_text) values(1,false,{quote(t['version'])},{quote(p['version'])},{quote(m['healthConsentVersion'])},{quote(m['acceptanceText'])},{quote(m['healthConsentText'])}) on conflict(id) do nothing;\n"
s+='''create table if not exists public.evoluifit_legal_acceptances (
  id bigint generated always as identity primary key,
  -- UUID mínimo mantido para comprovação; não impede exclusão futura da conta.
  user_id uuid not null,
  accepted_at timestamptz not null default clock_timestamp(),
  terms_version text not null,
  privacy_version text not null,
  terms_sha256 text not null check(terms_sha256 ~ '^[a-f0-9]{64}$'),
  privacy_sha256 text not null check(privacy_sha256 ~ '^[a-f0-9]{64}$'),
  acceptance_text text not null,
  health_consent_version text not null,
  health_consent_text text not null,
  source text not null default 'signup' check(source='signup'),
  unique(user_id,terms_version,privacy_version,health_consent_version)
);
alter table public.evoluifit_legal_acceptances enable row level security;
revoke all on public.evoluifit_legal_acceptances from public,anon,authenticated,service_role;
grant select on public.evoluifit_legal_acceptances to authenticated,service_role;
drop policy if exists "Read own legal acceptance" on public.evoluifit_legal_acceptances;
create policy "Read own legal acceptance" on public.evoluifit_legal_acceptances for select to authenticated using((select auth.uid())=user_id);
create index if not exists evoluifit_legal_acceptances_user_date on public.evoluifit_legal_acceptances(user_id,accepted_at desc);
create or replace function public.evoluifit_legal_configuration()
returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('ready',c.active,'termsVersion',c.terms_version,'privacyVersion',c.privacy_version,'termsSha256',t.body_sha256,'privacySha256',p.body_sha256,'healthConsentVersion',c.health_consent_version)
 from evoluifit_private.legal_configuration c
 join evoluifit_private.legal_document_versions t on t.kind='terms' and t.version=c.terms_version
 join evoluifit_private.legal_document_versions p on p.kind='privacy' and p.version=c.privacy_version where c.id=1;
$$;
revoke all on function public.evoluifit_legal_configuration() from public,anon,authenticated;
grant execute on function public.evoluifit_legal_configuration() to service_role;
create or replace function public.evoluifit_provision_account_legal(
 p_user_id uuid,p_cpf text,p_phone text,p_birth_date date,p_weight numeric,p_height numeric,p_nickname text,p_gender text,
 p_accepted boolean,p_terms_version text,p_privacy_version text,p_terms_sha256 text,p_privacy_sha256 text,p_health_consent boolean,p_health_consent_version text
) returns void language plpgsql security definer set search_path='' as $$
declare cfg jsonb; details evoluifit_private.legal_configuration%rowtype;
begin
 if p_birth_date is null or p_birth_date > (current_date - interval '18 years')::date then raise exception 'Cadastro disponível somente para maiores de 18 anos';end if;
 cfg:=public.evoluifit_legal_configuration();
 if cfg is null or cfg->>'ready' is distinct from 'true' or p_accepted is distinct from true or p_health_consent is distinct from true or
    p_terms_version is distinct from cfg->>'termsVersion' or p_privacy_version is distinct from cfg->>'privacyVersion' or
    p_terms_sha256 is distinct from cfg->>'termsSha256' or p_privacy_sha256 is distinct from cfg->>'privacySha256' or
    p_health_consent_version is distinct from cfg->>'healthConsentVersion' then
   raise exception 'Aceite obrigatório ausente, desativado ou com versão divergente';
 end if;
 select * into strict details from evoluifit_private.legal_configuration where id=1;
 -- Perfil, CPF e comprovante são criados na mesma transação; falha reverte todos.
 perform public.evoluifit_provision_account(p_user_id,p_cpf,p_phone,p_birth_date,p_weight,p_height,p_nickname,p_gender);
 insert into public.evoluifit_legal_acceptances(user_id,terms_version,privacy_version,terms_sha256,privacy_sha256,acceptance_text,health_consent_version,health_consent_text)
 values(p_user_id,p_terms_version,p_privacy_version,p_terms_sha256,p_privacy_sha256,details.acceptance_text,p_health_consent_version,details.health_consent_text);
end;
$$;
revoke all on function public.evoluifit_provision_account_legal(uuid,text,text,date,numeric,numeric,text,text,boolean,text,text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.evoluifit_provision_account_legal(uuid,text,text,date,numeric,numeric,text,text,boolean,text,text,text,text,boolean,text) to service_role;
-- Fecha a rota antiga de cadastro que não registrava aceite. O wrapper acima usa o proprietário da função.
revoke all on function public.evoluifit_provision_account(uuid,text,text,date,numeric,numeric,text,text) from public,anon,authenticated,service_role;
commit;
-- Não ativa automaticamente. Ver instruções e revisão em LEGAL-SETUP.md.
'''
Path('supabase/migrations/202610180001_legal_acceptance.sql').write_text(s)
