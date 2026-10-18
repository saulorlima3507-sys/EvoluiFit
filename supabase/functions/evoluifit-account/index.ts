// Deploy com o nome evoluifit-account; verify_jwt=false.
// A função valida a sessão antes de acessar qualquer perfil privado.
const project = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowed = (Deno.env.get('EVOLUIFIT_ORIGINS') || 'https://saulorlima3507-sys.github.io').split(',');
const encoder = new TextEncoder();
function validCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  for (let size = 9; size <= 10; size++) {
    let total = 0; for (let i = 0; i < size; i++) total += Number(value[i]) * (size + 1 - i);
    if ((total * 10 % 11) % 10 !== Number(value[size])) return false;
  }
  return true;
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const birth = new Date(value + 'T00:00:00Z'), now = new Date();
  const earliest = new Date(now); earliest.setUTCFullYear(now.getUTCFullYear() - 120);
  const age=now.getUTCFullYear()-birth.getUTCFullYear()-(now.getUTCMonth()<birth.getUTCMonth()||(now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()<birth.getUTCDate())?1:0);
  return !Number.isNaN(+birth) && birth.toISOString().slice(0,10) === value && birth <= now && birth >= earliest && age>=18;
}
async function api(path: string, body?: unknown, method = 'POST', token = secret) {
  const response = await fetch(project + path, {
    method, headers: {apikey: secret, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error('Backend request failed');
  return data;
}
async function hash(value: string) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const buffer = await crypto.subtle.sign('HMAC',key,encoder.encode(value));
  return Array.from(new Uint8Array(buffer),n=>n.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin') || '';
  const headers = {'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin'};
  const reply = (data: unknown, code = 200) => new Response(JSON.stringify(data),{status:code,headers});
  if (origin && !allowed.includes(origin)) return reply({error:'Origem não permitida.'},403);
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return reply({error:'Método não permitido.'},405);
  if (Number(request.headers.get('Content-Length') || 0) > 8192) return reply({error:'Pedido inválido.'},413);
  try {
    const raw = await request.text(); if (raw.length > 8192) return reply({error:'Pedido inválido.'},413);
    const input = JSON.parse(raw);
    const action = input.action;
    if(action==='legal-status'){
      const config=await api('/rest/v1/rpc/evoluifit_legal_configuration',{});
      return reply(config||{ready:false});
    }
    if (action === 'profile') {
      const authorization = request.headers.get('Authorization') || '';
      if (!authorization.startsWith('Bearer ')) return reply({error:'Entre novamente.'},401);
      let user;
      try { user = await api('/auth/v1/user',undefined,'GET',authorization.slice(7)); }
      catch { return reply({error:'Entre novamente.'},401); }
      const profiles = await api('/rest/v1/evoluifit_profiles?id=eq.'+encodeURIComponent(user.id)+'&select=*',undefined,'GET');
      if (!profiles?.[0]) return reply({error:'Cadastro incompleto. Entre em contato com o suporte.'},403);
      let legalAcceptance=null;
      try{const receipts=await api('/rest/v1/evoluifit_legal_acceptances?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id,accepted_at,terms_version,privacy_version,terms_sha256,privacy_sha256,health_consent_version&order=accepted_at.desc&limit=1',undefined,'GET');legalAcceptance=receipts?.[0]||null;}catch{/* Contas anteriores continuam acessíveis durante a instalação. */}
      return reply({user:{id:user.id,email:user.email},profile:profiles[0],legalAcceptance});
    }
    if (!['login','signup'].includes(action)) return reply({error:'Pedido inválido.'},400);
    const identifier = String(action === 'signup' ? input.email || '' : input.identifier || '').trim().toLowerCase();
    const password = typeof input.password === 'string' ? input.password : '';
    if (!identifier || identifier.length > 254 || password.length < 1 || password.length > 128) return reply({error:'Confira seus dados.'},400);
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const limits = await Promise.all([
      api('/rest/v1/rpc/evoluifit_consume_limit',{p_key:'ip:'+await hash(ip),p_limit:30,p_seconds:3600}),
      api('/rest/v1/rpc/evoluifit_consume_limit',{p_key:'id:'+await hash(identifier),p_limit:6,p_seconds:600})
    ]);
    if (limits.some(value=>value !== true)) return reply({error:'Muitas tentativas. Aguarde alguns minutos.'},429);
    let email = identifier;
    if (action === 'login') {
      if (!email.includes('@')) {
        const cpf = identifier.replace(/\D/g,'');
        email = validCpf(cpf) ? await api('/rest/v1/rpc/evoluifit_email_for_cpf',{p_cpf:cpf}) : null;
        // Executa a autenticação também quando o CPF não existe; nunca revela o e-mail.
        if (!email) email = 'unknown-'+crypto.randomUUID()+'@invalid.example';
      }
      try {
        const session = await api('/auth/v1/token?grant_type=password',{email,password});
        const profiles = await api('/rest/v1/evoluifit_profiles?id=eq.'+encodeURIComponent(session.user.id)+'&select=id',undefined,'GET');
        if (!profiles?.length) return reply({error:'Cadastro incompleto. Entre em contato com o suporte.'},403);
        return reply({session});
      } catch { return reply({error:'E-mail ou CPF e senha não conferem.'},401); }
    }
    const legal=input.legal;
    if(!legal||legal.accepted!==true)return reply({error:'Para continuar, é necessário ler e aceitar os Termos de Uso e a Política de Privacidade.'},400);
    if(legal.healthConsent!==true)return reply({error:'Autorize especificamente o tratamento dos dados de saúde para as funcionalidades personalizadas.'},400);
    const config=await api('/rest/v1/rpc/evoluifit_legal_configuration',{});
    if(config?.ready!==true)return reply({error:'O cadastro está temporariamente indisponível.'},503);
    if(legal.termsVersion!==config.termsVersion||legal.privacyVersion!==config.privacyVersion||legal.termsSha256!==config.termsSha256||legal.privacySha256!==config.privacySha256||legal.healthConsentVersion!==config.healthConsentVersion)return reply({error:'Os documentos de cadastro mudaram. Atualize a página e confira os textos antes de aceitar.'},409);
    const cpf = String(input.cpf || '').replace(/\D/g,'');
    const phone = String(input.phone || '').replace(/\D/g,'');
    const nickname = String(input.nickname || '').trim();
    const weight = Number(input.weight), height = Number(input.height);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !validCpf(cpf) || !/^\d{10,11}$/.test(phone) ||
      nickname.length < 2 || nickname.length > 40 || /[\u0000-\u001f]/.test(nickname) || !['homem','mulher'].includes(input.gender) ||
      !validDate(String(input.birthDate || '')) || !Number.isFinite(weight) || weight < 1 || weight > 500 || !Number.isFinite(height) || height < 30 || height > 280) {
      return reply({error:'Confira os campos do cadastro.'},400);
    }
    // Validação duplicada no banco impede corridas de cadastro com o mesmo CPF.
    if (await api('/rest/v1/rpc/evoluifit_email_for_cpf',{p_cpf:cpf})) return reply({error:'Não foi possível cadastrar. Confira os dados ou tente entrar.'},409);
    let user;
    try {
      user = await api('/auth/v1/admin/users',{email,password,email_confirm:true});
      await api('/rest/v1/rpc/evoluifit_provision_account_legal',{
        p_user_id:user.id,p_cpf:cpf,p_phone:phone,p_birth_date:input.birthDate,
        p_weight:weight,p_height:height,p_nickname:nickname,p_gender:input.gender,
        p_accepted:true,p_terms_version:config.termsVersion,p_privacy_version:config.privacyVersion,p_terms_sha256:config.termsSha256,p_privacy_sha256:config.privacySha256,p_health_consent:true,p_health_consent_version:config.healthConsentVersion
      });
    } catch {
      if (user?.id) {
        // Compensa falha do perfil sem deixar uma conta de login incompleta.
        try { await api('/auth/v1/admin/users/'+encodeURIComponent(user.id),undefined,'DELETE'); }
        catch { return reply({error:'Cadastro pendente. Entre em contato com o suporte antes de tentar novamente.'},503); }
      }
      return reply({error:'Não foi possível cadastrar. Confira os dados ou tente entrar.'},409);
    }
    try { return reply({legalRecorded:true,session:await api('/auth/v1/token?grant_type=password',{email,password})}); }
    catch { return reply({registered:true,legalRecorded:true,message:'Conta criada. Entre com seu e-mail ou CPF e senha.'}); }
  } catch { return reply({error:'Cadastro e login temporariamente indisponíveis. Tente novamente mais tarde.'},503); }
});
