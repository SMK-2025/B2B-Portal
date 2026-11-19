import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import manifest from '../src/app/manifest.ts';
const publicFile=path=>new URL('../public'+path,import.meta.url);
test('PWA has a stable same-origin identity, standalone mode and actual square installation icons',()=>{
 const app=manifest();
 assert.equal(app.id,'/');assert.equal(app.start_url,'/');assert.equal(app.scope,'/');
 assert.equal(app.display,'standalone');assert.equal(app.prefer_related_applications,false);
 assert.equal(app.theme_color,'#536bdb');
 for(const size of [192,512]) assert.ok(app.icons.some(i=>i.sizes===`${size}x${size}`&&i.purpose==='any'));
 assert.ok(app.icons.some(i=>i.purpose==='maskable'));
 for(const icon of [...app.icons,{src:'/icons/apple-touch-icon-180.png',sizes:'180x180'}]){
  const png=readFileSync(publicFile(icon.src)),[w,h]=icon.sizes.split('x').map(Number);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);assert.equal(w,h);
  assert.equal(png[25],2,'opaque RGB, including maskable/iOS backgrounds');
 }
 const layout=readFileSync(new URL('../src/app/layout.tsx',import.meta.url),'utf8');
 assert.match(layout,/apple-touch-icon-180\.png/);
});
test('service worker only caches the explicit public icon allowlist, never portal or API data',()=>{
 const source=readFileSync(publicFile('/sw.js'),'utf8');
 assert.match(source,/!PUBLIC_ASSETS.includes\(url.pathname\)/);
 assert.match(source,/url.origin !== self.location.origin/);
 const assets=JSON.parse(source.match(/const PUBLIC_ASSETS = (\[[\s\S]*?\]);/)[1].replace(/,\s*\]/,']'));
 for(const path of assets){assert.ok(path.startsWith('/icons/'));assert.ok(readFileSync(publicFile(path)).length>0);}
 assert.ok(assets.includes('/icons/pwa-512.png'));
});
