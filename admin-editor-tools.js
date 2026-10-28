(() => {
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const pathKey=path=>JSON.stringify(path);
  const valueAt=(content,path)=>path.reduce((value,key)=>value?.[key],content);
  function summarize(base,current,fields=[]) {
    const changes=[];
    const aliases={'settings.news':'Noticias','settings.events':'Calendario','settings.merch.products':'Productos antiguos','settings.specialVisual.schedule':'Programación de efectos'};
    const fieldLabel=path=>fields.find(field=>pathKey(field.path)===pathKey(path))?.label || fields.find(field=>path.length>field.path.length && field.path.every((key,index)=>path[index]===key))?.label;
    function visit(before,after,path) {
      if(equal(before,after))return;
      const alias=aliases[path.join('.')];
      if(alias && Array.isArray(before || after)) {
        const remaining=(before || []).map(item=>JSON.stringify(item));let added=0;
        for(const item of after || []) {const index=remaining.indexOf(JSON.stringify(item));if(index>=0)remaining.splice(index,1);else added++;}
        const edited=Math.min(added,remaining.length),removed=remaining.length-edited;
        const counts=[added-edited?`${added-edited} añadida(s)`:null,removed?`${removed} eliminada(s)`:null,edited?`${edited} modificada(s)`:null].filter(Boolean);
        changes.push({path,label:`${alias}: ${counts.join(', ') || 'orden cambiado'}`});return;
      }
      if(before && after && typeof before==='object' && typeof after==='object' && !Array.isArray(before) && !Array.isArray(after)) {
        for(const key of new Set([...Object.keys(before),...Object.keys(after)]))visit(before[key],after[key],[...path,key]);
        return;
      }
      changes.push({path,label:fieldLabel(path) || ({settings:'Configuración de la web',languages:'Textos de la web'}[path[0]] || 'Contenido de la web')});
    }
    visit(base,current,[]);return changes;
  }
  const effectLabels={christmas:'Navidad: nieve',autumn:'Otoño: hojas',carnival:'Carnaval: confeti',mourning:'Lazo de luto',breastCancer:'Lazo rosa',womensDay:'Día de la Mujer'};
  function effectState(settings,day) {
    if(!day){const now=new Date();day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
    const visual=settings.specialVisual || {};
    const yes=value=>value===true || value==='true';
    const seasons=['christmas','autumn','carnival'];
    const schedules=(visual.schedule || []).map((item,index)=>({...item,index,end:item.end || item.start})).filter(item=>item.enabled!==false && item.enabled!=='false' && effectLabels[item.mode] && item.start && item.end && day>=item.start && day<=item.end);
    const seasonal=schedules.find(item=>seasons.includes(item.mode));
    const weather=seasonal?.mode || (seasons.includes(visual.mode)?visual.mode:'none');
    return Object.entries(effectLabels).map(([mode,label])=>{
      const manual=visual.mode===mode || (!seasons.includes(mode) && yes(visual[mode]));
      const matches=schedules.filter(item=>item.mode===mode);
      const active=seasons.includes(mode)?weather===mode:manual || matches.length>0;
      return {mode,label,manual,active,schedules:seasons.includes(mode)?(seasonal?.mode===mode?[seasonal]:[]):matches};
    });
  }
  function previewFields(fields,content,lang) {
    const output=[];
    for(const field of fields) {
      const languageIndex=field.path.indexOf('languages');
      if(languageIndex>=0 && field.path[languageIndex+1]!==lang)continue;
      const value=valueAt(content,field.path);
      function add(item) {
        if(typeof item==='string' && item.trim().length>1)output.push({...field,value:item});
        else if(Array.isArray(item))item.forEach(add);
      }
      if(['input','textarea','array','matrix','galleryImages'].includes(field.type))add(value);
    }
    return output;
  }
  window.SKBC_EDITOR_TOOLS={summarize,effectState,previewFields,valueAt,pathKey};
})();
