import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
async function tools(){const box={window:{}};vm.runInNewContext(await readFile(new URL('../admin-editor-tools.js',import.meta.url),'utf8'),box);return box.window.SKBC_EDITOR_TOOLS;}
test('summary detects text, photo and news additions without modifying the content',async()=>{
  const api=await tools();const base={settings:{images:{hero:'old.jpg'},news:[]},languages:{es:{hero:{title:'Antes'}}}};
  const current=structuredClone(base);current.settings.images.hero='new.jpg';current.languages.es.hero.title='Después';current.settings.news.push({languages:{es:{title:'Curso'}}});
  const changes=api.summarize(base,current,[{path:['settings','images','hero'],label:'Foto principal'},{path:['languages','es','hero','title'],label:'Título principal · Español'}]);
  assert.equal(changes.length,3);assert.ok(changes.some(c=>c.label==='Foto principal'));assert.ok(changes.some(c=>/Noticias.*añadida/.test(c.label)));
  assert.equal(base.settings.images.hero,'old.jpg');assert.equal(api.summarize(base,structuredClone(base)).length,0);
});
test('deleting one news item is one deletion, not edits to shifted records',async()=>{
  const api=await tools();const base={settings:{news:[{title:'A'},{title:'B'},{title:'C'}]}};const current={settings:{news:[{title:'B'},{title:'C'}]}};
  const changes=api.summarize(base,current);assert.equal(changes.length,1);assert.match(changes[0].label,/1 eliminada/);
});
test('scheduled pink ribbon remains visibly explained when manual activation is off',async()=>{
  const api=await tools();const settings={specialVisual:{mode:'autumn',breastCancer:false,mourning:true,schedule:[{mode:'breastCancer',enabled:true,start:'2026-10-01',end:'2026-10-31'}]}};
  const pink=api.effectState(settings,'2026-10-28').find(effect=>effect.mode==='breastCancer');
  assert.equal(pink.active,true);assert.equal(pink.manual,false);assert.equal(pink.schedules[0].index,0);assert.equal(pink.schedules[0].end,'2026-10-31');
  assert.equal(api.effectState(settings,'2026-11-01').find(effect=>effect.mode==='breastCancer').active,false);
});
test('seasonal priority matches first active schedule and paused schedules do not apply',async()=>{
  const api=await tools();const settings={specialVisual:{mode:'autumn',schedule:[{enabled:false,mode:'christmas',start:'2026-10-01',end:'2026-10-31'},{mode:'carnival',start:'2026-10-01',end:'2026-10-31'}]}};
  const states=api.effectState(settings,'2026-10-28');assert.equal(states.find(e=>e.mode==='autumn').active,false);assert.equal(states.find(e=>e.mode==='carnival').active,true);
});
test('preview inventory selects the requested language in news and events as well as page text',async()=>{
  const api=await tools();const content={settings:{news:[{languages:{es:{title:'Curso'},eu:{title:'Curso'}}}],events:[{languages:{es:{title:'Curso'},eu:{title:'Curso'}}}]}};
  const fields=[];for(const kind of ['news','events'])for(const lang of ['es','eu'])fields.push({path:['settings',kind,0,'languages',lang,'title'],type:'input',label:lang});
  const result=api.previewFields(fields,content,'eu');assert.equal(result.length,2);assert.ok(result.every(field=>field.path[4]==='eu'));
});
