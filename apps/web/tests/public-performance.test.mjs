import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('public logos use bounded responsive delivery files, not the oversized original',()=>{
  const logo=read('../src/app/components/marketing-logo.tsx');
  assert.match(logo,/srcSet=/);assert.doesNotMatch(logo,/logo-full\.png/);
  for(const width of [480,960])assert.ok(statSync(new URL(`../public/images/optimized/brand-${width}.webp`,import.meta.url)).size<40000);
  assert.doesNotMatch(read('../src/app/components/city-marketing.tsx'),/logo-full\.png/);
  assert.match(read('../src/app/components/marketing-footer.tsx'),/<MarketingLogo/);
});
test('only near-viewport carousel images load, with responsive modern formats and low priority',()=>{
  const source=read('../src/app/components/city-orbit.tsx');
  for(const pattern of [/IntersectionObserver/,/rootMargin:'200px'/,/photo && imagesEnabled/,/srcSet=/,/loading="lazy"/,/fetchPriority="low"/])assert.match(source,pattern);
  const photos=JSON.parse(read('../src/app/lib/city-photos.json'));
  for(const photo of photos)for(const width of [480,960])assert.ok(statSync(new URL(`../public/images/optimized/city-${photo.key}-${width}.webp`,import.meta.url)).size>0);
});
test('homepage hero has art-directed mobile images and responsive preload; portal CSS is route-scoped',()=>{
  const hero=read('../src/app/components/city-marketing.tsx');
  assert.match(hero,/<source media="\(max-width: 700px\)"/);
  assert.match(hero,/imageSrcSet=\{imageSet/);assert.match(hero,/fetchPriority=.*high/);
  const root=read('../src/app/layout.tsx');
  assert.doesNotMatch(root,/network-lounge\.css|partner-chat\.css|admin-network-overview\.css|mailings\.css/);
  assert.match(read('../src/app/portal/layout.tsx'),/portal-ui\.css/);
  assert.match(read('../src/app/components/network-auth-brand.tsx'),/portal-ui\.css/);
});
