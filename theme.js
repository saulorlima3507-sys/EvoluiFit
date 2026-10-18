'use strict';
(() => {
  const key='evoluifit-theme';
  const system=matchMedia('(prefers-color-scheme: dark)');
  let preference='system';
  try{const saved=localStorage.getItem(key);if(['light','dark','system'].includes(saved))preference=saved;}catch{}
  function apply(){
    const dark=preference==='dark'||(preference==='system'&&system.matches);
    document.documentElement.dataset.theme=dark?'dark':'light';
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?'#111c18':'#173c2b';
    const button=document.getElementById('theme-toggle');if(button){button.setAttribute('aria-pressed',String(dark));button.setAttribute('aria-label',dark?'Ativar modo claro':'Ativar modo escuro');button.title=dark?'Ativar modo claro':'Ativar modo escuro';button.innerHTML=`<span aria-hidden="true">${dark?'☀':'☾'}</span><span class="theme-label">${dark?'Modo claro':'Modo escuro'}</span>`;}
  }
  apply();system.addEventListener('change',()=>{if(preference==='system')apply();});
  addEventListener('storage',event=>{if(event.key===key){preference=['light','dark'].includes(event.newValue)?event.newValue:'system';apply();}});
  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.createElement('button');button.id='theme-toggle';button.type='button';button.className='theme-toggle';
    const host=document.querySelector('.topbar-right');if(host)host.prepend(button);else{document.body.classList.add('public-theme');document.body.append(button);}
    button.addEventListener('click',()=>{preference=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem(key,preference);}catch{}apply();});apply();
  });
})();
