// Derive installation assets from the existing, approved B2B logo. Never redraw it.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../apps/api/package.json',import.meta.url));
const sharp=require('sharp');
const directory=new URL('../apps/web/public/icons/',import.meta.url);
const source=await sharp(fileURLToPath(new URL('b2b-matching-symbol-brand.png',directory))).trim().png().toBuffer();
for(const [name,size,ratio] of [
  ['pwa-192.png',192,.8],
  ['pwa-512.png',512,.8],
  ['pwa-maskable-512.png',512,.56],
  ['apple-touch-icon-180.png',180,.78],
]) {
  const extent=Math.round(size*ratio);
  const logo=await sharp(source).resize(extent,extent,{fit:'inside'}).png().toBuffer();
  await sharp({create:{width:size,height:size,channels:3,background:'#ffffff'}})
    .composite([{input:logo,gravity:'centre'}]).removeAlpha().png()
    .toFile(fileURLToPath(new URL(name,directory)));
  console.log(`${name}: ${size} × ${size}, approved original logo on white`);
}
