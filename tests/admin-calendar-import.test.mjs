import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c={window:{},Date,Set,Map};vm.runInNewContext(fs.readFileSync(new URL('../admin-calendar-import.js',import.meta.url),'utf8'),c);const api=c.window.SKBC_CALENDAR_IMPORT;
const plain=x=>JSON.parse(JSON.stringify(x));
test('closure import coalesces duplicates and overlapping same-name closures, excluding notes',()=>{
 const rows=[{title:'Navidad 2027',starts_on:'2027-12-23',ends_on:'2028-01-06',applies_to:'all',notes:'PRIVATE'}, {title:'Navidad 2027',starts_on:'2027-12-24',ends_on:'2028-01-06',applies_to:'all'}, {title:'Navidad 2027',starts_on:'2027-12-23',ends_on:'2028-01-06',applies_to:'all'}];
 const events=api.closures(rows);assert.equal(events.length,1);assert.equal(events[0].start,'2027-12-23');assert.equal(events[0].end,'2028-01-06');assert.ok(!JSON.stringify(events).includes('PRIVATE'));assert.equal(events[0].languages.en.title,'Navidad 2027');
 assert.equal(api.closures([{...rows[0],active:false}]).length,0);
 assert.throws(()=>api.closures([{...rows[0],starts_on:'2027-02-30'}]));
});
test('merging imports is idempotent and preserves manual events, translations and local date moves',()=>{
 const manual={start:'2027-01-01',end:'2027-01-01',languages:{es:{title:'Curso'}}};const imports=api.closures([{title:'Festivo',starts_on:'2027-05-01',ends_on:'2027-05-01'}]);
 const first=api.merge([manual],imports);assert.equal(first.length,2);assert.deepEqual(plain(api.merge(first,imports)),plain(first));assert.equal(manual.source,undefined);
 first[1].start='2027-05-03';first[1].end='2027-05-03';first[1].managementDateOverride=true;first[1].languages.eu.title='Jaieguna';
 const next=api.merge(first,imports);assert.equal(next.length,2);assert.equal(next[1].start,'2027-05-03');assert.equal(next[1].languages.eu.title,'Jaieguna');
});
test('matching manual events are linked without duplication and private events never import',()=>{
 const incoming=api.closures([{title:'Festivo',starts_on:'2027-05-01',ends_on:'2027-05-01'}]);
 const linked=api.merge([{start:'2027-05-01',end:'2027-05-01',languages:{es:{title:'Festivo'},eu:{title:'Jaieguna'}}}],incoming);
 assert.equal(linked.length,1);assert.equal(linked[0].source,'management');assert.equal(linked[0].languages.eu.title,'Jaieguna');
 assert.equal(api.publicEvents([{visibility:'private',active:true,starts_on:'2027-01-01',title:'PRIVATE'}]).length,0);
});
test('authoritative reimport disables removed or newly private records only for successfully read sources',()=>{
 const existing=[{source:'management',sourceTable:'skbc_public_calendar_events',sourceKey:'public:1',enabled:true,start:'2027-01-01',end:'2027-01-01',languages:{es:{title:'Event'}}},{source:'management',sourceTable:'skbc_calendar_closures',sourceKey:'closure:1',enabled:true,languages:{es:{title:'Closure'}}}];
 const result=api.merge(existing,[],{authoritativeTables:['skbc_public_calendar_events']});
 assert.equal(result[0].enabled,false);assert.equal(result[1].enabled,true);assert.equal(existing[0].enabled,true);
});
test('a previously coalesced closure can split into two separate source periods',()=>{
 const first=api.closures([{id:'a',title:'Cierre',starts_on:'2027-01-01',ends_on:'2027-01-03'},{id:'b',title:'Cierre',starts_on:'2027-01-02',ends_on:'2027-01-04'}]);
 const split=api.closures([{id:'a',title:'Cierre',starts_on:'2027-01-01',ends_on:'2027-01-03'},{id:'b',title:'Cierre',starts_on:'2027-01-07',ends_on:'2027-01-08'}]);
 const result=api.merge(first,split,{authoritativeTables:['skbc_calendar_closures']});assert.equal(result.length,2);assert.equal(result[0].start,'2027-01-01');assert.equal(result[1].start,'2027-01-07');
});
