import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('preview blocks writes and private reads, and omits credentials on the public catalog read',async()=>{
  const calls=[];
  const box={URL,Response,parent:{postMessage(){}},document:{baseURI:'https://example.com/',currentScript:{src:'https://example.com/admin-preview-bridge.js?token=test&parentOrigin=https%3A%2F%2Fexample.com',nonce:'test'},addEventListener(){}},window:{fetch:async(...args)=>{calls.push(args);return new Response('[]');},addEventListener(){}}};
  vm.runInNewContext(await readFile(new URL('../admin-preview-bridge.js',import.meta.url),'utf8'),box);
  assert.equal((await box.window.fetch('https://example.com/api/publish',{method:'POST',body:'{}'})).status,403);
  assert.equal((await box.window.fetch('https://example.com/auth/v1/user')).status,403);
  assert.equal(calls.length,0);
  assert.equal((await box.window.fetch('https://example.com/rest/v1/skbc_merch_catalog_public',{credentials:'include'})).status,200);
  assert.equal(calls.length,1);assert.equal(calls[0][1].credentials,'omit');
});
