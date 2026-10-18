'use strict';
(() => {
  const manifest=window.EvoluiLegalManifest;
  if(!manifest)return;
  let dialog,sequence=0;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ensureDialog(){
    if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='legal-dialog';dialog.className='legal-dialog';dialog.setAttribute('aria-labelledby','legal-dialog-title');
    dialog.innerHTML='<header class="legal-dialog-header"><h2 id="legal-dialog-title">Documentos da EvoluFit</h2><button type="button" id="legal-close" aria-label="Fechar documentos e voltar">Fechar ×</button></header><nav class="legal-dialog-nav" aria-label="Ler documentos"><a data-legal="terms" href="termos.html">Termos de Uso</a><a data-legal="privacy" href="privacidade.html">Política de Privacidade</a></nav><div class="legal-dialog-content" id="legal-content" aria-live="polite"></div>';
    document.body.append(dialog);dialog.querySelector('#legal-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{sequence++;});return dialog;
  }
  function receiptHTML(){
    if(!window.EvoluiAccount)return '';
    const receipt=window.EvoluiAccount.legalAcceptance;
    if(!receipt)return '<section class="legal-dialog-receipt"><h3>Registro desta conta</h3><p>Não há comprovante de aceite informado pelo servidor para esta conta. Nenhum aceite anterior foi presumido.</p></section>';
    const date=new Date(receipt.accepted_at),when=Number.isNaN(+date)?'Horário não disponível':date.toLocaleString('pt-BR')+' (horário deste dispositivo)';
    const archive=(kind,version)=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+$/.test(version)?`<a href="legal/${escape(version)}/${kind==='terms'?'termos':'privacidade'}.html" target="_blank" rel="noopener noreferrer">${escape(version)} · abrir texto aceito</a>`:escape(version);
    return `<section class="legal-dialog-receipt"><h3>Seu comprovante de aceite</h3><dl><dt>Conta</dt><dd>${escape(window.EvoluiAccount.user.id)}</dd><dt>Aceite registrado</dt><dd>${escape(when)}<br><small>Data original do servidor: ${escape(receipt.accepted_at)}</small></dd><dt>Termos</dt><dd>${archive('terms',receipt.terms_version)}</dd><dt>Privacidade</dt><dd>${archive('privacy',receipt.privacy_version)}</dd><dt>Autorização de saúde</dt><dd>${escape(receipt.health_consent_version)}</dd></dl><p>Registro recebido do servidor. Ler os documentos novamente não altera o aceite.</p></section>`;
  }
  async function open(kind){
    const doc=manifest.documents[kind];if(!doc)return;
    const d=ensureDialog(),request=++sequence,content=d.querySelector('#legal-content');
    d.querySelector('#legal-dialog-title').textContent=doc.title;content.innerHTML='<p class="legal-dialog-status" role="status">Carregando documento completo…</p>';
    if(!d.open)d.showModal();d.scrollTop=0;
    try{
      const response=await fetch(doc.path,{credentials:'same-origin',cache:'no-cache',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Documento indisponível.');
      const html=await response.text(),start=html.indexOf('<article class="legal-document"'),end=html.indexOf('</article>',start);
      if(start<0||end<start)throw new Error('Não foi possível conferir o documento.');
      const source=html.slice(start,end+10),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');
      if(hash!==doc.sha256)throw new Error('A versão do documento mudou. Atualize a página antes de aceitar.');
      if(request!==sequence||!d.open)return;
      const parsed=new DOMParser().parseFromString(source,'text/html'),article=parsed.querySelector('article.legal-document');
      if(!article||article.querySelector('script,iframe,object,embed,form'))throw new Error('Documento inválido.');
      content.replaceChildren(document.importNode(article,true));content.insertAdjacentHTML('beforeend',receiptHTML());
    }catch(error){if(request!==sequence||!d.open)return;content.innerHTML=`<p class="legal-dialog-status" role="alert">${escape(error.message||'Não foi possível carregar. Tente novamente.')}</p><a href="${escape(doc.path)}" target="_blank" rel="noopener noreferrer">Abrir documento completo em outra aba</a>`;}
  }
  document.addEventListener('click',event=>{const link=event.target.closest('[data-legal]');if(!link)return;event.preventDefault();open(link.dataset.legal);});
  window.EvoluiLegal={manifest,open};
})();
