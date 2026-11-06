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
test('moving a range keeps duration across month, year and DST boundaries',()=>{
 const original={start:'2027-03-27',end:'2027-03-30',source:'management',sourceKey:'closure:1',languages:{es:{title:'Curso'}}};
 const moved=api.move(original,'2027-03-28','2027-04-02');
 assert.equal(moved.start,'2027-04-01');assert.equal(moved.end,'2027-04-04');assert.equal(original.start,'2027-03-27');assert.equal(moved.sourceKey,'closure:1');assert.equal(moved.managementDateOverride,true);
 assert.equal(api.move({start:'2026-12-31',end:'2027-01-02'},'2026-12-31','2027-01-02').end,'2027-01-04');
});
test('moving a series shifts repeat limits, extra days and exclusions together',()=>{
 const moved=api.move({start:'2027-01-05',end:'2027-01-05',repeat:{enabled:true,start:'2027-01-05',until:'2027-02-05',everyDays:7},dates:['2027-01-09'],excludedDates:['2027-01-12']},'2027-01-05','2027-01-07');
 assert.equal(moved.repeat.start,'2027-01-07');assert.equal(moved.repeat.until,'2027-02-07');assert.deepEqual(plain(moved.dates),['2027-01-11']);assert.deepEqual(plain(moved.excludedDates),['2027-01-14']);assert.equal(moved.repeat.everyDays,7);
 assert.throws(()=>api.move({start:'2027-01-05'},'invalid','2027-01-07'));
});
test('saving date changes on an imported event records a local override',()=>{
 const event={source:'management',start:'2027-05-01',end:'2027-05-02',languages:{es:{title:'Curso'}}};
 const saved=api.prepare(event,{title:'Curso',start:'2027-05-03',end:'2027-05-04'});assert.equal(saved.managementDateOverride,true);
});
