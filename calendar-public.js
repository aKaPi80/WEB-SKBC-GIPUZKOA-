(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy={
    es:{calendar:'Calendario',official:'oficial',provisional:'provisional',view:'Ver calendario',notice:'Fechas provisionales, sujetas a cambios.',confirmed:'Calendario oficial del club.',back:'Volver a la web',print:'Imprimir / guardar PDF',year:'Año',go:'Ver',events:'Eventos y actividades',empty:'Sin eventos programados.',week:['L','M','X','J','V','S','D']},
    eu:{calendar:'Egutegi',official:'ofiziala',provisional:'behin-behinekoa',view:'Ikusi egutegi',notice:'Behin-behineko datak; aldaketak egon daitezke.',confirmed:'Klubaren egutegi ofiziala.',back:'Webgunera itzuli',print:'Inprimatu / PDF gorde',year:'Urtea',go:'Ikusi',events:'Ekitaldiak eta jarduerak',empty:'Ez dago programatutako ekitaldirik.',week:['Al','Ar','Az','Og','Or','Lr','Ig']},
    en:{calendar:'Calendar',official:'official',provisional:'provisional',view:'View calendar',notice:'Provisional dates, subject to change.',confirmed:'Official club calendar.',back:'Back to website',print:'Print / save PDF',year:'Year',go:'View',events:'Events and activities',empty:'No scheduled events.',week:['M','T','W','T','F','S','S']}
  };
  const language=lang=>copy[lang]?lang:'es';
  const yearValue=value=>Number.isInteger(Number(value))&&Number(value)>=2000&&Number(value)<=2100?Number(value):new Date().getFullYear();
  function parse(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?date:null;}
  function status(settings,year){const stored=settings.calendarPublication?.years?.[year];return stored==='official'?'official':stored==='provisional'?'provisional':Number(year)<=new Date().getFullYear()?'official':'provisional';}
  function buttonLabel(settings,year,lang='es'){const c=copy[language(lang)],s=status(settings,year);return lang==='en'?`View ${c[s]} calendar ${year}`:`${c.view} ${c[s]} ${year}`;}
  function link(year,lang='es'){return `calendario.html?year=${yearValue(year)}&lang=${language(lang)}`;}
  function dates(event,year){
    year=yearValue(year);const result=[],extra=new Set(event.dates||[]),excluded=new Set(event.excludedDates||[]),repeating=event.repeat?.enabled;
    const start=parse(repeating?(event.repeat.start||event.start):event.start),end=parse(repeating?(event.repeat.until||event.end||event.start):(event.end||event.start));
    const step=Math.max(1,Math.floor(Number(event.repeat?.everyDays)||15));
    for(let date=new Date(Date.UTC(year,0,1,12));date.getUTCFullYear()===year;date.setUTCDate(date.getUTCDate()+1)){
      const key=date.toISOString().slice(0,10);if(excluded.has(key))continue;
      if(extra.has(key)||(start&&end&&date>=start&&date<=end&&(!repeating||Math.round((date-start)/86400000)%step===0)))result.push(key);
    }
    return result;
  }
  const visible=event=>event.enabled!==false&&event.enabled!=='false'&&(!event.visibility||event.visibility==='public');
  function eventsForYear(events,year){return events.filter(event=>visible(event)&&dates(event,year).length).sort((a,b)=>dates(a,year)[0].localeCompare(dates(b,year)[0]));}
  function description(value){const text=String(value||'').trim();return /^(descripci[oó]n del evento\.?|event description\.?|ekitaldiaren deskribapena\.?)$/i.test(text)?'':text;}
  function page(settings,year,lang='es'){
    year=yearValue(year);lang=language(lang);const c=copy[lang],state=status(settings,year),events=eventsForYear(settings.events||[],year);
    const indexed=events.map((event,index)=>({event,index:index+1,days:new Set(dates(event,year))}));
    const text=event=>{const local=event.languages?.[lang]||{},fallback=event.languages?.es||{};return {title:local.title||fallback.title||c.calendar};};
    const dateLabel=value=>new Intl.DateTimeFormat(lang==='eu'?'eu-ES':lang,{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(parse(value));
    function dateSummary(event,selected){
      if(!event.repeat?.enabled&&!(event.dates||[]).length&&!(event.excludedDates||[]).length&&parse(event.start))return dateLabel(event.start)+(event.end&&event.end!==event.start?' – '+dateLabel(event.end):'');
      const groups=[];for(const value of selected){const last=groups.at(-1);if(last&&parse(value)-parse(last[1])===86400000)last[1]=value;else groups.push([value,value]);}
      return groups.map(([start,end])=>dateLabel(start)+(end!==start?' – '+dateLabel(end):'')).join(', ');
    }
    const color=event=>/^#[0-9a-f]{6}$/i.test(event.color||'')?event.color:'#216aa5';
    const years=new Set([new Date().getFullYear(),new Date().getFullYear()+1,year]);
    for(const event of settings.events||[]){if(!visible(event))continue;for(const value of [event.start,event.end,event.repeat?.start,event.repeat?.until,...event.dates||[]])if(parse(value))years.add(Number(value.slice(0,4)));}
    const months=Array.from({length:12},(_,m)=>{
      const first=new Date(Date.UTC(year,m,1,12)),offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(year,m+1,0)).getUTCDate();let cells='<span class="pub-day pub-empty" aria-hidden="true"></span>'.repeat(offset);
      for(let day=1;day<=count;day++){
        const key=`${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,items=indexed.filter(item=>item.days.has(key));
        cells+=`<div class="pub-day"><strong>${day}</strong><div class="pub-markers">${items.map(item=>`<span style="--event-color:${color(item.event)}" title="${esc(text(item.event).title)}" aria-label="${esc(text(item.event).title)}">${item.index}</span>`).join('')}</div></div>`;
      }
      return `<section class="pub-month"><h2>${esc(new Intl.DateTimeFormat(lang==='eu'?'eu-ES':lang,{month:'long',timeZone:'UTC'}).format(first))}</h2><div class="pub-week">${c.week.map(day=>`<span>${day}</span>`).join('')}</div><div class="pub-days">${cells}</div></section>`;
    }).join('');
    const printTitle = `<div class="pub-print-heading">
      <img src="assets/logo-skbc.png" alt="SKBC Gipuzkoa">
      <div><p>SKBC GIPUZKOA · TOLOSA</p><h1>${c.calendar} ${year}</h1><span>${c[state]}</span></div>
      <div class="pub-print-japan"><span lang="ja">少林寺拳法</span><small>SHORINJI KEMPO</small></div>
    </div>`;
    const printLegend = `<section class="pub-print-legend"><h2>${c.events}</h2><ol>${indexed.map(({event,index})=>`<li><span class="pub-number" style="--event-color:${color(event)}">${index}</span><span>${esc(text(event).title)}</span></li>`).join('')||`<li>${c.empty}</li>`}</ol></section>`;
    return `<header class="pub-header"><a href="./?lang=${lang}#calendario" class="pub-brand"><img src="assets/logo-skbc.png" alt="SKBC Gipuzkoa"><span>SKBC GIPUZKOA</span></a><div class="pub-actions"><a href="./?lang=${lang}#calendario">${c.back}</a><button type="button" data-public-print>${c.print}</button></div></header><main>${printTitle}<div class="pub-heading"><div><p class="pub-status ${state}">${c[state]}</p><h1>${c.calendar} ${c[state]} ${year}</h1><p>${state==='provisional'?c.notice:c.confirmed}</p></div><div class="pub-controls"><form method="get" action="calendario.html"><label>${c.year}<select name="year">${[...years].filter(y=>y>=2000&&y<=2100).sort().map(y=>`<option ${year===y?'selected':''}>${y}</option>`).join('')}</select></label><input type="hidden" name="lang" value="${lang}"><button>${c.go}</button></form><nav aria-label="${lang==='es'?'Idioma':lang==='eu'?'Hizkuntza':'Language'}">${['es','eu','en'].map(l=>`<a href="${link(year,l)}" ${l===lang?'aria-current="page"':''}>${l.toUpperCase()}</a>`).join('')}</nav></div></div><div class="pub-calendar">${months}</div>${printLegend}<section class="pub-event-section"><h2>${c.events}</h2><ol class="pub-events">${indexed.map(({event,index,days})=>{const selected=[...days];return `<li style="--event-color:${color(event)}"><span class="pub-number">${index}</span><div><h3>${esc(text(event).title)}</h3><p>${dateSummary(event,selected)}</p>${event.location?`<p>${esc(event.location)}</p>`:''}</div></li>`;}).join('')||`<li>${c.empty}</li>`}</ol></section></main>`;
  }
  window.SKBC_PUBLIC_CALENDAR={status,buttonLabel,link,dates,eventsForYear,description,page};
  if(typeof document!=='undefined'&&document.body?.hasAttribute('data-public-calendar')){
    const params=new URLSearchParams(location.search),year=yearValue(params.get('year')),lang=language(params.get('lang'));
    document.documentElement.lang=lang;document.title=`${copy[lang].calendar} ${copy[lang][status(window.SKBC_CONTENT.settings,year)]} ${year} · SKBC Gipuzkoa`;
    document.querySelector('#public-calendar').innerHTML=page(window.SKBC_CONTENT.settings,year,lang);
    document.querySelector('[data-public-print]').onclick=()=>window.print();
  }
})();
