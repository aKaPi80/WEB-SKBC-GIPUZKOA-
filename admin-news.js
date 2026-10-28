(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function createStore(getItems, onChange) {
    let original = null;
    const store = {
      draft:null, index:null, deleted:null,
      start(index = null) {
        if (store.draft) return;
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        store.index = index;
        store.draft = index === null ? {enabled:true,date,expiresAt:'',color:'#1f6fa9',image:'',url:'',languages:{es:{title:'',text:''},eu:{title:'',text:''},en:{title:'',text:''}}} : structuredClone(getItems()[index]);
        store.draft.languages ||= {};
        for (const lang of ['es','eu','en']) store.draft.languages[lang] ||= {title:'',text:''};
        original = JSON.stringify(store.draft);
      },
      hasDraft: () => Boolean(store.draft),
      hasUnsaved: () => Boolean(store.draft && JSON.stringify(store.draft) !== original),
      cancel() { store.draft=null; store.index=null; original=null; },
      save() {
        if (!store.draft) return;
        if (!store.draft.languages.es.title.trim()) throw new Error('Escribe un título para la noticia.');
        const item=structuredClone(store.draft);
        for (const key of ['image','url']) {
          const value=String(item[key] || '').trim();
          const valid=!value || (!/["'<>\u0000-\u001f]/.test(value) && /^(https?:\/\/|assets\/|\/(?!\/)|#)/.test(value));
          if (!valid) throw new Error(key==='image'?'Usa una imagen subida o una dirección web válida.':'Escribe un enlace que empiece por https:// o una ruta de la web.');
          item[key]=value;
        }
        item.languages.es.title=item.languages.es.title.trim();
        for (const lang of ['eu','en']) {
          item.languages[lang].title ||= item.languages.es.title;
          item.languages[lang].text ||= item.languages.es.text;
        }
        if (store.index === null) getItems().push(item);
        else getItems()[store.index]=item;
        store.cancel();onChange();
      },
      remove(index) {
        if (!getItems()[index]) return;
        store.deleted={index,item:structuredClone(getItems()[index])};
        getItems().splice(index,1);onChange();
      },
      undoDelete() {
        if (!store.deleted) return;
        getItems().splice(Math.min(store.deleted.index,getItems().length),0,store.deleted.item);
        store.deleted=null;onChange();
      }
    };
    return store;
  }
  let store, api, busy=false;
  function configure(callbacks) {
    api=callbacks;
    store=createStore(api.getItems,api.onChange);
  }
  function field(label,path,type='text') {
    const value=path.split('.').reduce((value,key)=>value?.[key],store.draft) ?? '';
    return `<label>${label}${type==='textarea'?`<textarea name="${path}" rows="6">${escape(value)}</textarea>`:`<input name="${path}" type="${type}" value="${escape(value)}"${path==='languages.es.title'?' required maxlength="180"':''}>`}</label>`;
  }
  function listHtml() {
    const items=api.getItems();
    const sorted=items.map((item,index)=>({item,index})).sort((a,b)=>String(b.item.date||'').localeCompare(String(a.item.date||'')));
    return `<div class="simple-news-heading"><div><p class="simple-eyebrow">CALENDARIO Y NOTICIAS</p><h2>Noticias</h2><p>Crea, edita o borra las noticias del club.</p></div><button type="button" class="primary" data-news-new>Nueva noticia</button></div>
      <p class="simple-news-note">Los cambios aparecerán en la web cuando pulses <strong>Publicar cambios</strong>.</p>
      ${store.deleted?'<div class="simple-news-undo" role="status">Noticia borrada de esta sesión. <button type="button" data-news-undo>Deshacer borrado</button></div>':''}
      <div class="simple-news-list">${sorted.length?sorted.map(({item,index})=>{
        const expiry=item.expiresAt?new Date(item.expiresAt).getTime():Infinity;
        const status=item.enabled===false?'Oculta':expiry<=Date.now()?'Caducada':'Visible';
        return `<article class="simple-news-row"><div><h3>${escape(item.languages?.es?.title || 'Sin título')}</h3><p>${escape(item.date || 'Sin fecha')} · ${status}</p></div><div class="simple-news-row__actions"><button type="button" data-news-edit="${index}">Editar</button><button type="button" class="danger" data-news-delete="${index}">Borrar</button></div></article>`;
      }).join(''):'<div class="simple-news-empty"><h3>No hay noticias</h3><p>Pulsa Nueva noticia para escribir la primera. No se añadirá hasta que la guardes.</p></div>'}</div>`;
  }
  function formHtml() {
    return `<div class="simple-news-heading"><div><p class="simple-eyebrow">NOTICIAS</p><h2>${store.index===null?'Nueva noticia':'Editar noticia'}</h2><p>Escribe la noticia y guárdala cuando esté lista.</p></div></div>
      <form id="simple-news-form" class="simple-news-form">
      <fieldset ${busy?'disabled':''}>
      ${field('Título','languages.es.title')}${field('Texto de la noticia','languages.es.text','textarea')}
      <div class="simple-news-short">${field('Fecha','date','date')}<label class="simple-news-checkbox"><input name="enabled" type="checkbox" ${store.draft.enabled!==false?'checked':''}> Mostrar en la web</label></div>
      <details class="simple-advanced"><summary>Imagen, enlace y caducidad (opcional)</summary>
        ${field('Imagen: dirección o archivo subido','image')}<label class="simple-news-upload">Subir imagen<input type="file" name="news-image-file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
        ${field('Enlace','url')}${field('Dejar de mostrar a partir de','expiresAt','datetime-local')}${field('Color','color','color')}
      </details>
      <details class="simple-advanced"><summary>Euskera e inglés (opcional)</summary>
        <p class="simple-news-note">Si los dejas vacíos, se mostrará el texto en castellano.</p>
        <button type="button" data-news-translate>Traducir desde el castellano</button>
        ${field('Título en euskera','languages.eu.title')}${field('Texto en euskera','languages.eu.text','textarea')}
        ${field('Título en inglés','languages.en.title')}${field('Texto en inglés','languages.en.text','textarea')}
      </details>
      </fieldset>
      <p class="simple-news-error" role="alert" id="simple-news-error"></p>
      <div class="simple-news-form__actions"><button type="submit" class="primary" ${busy?'disabled':''}>Guardar noticia</button><button type="button" data-news-cancel ${busy?'disabled':''}>Cancelar</button></div>
      <p class="simple-news-note">Guardar añade los cambios al panel. Después pulsa Publicar cambios para que se vean en la web.</p>
      </form>`;
  }
  function render() {
    const editor=document.querySelector('#editor');
    editor.innerHTML=store.draft?formHtml():listHtml();
    editor.querySelector('[data-news-new]')?.addEventListener('click',()=>{store.start();render();editor.querySelector('[name="languages.es.title"]')?.focus();});
    editor.querySelectorAll('[data-news-edit]').forEach(button=>button.addEventListener('click',()=>{store.start(Number(button.dataset.newsEdit));render();}));
    editor.querySelectorAll('[data-news-delete]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.newsDelete);
      if (confirm(`¿Borrar «${api.getItems()[index]?.languages?.es?.title || 'esta noticia'}»? Podrás deshacerlo antes de publicar.`)) {store.remove(index);render();}
    }));
    editor.querySelector('[data-news-undo]')?.addEventListener('click',()=>{store.undoDelete();render();});
    editor.querySelector('[data-news-cancel]')?.addEventListener('click',()=>{
      if (store.hasUnsaved() && !confirm('¿Descartar los cambios de esta noticia?')) return;
      store.cancel();render();
    });
    const form=editor.querySelector('#simple-news-form');
    form?.addEventListener('input',event=>{
      const input=event.target;
      if (!input.name || input.type==='file') return;
      const keys=input.name.split('.');
      const key=keys.pop();
      keys.reduce((value,name)=>value[name],store.draft)[key]=input.type==='checkbox'?input.checked:input.value;
    });
    form?.addEventListener('submit',event=>{
      event.preventDefault();
      if (busy) return;
      try {store.save();api.setStatus('Noticia guardada en el panel. Falta publicar los cambios.','warning');render();}
      catch(error) {editor.querySelector('#simple-news-error').textContent=error.message;}
    });
    form?.querySelector('[name="news-image-file"]')?.addEventListener('change',async event=>{
      const file=event.target.files?.[0];if(!file)return;
      await runAsync(async draft=>{draft.image=await api.upload(file);});
    });
    form?.querySelector('[data-news-translate]')?.addEventListener('click',()=>runAsync(async draft=>{
      const source=draft.languages.es;
      if(!source.title.trim())throw new Error('Escribe primero el título en castellano.');
      const values=await Promise.all([api.translate(source.title,'eu'),api.translate(source.text,'eu'),api.translate(source.title,'en'),api.translate(source.text,'en')]);
      draft.languages.eu={...draft.languages.eu,title:values[0],text:values[1]};
      draft.languages.en={...draft.languages.en,title:values[2],text:values[3]};
    }));
    api.afterRender();
  }
  async function runAsync(action) {
    if(busy || !store.draft)return;
    const draft=store.draft;
    busy=true;
    const form=document.querySelector('#simple-news-form');
    form?.querySelectorAll('button,input,textarea').forEach(input=>input.disabled=true);
    try {await action(draft);}
    catch(error) {api.setStatus(error.message,'danger');}
    finally {
      busy=false;
      if(store.draft===draft && document.querySelector('#simple-news-form')===form){
        // Preserve open optional sections after the asynchronous task.
        const opened=[...form.querySelectorAll('details')].map(details=>details.open);
        render();document.querySelectorAll('#simple-news-form details').forEach((details,index)=>details.open=opened[index]);
      }
    }
  }
  window.SKBC_ADMIN_NEWS={createStore,configure,render,open:index=>{store.start(index);render();},hasDraft:()=>Boolean(store?.hasDraft()),hasUnsaved:()=>Boolean(store?.hasUnsaved()),isBusy:()=>busy,cancel:()=>store?.cancel()};
})();
