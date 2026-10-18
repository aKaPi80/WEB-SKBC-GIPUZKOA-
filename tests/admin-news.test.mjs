import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
async function setup(items=[]) {
  const box={window:{},structuredClone,Date};
  vm.runInNewContext(await readFile(new URL('../admin-news.js',import.meta.url),'utf8'),box);
  let changes=0;
  const store=box.window.SKBC_ADMIN_NEWS.createStore(()=>items,()=>changes++);
  return {store,items,changes:()=>changes};
}
test('repeated new-news clicks create no records and cancel creates nothing',async()=>{
  const {store,items,changes}=await setup();
  store.start();store.start();store.start();
  assert.equal(items.length,0);assert.equal(changes(),0);
  store.cancel();assert.equal(items.length,0);
});
test('blank drafts cannot save; saving a valid draft creates exactly one record',async()=>{
  const {store,items,changes}=await setup();store.start();
  assert.throws(()=>store.save(),/título/);
  store.draft.languages.es.title='Curso del club';store.draft.languages.es.text='Información';
  store.save();assert.equal(items.length,1);assert.equal(changes(),1);
  assert.equal(store.hasDraft(),false);assert.equal(items[0].languages.es.title,'Curso del club');
});
test('editing and canceling preserve original data including translations and metadata',async()=>{
  const original={enabled:false,date:'2026-10-18',metadata:{source:'manual'},languages:{es:{title:'Original',text:'Texto'},eu:{title:'Euskera',text:'Testua'}}};
  const {store,items}=await setup([structuredClone(original)]);store.start(0);store.draft.languages.es.title='Editado';
  assert.equal(store.hasUnsaved(),true);assert.equal(items[0].languages.es.title,'Original');
  store.cancel();assert.deepEqual(items[0],original);
  store.start(0);store.draft.languages.es.title='Guardado';store.save();
  assert.equal(items.length,1);assert.equal(items[0].languages.eu.title,'Euskera');assert.equal(items[0].metadata.source,'manual');
});
test('deletion is undoable without losing neighboring news',async()=>{
  const {store,items}=await setup([{languages:{es:{title:'Uno'}}},{languages:{es:{title:'Dos'}}}]);
  store.remove(0);assert.equal(items.length,1);assert.equal(items[0].languages.es.title,'Dos');
  store.undoDelete();assert.equal(items.length,2);assert.equal(items[0].languages.es.title,'Uno');
});
test('unsafe links cannot enter the saved news list',async()=>{
  const {store,items}=await setup();store.start();store.draft.languages.es.title='Título';store.draft.url='javascript:alert(1)';
  assert.throws(()=>store.save(),/enlace/);assert.equal(items.length,0);
});
test('optional empty translations fall back to Spanish so the public cards are not blank',async()=>{
  const {store,items}=await setup();store.start();store.draft.languages.es={title:'Curso',text:'Información del curso'};store.save();
  assert.equal(items[0].languages.eu.title,'Curso');assert.equal(items[0].languages.en.text,'Información del curso');
});
test('publishing does not submit a news draft before explicit save',async()=>{
  const source=await readFile(new URL('../admin.js',import.meta.url),'utf8');
  const handlerSource=source.slice(source.indexOf('document.querySelector("#publish").addEventListener'),source.indexOf('async function publishWithGithubApi'));
  let handler, notice='';
  vm.runInNewContext(handlerSource,{document:{querySelector:()=>({addEventListener:(_,fn)=>{handler=fn;}})},window:{SKBC_ADMIN_NEWS:{hasDraft:()=>true}},setStatus:message=>{notice=message;}});
  await handler();assert.match(notice,/Guarda la noticia/);
});
