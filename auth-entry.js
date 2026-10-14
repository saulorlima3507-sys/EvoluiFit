'use strict';
(async () => {
  const loading = document.getElementById('auth-loading');
  const report = message => {loading.hidden=false;loading.querySelector('p').textContent=message;};
  let started = false, account;
  const toLogin = async () => {document.body.classList.remove('account-ready');await EvoluiAuth.logout();location.replace('conta.html');};
  async function verify() {
    if(!EvoluiAuth.hasSession()){location.replace('conta.html');return;}
    try {
      account=await EvoluiAuth.readProfile();
      if(!account?.user?.id || !/^[0-9a-f-]{36}$/i.test(account.user.id) || typeof account.profile?.nickname !== 'string') throw new Error('Não foi possível conferir sua conta.');
      window.EvoluiAccount=account;
      if(!started){started=true;setupMenu();const script=document.createElement('script');script.src='app.js?v=accounts-3';script.onload=()=>{loading.hidden=true;document.body.classList.add('account-ready');};script.onerror=()=>{report('Não foi possível carregar o site. Tente novamente.');};document.head.appendChild(script);}
      else{loading.hidden=true;document.body.classList.add('account-ready');}
    }catch(error){document.body.classList.remove('account-ready');if([400,401,403].includes(error.status)){await toLogin();return;}report(error.message);}
  }
  function setupMenu() {
    const details=document.getElementById('account-menu');
    details.querySelector('[data-account-name]').textContent=account.profile.nickname;
    details.querySelector('[data-account-email]').textContent=account.user.email;
    const initials=account.profile.nickname.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
    details.querySelector('[data-account-initials]').textContent=initials;
    document.getElementById('account-logout').onclick=toLogin;
    document.getElementById('account-details').onclick=()=>{
      details.open=false;const modal=document.getElementById('modal'),content=document.getElementById('modal-content');
      content.innerHTML='<div class="modal-inner"><div class="section-header"><h2>Minha conta</h2><button class="btn subtle" id="close-account">Fechar</button></div><dl class="account-data"></dl><label class="field">Foto de perfil (opcional)<input id="account-photo" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG ou WebP de até 5 MB.</small></label><p id="photo-status" role="status"></p></div>';
      const items=[['Apelido',account.profile.nickname],['E-mail',account.user.email],['Celular',account.profile.phone],['Gênero',account.profile.gender==='homem'?'Homem':'Mulher'],['Nascimento',new Date(account.profile.birth_date+'T12:00:00').toLocaleDateString('pt-BR')]];
      const list=content.querySelector('dl');for(const [label,value] of items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);}
      content.querySelector('#close-account').onclick=()=>modal.close();
      content.querySelector('#account-photo').onchange=async event=>{const file=event.target.files[0];if(!file)return;event.target.disabled=true;const status=content.querySelector('#photo-status');status.textContent='Salvando foto…';try{await EvoluiAuth.avatar(file,account.user.id);await updateAvatar();status.textContent='Foto atualizada.';}catch(error){status.textContent=error.message;}finally{event.target.disabled=false;event.target.value='';}};
      modal.showModal();
    };
    details.querySelector('[data-view]').addEventListener('click',()=>{details.open=false;});
    document.getElementById('account-import').onclick=()=>{details.open=false;window.importLegacyAccountRecords?.();};
    updateAvatar();
  }
  async function updateAvatar(){const url=await EvoluiAuth.avatarUrl(account.user.id);if(!url)return;const image=document.querySelector('[data-account-photo]');image.src=url;image.onload=()=>{image.hidden=false;document.querySelector('[data-account-initials]').hidden=true;};}
  document.getElementById('auth-retry').onclick=verify;
  document.getElementById('auth-return').onclick=toLogin;
  window.addEventListener('pageshow',event=>{if(event.persisted){document.body.classList.remove('account-ready');verify();}});
  await verify();
  setInterval(()=>{if(started)verify();},60000);
})();
