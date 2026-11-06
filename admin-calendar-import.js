(() => {
  const clone=value=>JSON.parse(JSON.stringify(value));
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
  const fingerprint=event=>[normalize(event.languages?.es?.title),event.start,event.end||event.start,event.appliesTo||'all'].join('|');
  function base(row,type){
    const start=row.starts_on,end=row.ends_on||start;
    if(!validDate(start)||!validDate(end)||end<start)throw Error('Hay un evento de gestión con fechas no válidas. No se ha importado.');
    const title=String(row.title||'Cierre del club').trim(),description=type==='closure'?(row.applies_to==='kids'?'Solo niños':row.applies_to==='adults'?'Solo adultos':''):String(row.description||'');
    const vacation=/vacacion|verano|navidad|semana santa/i.test(title);
    const event={enabled:true,source:'management',sourceTable:type==='closure'?'skbc_calendar_closures':'skbc_public_calendar_events',type:type==='closure'?(vacation?'vacation':'closure'):(row.kind||'event'),kind:type==='closure'?(vacation?'vacation':'holiday'):(row.kind==='course'?'course':'event'),visibility:'public',start,end,color:type==='closure'?(vacation?'#996019':'#b83232'):(/^#[0-9a-f]{6}$/i.test(row.color||'')?row.color:'#216aa5'),location:row.location||'SKBC GIPUZKOA',appliesTo:row.applies_to||'all',dates:[],repeat:{enabled:false,start,until:end,everyDays:15},languages:{es:{title,description},eu:{title,description},en:{title,description}}};
    event.sourceKey=row.id?`${type}:${row.id}`:`${type}-calendar:${fingerprint(event)}`;
    event.sourceAliases=[event.sourceKey,`${type}-calendar:${fingerprint(event)}`];
    event.managementOriginal={start,end};
    return event;
  }
  function closures(rows){
    const result=[];
    for(const row of rows){
      if(row.active===false)continue;
      const next=base(row,'closure');
      const matches=result.filter(previous=>normalize(previous.languages.es.title)===normalize(next.languages.es.title)&&previous.appliesTo===next.appliesTo&&previous.start<=next.end&&previous.end>=next.start);
      for(const previous of matches){next.start=previous.start<next.start?previous.start:next.start;next.end=previous.end>next.end?previous.end:next.end;next.sourceAliases.push(...previous.sourceAliases);result.splice(result.indexOf(previous),1);}
      next.repeat.start=next.start;next.repeat.until=next.end;next.managementOriginal={start:next.start,end:next.end};
      const canonical=`closure-calendar:${fingerprint(next)}`;next.sourceAliases=[...new Set([...next.sourceAliases,canonical])];if(!row.id)next.sourceKey=canonical;
      result.push(next);
    }
    return result.sort((a,b)=>a.start.localeCompare(b.start));
  }
  function publicEvents(rows){return rows.filter(row=>row.active!==false&&row.visibility==='public').map(row=>base(row,'public'));}
  function merge(current,incoming,{authoritativeTables=[]}={}){
    const result=clone(current);
    const seen=new Set();
    for(const next of incoming){
      const aliases=new Set([next.sourceKey,...next.sourceAliases||[]]);
      let index=result.findIndex((previous,index)=>!seen.has(index)&&previous.source==='management'&&[previous.sourceKey,...previous.sourceAliases||[]].some(key=>aliases.has(key)));
      if(index<0)index=result.findIndex((previous,index)=>!seen.has(index)&&fingerprint(previous)===fingerprint(next)&&!previous.repeat?.enabled&&!(previous.dates||[]).length);
      if(index<0){seen.add(result.length);result.push(clone(next));continue;}
      seen.add(index);
      const previous=result[index],updated={...clone(previous),...clone(next),languages:clone(previous.languages||next.languages),color:previous.color||next.color,enabled:previous.enabled!==false,sourceAliases:[...new Set([...next.sourceAliases||[],...previous.sourceAliases||[],previous.sourceKey].filter(Boolean))]};
      if(previous.managementDateOverride){for(const field of ['start','end','repeat','dates','excludedDates'])if(previous[field]!==undefined)updated[field]=clone(previous[field]);updated.managementDateOverride=true;}
      if(previous.managementUnavailable)updated.enabled=true;
      delete updated.managementUnavailable;
      result[index]=updated;
    }
    result.forEach((event,index)=>{
      if(event.source==='management'&&authoritativeTables.includes(event.sourceTable)&&!seen.has(index)){
        event.enabled=false;event.managementUnavailable=true;
      }
    });
    return result;
  }
  window.SKBC_CALENDAR_IMPORT={closures,publicEvents,merge};
})();
