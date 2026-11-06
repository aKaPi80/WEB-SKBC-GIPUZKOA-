import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{},Date,Intl,Set,Map};
vm.runInNewContext(fs.readFileSync(new URL('../admin-calendar.js',import.meta.url),'utf8'),context);
const api=context.window.SKBC_ADMIN_CALENDAR;
const plain=value=>JSON.parse(JSON.stringify(value));
test('ranges include every day across years without changing existing records',()=>{
 const event={start:'2026-12-30',end:'2027-01-02'};
 assert.deepEqual(plain(api.dates(event)),['2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
 assert.equal(event.end,'2027-01-02');
});
test('repeat uses calendar days across DST and respects exclusions and additional dates',()=>{
 assert.deepEqual(plain(api.dates({start:'2027-03-20',repeat:{enabled:true,start:'2027-03-20',until:'2027-04-03',everyDays:7},dates:['2027-03-22'],excludedDates:['2027-03-27']})),['2027-03-20','2027-03-22','2027-04-03']);
});
test('saving validates dates and preserves translations and management metadata without mutation',()=>{
 const original={start:'2027-01-01',end:'2027-01-01',source:'management',sourceId:'abc',languages:{es:{title:'Viejo'},eu:{title:'Zaharra'}}};
 assert.throws(()=>api.prepare(original,{title:'Curso',start:'2027-02-03',end:'2027-02-01'}));
 assert.throws(()=>api.prepare(original,{title:'',start:'2027-02-01',end:'2027-02-01'}));
 assert.throws(()=>api.prepare(original,{title:'Curso',start:'2027-02-30',end:'2027-03-01'}));
 const saved=api.prepare(original,{title:'Curso',start:'2027-02-01',end:'2027-02-03',kind:'course'});
 assert.equal(saved.sourceId,'abc');assert.equal(saved.languages.eu.title,'Zaharra');assert.equal(original.languages.es.title,'Viejo');assert.equal(saved.languages.es.title,'Curso');
});
test('new events inherit Spanish text when optional translations are blank',()=>{
 const saved=api.prepare({}, {title:'Festivo',description:'Sin clase',start:'2027-01-06',end:'2027-01-06',title_eu:'',description_eu:'',title_en:'Holiday',description_en:''});
 assert.equal(saved.languages.eu.title,'Festivo');assert.equal(saved.languages.eu.description,'Sin clase');assert.equal(saved.languages.en.title,'Holiday');
});
