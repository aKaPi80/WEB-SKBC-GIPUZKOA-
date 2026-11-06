(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function parse(value){const [y,m,d]=String(value||'').split('-').map(Number);const result=new Date(y,m-1,d,12);return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&key(result)===value?result:null;}
  function dates(event){
    const found=new Set((event.dates||[]).filter(value=>parse(value)));
    const repeating=event.repeat?.enabled;
    const start=parse(repeating?(event.repeat.start||event.start):event.start);
    const end=parse(repeating?(event.repeat.until||event.end||event.start):(event.end||event.start));
    const step=repeating?Math.max(1,Math.floor(Number(event.repeat.everyDays)||15)):1;
    if(start&&end)for(let date=new Date(start),count=0;date<=end&&count<36600;date.setDate(date.getDate()+step),count++)found.add(key(date));
    for(const excluded of event.excludedDates||[])found.delete(excluded);
    return [...found].sort();
  }
  function prepare(original,values){
    if(!String(values.title||'').trim())throw Error('Escribe el nombre del evento.');
    if(!parse(values.start)||!parse(values.end))throw Error('Indica fechas válidas de inicio y fin.');
    if(values.end<values.start)throw Error('La fecha de fin debe ser igual o posterior al inicio.');
    const event=clone(original||{});
    for(const name of ['start','end','kind','location','color','enabled'])if(values[name]!==undefined)event[name]=values[name];
    event.languages ||= {};event.languages.es ||= {};
    event.languages.es.title=values.title.trim();
    if(values.description!==undefined)event.languages.es.description=values.description;
    for(const lang of ['eu','en']){
      const title=values['title_'+lang] ?? event.languages[lang]?.title;
      const description=values['description_'+lang] ?? event.languages[lang]?.description;
      event.languages[lang]={...event.languages[lang],title:String(title||'').trim()||event.languages.es.title,description:String(description||'').trim()||event.languages.es.description||''};
    }
    return event;
  }
  let month=new Date(new Date().getFullYear(),new Date().getMonth(),1),view='month',activeDialog,unsaved=false;
  const kinds={holiday:['Festivo','#b83232'],course:['Curso','#216aa5'],vacation:['Vacaciones / cierre','#996019'],event:['Otro evento','#6951a5']};
  function closeDialog(){activeDialog?.close();activeDialog?.remove();activeDialog=null;unsaved=false;}
  function render(root,api){
    closeDialog();
    const events=api.events;
    const years=new Set([month.getFullYear(),new Date().getFullYear(),new Date().getFullYear()+1]);
    const indexed=events.map((event,index)=>({event,index,days:new Set(dates(event))}));
    indexed.forEach(item=>item.days.forEach(day=>years.add(Number(day.slice(0,4)))));
    const monthLabel=date=>new Intl.DateTimeFormat('es',{month:'long',year:'numeric'}).format(date);
    function monthMarkup(date,compact=false){
      const year=date.getFullYear(),m=date.getMonth(),offset=(new Date(year,m,1).getDay()+6)%7;
      let cells='<div class="cal-empty" aria-hidden="true"></div>'.repeat(offset);
      for(let day=1;day<=new Date(year,m+1,0).getDate();day++){
        const value=key(new Date(year,m,day)),items=indexed.filter(item=>item.days.has(value));
        cells+=`<div class="cal-cell ${value===key(new Date())?'cal-today':''}"><button type="button" class="cal-day" data-cal-date="${value}" aria-label="Añadir evento el ${value}">${day}<span class="cal-plus"> +</span></button>${items.map(({event,index})=>`<button type="button" class="cal-event ${event.enabled===false?'cal-disabled':''}" style="--cal-color:${/^#[0-9a-f]{6}$/i.test(event.color||'')?event.color:'#216aa5'}" data-cal-event="${index}" title="${esc(event.languages?.es?.title||'Sin título')}">${esc(event.languages?.es?.title||'Sin título')}${event.enabled===false?' · oculto':''}</button>`).join('')}</div>`;
      }
      return `<section class="cal-month ${compact?'cal-compact':''}">${compact?`<button class="cal-month-name" type="button" data-cal-month="${m}">${esc(monthLabel(date))}</button>`:''}<div class="cal-weekdays">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<span>${d}</span>`).join('')}</div><div class="cal-grid">${cells}</div></section>`;
    }
    root.innerHTML=`<section class="cal-workspace"><header class="cal-toolbar"><div><h2>Calendario del club</h2><p>Pulsa un día para añadir. Pulsa un evento para modificarlo.</p></div><button type="button" class="primary" data-cal-new>Añadir evento</button></header><div class="cal-navigation"><div><button type="button" data-cal-prev aria-label="Periodo anterior">←</button><button type="button" data-cal-today>Hoy</button><button type="button" data-cal-next aria-label="Periodo siguiente">→</button></div><h3>${view==='year'?month.getFullYear():esc(monthLabel(month))}</h3><label>Año <select data-cal-year>${[...years].sort().map(year=>`<option ${year===month.getFullYear()?'selected':''}>${year}</option>`).join('')}</select></label><div><button type="button" data-cal-view="month" aria-pressed="${view==='month'}">Mes</button><button type="button" data-cal-view="year" aria-pressed="${view==='year'}">Año</button></div></div><div class="cal-legend">${Object.values(kinds).map(([label,color])=>`<span><i style="background:${color}"></i>${label}</span>`).join('')}<span>${events.length} eventos guardados</span></div><div class="${view==='year'?'cal-year':''}">${view==='year'?Array.from({length:12},(_,m)=>monthMarkup(new Date(month.getFullYear(),m,1),true)).join(''):monthMarkup(month)}</div><footer><button type="button" data-cal-advanced>Opciones avanzadas: importar, duplicar y edición completa</button><p>Guardar actualiza esta sesión. Usa «Publicar cambios» para mostrarlo en la web.</p></footer></section>`;
    root.querySelector('[data-cal-prev]').onclick=()=>{month=new Date(month.getFullYear()-(view==='year'?1:0),month.getMonth()-(view==='month'?1:0),1);render(root,api);};
    root.querySelector('[data-cal-next]').onclick=()=>{month=new Date(month.getFullYear()+(view==='year'?1:0),month.getMonth()+(view==='month'?1:0),1);render(root,api);};
    root.querySelector('[data-cal-today]').onclick=()=>{month=new Date();render(root,api);};
    root.querySelector('[data-cal-year]').onchange=e=>{month=new Date(Number(e.target.value),month.getMonth(),1);render(root,api);};
    root.querySelectorAll('[data-cal-view]').forEach(button=>button.onclick=()=>{view=button.dataset.calView;render(root,api);});
    root.querySelectorAll('[data-cal-month]').forEach(button=>button.onclick=()=>{month=new Date(month.getFullYear(),Number(button.dataset.calMonth),1);view='month';render(root,api);});
    root.querySelector('[data-cal-new]').onclick=()=>edit(null,key(new Date(month.getFullYear(),month.getMonth(),1)));
    root.querySelectorAll('[data-cal-date]').forEach(button=>button.onclick=()=>edit(null,button.dataset.calDate));
    root.querySelectorAll('[data-cal-event]').forEach(button=>button.onclick=()=>edit(Number(button.dataset.calEvent)));
    root.querySelector('[data-cal-advanced]').onclick=api.advanced;
    if(Number.isInteger(api.selected)&&events[api.selected]){const index=api.selected;api.consumeSelection();edit(index);}
    function edit(index,date){
      const existing=index===null?null:events[index];
      const event=clone(existing||{start:date,end:date,enabled:true,color:kinds.event[1],kind:'event',languages:{es:{title:'',description:''}}});
      const dialog=document.createElement('dialog');activeDialog=dialog;dialog.className='cal-dialog';dialog.setAttribute('aria-labelledby','cal-dialog-title');
      function input(label,name,value,type='text'){return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${['title','start','end'].includes(name)?'required':''}></label>`;}
      dialog.innerHTML=`<form><header><h2 id="cal-dialog-title">${existing?'Editar evento':'Añadir evento'}</h2><button type="button" data-cal-close aria-label="Cerrar ficha">×</button></header>${event.source==='management'?'<p class="cal-warning">Importado de gestión: una nueva importación puede sustituir estos cambios.</p>':''}${input('Nombre','title',event.languages?.es?.title||'')}<div class="cal-form-grid"><label>Tipo<select name="kind">${Object.entries(kinds).map(([value,[label]])=>`<option value="${value}" ${(event.kind||'event')===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Mostrar en la web<select name="enabled"><option value="true" ${event.enabled!==false?'selected':''}>Sí</option><option value="false" ${event.enabled===false?'selected':''}>No</option></select></label>${input('Fecha de inicio','start',event.start,'date')}${input('Fecha de fin (incluida)','end',event.end||event.start,'date')}${input('Lugar','location',event.location||'')}${input('Color','color',event.color||kinds.event[1],'color')}</div><label>Descripción<textarea name="description">${esc(event.languages?.es?.description||'')}</textarea></label><details><summary>Idiomas y fechas avanzadas</summary><div class="cal-form-grid">${['eu','en'].map(lang=>input(`Título ${lang==='eu'?'en euskera':'en inglés'}`,`title_${lang}`,event.languages?.[lang]?.title||'')+`<label>Descripción ${lang.toUpperCase()}<textarea name="description_${lang}">${esc(event.languages?.[lang]?.description||'')}</textarea></label>`).join('')}<label>Repetición<select name="repeating"><option value="false" ${!event.repeat?.enabled?'selected':''}>Sin repetición</option><option value="true" ${event.repeat?.enabled?'selected':''}>Repetir</option></select></label>${input('Cada cuántos días','interval',event.repeat?.everyDays||15,'number')}${input('Repetir desde','repeatStart',event.repeat?.start||event.start,'date')}${input('Repetir hasta','repeatUntil',event.repeat?.until||event.end||event.start,'date')}</div><label>Días adicionales (AAAA-MM-DD separados por comas)<textarea name="dates">${esc((event.dates||[]).join(', '))}</textarea></label><label>Días excluidos (AAAA-MM-DD separados por comas)<textarea name="excludedDates">${esc((event.excludedDates||[]).join(', '))}</textarea></label></details><p class="cal-error" role="alert"></p><footer>${existing?'<button type="button" class="danger" data-cal-delete>Eliminar evento</button>':''}<button type="button" data-cal-close>Cancelar</button><button type="submit" class="primary">Guardar evento</button></footer></form>`;
      document.body.append(dialog);dialog.showModal();
      const form=dialog.querySelector('form');let changed=false;form.oninput=()=>{changed=true;unsaved=true;};
      function requestClose(){if(!changed||confirm('¿Descartar los cambios de esta ficha?'))closeDialog();}
      dialog.oncancel=e=>{e.preventDefault();requestClose();};
      dialog.querySelectorAll('[data-cal-close]').forEach(button=>button.onclick=requestClose);
      form.elements.kind.onchange=()=>{form.elements.color.value=kinds[form.elements.kind.value][1];changed=true;};
      form.elements.start.onchange=()=>{
        if(form.elements.end.value<form.elements.start.value)form.elements.end.value=form.elements.start.value;
        if(!event.repeat?.enabled||event.repeat.start===event.start)form.elements.repeatStart.value=form.elements.start.value;
      };
      form.elements.end.onchange=()=>{if(!event.repeat?.enabled||event.repeat.until===event.end)form.elements.repeatUntil.value=form.elements.end.value;};
      dialog.querySelector('[data-cal-delete]')?.addEventListener('click',()=>{if(confirm('¿Eliminar este evento completo del calendario?')){closeDialog();api.remove(index);}});
      form.onsubmit=e=>{e.preventDefault();try{
        const values=Object.fromEntries(new FormData(form));values.enabled=values.enabled==='true';
        const saved=prepare(event,values);
        const wasRepeating=event.repeat?.enabled;
        saved.repeat={...event.repeat,enabled:values.repeating==='true',start:values.repeatStart,until:values.repeatUntil,everyDays:Number(values.interval)};
        if(saved.repeat.enabled&&(!parse(saved.repeat.start)||!parse(saved.repeat.until)||saved.repeat.until<saved.repeat.start||!Number.isInteger(saved.repeat.everyDays)||saved.repeat.everyDays<1))throw Error('Revisa el inicio, fin e intervalo de la repetición.');
        if(!wasRepeating&&!saved.repeat.enabled){saved.repeat.start=saved.start;saved.repeat.until=saved.end;}
        for(const name of ['dates','excludedDates']){saved[name]=values[name].split(/[\s,;]+/).filter(Boolean);if(saved[name].some(day=>!parse(day)))throw Error('Los días adicionales y excluidos deben usar AAAA-MM-DD.');}
        closeDialog();api.save(index,saved);month=new Date(parse(saved.start).getFullYear(),parse(saved.start).getMonth(),1);api.refresh();
      }catch(error){dialog.querySelector('.cal-error').textContent=error.message;}};
      form.elements.title.focus();
    }
  }
  window.SKBC_ADMIN_CALENDAR={dates,prepare,render,hasUnsaved:()=>unsaved};
})();
