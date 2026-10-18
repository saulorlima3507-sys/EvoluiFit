'use strict';
const $ = id => document.getElementById(id);
const signup = $('signup-form');
const status = (message, error = false) => { $('account-status').textContent = message; $('account-status').dataset.error = String(error); };
function selectTab(create) {
  $('login-panel').hidden = create; $('signup-panel').hidden = !create;
  $('tab-login').setAttribute('aria-pressed', String(!create)); $('tab-signup').setAttribute('aria-pressed', String(create)); status('');
}
function step(second) {
  $('access-fields').hidden = second; $('access-fields').disabled = second;
  $('profile-fields').hidden = !second; $('profile-fields').disabled = !second;
  $('step-label').textContent = second ? 'PASSO 2 DE 2 • SOBRE VOCÊ' : 'PASSO 1 DE 2 • SEU ACESSO';
  $('signup-title').textContent = second ? 'Seu plano começa com você.' : 'Vamos começar?';
  $('signup-intro').textContent = second ? 'Conte um pouco sobre você para personalizar seu começo.' : 'Crie seu acesso ao EvoluiFit.';
  status('');
}
function validCpf(value) {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  for (let size = 9; size <= 10; size++) {
    let sum = 0;
    for (let i = 0; i < size; i++) sum += Number(digits[i]) * (size + 1 - i);
    const check = (sum * 10 % 11) % 10;
    if (check !== Number(digits[size])) return false;
  }
  return true;
}
function ageFor(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const birth = new Date(value + 'T12:00:00'), today = new Date();
  if (Number.isNaN(birth.getTime()) || birth > today) return null;
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age <= 120 ? age : null;
}
$('tab-login').onclick = () => selectTab(false);
$('tab-signup').onclick = () => {if($('signup-panel').hidden)location.assign('sobre.html');};
document.querySelector('[data-signup]').onclick = () => location.assign('sobre.html');
for (const button of document.querySelectorAll('[data-password]')) button.onclick = () => {
  const input = button.previousElementSibling, showing = input.type === 'password';
  input.type = showing ? 'text' : 'password'; button.textContent = showing ? 'Ocultar' : 'Mostrar'; button.setAttribute('aria-label', showing ? 'Ocultar senha' : 'Mostrar senha');
};
$('next-step').onclick = () => {
  const fields = signup.elements;
  fields.phone.setCustomValidity(/^\d{10,11}$/.test(fields.phone.value.replace(/\D/g, '')) ? '' : 'Informe o celular com DDD (10 ou 11 dígitos).');
  fields.confirmation.setCustomValidity(fields.password.value === fields.confirmation.value ? '' : 'As senhas precisam ser iguais.');
  if (!signup.reportValidity()) return;
  step(true); fields.cpf.focus();
};
for (const name of ['phone', 'password', 'confirmation', 'cpf', 'birthDate']) signup.elements[name].addEventListener('input', () => signup.elements[name].setCustomValidity(''));
$('previous-step').onclick = () => step(false);
const birth = signup.elements.birthDate;
const now = new Date(); birth.max = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
birth.addEventListener('input', () => {const age = ageFor(birth.value); $('age-text').textContent = age === null ? 'Informe uma data de nascimento válida.' : age<18?'O cadastro está disponível somente para maiores de 18 anos.':`Sua idade: ${age} ${age === 1 ? 'ano' : 'anos'}.`;});
let avatarUrl;
function clearAvatar() {if(avatarUrl) URL.revokeObjectURL(avatarUrl); avatarUrl = undefined; $('avatar-preview').removeAttribute('src'); $('avatar-preview').hidden = true; $('avatar-default').hidden = false; $('remove-avatar').hidden = true; $('avatar').value = '';}
$('avatar').onchange = () => {
  const file = $('avatar').files[0]; if (!file) return;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {clearAvatar(); status('Escolha JPG, PNG ou WebP de até 5 MB.', true); return;}
  if(avatarUrl) URL.revokeObjectURL(avatarUrl); avatarUrl = URL.createObjectURL(file);
  $('avatar-preview').src = avatarUrl; $('avatar-preview').hidden = false; $('avatar-default').hidden = true; $('remove-avatar').hidden = false; status('');
};
$('remove-avatar').onclick = clearAvatar;
let busy = false;
function loading(form, active) {
  busy = active;
  for (const button of form.querySelectorAll('button')) button.disabled = active;
  for (const button of document.querySelectorAll('.tabs button')) button.disabled = active;
}
$('login-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return;
  const form = event.target, identifier = form.elements.identifier.value.trim();
  if ((!identifier.includes('@') && !validCpf(identifier)) || (identifier.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))) {status('Informe um e-mail ou CPF válido.', true);return;}
  loading(form,true); status('Entrando…');
  try {await EvoluiAuth.login({identifier,password:form.elements.password.value}); await EvoluiAuth.readProfile(); form.elements.password.value='';location.replace('index.html');}
  catch (error) {status(error.message,true);}
  finally {loading(form,false);}
};
signup.onsubmit = async event => {
  event.preventDefault();if(busy)return;
  if ($('profile-fields').disabled) {$('next-step').click();return;}
  signup.elements.cpf.setCustomValidity(validCpf(signup.elements.cpf.value)?'':'Confira os dígitos do CPF.');
  const age=ageFor(birth.value);birth.setCustomValidity(age===null?'Confira a data de nascimento.':age<18?'O cadastro está disponível somente para maiores de 18 anos.':'');
  if(!signup.reportValidity())return;
  const names=['email','phone','password','cpf','birthDate','weight','height','nickname','gender'];
  const input=Object.fromEntries(names.map(name=>[name,signup.elements[name].value]));
  input.nickname=input.nickname.trim();
  if(input.nickname.length<2){status('Informe um apelido de pelo menos 2 caracteres.',true);return;}
  const legal=window.EvoluiLegalManifest;
  if(!legal){status('Não foi possível carregar os termos. Atualize a página.',true);return;}
  if(!validateLegalAcceptance(true))return;
  input.legal={accepted:true,termsVersion:legal.documents.terms.version,privacyVersion:legal.documents.privacy.version,termsSha256:legal.documents.terms.sha256,privacySha256:legal.documents.privacy.sha256,healthConsent:true,healthConsentVersion:legal.healthConsentVersion};
  const file=$('avatar').files[0];loading(signup,true);status('Criando sua conta…');
  try {
    // UI rollout: the deployed account service accepts signup while permanent receipts
    // remain pending. Send document versions; never claim server evidence without it.
    const result=await EvoluiAuth.signup(input);
    signup.elements.password.value='';signup.elements.confirmation.value='';
    if(result.registered){selectTab(false);$('login-form').elements.identifier.value=input.email;status(result.message);return;}
    const account=await EvoluiAuth.readProfile();
    if(file){
      try{await EvoluiAuth.avatar(file,account.user.id);}
      catch(error){status(error.message);const button=document.createElement('button');button.type='button';button.className='primary';button.textContent='Continuar para o site';button.onclick=()=>location.replace('index.html');$('account-status').appendChild(button);return;}
    }
    clearAvatar();location.replace('index.html');
  } catch(error){status(error.message,true);}
  finally {loading(signup,false);}
};
window.addEventListener('pagehide', () => {if(avatarUrl) URL.revokeObjectURL(avatarUrl);});

const signupRoute=new URLSearchParams(location.search);
if(signupRoute.get('cadastro')==='1'){
  if(signupRoute.get('etapa')!=='cadastro')location.replace('questionario.html?origem=cadastro');
  else selectTab(true);
}

const legalMessage='Para continuar, é necessário ler e aceitar os Termos de Uso e a Política de Privacidade.';
function validateLegalAcceptance(report=false){
  let valid=true;
  for(const [id,errorId,message]of [['legal-accept','legal-accept-error',legalMessage],['health-accept','health-accept-error','Para utilizar as funcionalidades personalizadas, autorize o tratamento específico dos dados de saúde informados.']]){
    const input=$(id),error=$(errorId);input.setCustomValidity(input.checked?'':message);
    if(!input.checked){valid=false;if(report){error.hidden=false;error.textContent=message;input.setAttribute('aria-invalid','true');}}
    else{error.hidden=true;error.textContent='';input.removeAttribute('aria-invalid');}
  }
  return valid;
}
for(const id of ['legal-accept','health-accept'])$(id).addEventListener('change',()=>validateLegalAcceptance(false));
signup.addEventListener('invalid',event=>{if(['legal-accept','health-accept'].includes(event.target.id))validateLegalAcceptance(true);},true);
// Browser constraint validation normally prevents submit; this also protects scripted submits.
signup.addEventListener('submit',event=>{if(!$('profile-fields').disabled&&!validateLegalAcceptance(true)){event.preventDefault();event.stopImmediatePropagation();$('legal-accept').focus();}},true);
