import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../admin.js',import.meta.url),'utf8');
const classifier=source.slice(source.indexOf('function isImageField('),source.indexOf('function positionPathForImagePath('));
test('contrast and other non-image controls never become image upload fields',()=>{
  const box={};vm.runInNewContext(classifier,box);
  assert.equal(box.isImageField('Contraste de la foto principal',['settings','theme','heroOverlay'],'overlay'),false);
  assert.equal(box.isImageField('Galería de imágenes',['settings','gallery'],'galleryImages'),false);
  assert.equal(box.isImageField('Mostrar logo',['settings','showLogo'],'booleanText'),false);
});
test('actual image inputs retain upload and preview support',()=>{
  const box={};vm.runInNewContext(classifier,box);
  assert.equal(box.isImageField('Foto principal',['settings','images','hero'],'input'),true);
  assert.equal(box.isImageField('Imagen de la noticia',['settings','news',0,'image'],'input'),true);
  assert.equal(box.isImageField('Título',['languages','es','hero','title'],'input'),false);
});
