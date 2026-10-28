/* Runs only inside the opaque, sandboxed editor-preview iframe. */
(() => {
  const script=document.currentScript;
  const params=new URL(script.src).searchParams;
  const token=params.get('token'),parentOrigin=params.get('parentOrigin'),nonce=script.nonce;
  let started=false,fields=[],editing=true;
  const send=message=>parent.postMessage({...message,token},parentOrigin);
  const originalFetch=window.fetch.bind(window);
  window.SKBC_ADMIN_PREVIEW=true;
  window.fetch=async (input,options={})=>{
    const url=new URL(input?.url || String(input),document.baseURI);
    const method=String(options.method || (typeof input==='object' && input.method) || 'GET').toUpperCase();
    if(method!=='GET' || !url.pathname.endsWith('/rest/v1/skbc_merch_catalog_public'))return new Response('{"message":"Esta operación está desactivada en la vista previa."}',{status:403,headers:{'Content-Type':'application/json'}});
    return originalFetch(input,{...options,credentials:'omit'});
  };
  window.open=()=>null;
  document.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();},true);
  document.addEventListener('click',event=>{
    const editable=event.target.closest('[data-preview-field]');
    if(editing && editable){event.preventDefault();event.stopImmediatePropagation();send({type:'skbc-preview-edit',path:fields[Number(editable.dataset.previewField)]?.path});return;}
    const lang=event.target.closest('[data-lang]');
    if(lang){event.preventDefault();event.stopImmediatePropagation();send({type:'skbc-preview-language',language:lang.dataset.lang});return;}
    const link=event.target.closest('a');
    if(link){event.preventDefault();event.stopImmediatePropagation();const href=link.getAttribute('href') || '';if(href.startsWith('#'))document.getElementById(href.slice(1))?.scrollIntoView({behavior:'smooth'});}
  },true);
  document.addEventListener('keydown',event=>{
    if(editing && ['Enter',' '].includes(event.key) && event.target.matches('[data-preview-field]')){event.preventDefault();event.stopImmediatePropagation();send({type:'skbc-preview-edit',path:fields[Number(event.target.dataset.previewField)]?.path});}
  },true);
  const normalized=value=>String(value||'').replace(/\s+/g,' ').trim();
  function annotate() {
    const normalFields=fields.map((field,index)=>({...field,index}));
    const direct=[['#inicio .hero-content h1',['languages',window.SKBC_PREVIEW_LANGUAGE,'hero','title']],['#inicio .hero-content > p:not(.eyebrow)',['languages',window.SKBC_PREVIEW_LANGUAGE,'hero','text']],['#inicio .hero-content > .eyebrow',['languages',window.SKBC_PREVIEW_LANGUAGE,'hero','eyebrow']],['#inicio .hero-logo > img',['settings','system','heroLogo']],['#club .split-media img',['settings','system','clubLogo']]];
    function mark(element,field) {
      if(!element || !field)return;
      element.dataset.previewField=field.index;element.setAttribute('title',`Editar: ${field.label}`);
      if(!['A','BUTTON','INPUT','TEXTAREA','SELECT'].includes(element.tagName))element.tabIndex=0;
    }
    for(const [selector,path] of direct)mark(document.querySelector(selector),normalFields.find(field=>JSON.stringify(field.path)===JSON.stringify(path)));
    function scoped(element,image=false) {
      const section=element.closest('section');if(!section)return [];
      const roots={inicio:'hero',ninos:'kids',adultos:'adults',club:'club',equipo:'team',galeria:'gallery',horarios:'schedule',redes:'social',noticias:'news',testimonios:'testimonials',faq:'faq',kenshi:'kenshi',contacto:'contact',aprendizaje:'learn',calendario:'calendar'};
      if(section.id && !roots[section.id])return [];
      let root=roots[section.id];
      if(!root){const heading=normalized(section.querySelector('h2')?.textContent);const matches=normalFields.filter(field=>field.path[0]==='languages' && field.path.length===4 && field.path[3]==='title' && normalized(field.value)===heading);if(new Set(matches.map(field=>field.path[2])).size===1)root=matches[0].path[2];}
      if(!root)return [];
      if(image)return normalFields.filter(field=>root==='gallery'?field.path[0]==='settings'&&field.path[1]==='images'&&field.path[2]==='gallery':field.path[0]==='settings' && ((field.path[1]==='images'&&field.path[2]==='people') || (field.path[1]==='system'&&field.path[2]==='clubLogo'&&root==='club') || (field.path[1]==='news'&&root==='news')));
      let candidates=normalFields.filter(field=>(field.path[0]==='languages'&&field.path[2]===root)||(field.path[0]==='settings'&&((root==='news'&&field.path[1]==='news')||(root==='calendar'&&field.path[1]==='events'))));
      if(root==='news' && element.closest('.news-card') && typeof visibleNewsItems==='function') {
        const cards=[...section.querySelectorAll('.news-card')],items=visibleNewsItems(window.SKBC_CONTENT.settings);
        if(items.length){const item=items[cards.indexOf(element.closest('.news-card'))%items.length];const index=window.SKBC_CONTENT.settings.news.indexOf(item);candidates=candidates.filter(field=>field.path[0]==='settings'&&field.path[2]===index);}
      }
      return candidates;
    }
    for(const element of document.querySelectorAll('#app h1,#app h2,#app h3,#app p,#app span,#app strong,#app a,#app li,#app img')) {
      if(element.dataset.previewField || element.closest('[data-preview-photo]'))continue;
      if(element.tagName==='IMG') {
        const src=element.getAttribute('src');
        const matches=scoped(element,true).filter(field=>src===field.value || (typeof optimizedImage==='function' && src===optimizedImage(field.value)));
        if(new Set(matches.map(field=>JSON.stringify(field.path))).size===1)mark(element,matches[0]);
      } else if(element.children.length===0) {
        const value=normalized(element.textContent);
        const matches=scoped(element).filter(field=>!/^https?:|^assets\//.test(field.value) && normalized(field.value)===value);
        if(new Set(matches.map(field=>JSON.stringify(field.path))).size===1)mark(element,matches[0]);
      }
    }
    const photos=[['inicio','hero'],['ninos','kids'],['adultos','adults'],['aprendizaje','learn']];
    for(const [id,key] of photos) {
      const section=document.getElementById(id),field=normalFields.find(field=>JSON.stringify(field.path)===JSON.stringify(['settings','images',key]));
      if(!section || !field || section.querySelector(`[data-preview-photo="${key}"]`))continue;
      const button=document.createElement('button');button.type='button';button.dataset.previewPhoto=key;button.className='preview-photo-edit';button.textContent='Editar foto';mark(button,field);section.append(button);section.classList.add('preview-has-photo');
    }
  }
  async function loadScript(url) {
    const parsed=new URL(url);if(parsed.origin!==parentOrigin)throw new Error('Origen de script no permitido');
    await new Promise((resolve,reject)=>{const element=document.createElement('script');element.src=parsed.href;element.nonce=nonce;element.onload=resolve;element.onerror=reject;document.body.append(element);});
  }
  window.addEventListener('message',async event=>{
    if(event.source!==parent || event.origin!==parentOrigin || event.data?.token!==token)return;
    if(event.data.type==='skbc-preview-edit-mode'){editing=event.data.enabled===true;document.documentElement.classList.toggle('preview-editing',editing);return;}
    if(event.data.type!=='skbc-preview-content' || started)return;
    started=true;fields=Array.isArray(event.data.fields)?event.data.fields:[];editing=event.data.editing!==false;
    window.SKBC_CONTENT=event.data.content;window.SKBC_PREVIEW_LANGUAGE=['es','eu','en'].includes(event.data.language)?event.data.language:'es';
    try {
      await loadScript(params.get('app'));await loadScript(params.get('seasonal'));
      if(!document.querySelector('#app .hero'))throw new Error('No se pudo renderizar la página');
      const style=document.createElement('style');style.textContent='.preview-editing [data-preview-field]{cursor:pointer!important}.preview-editing [data-preview-field]:hover,.preview-editing [data-preview-field]:focus-visible{outline:3px solid #ffcf5a!important;outline-offset:4px}.preview-has-photo{position:relative}.preview-photo-edit{display:none;position:absolute;right:18px;top:130px;z-index:10;background:#fff;color:#951f25;padding:10px 15px;border:2px solid #951f25;border-radius:7px;font:600 14px Arial}.preview-editing .preview-photo-edit{display:block}';document.head.append(style);
      document.documentElement.classList.toggle('preview-editing',editing);annotate();
      let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;annotate();});}).observe(document.querySelector('#app'),{childList:true,subtree:true});
      send({type:'skbc-preview-loaded'});
    } catch {send({type:'skbc-preview-error'});}
  });
  send({type:'skbc-preview-ready'});
})();
