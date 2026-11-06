import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const context={window:{},Date,Intl,Set,Map};vm.runInNewContext(fs.readFileSync(new URL('../calendar-public.js',import.meta.url),'utf8'),context);const api=context.window.SKBC_PUBLIC_CALENDAR;const plain=x=>JSON.parse(JSON.stringify(x));
test('2027 stays provisional until explicitly approved and all languages follow the stored status',()=>{
 const settings={calendarPublication:{years:{2026:'official',2027:'provisional'}}};assert.equal(api.status(settings,2027),'provisional');assert.equal(api.buttonLabel(settings,2027,'es'),'Ver calendario provisional 2027');settings.calendarPublication.years[2027]='official';assert.equal(api.buttonLabel(settings,2027,'es'),'Ver calendario oficial 2027');assert.match(api.buttonLabel(settings,2027,'en'),/official/);assert.match(api.buttonLabel(settings,2027,'eu'),/ofiziala/);
});
test('public calendar filters private/disabled events, handles cross-year ranges and repeats',()=>{
 const events=[{start:'2026-12-24',end:'2027-01-06',languages:{es:{title:'Navidad'}}},{enabled:false,start:'2027-01-01'},{visibility:'private',start:'2027-01-01'},{start:'2026-01-01',end:'2026-01-02'}];assert.equal(api.eventsForYear(events,2027).length,1);
 const days=api.dates({start:'2027-03-20',repeat:{enabled:true,start:'2027-03-20',until:'2027-04-03',everyDays:7},excludedDates:['2027-03-27']},2027);assert.deepEqual(plain(days),['2027-03-20','2027-04-03']);
});
test('public markup escapes event content and omits descriptions, editorial hints and empty placeholders',()=>{
 const settings={events:[{start:'2027-01-01',end:'2027-01-01',languages:{es:{title:'<img src=x onerror=alert(1)>',description:'INTERNAL NOTE'}},location:'<script>secret</script>'}],calendarPublication:{years:{2027:'provisional'}}};
 const html=api.page(settings,2027,'es');assert.ok(!html.includes('INTERNAL NOTE'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<script>secret'));assert.ok(!html.includes('printHint'));assert.ok(html.includes('provisional 2027'));assert.equal(api.description('Descripción del evento.'),'');
});
test('event list does not turn separate repeat dates into a continuous closure and keeps complete cross-year ranges',()=>{
 const html=api.page({events:[{start:'2027-03-20',repeat:{enabled:true,start:'2027-03-20',until:'2027-04-03',everyDays:14},languages:{es:{title:'Serie'}}},{start:'2027-12-23',end:'2028-01-06',languages:{es:{title:'Navidad'}}}]},2027,'es');
 assert.ok(!html.includes('20/03/2027 – 03/04/2027'));assert.ok(html.includes('06/01/2028'));
});
