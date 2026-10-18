'use strict';
(async () => {
  const loading = document.getElementById('auth-loading');
  const report = message => {loading.hidden=false;loading.querySelector('p').textContent=message;};
  let started = false, account, verifying=null, loadedId=null;
  function lock(){document.body.classList.remove('account-ready');document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelectorAll('video').forEach(v=>v.pause());document.querySelectorAll('#modal iframe').forEach(f=>f.remove());}
  function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('Não foi possível carregar o site. Tente novamente.'));};document.head.appendChild(script);});}
  const toLogin = async () => {lock();document.getElementById('modal-content').replaceChildren();document.getElementById('main').replaceChildren();await EvoluiAuth.logout();location.replace('conta.html');};
  function verify(){if(!verifying)verifying=verifyAccount().finally(()=>{verifying=null;});return verifying;}
  async function verifyAccount() {
    if(!EvoluiAuth.hasSession()){location.replace('sobre.html');return;}
    try {
      account=await EvoluiAuth.readProfile();
      if(!account?.user?.id || !/^[0-9a-f-]{36}$/i.test(account.user.id) || typeof account.profile?.nickname !== 'string') throw new Error('Não foi possível conferir sua conta.');
      if(loadedId&&loadedId!==account.user.id){lock();location.reload();return;}
      window.EvoluiAccount=account;
      if(!Array.isArray(window.EvoluiRecipes)) {
        await new Promise((resolve,reject)=>{const catalog=document.createElement('script');catalog.src='recipes150.js?v=7';catalog.onload=resolve;catalog.onerror=()=>reject(new Error('Não foi possível carregar as receitas. Tente novamente.'));document.head.appendChild(catalog);});
      }
      if(window.EvoluiRecipes.length!==150)throw new Error('Não foi possível conferir o catálogo. Atualize a página.');
      if(!window.EvoluiRecipeCovers)await loadScript('recipe-covers.js?v=18');
      if(!started){await loadScript('app-device-review-4.js');started=true;loadedId=account.user.id;setupMenu();}
      loading.hidden=true;document.body.classList.add('account-ready');
    }catch(error){lock();if([400,401,403].includes(error.status)){await toLogin();return;}report(error.message);}
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
      modal.showModal();modal.scrollTop=0;
    };
    details.querySelector('[data-view]').addEventListener('click',()=>{details.open=false;});
    document.getElementById('account-import').onclick=()=>{details.open=false;window.importLegacyAccountRecords?.();};
    updateAvatar();
  }
  async function updateAvatar(){const url=await EvoluiAuth.avatarUrl(account.user.id);if(!url)return;const image=document.querySelector('[data-account-photo]');image.src=url;image.onload=()=>{image.hidden=false;document.querySelector('[data-account-initials]').hidden=true;};}
  document.getElementById('auth-retry').onclick=verify;
  document.getElementById('auth-return').onclick=toLogin;
  window.addEventListener('pageshow',event=>{if(event.persisted){lock();verify();}});
  window.addEventListener('pagehide',lock);
  await verify();
  setInterval(()=>{if(started)verify();},60000);
})();
