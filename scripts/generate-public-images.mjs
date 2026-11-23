// Deterministic delivery variants; preserve approved originals and image credits.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile} from 'node:fs/promises';
const require=createRequire(new URL('../apps/api/package.json',import.meta.url));
const sharp=require('sharp');
const root=new URL('../apps/web/public/',import.meta.url);
const output=new URL('images/optimized/',root);
await mkdir(output,{recursive:true});
const photos=JSON.parse(await readFile(new URL('../apps/web/src/app/lib/city-photos.json',import.meta.url),'utf8'));
for(const width of [480,960])await sharp(fileURLToPath(new URL('images/b2b-matching-logo-full.png',root))).resize({width,withoutEnlargement:true}).webp({lossless:true}).toFile(fileURLToPath(new URL(`brand-${width}.webp`,output)));
for(const photo of photos){
  for(const width of [480,960])await sharp(fileURLToPath(new URL(photo.src.slice(1),root))).resize({width,withoutEnlargement:true}).webp({quality:76}).toFile(fileURLToPath(new URL(`city-${photo.key}-${width}.webp`,output)));
  if(!['bremen','koeln','leverkusen','hamburg','berlin','muenchen'].includes(photo.key))continue;
  for(const width of [640,960])await sharp(fileURLToPath(new URL(photo.src.slice(1),root))).resize(width,Math.round(width*1.65),{fit:'cover',position:'centre'}).webp({quality:78}).toFile(fileURLToPath(new URL(`hero-mobile-${photo.key}-${width}.webp`,output)));
  for(const width of [1280,1920,2400])await sharp(fileURLToPath(new URL(photo.src.slice(1),root))).resize({width,withoutEnlargement:true}).webp({quality:78}).toFile(fileURLToPath(new URL(`hero-${photo.key}-${width}.webp`,output)));
}
console.log('Generated 132 responsive public image variants. Originals and credit metadata unchanged.');
