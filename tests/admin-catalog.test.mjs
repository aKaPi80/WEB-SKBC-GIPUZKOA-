import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('live catalog groups dogis, obis and club clothing without repeating products for each size', async () => {
  const box={window:{}};
  vm.runInNewContext(await readFile(new URL('../admin-catalog.js',import.meta.url),'utf8'),box);
  const rows=[{product_id:'gi',product_name:'Dogi',category:'gi',variant_name:'180',sku:'GI-180'}, {product_id:'gi',product_name:'Dogi',category:'gi',variant_name:'190',sku:'GI-190'}, {product_id:'belt',product_name:'Obi',category:'belt',variant_name:'Azul'}, {product_id:'club',product_name:'Camiseta <SKBC>',category:'club'}];
  let requested;
  const products=await box.window.SKBC_ADMIN_CATALOG.load({supabaseUrl:'https://example.com',anonKey:'public'},async url=>{requested=url;return {ok:true,json:async()=>rows};});
  assert.equal(products.length,3);
  assert.equal(products[0].variants.length,2);
  assert.match(requested,/skbc_merch_catalog_public/);
  const html=box.window.SKBC_ADMIN_CATALOG.html(products);
  for(const label of ['Dogis','Obis','Ropa del club','GI-180','GI-190']) assert.ok(html.includes(label));
  assert.match(html,/Camiseta &lt;SKBC&gt;/);
});

test('opening orders with a session automatically loads them',async()=>{
  const source=await readFile(new URL('../admin.js',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('function renderOrders()'),source.indexOf('async function loginOrdersSupabase()'));
  let loads=0;const node={addEventListener(){}};
  vm.runInNewContext(`${fn};renderOrders()`,{document:{querySelector:()=>node},orderInboxConfig:()=>({enabled:true}),renderIntro:()=>'',privateSessionNoticeTemplate:()=>'',bindFields(){},enhanceMobileCollapsers(){},loadOrders:()=>{loads++;},deleteClosedOrders(){},supabaseSession:()=>({access_token:'test'})});
  assert.equal(loads,1);
});
