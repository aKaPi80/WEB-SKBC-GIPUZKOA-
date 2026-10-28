(() => {
  const tools=window.SKBC_EDITOR_TOOLS;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let api, preview, frame, token, language='es', desktop=true, template, review;
  function changes(){return tools.summarize(api.getBaseline(),api.getContent(),api.getFields());}
  function refresh() {
    if(!api)return;
    const count=changes().length;
    const badge=document.querySelector('#pending-changes');
    if(badge)badge.textContent=count?`${count} cambio${count===1?'':'s'} pendiente${count===1?'':'s'} de publicar`:'Sin cambios de contenido';
    renderEffects();
  }
  function install(callbacks) {
    api=callbacks;
    const publish=document.querySelector('#publish');
    const button=document.createElement('button');button.type='button';button.textContent='Vista previa';button.id='preview-session';button.addEventListener('click',openPreview);publish.before(button);
    const badge=document.createElement('span');badge.id='pending-changes';badge.setAttribute('aria-live','polite');document.querySelector('#status').after(badge);
    document.querySelector('#editor').addEventListener('input',()=>queueMicrotask(refresh));
    document.querySelector('#editor').addEventListener('change',()=>queueMicrotask(refresh));
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-effect-schedule]');
      if(button)api.focusSchedule(Number(button.dataset.effectSchedule));
    });
    window.addEventListener('message',event=>{
      if(!frame || event.source!==frame.contentWindow || event.origin!=='null' || event.data?.token!==token)return;
      const message=event.data;
      if(message.type==='skbc-preview-ready') {
        frame.contentWindow.postMessage({type:'skbc-preview-content',token,content:structuredClone(api.getContent()),fields:tools.previewFields(api.getFields(),api.getContent(),language),language,editing:document.querySelector('#preview-edit').checked},'*');
      } else if(message.type==='skbc-preview-loaded'){frame.dataset.previewLoaded='true';document.querySelector('#preview-status').textContent='Vista de esta sesión, sin publicar. Los formularios y contenidos externos están desactivados.';}
      else if(message.type==='skbc-preview-error')document.querySelector('#preview-status').textContent='No se pudo cargar la vista previa. Pulsa Actualizar vista para reintentar.';
      else if(message.type==='skbc-preview-language' && ['es','eu','en'].includes(message.language)){language=message.language;document.querySelector('#preview-language').value=language;void updatePreview();}
      else if(message.type==='skbc-preview-edit' && Array.isArray(message.path)) {
        const field=api.getFields().find(field=>tools.pathKey(field.path)===tools.pathKey(message.path));
        if(field){preview.close();api.editField(field);}
      }
    });
    refresh();
  }
  function renderEffects() {
    const group=document.querySelector('#editor [data-visual-settings]');
    if(!group)return;
    let section=group.querySelector('.editor-effect-status');
    if(!section){section=document.createElement('section');section.className='editor-effect-status';section.setAttribute('aria-label','Efectos que se aplican ahora');group.querySelector('header').after(section);}
    section.innerHTML=`<h3>Qué se aplica ahora</h3><p>Se combina la activación manual con las programaciones vigentes.</p>${tools.effectState(api.getContent().settings).map(effect=>{
      const sources=[];
      if(effect.active && effect.manual && (!['autumn','christmas','carnival'].includes(effect.mode) || !effect.schedules.length))sources.push('activación manual');
      if(effect.active && effect.schedules.length)sources.push('programación por fechas');
      const until=effect.schedules.map(item=>item.end.split('-').reverse().join('/')).join(', ');
      return `<div class="editor-effect-row"><strong>${escape(effect.label)}</strong><span>${effect.active?`Activo por ${sources.join(' y ')}${until?` · hasta ${escape(until)}`:''}`:(effect.manual?'No aplicado: otra programación de temporada tiene prioridad':'Desactivado')}${effect.active&&!effect.manual?' · manual desactivado':''}</span>${effect.schedules.map(item=>`<button type="button" data-effect-schedule="${item.index}">Ver programación</button>`).join('')}</div>`;
    }).join('')}`;
  }
  function dialog(id,title) {
    let element=document.getElementById(id);
    if(element)return element;
    element=document.createElement('dialog');element.id=id;element.className='editor-dialog';element.setAttribute('aria-labelledby',`${id}-title`);element.innerHTML=`<header><h2 id="${id}-title">${title}</h2><button type="button" data-close-dialog aria-label="Cerrar">Cerrar</button></header><div class="editor-dialog-body"></div>`;
    element.querySelector('[data-close-dialog]').addEventListener('click',()=>element.close());document.body.append(element);return element;
  }
  function confirmPublish() {
    review=dialog('publish-review','Revisar antes de publicar');
    const items=changes();
    review.querySelector('.editor-dialog-body').innerHTML=items.length?`<p>${items.length===1?'Este cambio se hará visible':`Estos ${items.length} cambios se harán visibles`} en la web:</p><ul class="editor-change-list">${items.map(item=>`<li>${escape(item.label)}</li>`).join('')}</ul><div class="editor-dialog-actions"><button type="button" data-confirm-publish class="primary">Publicar estos cambios</button><button type="button" data-cancel-publish>Seguir editando</button></div>`:'<p>No hay cambios de contenido pendientes de publicar.</p>';
    return new Promise(resolve=>{
      let accepted=false;
      review.querySelector('[data-confirm-publish]')?.addEventListener('click',()=>{accepted=true;review.close();},{once:true});
      review.querySelector('[data-cancel-publish]')?.addEventListener('click',()=>review.close(),{once:true});
      review.addEventListener('close',()=>resolve(accepted),{once:true});review.showModal();
    });
  }
  async function openPreview() {
    if(api.hasDraft()){api.notice('Guarda la noticia o pulsa Cancelar antes de abrir la vista previa.','warning');return;}
    preview=dialog('session-preview','Vista previa sin publicar');preview.classList.add('editor-preview-dialog');
    preview.querySelector('.editor-dialog-body').innerHTML=`<div class="editor-preview-toolbar"><button type="button" data-preview-size="desktop" aria-pressed="${desktop}">Ordenador</button><button type="button" data-preview-size="mobile" aria-pressed="${!desktop}">Móvil</button><label>Idioma <select id="preview-language"><option value="es">Español</option><option value="eu">Euskera</option><option value="en">Inglés</option></select></label><label><input type="checkbox" id="preview-edit" checked> Pulsar para editar</label><button type="button" id="refresh-preview">Actualizar vista</button></div><p id="preview-status" role="status">Cargando vista previa…</p><div class="editor-preview-stage"></div>`;
    document.querySelector('#preview-language').value=language;
    preview.querySelectorAll('[data-preview-size]').forEach(button=>button.addEventListener('click',()=>{desktop=button.dataset.previewSize==='desktop';sizeFrame();}));
    document.querySelector('#preview-language').addEventListener('change',event=>{language=event.target.value;void updatePreview();});
    document.querySelector('#preview-edit').addEventListener('change',event=>frame?.contentWindow.postMessage({type:'skbc-preview-edit-mode',token,enabled:event.target.checked},'*'));
    document.querySelector('#refresh-preview').addEventListener('click',()=>void updatePreview());
    preview.addEventListener('close',()=>{frame?.remove();frame=null;token=null;},{once:true});
    preview.showModal();await updatePreview();
  }
  function sizeFrame() {
    if(!frame)return;
    frame.style.width=desktop?'1280px':'390px';
    preview.querySelectorAll('[data-preview-size]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.previewSize===(desktop?'desktop':'mobile'))));
  }
  async function updatePreview() {
    const generation=crypto.randomUUID();token=generation;
    document.querySelector('#preview-status').textContent='Cargando vista previa…';
    try {
      if(!template){const response=await fetch('index.html',{cache:'no-store'});if(!response.ok)throw new Error('index');template=await response.text();}
      if(token!==generation || !preview.open)return;
      const doc=new DOMParser().parseFromString(template,'text/html');
      const appScript=[...doc.scripts].find(script=>/\bapp\.js(?:\?|$)/.test(script.getAttribute('src')||''));
      const seasonal=[...doc.scripts].find(script=>/seasonal-effects\.js/.test(script.getAttribute('src')||''));
      const params=new URLSearchParams({token:generation,parentOrigin:location.origin,nonce:generation,app:new URL(appScript?.getAttribute('src')||'app.js',location.href).href,seasonal:new URL(seasonal?.getAttribute('src')||'seasonal-effects.js',location.href).href});
      doc.querySelectorAll('script,base,meta[http-equiv="Content-Security-Policy"]').forEach(element=>element.remove());
      const base=doc.createElement('base');base.href=new URL('.',location.href).href;doc.head.prepend(base);
      const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content=`default-src 'none'; script-src 'nonce-${generation}'; style-src 'unsafe-inline' http: https:; img-src http: https: data: blob:; font-src http: https: data:; connect-src http: https:; media-src http: https:; frame-src 'none'; form-action 'none'; base-uri ${location.origin}`;doc.head.prepend(csp);
      const bridgeURL=new URL(`admin-preview-bridge.js?${params}`,location.href).href;
      const bridgeMarkup=`<script nonce="${generation}" src="${escape(bridgeURL)}"><\/script>`;
      const html=doc.documentElement.outerHTML.replace('</body>',bridgeMarkup+'</body>');
      frame?.remove();frame=document.createElement('iframe');frame.title='Vista previa de los cambios de esta sesión';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.srcdoc='<!doctype html>'+html;preview.querySelector('.editor-preview-stage').replaceChildren(frame);sizeFrame();
      setTimeout(()=>{if(token===generation && frame && frame.dataset.previewLoaded!=='true')document.querySelector('#preview-status').textContent='La vista previa no ha terminado de cargar. Pulsa Actualizar vista para reintentar.';},15000);
    } catch {if(token===generation)document.querySelector('#preview-status').textContent='No se pudo cargar la vista previa. Pulsa Actualizar vista para reintentar.';}
  }
  window.SKBC_EDITOR_WORKSPACE={install,refresh,renderEffects,confirmPublish};
})();
