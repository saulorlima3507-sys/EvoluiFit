'use strict';
(() => {
  const url = 'https://xoyaoxhmkmplqsxjooni.supabase.co';
  const key = 'sb_publishable_ocwP13bcjMNQhRkFzq9vJg_SRGW2jJQ';
  const sessionKey = 'evoluifit-auth-session-v1';
  let session = null;
  try {session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');} catch {}
  let refreshing=null, generation=0;
  function minimal(next) {
    if(!next||typeof next.access_token!=='string'||!next.access_token||typeof next.refresh_token!=='string'||!next.refresh_token)return null;
    const expires=Number(next.expires_at);
    return {access_token:next.access_token,refresh_token:next.refresh_token,expires_at:Number.isFinite(expires)?expires:0};
  }
  session=minimal(session);
  try{if(session)sessionStorage.setItem(sessionKey,JSON.stringify(session));else sessionStorage.removeItem(sessionKey);}catch{}
  function save(next) {
    // Somente tokens de sessão; nunca senha, CPF ou dados do formulário.
    const value=minimal(next);if(!value)throw new Error("Sessão inválida. Entre novamente.");
    sessionStorage.setItem(sessionKey, JSON.stringify(value)); session = value;
  }
  async function request(path, body, token, method = 'POST') {
    let response;
    try { response = await fetch(url + path, {method,headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body === undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)}); }
    catch {throw new Error('Não foi possível conectar. Confira sua internet e tente novamente.');}
    const data = await response.json().catch(()=>null);
    if (!response.ok) {
      const error = new Error(response.status === 404 ? 'O cadastro está aguardando a ativação no Supabase. Seus dados não foram cadastrados.' : data?.error || (response.status === 401?'Sua sessão terminou. Entre novamente.':'Não foi possível concluir. Tente novamente.'));
      error.status = response.status; throw error;
    }
    return data;
  }
  async function token() {
    if (!session?.access_token || !session.refresh_token) return null;
    if ((session.expires_at || 0) * 1000 < Date.now() + 60000) {
      if(!refreshing){
        const version=generation,refreshToken=session.refresh_token;
        refreshing=(async()=>{
          try{const refreshed=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:refreshToken});if(version!==generation)return;save({...refreshed,expires_at:refreshed.expires_at||Math.floor(Date.now()/1000)+refreshed.expires_in});}
          catch(error){if(version===generation&&[400,401,403].includes(error.status)){session=null;sessionStorage.removeItem(sessionKey);}throw error;}
          finally{refreshing=null;}
        })();
      }
      await refreshing;
    }
    return session?.access_token||null;
  }
  async function account(action, input = {}, authenticated = false) {
    return request('/functions/v1/evoluifit-account',{...input,action},authenticated?await token():undefined);
  }
  function accept(data) {
    if (data?.session?.access_token) save({...data.session,expires_at:data.session.expires_at || Math.floor(Date.now()/1000)+data.session.expires_in});
    return data;
  }
  async function readProfile() {
    if (!await token()) return null;
    return account('profile',{},true);
  }
  async function logout() {
    const old = session?.access_token;generation++;session=null;sessionStorage.removeItem(sessionKey);
    if(old) request('/auth/v1/logout?scope=local',{},old).catch(()=>{});
  }
  async function avatar(file, id) {
    if(!file) return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>5*1024*1024) throw new Error('Escolha JPG, PNG ou WebP de até 5 MB.');
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas'), scale = Math.min(1,512/Math.max(bitmap.width,bitmap.height));
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.85));
    if (!blob || blob.size>2*1024*1024) throw new Error('Não foi possível preparar a foto.');
    const response = await fetch(url+'/storage/v1/object/evoluifit-avatars/'+encodeURIComponent(id)+'/profile.webp',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+await token(),'Content-Type':'image/webp','x-upsert':'true'},body:blob,signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw new Error('Sua conta foi criada, mas a foto não pôde ser enviada. Você pode adicioná-la depois.');
  }
  async function avatarUrl(id) {
    try {const data = await request('/storage/v1/object/sign/evoluifit-avatars/'+encodeURIComponent(id)+'/profile.webp',{expiresIn:3600},await token());const path=data.signedURL || data.signedUrl;return typeof path==='string' && path.startsWith('/object/sign/')?url+'/storage/v1'+path:null;} catch {return null;}
  }
  window.EvoluiAuth={login:async input=>accept(await account('login',input)),signup:async input=>accept(await account('signup',input)),readProfile,logout,avatar,avatarUrl,hasSession:()=>!!session?.access_token};
})();
