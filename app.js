'use strict';

const STORE = 'evoluifit-v1';
const arrow = '<svg class="arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8"/></svg>';
const initialState = () => ({ profile: null, measurements: [], completed: [], workoutSessions: {}, favorites: [], recipeChecks: {} });
let state = initialState();
let storageAvailable = true;
let storageNotice = '';
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (saved) {
    state = restoreState(saved);
    if (JSON.stringify({...initialState(),...saved}) !== JSON.stringify(state)) storageNotice = 'Há registros locais inválidos. Os registros válidos foram recuperados; os dados originais permanecem no navegador até você salvar uma alteração.';
  }
} catch {
  storageNotice = 'Não foi possível ler os registros locais. Você pode recomeçar ou apagar os dados em Meu plano. O conteúdo original ainda não foi alterado.';
}
try {
  localStorage.setItem('ef-check', '1'); localStorage.removeItem('ef-check');
} catch { storageAvailable = false; }
let view = 'inicio';
let selectedDay = new Date().getDay();
const resumableSession=Object.values(state.workoutSessions).filter(s=>s.date===localDate(new Date())&&!s.finished).at(-1);
if(resumableSession)selectedDay=Number(resumableSession.signature.split('|')[0]);
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let photos = [];
let photoDb;
let photoError = false;
let pageToken = 0;
let openExercises = null;
let trainingMode = 'plan';
let movementTopic = 'warmup';
let recipeFilter = 'all';
let currentRecipe = null;
let currentRecipeStep = 0;
const restTimer = {deadline:0,remaining:60,interval:null,running:false,seconds:60};
const main = document.querySelector('#main');
const modal = document.querySelector('#modal');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => localDate(new Date());
function localDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function displayDate(s) { return new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR'); }
function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && localDate(new Date(`${s}T12:00:00`)) === s && s <= today() && s >= '1900-01-01'; }
function validProfile(p) {
  return p && ['fat','muscle','balance'].includes(p.goal) && ['beginner','intermediate','advanced'].includes(p.level) && ['2','3','4','5'].includes(String(p.days)) && ['yes','no'].includes(p.gym) && Number.isInteger(Number(p.age)) && Number(p.age)>=1 && Number(p.age)<=120;
}
function restoreState(saved) {
  const restored = initialState();
  if (!saved || typeof saved !== 'object') return restored;
  if (validProfile(saved.profile)) restored.profile = {goal:saved.profile.goal,level:saved.profile.level,days:String(saved.profile.days),gym:saved.profile.gym,age:Number(saved.profile.age)};
  // Called before UI constants initialize: use localDate directly, not today().
  const dateIsValid = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && localDate(new Date(`${s}T12:00:00`))===s && s>='1900-01-01' && s<=localDate(new Date());
  if (Array.isArray(saved.measurements)) {
    const records = new Map();
    for (const m of saved.measurements) if (m && dateIsValid(m.date) && typeof m.weight==='number' && Number.isFinite(m.weight) && m.weight>=1 && m.weight<=500 && typeof m.height==='number' && Number.isFinite(m.height) && m.height>=30 && m.height<=280) records.set(m.date,{date:m.date,weight:m.weight,height:m.height});
    restored.measurements = [...records.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  if (Array.isArray(saved.completed)) restored.completed = [...new Set(saved.completed.filter(dateIsValid))].sort();
  if (Array.isArray(saved.favorites)) restored.favorites = [...new Set(saved.favorites.filter(i=>Number.isInteger(i)&&i>=0&&i<6))];
  if (saved.recipeChecks && typeof saved.recipeChecks==='object') for (const [key,entry] of Object.entries(saved.recipeChecks)) {
    if (/^[0-5]$/.test(key) && entry && typeof entry==='object') restored.recipeChecks[key] = {
      ingredients:Array.isArray(entry.ingredients)?[...new Set(entry.ingredients.filter(i=>Number.isInteger(i)&&i>=0&&i<[5,4,5,4,5,5][Number(key)]))]:[],
      steps:Array.isArray(entry.steps)?[...new Set(entry.steps.filter(i=>Number.isInteger(i)&&i>=0&&i<3))]:[],
    };
  }
  if (saved.workoutSessions && typeof saved.workoutSessions==='object') for (const [key,entry] of Object.entries(saved.workoutSessions)) {
    if (!entry || !dateIsValid(entry.date) || typeof entry.signature!=='string' || !/^\d{4}-\d{2}-\d{2}\|[0-6]\|(?:yes|no)\|(?:beginner|intermediate|advanced)\|[a-z,]+$/.test(key) || key!==`${entry.date}|${entry.signature}` || !entry.sets || typeof entry.sets!=='object') continue;
    const checked={};
    for (const [id,values] of Object.entries(entry.sets)) if (['squat','push','row','hinge','plank','lunge','shoulder','pull','bridge','deadbug','calf'].includes(id)&&Array.isArray(values)) checked[id]=values.slice(0,4).map(v=>v===true);
    restored.workoutSessions[key]={date:entry.date,signature:entry.signature,sets:checked,finished:entry.finished===true};
  }
  return restored;
}
const decimal = n => Number(n).toLocaleString('pt-BR', {maximumFractionDigits:1,minimumFractionDigits:1});
const weekdays = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const goalNames = {fat:'Perder gordura', muscle:'Ganhar músculos', balance:'Condicionamento e saúde'};
const levelNames = {beginner:'Iniciante', intermediate:'Intermediário', advanced:'Experiente'};
const svgIcon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
  home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  train:'<path d="m6 4-2 2 14 14 2-2M4 10l6-6m4 16 6-6M3 7 7 3m10 18 4-4"/>',
  food:'<path d="M5 3v6c0 3 5 3 5 0V3M7.5 3v18M18 3c-4 2-5 9-1 9h2V3h-1Zm1 9v9"/>',
  chart:'<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  photo:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="m8 5 2-3h4l2 3"/><circle cx="12" cy="12" r="3.5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h1m6 0h1m-8 3h1"/>',
  weight:'<path d="M4 8h16l2 13H2L4 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2M12 4v2"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 9-9"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  play:'<path d="m9 5 11 7-11 7Z"/><circle cx="12" cy="12" r="10"/>',
  heart:'<path d="M12 20S3 14.5 3 8.5C3 3 9 2 12 6c3-4 9-3 9 2.5C21 14.5 12 20 12 20Z"/>',
  check:'<path d="m5 12 4 4L19 6"/>'
}[name] || ''}</svg>`;

const athleteArt = `<svg viewBox="0 0 380 280" role="img" aria-label="Ilustração de uma pessoa fazendo exercício com halter"><ellipse cx="215" cy="263" rx="123" ry="9" fill="#152e25" opacity=".45"/><path d="M82 230h215" stroke="#79936c" stroke-width="1"/><path d="M254 234c-5-49 29-66 34-100 32 17 8 51-4 63 26-15 37-4 40-21 13 30-16 46-46 50l-5 20" fill="#647d53"/><path d="M133 143c-15 14-30 41-39 74l-26 23c-11 10-9 17 5 16l39-8c10-18 32-46 49-57l20-40" fill="#c5dca3"/><path d="m168 144 22 41 36 54 30 7c12 3 18 14 1 15l-39-1-51-54-23-36" fill="#dbedb7"/><path d="m173 151 10 24-25 25-18-14-13-18 9-24" fill="#111f1b"/><path d="m129 146 21-56 39-2 13 64c-26 16-49 11-73-6" fill="#c8ed79"/><path d="M152 78v21c12 10 27 4 29-2l-8-24" fill="#d49a6e"/><path d="M156 41c22-9 33 9 31 25-2 14-13 23-24 13-7-7-14-27-7-38" fill="#e4ad7d"/><path d="M157 62c-9-2-17-30 2-32 20-13 35 5 33 17-15 1-23-6-24 8l-5 6" fill="#132820"/><path d="M143 94c-14-11-33-18-40-34L94 43 83 50l11 29 35 42" fill="#e4ad7d"/><path d="m181 94 35 21 34-39 12 9-32 54c-4 8-14 8-24 2l-24-12" fill="#dba274"/><path d="m85 50-7-18c-3-9 9-13 13-5l8 17m153 37 6-16c4-8 14-3 10 5l-5 14" fill="#e4ad7d"/><g transform="rotate(-20 85 24)" fill="#14291f"><rect x="56" y="19" width="56" height="8" rx="3"/><rect x="59" y="8" width="12" height="30" rx="4"/><rect x="97" y="8" width="12" height="30" rx="4"/></g><g transform="rotate(25 267 60)" fill="#14291f"><rect x="242" y="56" width="50" height="8" rx="3"/><rect x="245" y="45" width="11" height="30" rx="4"/><rect x="278" y="45" width="11" height="30" rx="4"/></g><path d="m67 240 9 7 24-3-5 10-26 3c-15 2-11-9-2-17m156 2 13 6 17-2c10 5 17 14 1 14h-35" fill="#10291f"/></svg>`;
function foodArt(kind = 0) {
  const plate = '<ellipse cx="80" cy="109" rx="58" ry="10" fill="#71613e" opacity=".13"/><circle cx="80" cy="75" r="57" fill="#fffdf7"/><circle cx="80" cy="75" r="46" fill="#f0e6cf"/>';
  const leaves = '<path d="M40 53c-9-17 12-21 17-7 5-17 23-12 19 1 16-12 22 1 14 12-13 3-34 5-50-6" fill="#5b8b3b"/><path d="M43 48c12 8 20 10 33 10" stroke="#b6cc71" stroke-width="2" fill="none"/>';
  const details = [
    `${plate}${leaves}<path d="M94 45c17-5 28 15 20 31l-19 11-17-18Z" fill="#bd773d"/><path d="m92 52 15 12m-19-3 15 12m-18-3 9 7" stroke="#e1ab64" stroke-width="4" stroke-linecap="round"/><path d="M38 76c14-14 34-14 44 5 11 22-14 30-32 19Z" fill="#e4d7a8"/>${Array.from({length:18},(_,i)=>`<path d="m${43+(i*13)%32} ${78+(i*7)%23} 5-2" stroke="#fff4d7" stroke-width="2" stroke-linecap="round"/>`).join('')}<circle cx="101" cy="97" r="12" fill="#d16a46"/><circle cx="101" cy="97" r="7" fill="#ecad71"/><path d="m93 91 13 13m-2-15-7 16" stroke="#f5c58d" stroke-width="1.5"/>`,
    `${plate}<ellipse cx="78" cy="86" rx="36" ry="21" fill="#aa6b36"/><ellipse cx="78" cy="81" rx="36" ry="20" fill="#e9ba70"/><ellipse cx="78" cy="75" rx="35" ry="20" fill="#ba7a3e"/><ellipse cx="78" cy="70" rx="35" ry="20" fill="#f1c782"/><ellipse cx="78" cy="64" rx="33" ry="18" fill="#d49851"/><ellipse cx="78" cy="60" rx="33" ry="17" fill="#efc17b"/><path d="M67 55c7-5 18-6 23-2l-5 24-10 8-4-23Z" fill="#b56d27" opacity=".7"/>${[55,72,89].map((x,i)=>`<ellipse cx="${x}" cy="${49+i*2}" rx="11" ry="8" transform="rotate(-20 ${x} ${49+i*2})" fill="#fff0b6"/><ellipse cx="${x}" cy="${49+i*2}" rx="5" ry="3" fill="#dec485"/>`).join('')}<circle cx="107" cy="86" r="6" fill="#7a4b70"/><circle cx="115" cy="77" r="5" fill="#675273"/>`,
    `${plate}<circle cx="80" cy="75" r="42" fill="#b8854e"/>${Array.from({length:26},(_,i)=>`<ellipse cx="${48+(i*19)%65}" cy="${48+(i*11)%53}" rx="5" ry="3" transform="rotate(${i*23} ${48+(i*19)%65} ${48+(i*11)%53})" fill="${['#bc9f60','#8e713b','#d8bb7c'][i%3]}"/>`).join('')}<path d="m54 71 10-7 7 11-11 5Z m37 20 8-6 8 8-9 8Z m-3-40 10-4 5 10-11 5Z" fill="#e39146"/><path d="m69 87 9-11 13 4-4 9-12 4Z" fill="#668d43"/><path d="m75 58 5-6m-21 39 6-5m32 2 5-5" stroke="#406b31" stroke-width="3" stroke-linecap="round"/>`,
    `<ellipse cx="80" cy="124" rx="38" ry="8" fill="#71613e" opacity=".13"/><path d="M45 40h70l-8 77c-10 11-44 11-54 0Z" fill="#e7d1b0"/><path d="M47 48h66l-4 31H50Z" fill="#fbf6e5"/><path d="M50 79h59l-3 26H53Z" fill="#b87454"/><path d="M53 105h53l-1 10c-11 7-40 7-50 0Z" fill="#e7bd78"/><ellipse cx="80" cy="41" rx="35" ry="12" fill="#f9f0da"/><ellipse cx="80" cy="40" rx="28" ry="8" fill="#e8c893"/>${[58,73,84,98].map((x,i)=>`<circle cx="${x}" cy="${35+i%2*7}" r="6" fill="${i%2?'#8b5071':'#d77558'}"/>`).join('')}<path d="m65 30 4-5 11 2-5 8Z" fill="#ffdfa0"/><path d="m88 28 8 4-6 7-6-5Z" fill="#f1c878"/><path d="m89 19-4 13 14-7Z" fill="#6a924a"/>`,
    `${plate}<path d="M40 69c9-32 66-36 83 1l-14 33c-27 10-50 3-66-8Z" fill="#e4b548"/><path d="M43 69c20 0 52-2 76-1l-12 28c-25 4-48 0-64-6Z" fill="#f3cf61"/><path d="m52 68 9-6 7 5m16 8 8-7 7 5m-37 13 8-6 5 4m20 5 8-5" fill="none" stroke="#d98145" stroke-width="5" stroke-linecap="round"/><path d="m60 57 8 4m13-8 6 6m16 0 4 5m-44 15 4 3m23-3 5 3" stroke="#5e863e" stroke-width="3" stroke-linecap="round"/>`,
    `${plate}${leaves}${Array.from({length:19},(_,i)=>`<circle cx="${46+(i*17)%67}" cy="${62+(i*13)%43}" r="6" fill="${i%3?'#e1c58a':'#f0d8a4'}"/><path d="m${44+(i*17)%67} ${62+(i*13)%43} 3-2" stroke="#bfa06a" stroke-width="1.5"/>`).join('')}<path d="m52 70 12-5 4 10-12 6Z m40 14 13-4 3 10-13 4Z m-15-21 11-4 4 8-12 3Z" fill="#c66e50"/><path d="m65 96 10-5 4 9-11 3Z m36-33 9-4 5 7-10 5Z" fill="#759457"/><path d="m41 85 16 3m27-6 13-7m-25 19 10-3" stroke="#a982a2" stroke-width="2"/>`,
  ];
  return `<div class="food-art" style="background:${['#f1e9d8','#f6e9d2','#edf0db','#f0e3d9','#f6edd5','#e9efd8'][kind % 6]}"><svg viewBox="0 0 160 150" aria-hidden="true">${details[kind % 6]}</svg></div>`;
}

// All suggestions are general, with explicit regressions and progressions.
const exercises = {
  squat:{name:'Agachamento',gym:'Agachamento goblet com halter',body:'Agachamento com peso corporal',muscles:'Quadríceps, glúteos e abdômen',reps:'8–12',how:'Pés na largura dos ombros. Leve o quadril para trás e flexione os joelhos, mantendo os calcanhares no chão. Desça até onde consegue controlar e suba sem prender a respiração.',easy:'Sente e levante de uma cadeira firme, apoiada na parede.',hard:'Faça a descida em 3 segundos ou aumente a carga gradualmente.',alternative:'Na academia: segure um halter perto do peito. Em casa: use o peso do corpo.'},
  push:{name:'Empurrar horizontal',gym:'Supino com halteres',body:'Flexão de braços',muscles:'Peitoral, tríceps e ombros',reps:'6–12',how:'Na flexão, mãos um pouco além dos ombros e corpo alinhado. Flexione os cotovelos em aproximadamente 45° e empurre o chão. No supino, deite no banco, estabilize os pés e desça os halteres ao lado do peito com controle.',easy:'Flexão na parede ou com as mãos em uma bancada firme.',hard:'Reduza a altura do apoio; depois use a flexão no chão. No supino, aumente a carga com controle.',alternative:'Academia: supino com halteres. Calistenia: flexão em uma superfície estável.'},
  row:{name:'Remada',gym:'Remada na polia baixa',body:'Remada com mochila',muscles:'Dorsais, parte média das costas e bíceps',reps:'8–12',how:'Incline o tronco com coluna neutra, apoie uma mão em um suporte firme e puxe uma mochila bem fechada em direção ao quadril. Na polia, sente com o tronco estável e puxe sem balançar o corpo.',easy:'Use mochila vazia ou carga leve e amplitude confortável.',hard:'Aumente a carga ou faça remada invertida apenas em barra própria, segura e fixa.',alternative:'Academia: polia baixa. Em casa sem barra: mochila; com barra própria: remada invertida. Não use mesas ou portas improvisadas.'},
  hinge:{name:'Movimento de quadril',gym:'Levantamento romeno com halteres',body:'Bom dia sem carga',muscles:'Posteriores de coxa, glúteos e estabilizadores do tronco',reps:'10–12',how:'Com joelhos levemente flexionados, empurre o quadril para trás mantendo a coluna neutra. Sinta alongar a parte de trás das coxas e volte contraindo os glúteos. No romeno, mantenha os halteres perto das pernas.',easy:'Treine sem carga e com amplitude menor.',hard:'Use carga moderada ou faça a variação unilateral com apoio.',alternative:'Academia: romeno com halteres. Calistenia: movimento de quadril sem carga.'},
  plank:{name:'Prancha',gym:'Prancha no solo',body:'Prancha no solo',muscles:'Abdômen, glúteos e estabilizadores dos ombros',reps:'20–40 s',how:'Apoie antebraços abaixo dos ombros e mantenha corpo alinhado. Contraia levemente glúteos e abdômen, respire continuamente e encerre a série antes de perder a postura.',easy:'Apoie os joelhos ou faça na parede.',hard:'Aumente o tempo até 40 segundos ou alterne elevar um pé sem girar o quadril.',alternative:'O mesmo exercício funciona na academia e em casa.'},
  lunge:{name:'Avanço para trás',gym:'Avanço para trás com halteres',body:'Avanço sem carga',muscles:'Quadríceps, glúteos e equilíbrio',reps:'8–10 / lado',how:'Dê um passo para trás e flexione os dois joelhos. Mantenha o pé da frente inteiro no chão. Volte empurrando o chão com a perna da frente e alterne os lados.',easy:'Segure em um apoio firme e reduza a profundidade.',hard:'Acrescente halteres ou pause por 2 segundos na posição baixa.',alternative:'Academia: halteres ao lado do corpo. Calistenia: sem carga, usando apoio se necessário.'},
  shoulder:{name:'Empurrar vertical',gym:'Desenvolvimento com halteres',body:'Flexão de ombros (pike)',muscles:'Ombros e tríceps',reps:'6–10',how:'Com halteres, comece à altura dos ombros e empurre acima da cabeça sem arquear a lombar. Na versão com peso corporal, apoie as mãos no chão, eleve o quadril e flexione os cotovelos com cuidado, aproximando a cabeça do chão.',easy:'Use halteres leves. Em casa, faça flexão inclinada em bancada firme, sem elevar o quadril.',hard:'Aumente a carga ou eleve gradualmente o quadril na flexão, mantendo controle.',alternative:'Academia: desenvolvimento com halteres. Calistenia: flexão inclinada, progredindo para pike no solo.'},
  pull:{name:'Puxada',gym:'Puxada na polia alta',body:'Remada com mochila',muscles:'Dorsais, bíceps e parte média das costas',reps:'8–12',how:'Na polia, puxe a barra até a parte superior do peito, mantendo o tronco estável, e retorne devagar. Sem equipamento, incline o tronco com coluna neutra e puxe uma mochila bem fechada até o quadril.',easy:'Use pouca carga na polia ou mochila leve.',hard:'Barra fixa assistida; diminua a assistência gradualmente em uma barra própria e bem fixada.',alternative:'Academia: puxada na polia. Em casa: remada com mochila; se houver barra própria, barra fixa assistida.'},
  bridge:{name:'Ponte de glúteos',gym:'Ponte de glúteos com carga leve',body:'Ponte de glúteos no solo',muscles:'Glúteos e posteriores de coxa',reps:'12–15',how:'Deite de costas, joelhos flexionados e pés no chão. Eleve o quadril até alinhar tronco e coxas, sem hiperestender a lombar. Desça devagar.',easy:'Use menor amplitude e os dois pés apoiados.',hard:'Pause 2 segundos no topo ou faça uma perna por vez com controle.',alternative:'Academia: adicione carga leve protegida sobre o quadril com orientação. Calistenia: peso corporal.'},
  deadbug:{name:'Dead bug',gym:'Dead bug no solo',body:'Dead bug no solo',muscles:'Abdômen e controle do tronco',reps:'8–10 / lado',how:'Deite de costas com braços para cima e joelhos a 90°. Estenda devagar braço e perna opostos, sem afastar a lombar do chão. Volte e alterne.',easy:'Mova só os braços ou só uma perna de cada vez.',hard:'Estenda mais a perna e faça movimentos mais lentos.',alternative:'O mesmo exercício funciona na academia e em casa.'},
  calf:{name:'Elevação de panturrilha',gym:'Elevação com halter e apoio',body:'Elevação com peso corporal',muscles:'Panturrilhas',reps:'12–15',how:'Segure um apoio firme. Eleve os calcanhares sem rolar os tornozelos para fora. Pause no alto e desça com controle.',easy:'Faça com os dois pés e sem carga.',hard:'Faça com uma perna de cada vez ou adicione halter.',alternative:'Academia: halter ou máquina de panturrilha com orientação. Calistenia: elevação em pé.'},
};
const templates = [
  {name:'Corpo inteiro A',focus:'Base, força e controle',ids:['squat','push','row','hinge','plank']},
  {name:'Corpo inteiro B',focus:'Equilíbrio e estabilidade',ids:['lunge','shoulder','pull','bridge','deadbug']},
  {name:'Corpo inteiro C',focus:'Movimento e consistência',ids:['squat','push','row','calf','plank']},
  {name:'Parte superior A',focus:'Peito, costas e ombros',ids:['push','row','shoulder','deadbug']},
  {name:'Parte inferior A',focus:'Pernas e glúteos',ids:['squat','hinge','calf','plank']},
  {name:'Parte superior B',focus:'Costas, peito e estabilidade',ids:['pull','push','shoulder','deadbug']},
  {name:'Parte inferior B',focus:'Pernas, glúteos e controle',ids:['lunge','bridge','calf','plank']},
];
const recipes = [
  {name:'Bowl de frango e arroz',time:25,tag:'Almoço descomplicado',cost:'Ingredientes do dia a dia',servings:1,ingredients:['100 g de frango em cubos','½ xícara de arroz cozido','½ xícara de feijão cozido','½ cenoura ralada e folhas a gosto','1 colher de chá de óleo, limão e temperos'],steps:['Cozinhe o frango em frigideira com o óleo e temperos até ficar completamente cozido, sem partes rosadas.','Aqueça o arroz e o feijão. Lave as folhas e rale a cenoura.','Monte o bowl e finalize com limão.'],tip:'Troque o frango por 2 ovos bem cozidos ou grão-de-bico. A porção é uma sugestão; ajuste com orientação conforme sua necessidade.'},
  {name:'Panqueca de banana e aveia',time:10,tag:'Café da manhã',cost:'Só 3 ingredientes principais',servings:1,ingredients:['1 banana madura','1 ovo','2 colheres de sopa de aveia','Canela a gosto e um pouco de óleo para untar'],steps:['Amasse a banana e misture o ovo e a aveia.','Unte uma frigideira e coloque a massa em fogo baixo.','Doure dos dois lados até a massa e o ovo estarem cozidos. Finalize com canela.'],tip:'Contém ovo. Para uma versão sem ovo, use 1 colher de sopa de chia hidratada em 3 colheres de sopa de água por 10 minutos. Use aveia certificada se precisar evitar glúten.'},
  {name:'Lentilha com legumes',time:30,tag:'Opção vegetal',cost:'Rende bem, custa pouco',servings:2,ingredients:['½ xícara de lentilha seca, lavada','1 cenoura em cubos','½ cebola e 1 dente de alho','2 xícaras de água, ajustando se necessário','1 colher de chá de óleo e temperos'],steps:['Refogue a cebola e o alho com o óleo.','Adicione a lentilha, a cenoura e a água. Cozinhe por 20–25 minutos, até ficarem macias, acrescentando água se necessário.','Ajuste o tempero e sirva com arroz ou outro acompanhamento.'],tip:'Uma opção com leguminosas para variar a semana. Guarde a sobra em recipiente fechado na geladeira por até 3 dias e aqueça bem ao consumir.'},
  {name:'Iogurte com fruta e aveia',time:5,tag:'Lanche rápido',cost:'Sem fogão',servings:1,ingredients:['1 pote de iogurte natural (170 g)','1 fruta da estação picada','2 colheres de sopa de aveia','Canela a gosto'],steps:['Lave e corte a fruta.','Misture o iogurte com a aveia.','Adicione a fruta e a canela. Consuma em seguida ou mantenha refrigerado.'],tip:'Contém leite. Use iogurte vegetal sem açúcar se precisar de alternativa. Escolha frutas da estação para economizar.'},
  {name:'Omelete de legumes',time:15,tag:'Jantar prático',cost:'Aproveite o que tem',servings:1,ingredients:['2 ovos','½ tomate picado','2 colheres de sopa de cenoura ralada','1 colher de chá de óleo','Salsinha e temperos a gosto'],steps:['Lave os legumes. Bata os ovos e misture com os legumes e temperos.','Aqueça o óleo em frigideira e despeje a mistura.','Cozinhe em fogo baixo dos dois lados até os ovos firmarem por completo.'],tip:'Contém ovo. Sirva com arroz e salada para uma refeição mais completa. Nenhuma receita substitui um plano alimentar individual.'},
  {name:'Salada de grão-de-bico',time:10,tag:'Fresca e fácil',cost:'Pode usar feijão no lugar',servings:2,ingredients:['1 xícara de grão-de-bico cozido','1 tomate e ½ pepino picados','½ cebola pequena','Suco de ½ limão','1 colher de chá de azeite e cheiro-verde'],steps:['Se usar grão-de-bico enlatado, escorra e enxágue.','Lave e pique os vegetais, misturando com o grão-de-bico.','Tempere com limão, azeite e cheiro-verde. Mantenha refrigerado até servir.'],tip:'Troque o grão-de-bico por feijão-fradinho cozido. Observe alergias e necessidades pessoais antes de escolher uma receita.'},
];

function persist(next) {
  try { localStorage.setItem(STORE, JSON.stringify(next)); state = next; storageAvailable = true; storageNotice = ''; return true; }
  catch { toast('Não foi possível salvar. Verifique espaço e permissões do navegador.'); return false; }
}
let toastTimer;
function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('show'),4500);
}
function openModal(content) { document.querySelectorAll('dialog video').forEach(v=>v.pause()); document.querySelector('#modal-content').innerHTML = content; if (!modal.open) modal.showModal(); }
modal.addEventListener('close',()=>document.querySelectorAll('dialog video').forEach(v=>v.pause()));
function modalHeader(title) { return `<div class="modal-top"><h2>${title}</h2><button data-action="close-modal" aria-label="Fechar janela">×</button></div>`; }
function intro(eyebrow,title,sub) { return `<div class="page-intro"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtitle">${sub}</p></div><div class="date-chip">${svgIcon('calendar')}${new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long'})}</div></div>`; }
function latest() { return [...state.measurements].sort((a,b)=>b.date.localeCompare(a.date))[0]; }
function plan() {
  const days = Number(state.profile?.days || 3);
  const schedules = {2:[1,4],3:[1,3,5],4:[1,2,4,5],5:[1,2,3,4,5]};
  const ids = days < 4 ? [0,1,2] : days===4 ? [3,4,5,6] : [3,4,2,5,6];
  const routine = {};
  schedules[days].forEach((day,i)=> {routine[day] = templates[ids[i]];});
  if (days===5) routine[3] = {name:'Recuperação ativa',focus:'Movimento leve, sem treino de força',ids:[],active:true};
  return routine;
}
function sets() { return {beginner:2,intermediate:3,advanced:4}[state.profile?.level] || 2; }
function weekCount() {
  const d = new Date(); d.setDate(d.getDate() - (d.getDay()+6)%7); const start = localDate(d);
  return state.completed.filter(s=>s>=start && s<=today()).length;
}
function bmi(m) { return m ? m.weight / ((m.height/100)**2) : null; }
function bmiLabel(value) { return value<18.5?'Abaixo da faixa de referência':value<25?'Na faixa de referência':value<30?'Acima da faixa de referência':'IMC elevado em relação à referência'; }
function chart(width=500,height=180) {
  const data = [...state.measurements].sort((a,b)=>a.date.localeCompare(b.date));
  if (!data.length) return '<div class="chart-empty"><span>Seu ponto de partida começa aqui.</span><span class="small">Adicione um registro de peso para ver o gráfico.</span></div>';
  const min = Math.min(...data.map(d=>d.weight))-2, max = Math.max(...data.map(d=>d.weight))+2;
  const left=43,right=width-22,top=20,bottom=height-30;
  const firstTime = Date.parse(data[0].date), lastTime = Date.parse(data.at(-1).date);
  const coords = data.map(d=>({x:data.length===1?(left+right)/2:left+(Date.parse(d.date)-firstTime)/(lastTime-firstTime)*(right-left),y:bottom-(d.weight-min)/(max-min)*(bottom-top),d}));
  const lines = [0,.5,1].map(t=>{const y=top+(bottom-top)*t;return `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#e9eedf" stroke-dasharray="3 5"/><text x="0" y="${y+4}" fill="#95a086" font-size="10">${decimal(max-(max-min)*t)}</text>`;}).join('');
  const points = coords.map(c=>`${c.x},${c.y}`).join(' ');
  return `<svg class="mini-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico do peso em quilogramas por data, com ${data.length} registros. Os valores completos estão na tabela de histórico.">${lines}<polygon points="${coords[0].x},${bottom} ${points} ${coords.at(-1).x},${bottom}" fill="#eef5e3"/><polyline points="${points}" fill="none" stroke="#8ba85a" stroke-width="2.5" stroke-linejoin="round"/>${coords.map(c=>`<circle cx="${c.x}" cy="${c.y}" r="4" fill="#729646" stroke="white" stroke-width="2"><title>${displayDate(c.d.date)}: ${decimal(c.d.weight)} kg</title></circle>`).join('')}<text x="${left}" y="${height-6}" font-size="10" fill="#8c9880">${displayDate(data[0].date).slice(0,5)}</text>${data.length>1?`<text x="${right}" y="${height-6}" text-anchor="end" font-size="10" fill="#8c9880">${displayDate(data.at(-1).date).slice(0,5)}</text>`:''}</svg>`;
}
function dashboard() {
  const p = state.profile, m = latest(), routine = plan(), workout = routine[new Date().getDay()];
  const d = new Date(); d.setDate(d.getDate()-(d.getDay()+6)%7);
  const week = Array.from({length:7},(_,i)=>{const day=new Date(d);day.setDate(day.getDate()+i);const date=localDate(day);return `<button class="week-day ${date===today()?'today':''} ${state.completed.includes(date)?'done':''}" data-view="calendario" aria-label="${displayDate(date)}${state.completed.includes(date)?', treino concluído':''}">${['SEG','TER','QUA','QUI','SEX','SÁB','DOM'][i]}<strong>${day.getDate()}</strong><span class="dot"></span></button>`;}).join('');
  return `${intro('BEM-VINDO AO SEU ESPAÇO','Sua evolução começa hoje.','Treine, cuide de você e acompanhe cada passo da sua jornada.')}
  <section class="hero"><div class="hero-copy"><p class="eyebrow">CONSISTÊNCIA É O CAMINHO</p><h2>Seu próximo<br>nível começa<br>com <em>um passo.</em></h2><p>${p?'Seu plano está pronto. Construa hábitos possíveis, um treino de cada vez.':'Um plano que acompanha seu ritmo. Treinos, receitas e evolução em um só lugar.'}</p><button class="btn lime" data-view="${p?'treinos':'perfil'}">${p?'Ver meu treino':'Montar meu plano'} <span>${arrow}</span></button></div><div class="hero-art">${athleteArt}<div class="art-note">✦ &nbsp; Evolução, não perfeição.</div></div></section>
  <div class="stats-grid">
    <div class="stat"><div class="stat-top">Seu objetivo ${svgIcon('target')}</div><div class="stat-value goal-value">${p?goalNames[p.goal]:'Seu primeiro passo'}</div><p class="stat-note">${p?levelNames[p.level]:'Configure seu perfil para começar'}</p></div>
    <div class="stat"><div class="stat-top">Treinos nesta semana ${svgIcon('train')}</div><div class="stat-value">${weekCount()}<small>/ ${p?.days || '—'} planejados</small></div><p class="stat-note positive">Cada treino conta</p></div>
    <div class="stat"><div class="stat-top">Último peso registrado ${svgIcon('weight')}</div><div class="stat-value">${m?decimal(m.weight):'—'}<small>kg</small></div><p class="stat-note">${m?displayDate(m.date):'Adicione seu primeiro registro'}</p></div>
    <div class="stat"><div class="stat-top">Dias de movimento ${svgIcon('calendar')}</div><div class="stat-value">${state.completed.length}<small>no total</small></div><p class="stat-note">Sua história, um dia de cada vez</p></div>
  </div>
  <div class="dashboard-grid"><section class="card"><div class="section-header"><h2>Sua semana em movimento</h2><span class="tag">${p?`${p.days} dias / semana`:'Seu ritmo'}</span></div><div class="week-strip">${week}</div><div class="workout-summary"><div><h3>${!p?'Vamos encontrar seu ritmo?':workout?workout.name:'Hoje: descanso e recuperação'}</h3><p>${!p?'Responda às perguntas para montar seu treino':workout?workout.focus:'Recuperar também faz parte da evolução'}</p></div><button class="btn subtle" data-view="${p?'treinos':'perfil'}">${p?'Ver treino':'Começar'} ${arrow}</button></div></section>
  <section class="card"><div class="section-header"><h2>Sua evolução</h2><button class="text-button" data-view="evolucao">Ver histórico ${arrow}</button></div><div class="chart-legend"><i></i> Peso corporal (kg)</div>${chart()}</section></div>
  <div class="bottom-grid"><section class="card"><div class="section-header"><h2>Nutrição sem complicação</h2><button class="text-button" data-view="receitas">Ver receitas ${arrow}</button></div><div class="recipe-preview">${foodArt(0)}<div><span class="tag">SIMPLES & ACESSÍVEL</span><h3>Bowl de frango e arroz</h3><p>Comida de verdade, ingredientes do dia a dia.</p><button class="text-button" data-recipe="0">25 min · 1 porção ${arrow}</button></div></div></section><section class="card habit-card"><span class="habit-icon">${svgIcon('sun')}</span><div><h3>O descanso também é progresso.</h3><p>Reserve tempo para recuperar. Sono, alimentação e movimento fazem parte da mesma jornada.</p><small>SEU LEMBRETE DO DIA</small></div></section></div>
  <div class="quick-actions" aria-label="Ações rápidas"><button class="quick-action" data-view="evolucao">${svgIcon('weight')}<span><strong>Registrar medidas</strong><small>Seu ponto de partida de hoje</small></span>${arrow}</button><button class="quick-action" data-view="fotos">${svgIcon('photo')}<span><strong>Meu álbum de evolução</strong><small>Fotos salvas só no navegador</small></span>${arrow}</button><button class="quick-action" data-view="calendario">${svgIcon('check')}<span><strong>Marcar um treino</strong><small>Cada dia de movimento conta</small></span>${arrow}</button></div>`;
}
function profileForm() {
  const p=state.profile || {goal:'fat',level:'beginner',days:'3',gym:'no',age:''};
  const option=(value,label,current)=>`<option value="${value}" ${String(current)===value?'selected':''}>${label}</option>`;
  return `<form id="profile-form"><div class="form-grid"><label class="field">Qual é seu objetivo?<select name="goal">${Object.entries(goalNames).map(([k,v])=>option(k,v,p.goal)).join('')}</select></label><label class="field">Sua experiência com treinos<select name="level">${Object.entries(levelNames).map(([k,v])=>option(k,v,p.level)).join('')}</select></label><label class="field">Dias disponíveis por semana<select name="days">${[2,3,4,5].map(n=>option(String(n),`${n} dias`,p.days)).join('')}</select><small>Em planos de 5 dias, um dia é de recuperação ativa.</small></label><label class="field">Onde você quer treinar?<select name="gym">${option('no','Calistenia / em casa',p.gym)}${option('yes','Academia',p.gym)}</select></label><label class="field full">Idade (em anos)<input name="age" type="number" min="1" max="120" step="1" required value="${escapeHTML(p.age)}" placeholder="Ex.: 28"><small>A idade evita o uso de referências adultas de IMC para menores. Menores de 18 anos precisam de orientação profissional e acompanhamento responsável.</small></label></div><div class="actions"><button class="btn" type="submit">${state.profile?'Salvar meu plano':'Criar meu plano'} ${arrow}</button></div></form>`;
}
function profilePage() {
  if (!state.profile) return `${intro('VAMOS COMEÇAR','Um plano com o seu ritmo.','Conte um pouco sobre você. Dá para mudar suas escolhas depois.')}<div class="onboard"><section class="onboard-aside"><div><p class="eyebrow">SEU PONTO DE PARTIDA</p><h2>A evolução começa<br>com um passo.</h2><p>Sem pressa, sem promessas milagrosas. Encontre uma rotina possível para o seu dia a dia.</p></div><strong>01 ${arrow}</strong></section><section class="card">${profileForm()}</section></div><section class="card settings-card" style="margin-top:20px"><h2>Dados e acesso</h2><p>Seus dados ficam somente neste navegador, sem sincronização nem backup automático. Pessoas com acesso a este perfil do navegador podem ver os registros. Limpar dados do navegador remove seu histórico e fotos.</p><p>Preço planejado: R$ 24,99 por acesso vitalício, em uma única compra. Esta demonstração é gratuita e não realiza cobrança.</p><div class="actions"><button class="btn secondary" data-action="export">Exportar registros</button><button class="btn danger" data-action="clear-all">Apagar todos os dados</button><button class="btn subtle" data-action="premium">Ver demonstração</button><button class="text-button" data-action="integrations">Próximas integrações ${arrow}</button></div></section>`;
  return `${intro('DO SEU JEITO','Meu plano e meus dados','Mude os dias de treino e cuide dos seus registros.')}<div class="profile-grid"><section class="card">${profileForm()}</section><div class="stack"><section class="card settings-card"><h2>Seu espaço é local</h2><p>Perfil, medidas, calendário, séries e receitas salvas ficam no localStorage. Fotos ficam no IndexedDB, apenas neste navegador. Nenhum dado é enviado a um servidor.</p><p>Não há sincronização, login ou backup automático. Quem usa este perfil do navegador pode acessar os dados. Isso não é um cofre criptografado. Evite dispositivos compartilhados.</p><p>Limpar dados do navegador ou usar modo privado pode apagar registros e fotos. Você pode baixar uma cópia dos registros (sem fotos), em um arquivo JSON.</p><div class="actions"><button class="btn secondary" data-action="export">Exportar registros</button><button class="btn danger" data-action="clear-all">Apagar todos os dados</button></div></section><section class="card settings-card"><span class="tag">ACESSO PLANEJADO</span><h2 style="margin-top:12px">Uma compra. Sua jornada.</h2><p>R$ 24,99 por acesso vitalício, em uma única compra. A demonstração está aberta, sem cobrança.</p><button class="btn" data-action="premium">Ver demonstração ${arrow}</button></section><section class="card settings-card"><h2>Próximas integrações</h2><p>Pagamento, aplicativo e anúncios são etapas futuras. Nenhum serviço de publicidade está conectado.</p><button class="text-button" data-action="integrations">Entender o que falta ${arrow}</button></section></div></div>`;
}
const exerciseVideos = {
  "squat-home": {
    "provider": "youtube",
    "id": "GvrvBJYaOSM",
    "author": "Nuffield Health"
  },
  "push-home": {
    "provider": "youtube",
    "id": "WDIpL0pjun0",
    "author": "National Academy of Sports Medicine (NASM)"
  },
  "row-home": {
    "provider": "youtube",
    "id": "mrYBMjhm2hw",
    "author": "Fábrica de Musas Oficial"
  },
  "hinge-home": {
    "provider": "youtube",
    "id": "Kdeq15AvUVU",
    "author": "PLT4M"
  },
  "plank-home": {
    "provider": "youtube",
    "id": "xhk1JkbF2lg",
    "author": "National Academy of Sports Medicine (NASM)"
  },
  "lunge-home": {
    "provider": "youtube",
    "id": "U7Nrwyu6Uqo",
    "author": "John Rusin"
  },
  "shoulder-home": {
    "provider": "youtube",
    "id": "Tq1nYz7U5os",
    "author": "FitnessFAQs"
  },
  "pull-home": {
    "provider": "youtube",
    "id": "mrYBMjhm2hw",
    "author": "Fábrica de Musas Oficial"
  },
  "bridge-home": {
    "provider": "youtube",
    "id": "tqp5XQPpTxY",
    "author": "PureGym"
  },
  "deadbug-home": {
    "provider": "youtube",
    "id": "g_BYB0R-4Ws",
    "author": "Children’s Hospital Colorado"
  },
  "calf-home": {
    "provider": "youtube",
    "id": "fQiMiUHWubw",
    "author": "John Rusin"
  },
  "squat-gym": {
    "provider": "youtube",
    "id": "Xjo_fY9Hl9w",
    "author": "Live Lean TV Daily Exercises"
  },
  "plank-gym": {
    "provider": "youtube",
    "id": "xhk1JkbF2lg",
    "author": "National Academy of Sports Medicine (NASM)"
  },
  "lunge-gym": {
    "provider": "youtube",
    "id": "gd2gU83tk5w",
    "author": "Red Dot Fitness"
  },
  "pull-gym": {
    "provider": "youtube",
    "id": "GL3h256d6JM",
    "author": "Live Lean TV Daily Exercises"
  },
  "bridge-gym": {
    "provider": "youtube",
    "id": "LXBF7dU9e7g",
    "author": "Group HIIT"
  },
  "deadbug-gym": {
    "provider": "youtube",
    "id": "g_BYB0R-4Ws",
    "author": "Children’s Hospital Colorado"
  },
  "calf-gym": {
    "provider": "youtube",
    "id": "ADIDoYt_ko4",
    "author": "OPEX Fitness"
  },
  "push-gym": {
    "provider": "local",
    "exercise": 75,
    "author": "Goulart"
  },
  "row-gym": {
    "provider": "local",
    "exercise": 512,
    "author": "Goulart"
  },
  "hinge-gym": {
    "provider": "local",
    "exercise": 507,
    "author": "Goulart"
  },
  "shoulder-gym": {
    "provider": "local",
    "exercise": 567,
    "author": "Goulart"
  }
};
function guidePlayer(file, title) {
  if (!file.startsWith('recipe-')) {
    const clip = exerciseVideos[file];
    if (!clip) return '';
    if (clip.provider === 'youtube') return `<section class="guide-player" data-clip="${file}"><div class="guide-caption"><span>${svgIcon('play')} Vídeo deste exercício</span><small>${file.endsWith('-home')?'Calistenia / em casa':'Academia'}</small></div><div class="exercise-video-screen"><button class="load-exercise-video" data-load-clip="${file}" aria-label="Assistir: ${escapeHTML(title)}">${svgIcon('play')}<strong>${escapeHTML(title)}</strong><span>Assistir demonstração com pessoa real</span></button></div><p class="guide-disclaimer">Por ${escapeHTML(clip.author)} · Ao assistir, você carrega o player do YouTube e seus serviços. Requer internet. <a href="https://www.youtube.com/watch?v=${clip.id}" target="_blank" rel="noopener noreferrer">Abrir este vídeo no YouTube</a>.</p></section>`;
    return `<section class="guide-player" data-clip="${file}"><div class="guide-caption"><span>${svgIcon('play')} Vídeo deste exercício</span><small>Academia · Arquivo local</small></div><video controls playsinline preload="none" poster="media/${file}.jpg" aria-label="Demonstração: ${escapeHTML(title)}"><source src="media/${file}.mp4" type="video/mp4"><track kind="captions" src="media/${file}.vtt" srclang="pt-BR" label="Português" default>Seu navegador não reproduz este vídeo.</video><p class="guide-disclaimer">Goulart, via <a href="https://wger.de/en/exercise/${clip.exercise}/view/" target="_blank" rel="noopener noreferrer">wger</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Convertido para MP4, sem áudio, com redimensionamento e legendas. <a href="media/credits.json" target="_blank" rel="noopener">Créditos</a>.</p><p class="video-error" hidden role="status">Não foi possível carregar o vídeo. Consulte as instruções abaixo.</p></section>`;
  }
  return `<section class="guide-player"><div class="guide-caption"><span>${svgIcon('play')} Vídeo: guia animado</span><small>15 s · Sem áudio · Arquivo local</small></div><video controls playsinline preload="none" poster="media/${file}.jpg" aria-label="Guia animado: ${escapeHTML(title)}"><source src="media/${file}.mp4" type="video/mp4"><track kind="captions" src="media/${file}.vtt" srclang="pt-BR" label="Português" default>Seu navegador não reproduz este vídeo. Use as instruções escritas abaixo.</video><p class="guide-disclaimer">Animação esquemática, não uma filmagem. Use junto às instruções escritas; a técnica deve ser adaptada com orientação profissional.</p><p class="video-error" hidden role="status">Não foi possível carregar o vídeo. As instruções escritas continuam disponíveis.</p></section>`;
}
function currentSessionInfo(w=plan()[selectedDay]) {
  if(!state.profile || !w || w.active) return null;
  const signature=`${selectedDay}|${state.profile.gym}|${state.profile.level}|${w.ids.join(',')}`;
  const key=`${today()}|${signature}`;
  const session=state.workoutSessions[key];
  const total=w.ids.length*sets();
  const count=w.ids.reduce((n,id)=>n+(session?.sets[id]||[]).slice(0,sets()).filter(Boolean).length,0);
  return {key,signature,session,total,count,w};
}
function sessionPanel(w) {
  const info=currentSessionInfo(w);
  if(!info.session) return `<section class="card session-card"><div class="session-intro"><span class="session-icon">${svgIcon('play')}</span><div><h3>Pronto para começar?</h3><p>Toque em Começar treino. Depois, abra um exercício, veja a explicação e marque as séries que fizer.</p></div></div><button class="btn lime" data-action="start-guided">Começar treino ${arrow}</button></section>`;
  return `<section class="card session-card active-session"><div class="session-progress"><div><span class="eyebrow">TREINO GUIADO · DATA DE HOJE</span><h3>${info.count} de ${info.total} séries concluídas</h3><p>${weekdays[selectedDay]} · ${info.session.finished?'Treino finalizado':'Você pode sair e retomar hoje, no mesmo navegador.'}</p></div><span class="session-percent">${Math.round(info.count/info.total*100)}<small>%</small></span></div><progress class="session-meter" max="${info.total}" value="${info.count}" aria-label="Progresso de séries"></progress><div class="rest-controls"><div class="rest-clock"><span class="muted">Descanso</span><strong id="rest-display" role="timer">${timerText()}</strong></div><label class="rest-select">Intervalo<select id="rest-duration" aria-label="Duração do descanso"><option value="60" ${restTimer.seconds===60?'selected':''}>60 segundos</option><option value="90" ${restTimer.seconds===90?'selected':''}>90 segundos</option></select></label><button class="btn secondary" data-action="rest-toggle" id="rest-toggle">${restTimer.running?'Pausar descanso':restTimer.remaining!==restTimer.seconds?'Retomar descanso':'Iniciar descanso'}</button><button class="text-button" data-action="rest-reset">Reiniciar</button></div><div class="session-footer"><p>Marque as séries abaixo. A conclusão registra o treino na data de hoje.</p><button class="btn" data-action="finish-guided" ${info.count!==info.total||info.session.finished?'disabled':''}>${info.session.finished?'✓ Treino finalizado':'Concluir treino de hoje'}</button></div></section>`;
}
function seriesControls(id) {
  const info=currentSessionInfo();if(!info?.session)return '';
  return `<div class="series-controls"><span>Marque cada série realizada</span><div>${Array.from({length:sets()},(_,i)=>`<button class="series-button ${(info.session.sets[id]||[])[i]?'done':''}" data-series="${i}" data-exercise="${id}" aria-pressed="${Boolean((info.session.sets[id]||[])[i])}" aria-label="Série ${i+1} de ${escapeHTML(state.profile.gym==='yes'?exercises[id].gym:exercises[id].body)}">${(info.session.sets[id]||[])[i]?'✓ ':''}Série ${i+1}</button>`).join('')}</div></div>`;
}
function rememberOpenExercises() {openExercises=new Set([...main.querySelectorAll('.exercise[open]')].map(el=>el.dataset.exercise));}
function timerText() {return `${String(Math.floor(restTimer.remaining/60)).padStart(2,'0')}:${String(restTimer.remaining%60).padStart(2,'0')}`;}
function updateRestUI() {
  const display=document.querySelector('#rest-display');if(display)display.textContent=timerText();
  const btn=document.querySelector('#rest-toggle');if(btn)btn.textContent=restTimer.running?'Pausar descanso':restTimer.remaining===0?'Novo descanso':restTimer.remaining===restTimer.seconds?'Iniciar descanso':'Retomar descanso';
}
function stopRest() {clearInterval(restTimer.interval);restTimer.interval=null;restTimer.running=false;}
function startRest(seconds=restTimer.remaining||restTimer.seconds) {
  stopRest();restTimer.remaining=seconds;restTimer.deadline=Date.now()+seconds*1000;restTimer.running=true;updateRestUI();
  restTimer.interval=setInterval(()=>{
    restTimer.remaining=Math.max(0,Math.ceil((restTimer.deadline-Date.now())/1000));
    if(restTimer.remaining===0){stopRest();toast('Descanso concluído. Retome apenas se estiver confortável.');}
    updateRestUI();
  },250);
}
function trainingModeTabs() {
  return `<div class="training-mode-tabs" aria-label="O que você quer fazer?"><button data-training-mode="plan" class="${trainingMode==='plan'?'active':''}" aria-pressed="${trainingMode==='plan'}">${svgIcon('calendar')} Meu treino da semana</button><button data-training-mode="learn" class="${trainingMode==='learn'?'active':''}" aria-pressed="${trainingMode==='learn'}">${svgIcon('play')} Aprender movimentos</button></div>`;
}
function movementLibrary() {
  const topics={warmup:{label:'Aquecimento',title:'Prepare o corpo antes do treino',intro:'Comece devagar. Aquecer ajuda a entrar no ritmo do treino, sem precisar cansar.',steps:['Caminhe ou marche em ritmo confortável por 5–8 minutos.','Movimente braços, ombros e quadris dentro de uma amplitude confortável.','Pratique uma série fácil dos exercícios do dia, sem carga ou com carga leve.'],note:'O aquecimento não substitui orientação para lesões. Evite movimentos rápidos ou amplitudes que causem dor.'},running:{label:'Corrida',title:'Corrida: conforto antes de velocidade',intro:'Estas orientações são gerais. Se você está começando, alterne caminhada e trotes curtos em vez de forçar o ritmo.',steps:['Antes de correr, caminhe e aumente o ritmo aos poucos.','Mantenha o olhar em frente, ombros relaxados e braços em movimento confortável.','Use passos naturais e um ritmo que permita conversar. Não force um tipo de pisada ou uma cadência fixa.','Ao terminar, reduza o ritmo e caminhe. Aumente o tempo de corrida aos poucos, em sessões futuras.'],note:'Dor persistente, tontura ou mal-estar são motivos para parar. Problemas de saúde e retorno após lesão exigem avaliação profissional.'},stretch:{label:'Alongamento',title:'Alongue sem forçar',intro:'Alongar é opcional e deve ser confortável. Prefira alongamentos leves depois do treino ou em outro momento do dia.',steps:['Escolha uma posição estável e apoie-se, se precisar.','Alongue até uma tensão leve, sem dor. Respire normalmente e não faça movimentos de impulso.','Mantenha por cerca de 15–30 segundos e solte devagar. Reduza o tempo ou a amplitude se houver desconforto.'],note:'Não force articulações nem use o alongamento para tratar uma dor sem avaliação. Antes de correr ou treinar força, priorize aquecimento leve.'},strength:{label:'Fortalecimento',title:'Aprenda os exercícios do seu plano',intro:'Comece pela versão mais fácil e priorize o controle. Só aumente a dificuldade quando conseguir executar sem dor.',steps:['Abra um exercício para ver a execução, os músculos e as alternativas.','Faça as séries indicadas para o seu nível. Descanse entre elas e mantenha a respiração.','Interrompa antes de perder a postura. Não é necessário chegar ao limite.'],note:'Escolha apenas equipamentos e apoios firmes. Procure ajuda profissional para ajustar técnica e carga.'}};
  const topic=topics[movementTopic];
  return `<div class="movement-topics" aria-label="Assuntos para aprender">${Object.entries(topics).map(([id,t])=>`<button data-movement-topic="${id}" class="${movementTopic===id?'active':''}" aria-pressed="${movementTopic===id}">${t.label}</button>`).join('')}</div><section class="card movement-guide"><span class="tag">${topic.label}</span><h2>${topic.title}</h2><p class="subtitle">${topic.intro}</p><ol>${topic.steps.map(step=>`<li>${step}</li>`).join('')}</ol><div class="notice">${topic.note}</div>${movementTopic==='strength'?`<button class="btn" data-training-mode="plan">Ver meu treino da semana ${arrow}</button>`:''}</section>`;
}
const exerciseInstructions = {
  "home": {
    "squat": {
      "how": "Com os pés em uma largura confortável, flexione quadris e joelhos e desça até onde consegue controlar. Mantenha os pés apoiados e volte a ficar em pé.",
      "easy": "Sente e levante de uma cadeira firme apoiada na parede.",
      "hard": "Faça a descida mais lenta, sem perder o equilíbrio.",
      "equipment": "Peso corporal; cadeira firme opcional."
    },
    "push": {
      "how": "Apoie as mãos um pouco além da largura dos ombros, mantenha o corpo alinhado, flexione os cotovelos e empurre o chão. Respire durante o movimento.",
      "easy": "Faça na parede ou com as mãos em uma bancada firme.",
      "hard": "Reduza a altura do apoio, progredindo até o chão com controle.",
      "equipment": "Peso corporal e apoio firme para a versão mais fácil."
    },
    "row": {
      "how": "Feche bem a mochila e segure suas alças resistentes. Incline o tronco a partir do quadril, mantenha a coluna neutra e puxe a mochila em direção ao quadril. Desça devagar.",
      "easy": "Comece com a mochila vazia ou leve.",
      "hard": "Aumente a carga aos poucos, mantendo o tronco estável.",
      "equipment": "Mochila bem fechada, com alças resistentes e carga estável."
    },
    "hinge": {
      "how": "Em pé, com joelhos levemente flexionados, leve o quadril para trás e incline o tronco sem arredondar as costas. Volte a ficar em pé com controle.",
      "easy": "Use uma amplitude pequena e treine sem carga.",
      "hard": "Faça a descida mais lenta, mantendo o controle.",
      "equipment": "Peso corporal, sem equipamento."
    },
    "plank": {
      "how": "Apoie os antebraços abaixo dos ombros e mantenha o corpo alinhado. Contraia suavemente abdômen e glúteos e respire durante a posição.",
      "easy": "Apoie os joelhos ou reduza o tempo.",
      "hard": "Aumente o tempo gradualmente até 40 segundos, mantendo a postura.",
      "equipment": "Chão estável; colchonete opcional."
    },
    "lunge": {
      "how": "Dê um passo para trás, flexione os joelhos e mantenha o pé da frente inteiro no chão. Empurre o chão com a perna da frente para voltar. Alterne os lados.",
      "easy": "Segure em um apoio firme e reduza a profundidade.",
      "hard": "Pause brevemente na posição baixa, sem perder o equilíbrio.",
      "equipment": "Peso corporal; apoio firme opcional."
    },
    "shoulder": {
      "how": "Apoie as mãos no chão e eleve o quadril, formando um V invertido. Flexione os cotovelos para aproximar a cabeça do chão e empurre para voltar, com controle.",
      "easy": "Reduza a amplitude. Se precisar, pratique flexão com mãos em bancada firme antes de progredir para o pike.",
      "hard": "Aumente gradualmente a amplitude apenas com boa técnica. O vídeo também mostra progressões.",
      "equipment": "Peso corporal e chão firme; bancada firme na preparação mais fácil."
    },
    "pull": {
      "how": "Feche bem a mochila e segure suas alças resistentes. Incline o tronco a partir do quadril, mantenha a coluna neutra e puxe a mochila em direção ao quadril. Retorne devagar.",
      "easy": "Use mochila vazia ou carga leve.",
      "hard": "Aumente a carga aos poucos, sem balançar o tronco.",
      "equipment": "Mochila bem fechada; sem polia ou aparelho de academia."
    },
    "bridge": {
      "how": "Deite de costas com joelhos flexionados e pés no chão. Eleve o quadril até alinhar tronco e coxas, sem arquear a lombar, e desça devagar.",
      "easy": "Faça uma amplitude menor com os dois pés apoiados.",
      "hard": "Pause por 2 segundos no topo, mantendo a respiração.",
      "equipment": "Chão estável; colchonete opcional."
    },
    "deadbug": {
      "how": "Deite de costas com braços para cima e joelhos a 90°. Estenda devagar braço e perna opostos sem perder o apoio da lombar. Volte e alterne.",
      "easy": "Mova só os braços ou uma perna de cada vez.",
      "hard": "Estenda mais a perna e faça o movimento mais lento.",
      "equipment": "Chão estável; colchonete opcional."
    },
    "calf": {
      "how": "Em pé, use um apoio firme se precisar. Eleve os calcanhares sem rolar os tornozelos para fora, pause brevemente e desça com controle.",
      "easy": "Use os dois pés e uma amplitude confortável.",
      "hard": "Faça com uma perna por vez, usando apoio.",
      "equipment": "Peso corporal e apoio firme opcional."
    }
  },
  "gym": {
    "squat": {
      "how": "Segure um halter junto ao peito com as duas mãos. Flexione quadris e joelhos, mantendo os pés apoiados, desça com controle e volte a ficar em pé.",
      "easy": "Use um halter leve e uma amplitude confortável.",
      "hard": "Aumente a carga gradualmente quando conseguir manter a técnica.",
      "equipment": "Um halter."
    },
    "push": {
      "how": "Deite em um banco firme com os pés estabilizados. Segure os halteres ao lado do peito e empurre para cima sem perder o alinhamento. Desça devagar.",
      "easy": "Comece com halteres leves.",
      "hard": "Aumente a carga aos poucos, mantendo a execução.",
      "equipment": "Banco firme e dois halteres."
    },
    "row": {
      "how": "Sente na polia baixa com os pés apoiados e o tronco estável. Puxe a pegada fechada em direção ao abdômen e retorne com controle, sem balançar o corpo.",
      "easy": "Use uma carga leve.",
      "hard": "Aumente a carga mantendo o tronco estável.",
      "equipment": "Polia baixa com pegada fechada."
    },
    "hinge": {
      "how": "Segure os halteres perto das pernas. Com joelhos levemente flexionados, leve o quadril para trás e incline o tronco com coluna neutra. Retorne com controle.",
      "easy": "Pratique sem carga antes de usar halteres leves.",
      "hard": "Aumente a carga gradualmente, sem arredondar as costas.",
      "equipment": "Dois halteres."
    },
    "plank": {
      "how": "Apoie os antebraços abaixo dos ombros e mantenha o corpo alinhado. Contraia suavemente abdômen e glúteos e respire durante a posição.",
      "easy": "Apoie os joelhos ou reduza o tempo.",
      "hard": "Aumente o tempo gradualmente até 40 segundos, mantendo a postura.",
      "equipment": "Chão estável; colchonete opcional."
    },
    "lunge": {
      "how": "Segure os halteres ao lado do corpo. Dê um passo para trás, flexione os joelhos e mantenha o pé da frente apoiado. Empurre com a perna da frente para voltar e alterne.",
      "easy": "Comece sem carga ou com halteres leves.",
      "hard": "Aumente a carga aos poucos, preservando o equilíbrio.",
      "equipment": "Dois halteres."
    },
    "shoulder": {
      "how": "Comece com os halteres à altura dos ombros. Empurre acima da cabeça sem arquear a lombar e retorne devagar. Mantenha o tronco estável.",
      "easy": "Use halteres leves e amplitude confortável.",
      "hard": "Aumente gradualmente a carga com controle.",
      "equipment": "Dois halteres; banco com encosto opcional."
    },
    "pull": {
      "how": "Sente na polia alta, ajuste o apoio das pernas e segure a barra. Puxe em direção à parte superior do peito e retorne devagar, sem jogar o tronco para trás.",
      "easy": "Use uma carga leve.",
      "hard": "Aumente a carga mantendo o controle.",
      "equipment": "Polia alta com barra."
    },
    "bridge": {
      "how": "Deite de costas no solo com joelhos flexionados e pés apoiados. Posicione uma carga leve e protegida sobre o quadril com orientação, eleve o quadril e desça devagar.",
      "easy": "Comece sem carga.",
      "hard": "Aumente a carga aos poucos ou pause brevemente no topo.",
      "equipment": "Colchonete e carga leve protegida sobre o quadril."
    },
    "deadbug": {
      "how": "Deite de costas com braços para cima e joelhos a 90°. Estenda devagar braço e perna opostos sem perder o apoio da lombar. Volte e alterne.",
      "easy": "Mova só os braços ou uma perna de cada vez.",
      "hard": "Estenda mais a perna e faça o movimento mais lento.",
      "equipment": "Chão estável; colchonete opcional."
    },
    "calf": {
      "how": "Segure um halter e mantenha a outra mão em um apoio firme. Eleve e abaixe os calcanhares com controle. O vídeo demonstra em um degrau; use apenas uma superfície própria e estável.",
      "easy": "Comece no chão, com os dois pés e sem carga.",
      "hard": "Use uma perna por vez ou aumente a carga gradualmente.",
      "equipment": "Halter e apoio firme; degrau próprio é opcional."
    }
  }
};
function exerciseForMode(id, gym) { return {...exercises[id], ...exerciseInstructions[gym==='yes'?'gym':'home'][id]}; }
function workoutModeSelector() {
  return `<section class="workout-mode-selector" aria-label="Modalidade de treino"><span>Onde você vai treinar?</span><div><button data-workout-mode="no" aria-pressed="${state.profile.gym==='no'}" class="${state.profile.gym==='no'?'active':''}">Calistenia / em casa</button><button data-workout-mode="yes" aria-pressed="${state.profile.gym==='yes'}" class="${state.profile.gym==='yes'?'active':''}">Academia</button></div><small>Escolha a modalidade para ver os exercícios e os vídeos correspondentes. Seu histórico fica preservado.</small></section>`;
}
function trainingPage() {
  if(trainingMode==='learn')return `${intro('APRENDA NO SEU RITMO','Como se movimentar melhor','Aquecimento, corrida, alongamento e força, com explicações simples.')} ${trainingModeTabs()}${movementLibrary()}`;
  if(!state.profile) return `${intro('TREINOS','Monte seu primeiro treino','Conte seu objetivo e os dias disponíveis. Nós organizamos sua semana.')} ${trainingModeTabs()}<section class="card empty"><p>Você pode treinar em casa ou na academia.</p><button class="btn" data-view="perfil" style="margin-top:20px">Montar meu plano ${arrow}</button></section>`;
  const p=state.profile, routine=plan(), w=routine[selectedDay];
  const tabs=[1,2,3,4,5,6,0].map(d=>`<button class="day-tab ${selectedDay===d?'active':''}" data-day="${d}" aria-label="${weekdays[d]}${routine[d]?' ·':''}" aria-pressed="${selectedDay===d}"><strong>${weekdays[d].slice(0,3)}</strong><small>${routine[d]?'Treino':'Livre'}</small></button>`).join('');
  const safety=p.age<18?'<div class="notice warning">Para menores de 18 anos, esta rotina é apenas uma visão geral. Procure um profissional para adaptar volume, técnica e progressão à idade, com acompanhamento de um responsável. Não siga metas de perda de peso sem orientação.</div>':'';
  const goalText = p.goal==='fat'?'Se for confortável, complemente com 10–20 minutos de caminhada leve após o treino. O gasto energético e a perda de gordura variam; não há resultado garantido.':p.goal==='muscle'?'Priorize a execução. Só aumente a carga ou a dificuldade quando completar as séries com controle e sem dor.':'Priorize regularidade, técnica e um esforço que permita recuperar bem entre as sessões.';
  const done=state.completed.includes(today());
  return `${intro('SEU PLANO SEMANAL','Seu treino, passo a passo',`${goalNames[p.goal]} · ${levelNames[p.level]} · ${p.days} dias · ${p.gym==='yes'?'Academia':'Calistenia / em casa'}`)}${trainingModeTabs()}${workoutModeSelector()}${safety}<p class="schedule-help">1. Escolha o dia abaixo. <span>2. Comece o treino.</span> <span>3. Abra os exercícios e marque suas séries.</span></p><div class="day-tabs" aria-label="Dias de treino">${tabs}</div>${!w?`<section class="card rest-card"><span style="font-size:42px">☀</span><h2>${weekdays[selectedDay]}: descanso</h2><p>Deixe seu corpo recuperar. Se desejar, faça uma caminhada confortável ou mobilidade leve, sem forçar. Escolha acima um dia com a indicação Treino para ver os exercícios.</p></section>`:`<div class="workout-heading"><div><p class="eyebrow">${weekdays[selectedDay]}</p><h2>${w.name}</h2><p class="subtitle">${w.active?'20–30 minutos leves':`${sets()} séries por exercício · 60–90 s de descanso · cerca de 30–50 min`}</p></div><button class="btn ${done?'subtle':''}" data-action="toggle-today">${done?'✓ Hoje concluído':'Marcar treino de hoje'}</button></div>${w.active?`<section class="card"><h3>Um dia para recuperar em movimento</h3><p class="subtitle">Caminhe ou pedale em ritmo confortável por 20–30 minutos, permitindo conversar sem ficar ofegante. Faça 5 minutos de mobilidade suave. Reduza o tempo se estiver começando e interrompa se houver dor ou tontura.</p></section>`:`${sessionPanel(w)}<div class="notice"><strong>Antes de começar:</strong> aqueça por 5–8 minutos com caminhada e movimentos leves. Faça uma série fácil de cada exercício para praticar. Termine com 2–3 repetições ainda possíveis; não é necessário chegar à falha. Interrompa diante de dor, tontura ou mal-estar.</div><div class="exercise-list">${w.ids.map((id,i)=>{const e=exerciseForMode(id,p.gym);return `<details class="exercise" data-exercise="${id}" ${(openExercises?openExercises.has(id):i===0)?'open':''}><summary><span class="exercise-number">${String(i+1).padStart(2,'0')}</span><div class="exercise-info"><h3>${p.gym==='yes'?e.gym:e.body}</h3><p>${e.muscles}</p></div><span class="sets">${sets()} × ${e.reps}</span></summary><div class="exercise-body">${guidePlayer(`${id}-${p.gym==='yes'?'gym':'home'}`,p.gym==='yes'?e.gym:e.body)}<p>${e.how}</p><dl><dt>Mais fácil</dt><dd>${e.easy}</dd><dt>Mais difícil</dt><dd>${e.hard}</dd><dt>Equipamento</dt><dd>${e.equipment}</dd></dl>${seriesControls(id)}</div></details>`;}).join('')}</div><div class="notice" style="margin-top:20px">${goalText}</div>`}`}
  <p class="small muted" style="margin-top:18px">O treino guiado e o botão de marcação registram a data de hoje, independentemente do dia consultado. Para outras datas, use o calendário. Mudar meu plano recalcula a rotina, preservando seus registros. O cronômetro é reiniciado ao recarregar a página.</p>`;
}
function favoriteButton(i,large=false) {
  const saved=state.favorites.includes(i);
  return `<button class="${large?'btn secondary':'favorite-button'} ${saved?'is-favorite':''}" data-favorite="${i}" aria-pressed="${saved}" aria-label="${saved?'Remover dos favoritos:':'Favoritar:'} ${escapeHTML(recipes[i].name)}">${svgIcon('heart')}${large?(saved?'Salva nos favoritos':'Salvar receita'):''}</button>`;
}
function recipesPage() {
  const cards=recipes.map((r,i)=>({r,i})).filter(({i})=>recipeFilter==='all'||state.favorites.includes(i));
  return `${intro('COMIDA DE VERDADE','Simples de fazer. Bom de comer.','Escolha uma receita, assista ao guia e prepare um passo de cada vez.')}<div class="notice">Porções são sugestões gerais, não uma prescrição alimentar. Verifique alergias e restrições; para necessidades individuais, procure um nutricionista.</div><div class="recipe-filters" aria-label="Filtro de receitas"><button data-recipe-filter="all" class="${recipeFilter==='all'?'active':''}" aria-pressed="${recipeFilter==='all'}">Todas as receitas <span>${recipes.length}</span></button><button data-recipe-filter="favorites" class="${recipeFilter==='favorites'?'active':''}" aria-pressed="${recipeFilter==='favorites'}">Minhas favoritas <span>${state.favorites.length}</span></button></div>${cards.length?`<div class="cards-grid">${cards.map(({r,i})=>`<article class="card recipe-card">${foodArt(i)}<div class="recipe-content"><div class="recipe-tag-row"><span class="tag">${r.tag}</span>${favoriteButton(i)}</div><h2>${r.name}</h2><p>${r.cost}<br>${r.time} min · ${r.servings} ${r.servings===1?'porção':'porções'}</p><button class="btn secondary" data-recipe="${i}">Ver receita ${arrow}</button></div></article>`).join('')}</div>`:'<section class="card empty">Ainda não há receitas favoritas.<br>Toque no coração de uma receita para salvá-la.</section>'}`;
}
function recipeStepHTML(i) {
  const r=recipes[i],checked=state.recipeChecks[i]?.steps||[],done=checked.includes(currentRecipeStep);
  return `<div class="recipe-step-top"><span class="eyebrow">ETAPA ${currentRecipeStep+1} DE ${r.steps.length}</span><span class="tag">${checked.length} / ${r.steps.length} concluídas</span></div><p>${r.steps[currentRecipeStep]}</p><div class="recipe-step-actions"><button class="text-button" data-recipe-direction="-1" ${currentRecipeStep===0?'disabled':''}>← Anterior</button><button class="btn ${done?'subtle':''}" data-action="recipe-step-done" ${done?'disabled':''}>${done?'✓ Etapa concluída':'Concluir esta etapa'}</button><button class="text-button" data-recipe-direction="1" ${currentRecipeStep===r.steps.length-1?'disabled':''}>Próxima →</button></div>${checked.length===r.steps.length?'<div class="notice recipe-finished">✓ Preparo concluído! Confira o cozimento antes de servir. Bom apetite.</div>':''}`;
}
function ingredientProgress(i) {const count=state.recipeChecks[i]?.ingredients.length||0;return `${count} de ${recipes[i].ingredients.length} ingredientes separados`;}
function recipeModal(i,reset=true) {
  const r=recipes[i];if(!r)return;
  currentRecipe=i;if(reset)currentRecipeStep=0;
  const checked=state.recipeChecks[i]?.ingredients||[];
  openModal(`<article class="modal-inner recipe-modal">${modalHeader(r.name)}<div class="recipe-modal-meta"><span class="tag">${r.time} min · ${r.servings} ${r.servings===1?'porção':'porções'}</span>${favoriteButton(i,true)}</div>${guidePlayer(`recipe-${i}`,r.name)}<h3>Ingredientes</h3><p class="ingredient-count" id="ingredient-count">${ingredientProgress(i)}</p><ul class="ingredient-list">${r.ingredients.map((text,j)=>`<li><label class="ingredient ${checked.includes(j)?'checked':''}"><input type="checkbox" data-ingredient="${j}" data-recipe-id="${i}" ${checked.includes(j)?'checked':''}><span>${text}</span></label></li>`).join('')}</ul><h3>Preparo passo a passo</h3><div class="recipe-step" id="recipe-step">${recipeStepHTML(i)}</div><details class="recipe-transcript"><summary>Ver modo de preparo completo</summary><ol>${r.steps.map(s=>`<li>${s}</li>`).join('')}</ol></details><div class="notice" style="margin:20px 0 0">${r.tip}</div><div class="recipe-modal-footer"><small>Checklist e favoritos ficam neste navegador.</small><button class="text-button" data-action="recipe-reset">Recomeçar preparo</button></div></article>`);
}
function bmiCard() {
  const m=latest(), value=bmi(m), age=state.profile?.age;
  return `<section class="card"><h2>IMC: uma referência geral</h2>${m?`<div class="bmi-value">${decimal(value)}</div><p class="small muted">Peso ÷ altura² · ${decimal(m.weight)} kg / ${decimal(m.height)} cm</p><p class="small" style="margin-top:12px">${!age?'Informe sua idade em Meu plano para saber se a referência adulta é aplicável. Nenhuma classificação foi aplicada.':age<18?'Menores de 18 anos: não usamos classificação adulta. A interpretação depende de idade e sexo nas curvas de crescimento e deve ser feita por um profissional.':`${bmiLabel(value)} para adultos. Faixa geral: 18,5–24,9.`}</p>`:'<p class="subtitle">Registre peso e altura para calcular.</p>'}<p class="small muted" style="margin-top:12px">IMC não é diagnóstico: não diferencia músculo e gordura e tem limitações, por exemplo na gestação e em atletas. Não use o número como uma meta isolada.</p>${!age?`<button class="text-button" data-view="perfil">Informar idade ${arrow}</button>`:''}</section>`;
}
function progressTabs() {return `<div class="progress-tabs" aria-label="Acompanhar meu progresso"><button class="${view==='evolucao'?'active':''}" data-view="evolucao" ${view==='evolucao'?'aria-current="page"':''}>${svgIcon('weight')} Peso e altura</button><button class="${view==='fotos'?'active':''}" data-view="fotos" ${view==='fotos'?'aria-current="page"':''}>${svgIcon('photo')} Minhas fotos</button></div>`;}
function progressPage() {
  const m=latest();
  return `${intro('MEU PROGRESSO','Veja o que mudou','Registre peso e altura ou acompanhe suas fotos, sem pressão.')} ${progressTabs()}<div class="split-grid"><div class="stack"><section class="card"><h2>Novo registro</h2><p class="subtitle" style="margin-bottom:20px">Peso e altura na data escolhida.</p><form id="measurement-form"><div class="form-grid"><label class="field full">Data<input type="date" name="date" min="1900-01-01" max="${today()}" value="${today()}" required></label><label class="field">Peso (kg)<input type="number" name="weight" min="1" max="500" step="0.1" placeholder="Ex.: 72,5" required></label><label class="field">Altura (cm)<input type="number" name="height" min="30" max="280" step="0.1" value="${m?m.height:''}" placeholder="Ex.: 170" required></label></div><button class="btn" style="margin-top:20px" type="submit">Salvar registro ${arrow}</button><p class="small muted" style="margin-top:12px">Um registro por data. Salvar na mesma data atualiza o registro existente.</p></form></section>${bmiCard()}</div><div class="stack"><section class="card"><div class="section-header"><h2>Gráfico de evolução</h2><span class="tag">${state.measurements.length} registros</span></div><div class="chart-legend"><i></i> Peso corporal (kg)</div>${chart(550,220)}</section><section class="card"><div class="section-header"><h2>Seu histórico</h2><button class="text-button" data-action="export">Exportar ${arrow}</button></div>${state.measurements.length?`<div class="table-wrap"><table><caption class="visually-hidden">Histórico de peso e altura por data</caption><thead><tr><th scope="col">Data</th><th scope="col">Peso</th><th scope="col">Altura</th><th scope="col">Ação</th></tr></thead><tbody>${[...state.measurements].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr><td>${displayDate(r.date)}</td><td>${decimal(r.weight)} kg</td><td>${decimal(r.height)} cm</td><td><button class="delete-btn" data-delete-measure="${escapeHTML(r.date)}" aria-label="Excluir registro de ${displayDate(r.date)}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nada registrado ainda.<br>Seu primeiro registro é seu ponto de partida.</div>'}</section></div></div>`;
}

function openPhotoDb() {
  if(photoDb) return photoDb;
  photoDb = new Promise((resolve,reject)=>{
    if(!window.indexedDB) {reject(new Error('IndexedDB indisponível'));return;}
    const request=indexedDB.open('evoluifit-photos',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Armazenamento bloqueado'));
  });
  return photoDb;
}
async function photoOperation(mode,action) {
  const db=await openPhotoDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('photos',mode);const req=action(tx.objectStore('photos')); let value;
    if(req) req.onsuccess=()=>{value=req.result;};
    tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Não salvo'));
  });
}
async function loadPhotos() { photos = (await photoOperation('readonly',store=>store.getAll())).filter(p=>p && typeof p.id==='string' && validDate(p.date) && p.blob instanceof Blob).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)); }
let photoUrls=[];
let comparisonUrls=[];
function releaseComparison() {comparisonUrls.forEach(u=>URL.revokeObjectURL(u));comparisonUrls=[];}
function releasePhotos() {photoUrls.forEach(u=>URL.revokeObjectURL(u));photoUrls=[];releaseComparison();}
function photoUrl(blob,comparison=false) {const url=URL.createObjectURL(blob);(comparison?comparisonUrls:photoUrls).push(url);return url;}
function photosPage() {
  return `${intro('MEU PROGRESSO','Suas fotos, lado a lado','Guarde e compare fotos de datas diferentes, neste navegador.')} ${progressTabs()}<div class="notice">Fotos ficam só neste navegador, sem envio a servidor e sem sincronização. Não há backup nem criptografia própria. Pessoas com acesso a este perfil do navegador podem vê-las. Evite dispositivos compartilhados.</div>${photoError?'<div class="notice warning">Não foi possível abrir o armazenamento de fotos. Verifique as permissões e o espaço do navegador; tente novamente em uma janela normal.</div>':''}<section class="card" style="margin-bottom:22px"><form id="photo-form"><div class="form-grid"><label class="field">Data da foto<input type="date" name="date" required min="1900-01-01" max="${today()}" value="${today()}"></label><label class="field">Escolha uma foto<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required ${photoError?'disabled':''}><small>JPEG, PNG ou WebP, até 10 MB. Redimensionamos para até 1200 px e removemos metadados da imagem ao salvar.</small></label></div><div class="actions"><button class="btn" type="submit" ${photoError?'disabled':''}>Salvar foto no navegador</button><span class="small muted">Não é enviada para ninguém.</span></div></form></section>${photos.length>=2?`<section class="card" style="margin-bottom:22px"><h2>Compare dois momentos</h2><form id="compare-form" style="margin-top:20px"><div class="form-grid">${['before','after'].map((name,i)=>`<label class="field">${i?'Depois':'Antes'}<select name="${name}">${photos.map((p,j)=>`<option value="${escapeHTML(p.id)}" ${j===(i?photos.length-1:0)?'selected':''}>${displayDate(p.date)} · Foto ${j+1}</option>`).join('')}</select></label>`).join('')}</div><button class="btn secondary" type="submit" style="margin-top:18px">Comparar fotos</button></form><div id="comparison"></div></section>`:''}<div class="section-header"><h2>Seu álbum privado local</h2><span class="tag">${photos.length} fotos</span></div>${photos.length?`<div class="photo-grid">${photos.map(p=>`<article class="card photo-card"><img src="${photoUrl(p.blob)}" alt="Foto corporal registrada em ${displayDate(p.date)}"><div class="photo-meta"><span>${displayDate(p.date)}</span><button class="delete-btn" data-delete-photo="${escapeHTML(p.id)}">Apagar foto</button></div></article>`).join('')}</div>`:'<section class="card empty">Seu álbum está vazio.<br>Adicione uma foto quando se sentir confortável.</section>'}`;
}
async function prepareImage(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10*1024*1024 || !file.size) throw new Error('Escolha JPEG, PNG ou WebP de até 10 MB.');
  const url=URL.createObjectURL(file);
  try {
    const img = new Image(); img.src=url; await img.decode();
    const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível processar a imagem.')),'image/jpeg',.85));
  } finally { URL.revokeObjectURL(url); }
}
function calendarPage() {
  const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();const first=(calendarMonth.getDay()+6)%7;const days=new Date(year,month+1,0).getDate();
  const routine=plan();
  const cells=Array.from({length:first},()=>'<div aria-hidden="true"></div>').concat(Array.from({length:days},(_,i)=>{
    const d=new Date(year,month,i+1),s=localDate(d),done=state.completed.includes(s),planned=state.profile&&routine[d.getDay()];
    return `<button class="calendar-cell ${done?'done':''} ${s===today()?'today':''}" data-date="${s}" ${s>today()?'disabled':''} aria-label="${displayDate(s)}${done?', treino concluído':planned?', treino planejado':', sem registro'}" aria-pressed="${done}"><span>${i+1}${done?' ✓':''}</span><small>${done?'CONCLUÍDO':planned?'PLANEJADO':''}</small></button>`;
  })).join('');
  const count=state.completed.filter(d=>d.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length;
  return `${intro('CONSISTÊNCIA EM VISTA','Cada treino tem seu lugar.','Toque em uma data para marcar ou desmarcar um treino concluído.')}<section class="card"><div class="calendar-controls"><button data-month="-1" aria-label="Mês anterior">‹</button><h2 style="text-transform:capitalize">${calendarMonth.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h2><button data-month="1" aria-label="Próximo mês">›</button></div><div class="calendar-grid">${['SEG','TER','QUA','QUI','SEX','SÁB','DOM'].map(s=>`<div class="calendar-weekday">${s}</div>`).join('')}${cells}</div><div class="calendar-legend"><span><i></i>Treino concluído</span><span>Planejado: rotina atual</span><span>Datas futuras desativadas</span></div></section><div class="notice" style="margin-top:22px"><strong>${count} ${count===1?'treino concluído':'treinos concluídos'}</strong> neste mês. Você pode registrar movimento em dias de descanso; o calendário guarda a data, não os exercícios realizados.</div>`;
}
const navItems=[['inicio','Início','home'],['treinos','Treinos','train'],['receitas','Receitas','food'],['evolucao','Progresso','chart'],['calendario','Calendário','calendar']];
function renderNavigation() {
  const activeView=view==='fotos'?'evolucao':view;
  document.querySelector('#navigation').innerHTML=navItems.map(([id,label,icon])=>`<button class="nav-item ${activeView===id?'active':''}" data-view="${id}" aria-label="${label}" title="${label}" ${activeView===id?'aria-current="page"':''}>${svgIcon(icon)}<span>${label}</span></button>`).join('');
  document.querySelector('#page-label').textContent=view==='fotos'?'Progresso / Fotos':navItems.find(n=>n[0]===view)?.[1]||'Meu plano e dados';
}
async function render() {
  const token=++pageToken;releasePhotos();renderNavigation();
  if(view==='fotos') {
    main.innerHTML='<div class="empty">Abrindo seu álbum local…</div>';
    try {await loadPhotos();photoError=false;}catch{photoError=true;photos=[];photoDb=undefined;}
    if(token!==pageToken) return;
  }
  const pages={inicio:dashboard,perfil:profilePage,treinos:trainingPage,receitas:recipesPage,evolucao:progressPage,fotos:photosPage,calendario:calendarPage};
  main.innerHTML=(!storageAvailable?'<div class="notice warning">O armazenamento local está indisponível. Seus registros não poderão ser salvos. Verifique as permissões do navegador antes de começar.</div>':'')+(storageNotice?`<div class="notice warning">${escapeHTML(storageNotice)}</div>`:'')+pages[view]();
  updateRestUI();
}
function navigate(next) {
  if(!['inicio','perfil','treinos','receitas','evolucao','fotos','calendario'].includes(next)) next='inicio';
  view=next;if(location.hash!==`#${next}`) location.hash=next;else render();
}
window.addEventListener('hashchange',()=>{view=location.hash.slice(1);if(!['inicio','perfil','treinos','receitas','evolucao','fotos','calendario'].includes(view))view='inicio';render();window.scrollTo(0,0);main.focus({preventScroll:true});});

function toggleDate(date) {
  if(!validDate(date)) return;
  const completed=state.completed.includes(date)?state.completed.filter(s=>s!==date):[...state.completed,date].sort();
  if(persist({...state,completed})) {render();toast(completed.includes(date)?'Treino registrado. Mais um passo na sua jornada!':'Registro de treino removido.');}
}
function premiumModal() {
  openModal(`<div class="modal-inner premium-modal">${modalHeader('Sua jornada. Uma compra.')}<span class="tag">PREÇO PLANEJADO · ACESSO VITALÍCIO</span><div class="price"><small>R$</small> 24,99</div><p>Pagamento único planejado, sem mensalidade.</p><h3>Esta é uma demonstração</h3><p>O site já pode ser usado gratuitamente nesta versão. Não há checkout, cobrança, compra ou ativação de acesso. Não solicitamos dados de cartão.</p><div class="notice" style="margin:20px 0">O acesso vitalício é uma proposta comercial para uma versão futura. Condições, suporte e funcionamento serão definidos antes da venda.</div><div class="actions"><button class="btn" data-action="pix-test">Testar pagamento com Pix ${arrow}</button><button class="text-button" data-action="integrations">Como conectar um pagamento real</button></div></div>`);
}
function pixTestModal() {
  openModal(`<div class="modal-inner premium-modal">${modalHeader('Pix de teste')}<span class="tag">SIMULAÇÃO · SEM CONFIRMAÇÃO DE PAGAMENTO</span><div class="price"><small>R$</small> 24,99</div><p>Valor demonstrativo do acesso vitalício.</p><figure class="test-qr"><img src="media/qr-test.svg" width="264" height="264" alt="QR ilustrativo de teste que abre o site EvoluiFit"><figcaption>QR ilustrativo: abre o EvoluiFit. Não é Pix e não realiza pagamento.</figcaption></figure><div class="notice"><strong>Somente teste da tela</strong><p>Nenhuma cobrança foi criada. Este QR serve apenas para testar a exibição e a leitura.</p></div><p>Esta tela não confirma pagamentos nem altera seu acesso ou seus registros.</p><button class="btn secondary" data-action="premium">Voltar</button></div>`);
}
function integrationsModal() {
  openModal(`<div class="modal-inner">${modalHeader('O que vem depois')}<h3>Pagamento no site</h3><p>Escolher um provedor (ex.: Mercado Pago ou Stripe), criar um backend seguro com credenciais fora do navegador, usar checkout hospedado e verificar webhooks assinados para confirmar o pagamento de R$ 24,99. O servidor precisa validar moeda, valor e identificador da transação, evitar duplicação, tratar reembolsos e controlar o acesso associado a uma conta real.</p><h3>Pagamento no aplicativo</h3><p>Este projeto é um site responsivo. Um aplicativo distribuído pelas lojas precisará de empacotamento e, para vender acesso digital, integração com os sistemas de compra da Apple e Google conforme as regras vigentes. Será necessário validar recibos no servidor e restaurar compras. Regras e preços das lojas devem ser revisados antes da publicação.</p><h3>Contas e sincronização</h3><p>Exigem autenticação real, banco de dados, armazenamento privado de imagens, controle de acesso, exclusão, política de privacidade e consentimento. Esta demonstração usa apenas dados locais, sem sincronização.</p><h3>Meta e divulgação</h3><p>Nenhum anúncio, campanha, Pixel ou SDK está conectado. Futuramente: configurar conta comercial e conta de anúncios, revisar políticas, consentimento para rastreamento e integrar Pixel e/ou Conversions API para eventos permitidos. No app, avaliar o SDK e permissões da plataforma. Nunca enviar fotos corporais, peso, IMC ou outros dados de saúde em eventos publicitários.</p></div>`);
}
document.addEventListener('toggle', event=>{
  const detail=event.target;
  if(!detail.matches?.('details.exercise') || detail.open)return;
  detail.querySelectorAll('video').forEach(video=>video.pause());
  const player=detail.querySelector('.guide-player[data-clip]');
  if(player?.querySelector('iframe'))player.outerHTML=guidePlayer(player.dataset.clip,detail.querySelector('h3').textContent);
},true);
document.addEventListener('click',async event=>{
  const el=event.target.closest('button');if(!el)return;
  if(el.dataset.view) {if(el.dataset.view==='treinos')trainingMode='plan';navigate(el.dataset.view);return;}
  if(el.dataset.loadClip) {
    const clip=exerciseVideos[el.dataset.loadClip];
    if(!clip || clip.provider!=='youtube')return;
    const frame=document.createElement('iframe');
    frame.src=`https://www.youtube-nocookie.com/embed/${clip.id}?autoplay=1&playsinline=1&rel=0`;
    frame.title=el.querySelector('strong').textContent;
    frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
    el.closest('.exercise-video-screen').replaceChildren(frame);return;
  }
  if(el.dataset.workoutMode) {
    const gym=el.dataset.workoutMode;if(!state.profile||!['yes','no'].includes(gym)||gym===state.profile.gym)return;
    if(persist({...state,profile:{...state.profile,gym}})){
      rememberOpenExercises();stopRest();restTimer.remaining=restTimer.seconds;await render();
      document.querySelector(`[data-workout-mode="${gym}"]`)?.focus({preventScroll:true});
    }
    return;
  }
  if(el.dataset.trainingMode){trainingMode=el.dataset.trainingMode;render();return;}
  if(el.dataset.movementTopic){movementTopic=el.dataset.movementTopic;render();return;}
  if(el.dataset.day!==undefined) {selectedDay=Number(el.dataset.day);openExercises=null;render();return;}
  if(el.dataset.recipe!==undefined) {recipeModal(Number(el.dataset.recipe));return;}
  if(el.dataset.recipeFilter) {recipeFilter=el.dataset.recipeFilter;render();return;}
  if(el.dataset.favorite!==undefined) {
    const i=Number(el.dataset.favorite);if(!recipes[i])return;
    const favorites=state.favorites.includes(i)?state.favorites.filter(n=>n!==i):[...state.favorites,i];
    if(persist({...state,favorites})){
      if(view==='receitas')render();
      const saved=favorites.includes(i);
      document.querySelectorAll(`dialog [data-favorite="${i}"]`).forEach(button=>{button.classList.toggle('is-favorite',saved);button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',`${saved?'Remover dos favoritos:':'Favoritar:'} ${recipes[i].name}`);button.innerHTML=`${svgIcon('heart')}${saved?'Salva nos favoritos':'Salvar receita'}`;});
      toast(saved?'Receita salva nos favoritos.':'Receita removida dos favoritos.');
    }
    return;
  }
  if(el.dataset.recipeDirection){
    currentRecipeStep=Math.max(0,Math.min(recipes[currentRecipe].steps.length-1,currentRecipeStep+Number(el.dataset.recipeDirection)));
    document.querySelector('#recipe-step').innerHTML=recipeStepHTML(currentRecipe);return;
  }
  if(el.dataset.series!==undefined){
    const info=currentSessionInfo(),id=el.dataset.exercise,index=Number(el.dataset.series);
    if(!info?.session||!info.w.ids.includes(id)||!Number.isInteger(index)||index<0||index>=sets())return;
    const values=Array.from({length:sets()},(_,j)=>info.session.sets[id]?.[j]===true);values[index]=!values[index];
    const session={...info.session,sets:{...info.session.sets,[id]:values},finished:false};
    rememberOpenExercises();
    if(persist({...state,workoutSessions:{...state.workoutSessions,[info.key]:session}})){
      await render();
      if(values[index])startRest(restTimer.seconds);
      document.querySelector(`[data-series="${index}"][data-exercise="${id}"]`)?.focus({preventScroll:true});
      toast(values[index]?'Série registrada. Respire e descanse no seu ritmo.':'Marcação da série removida.');
    }
    return;
  }
  if(el.dataset.month) {calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+Number(el.dataset.month),1);render();return;}
  if(el.dataset.date) {toggleDate(el.dataset.date);return;}
  if(el.dataset.deleteMeasure) {
    const date=el.dataset.deleteMeasure;
    openModal(`<div class="modal-inner">${modalHeader('Apagar registro?')}<p>O registro de ${displayDate(date)} será removido do histórico e do gráfico.</p><div class="actions"><button class="btn danger" data-confirm-measure="${escapeHTML(date)}">Apagar registro</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div></div>`);return;
  }
  if(el.dataset.confirmMeasure) {if(persist({...state,measurements:state.measurements.filter(m=>m.date!==el.dataset.confirmMeasure)})){modal.close();render();toast('Registro apagado.');}return;}
  if(el.dataset.deletePhoto) {
    openModal(`<div class="modal-inner">${modalHeader('Apagar foto?')}<p>Esta foto será removida do armazenamento local. Não há backup automático.</p><div class="actions"><button class="btn danger" data-confirm-photo="${escapeHTML(el.dataset.deletePhoto)}">Apagar definitivamente</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div></div>`);return;
  }
  if(el.dataset.confirmPhoto) {
    el.disabled=true;
    try{await photoOperation('readwrite',s=>s.delete(el.dataset.confirmPhoto));modal.close();await render();toast('Foto apagada do navegador.');}catch{toast('Não foi possível apagar a foto. Tente novamente.');el.disabled=false;}return;
  }
  switch(el.dataset.action) {
    case 'close-modal':modal.close();break;
    case 'premium':premiumModal();break;
    case 'pix-test':pixTestModal();break;
    case 'integrations':integrationsModal();break;
    case 'toggle-today':toggleDate(today());break;
    case 'start-guided':{
      const info=currentSessionInfo();if(!info)return;
      const session={date:today(),signature:info.signature,sets:Object.fromEntries(info.w.ids.map(id=>[id,Array(sets()).fill(false)])),finished:false};
      rememberOpenExercises();
      if(persist({...state,workoutSessions:{...state.workoutSessions,[info.key]:session}})){render();toast('Treino iniciado. Abra cada exercício e marque as séries realizadas.');}
      break;
    }
    case 'finish-guided':{
      const info=currentSessionInfo();if(!info?.session||info.count!==info.total)return;
      const session={...info.session,finished:true};
      rememberOpenExercises();
      if(persist({...state,completed:[...new Set([...state.completed,today()])].sort(),workoutSessions:{...state.workoutSessions,[info.key]:session}})){stopRest();render();toast('Treino concluído e registrado no calendário. Bom trabalho!');}
      break;
    }
    case 'rest-toggle':
      if(restTimer.running){restTimer.remaining=Math.max(0,Math.ceil((restTimer.deadline-Date.now())/1000));stopRest();updateRestUI();}else startRest();
      break;
    case 'rest-reset':stopRest();restTimer.remaining=restTimer.seconds;updateRestUI();break;
    case 'recipe-step-done':{
      if(currentRecipe===null)return;
      const checks=state.recipeChecks[currentRecipe]||{ingredients:[],steps:[]};
      const entry={...checks,steps:[...new Set([...checks.steps,currentRecipeStep])].sort()};
      if(persist({...state,recipeChecks:{...state.recipeChecks,[currentRecipe]:entry}})){
        const finished=entry.steps.length===recipes[currentRecipe].steps.length;
        if(!finished)currentRecipeStep=Math.min(currentRecipeStep+1,recipes[currentRecipe].steps.length-1);
        document.querySelector('#recipe-step').innerHTML=recipeStepHTML(currentRecipe);
        toast(finished?'Preparo concluído. Confira o cozimento antes de servir.':'Etapa marcada. Vamos ao próximo passo.');
      }
      break;
    }
    case 'recipe-reset':{
      if(currentRecipe===null)return;
      if(persist({...state,recipeChecks:{...state.recipeChecks,[currentRecipe]:{ingredients:[],steps:[]}}})){recipeModal(currentRecipe);toast('Checklist reiniciado.');}
      break;
    }
    case 'export':{
      const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),note:'Fotos não incluídas.'},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`evoluifit-registros-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Exportação de registros solicitada. Fotos não estão incluídas.');break;
    }
    case 'clear-all':openModal(`<div class="modal-inner">${modalHeader('Apagar todos os dados?')}<p>Seu perfil, medidas, calendário, séries, favoritos, checklists e todas as fotos serão apagados deste navegador. A ação não pode ser desfeita. Exporte seus registros primeiro se precisar.</p><div class="actions"><button class="btn danger" data-action="confirm-clear">Apagar tudo</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div></div>`);break;
    case 'confirm-clear':{
      el.disabled=true;
      try{await photoOperation('readwrite',s=>s.clear());}catch{toast('Não foi possível apagar o álbum. Seus outros dados foram preservados.');el.disabled=false;break;}
      if(persist(initialState())){stopRest();restTimer.remaining=restTimer.seconds;recipeFilter='all';modal.close();navigate('inicio');toast('Perfil, medidas, calendário, séries, receitas favoritas e fotos apagados.');}else el.disabled=false;
      break;
    }
  }
});
document.addEventListener('change',event=>{
  const input=event.target;
  if(input.id==='rest-duration'){
    restTimer.seconds=Number(input.value);stopRest();restTimer.remaining=restTimer.seconds;updateRestUI();return;
  }
  if(input.dataset.ingredient!==undefined){
    const i=Number(input.dataset.recipeId),index=Number(input.dataset.ingredient);
    if(!recipes[i]||!Number.isInteger(index)||index<0||index>=recipes[i].ingredients.length)return;
    const checks=state.recipeChecks[i]||{ingredients:[],steps:[]};
    const ingredients=input.checked?[...new Set([...checks.ingredients,index])].sort():checks.ingredients.filter(n=>n!==index);
    if(persist({...state,recipeChecks:{...state.recipeChecks,[i]:{...checks,ingredients}}})){
      input.closest('label').classList.toggle('checked',input.checked);
      document.querySelector('#ingredient-count').textContent=ingredientProgress(i);
    }else input.checked=!input.checked;
  }
});
document.addEventListener('error',event=>{
  const target=event.target.closest?.('video');if(target)target.closest('.guide-player')?.querySelector('.video-error')?.removeAttribute('hidden');
},true);
document.addEventListener('submit',async event=>{
  const form=event.target;if(!['profile-form','measurement-form','photo-form','compare-form'].includes(form.id))return;
  event.preventDefault();const data=new FormData(form);
  if(form.id==='profile-form') {
    const profile=Object.fromEntries(data);profile.age=Number(profile.age);
    if(!validProfile(profile)) {toast('Confira as opções do perfil e informe uma idade válida.');return;}
    if(persist({...state,profile})){trainingMode='plan';selectedDay=1;openExercises=null;stopRest();restTimer.remaining=restTimer.seconds;navigate('treinos');toast('Seu plano está pronto. Comece no seu ritmo.');}
  }
  if(form.id==='measurement-form') {
    const m={date:data.get('date'),weight:Number(data.get('weight')),height:Number(data.get('height'))};
    if(!validDate(m.date)||!Number.isFinite(m.weight)||m.weight<1||m.weight>500||!Number.isFinite(m.height)||m.height<30||m.height>280) {toast('Confira a data, peso e altura informados.');return;}
    if(persist({...state,measurements:[...state.measurements.filter(r=>r.date!==m.date),m].sort((a,b)=>a.date.localeCompare(b.date))})){render();toast('Registro salvo neste navegador.');}
  }
  if(form.id==='photo-form') {
    const date=data.get('date');if(!validDate(date)){toast('Escolha uma data válida, até hoje.');return;}
    const button=form.querySelector('button');button.disabled=true;button.textContent='Salvando localmente…';
    try{const blob=await prepareImage(data.get('photo'));await photoOperation('readwrite',s=>s.put({id:crypto.randomUUID?.() || `${Date.now()}-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`,date,blob}));if(view==='fotos')await render();toast('Foto salva somente neste navegador.');}
    catch(error){toast(error.message?.startsWith('Escolha')?error.message:'Não foi possível salvar a foto. Confira o formato, espaço e permissões do navegador.');button.disabled=false;button.textContent='Salvar foto no navegador';}
  }
  if(form.id==='compare-form') {
    if(data.get('before')===data.get('after')) {toast('Escolha duas fotos diferentes.');return;}
    const chosen=[data.get('before'),data.get('after')].map(id=>photos.find(p=>p.id===id));
    if(chosen.some(p=>!p))return;
    releaseComparison();
    document.querySelector('#comparison').innerHTML=`<div class="compare-grid">${chosen.map((p,i)=>`<figure><img src="${photoUrl(p.blob,true)}" alt="${i?'Depois':'Antes'}: foto de ${displayDate(p.date)}"><figcaption>${i?'Depois':'Antes'} · ${displayDate(p.date)}</figcaption></figure>`).join('')}</div>`;
  }
});
view=location.hash.slice(1)||'inicio';if(!['inicio','perfil','treinos','receitas','evolucao','fotos','calendario'].includes(view))view='inicio';render();
