import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import sharp from 'sharp';

export function publicAddress(address:string):boolean {
  try { return ipaddr.process(address).range()==='unicast'; } catch { return false; }
}
export function publicWebsiteUrl(value:string):URL {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||isIP(url.hostname.replace(/[\[\]]/g,''))||!url.hostname.includes('.')||/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)) throw new Error('Public HTTPS URL required');
  return url;
}
/** No cookies, credentials, proxy, JavaScript or browser execution. All DNS
 * answers and every redirect are checked; the socket is pinned to that answer.
 */
export async function readPublicResource(value:string,maxBytes:number,redirects=0):Promise<{bytes:Buffer;type:string;url:string}> {
  const url=publicWebsiteUrl(value);
  if(redirects>3) throw new Error('Too many redirects');
  let dnsTimer:ReturnType<typeof setTimeout>|undefined;
  const answers=await Promise.race([lookup(url.hostname,{all:true}),new Promise<never>((_,reject)=>{dnsTimer=setTimeout(()=>reject(new Error('DNS timeout')),4000);})]).finally(()=>clearTimeout(dnsTimer));
  if(!answers.length||answers.some(a=>!publicAddress(a.address))) throw new Error('Private network target blocked');
  const selected=answers.find(a=>a.family===4)||answers[0];
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{req.destroy(new Error('Website timeout'));},7000);
    const req=request(url,{method:'GET',agent:false,headers:{'user-agent':'PagePilotAI/1.0 (company profile preparation)','accept-encoding':'identity'},
      lookup:((_host:any,options:any,cb:any)=>options?.all?cb(null,[selected]):cb(null,selected.address,selected.family)) as any},response=>{
      const status=response.statusCode||0;
      if([301,302,303,307,308].includes(status)&&response.headers.location){
        response.resume();clearTimeout(timer);
        readPublicResource(new URL(response.headers.location,url).href,maxBytes,redirects+1).then(resolve,reject);return;
      }
      if(status!==200 || Number(response.headers['content-length']||0)>maxBytes || (response.headers['content-encoding'] && response.headers['content-encoding']!=='identity')) {
        response.resume();clearTimeout(timer);reject(new Error('Unsupported website response'));return;
      }
      let size=0;const chunks:Buffer[]=[];
      response.on('data',chunk=>{size+=chunk.length;if(size>maxBytes)req.destroy(new Error('Resource too large'));else chunks.push(Buffer.from(chunk));});
      response.on('error',error=>{clearTimeout(timer);reject(error);});
      response.on('aborted',()=>{clearTimeout(timer);reject(new Error('Incomplete resource'));});
      response.on('end',()=>{clearTimeout(timer);resolve({bytes:Buffer.concat(chunks),type:String(response.headers['content-type']||'').split(';')[0].toLowerCase(),url:url.href});});
    });
    req.on('error',error=>{clearTimeout(timer);reject(error);});req.end();
  });
}
function decode(value:string){return value.replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g,s=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '}[s]||s)).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,s)=>{const n=s[0].toLowerCase()==='x'?parseInt(s.slice(1),16):Number(s);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';});}
function attributes(tag:string){return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),decode(m[2]??m[3]??m[4]??'')]));}
export function extractWebsite(html:string,base:string){
  const links:string[]=[],logos:string[]=[],heroes:string[]=[],pictures:string[]=[];
  const absolute=(value:string)=>{try{return publicWebsiteUrl(new URL(value,base).href).href;}catch{return '';}};
  for(const tag of html.match(/<(?:meta|img|link|a)\b[^>]*>/gi)||[]){
    const a=attributes(tag);
    if(/^<meta/i.test(tag)&&/^(og:image|twitter:image)$/.test(a.property||a.name))heroes.push(absolute(a.content));
    if(/^<img/i.test(tag)){
      const src=absolute(a['data-src']||a.src||a.srcset?.split(',').at(-1)?.trim().split(/\s+/)[0]||'');const hint=[a.alt,a.class,a.id,a.src].join(' ');
      if(/logo|brand/i.test(hint))logos.push(src);
      else if(/hero|banner|header|cover|titel/i.test(hint)||Number(a.width)>=1000)heroes.push(src);
      else if(!Number(a.width)||Number(a.width)>=600)pictures.push(src);
    }
    if(/^<link/i.test(tag)&&/icon/i.test(a.rel||''))logos.push(absolute(a.href));
    if(/^<a/i.test(tag)&&a.href&&/leistungen|services|angebote|products|produkte|kontakt|contact|über-uns|ueber-uns|about|impressum/i.test(a.href)){
      const target=absolute(a.href);if(target&&new URL(target).hostname===new URL(base).hostname)links.push(target);
    }
  }
  for(const match of html.matchAll(/background(?:-image)?\s*:[^;{}<>]*url\(\s*["']?([^"')\s]+)["']?\s*\)/gi))heroes.push(absolute(match[1]));
  for(const script of html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)||[]){
    try{const data=JSON.parse(script.replace(/^[\s\S]*?>/,'').replace(/<\/script>$/i,''));
      const walk=(v:any,depth=0)=>{if(!v||typeof v!=='object'||depth>8)return;if(v.logo)logos.push(absolute(typeof v.logo==='string'?v.logo:v.logo.url||''));for(const child of Object.values(v))walk(child,depth+1);};walk(data);
    }catch{}
  }
  const text=decode(html.replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).slice(0,18000);
  const colors=[...html.matchAll(/(?:theme-color["'][^>]*content=["']|(?:--[\w-]*(?:primary|brand)[\w-]*|background-color)\s*:\s*)(#[0-9a-f]{6})/gi)].map(m=>m[1]);
  return {text,links:[...new Set(links)].slice(0,4),logos:[...new Set(logos.filter(Boolean))].slice(0,4),heroes:[...new Set([...heroes,...pictures].filter(Boolean))].slice(0,4),colors:[...new Set(colors)].slice(0,2)};
}
export class CompanyWebsiteReader {
  async read(website:string){
    const first=await readPublicResource(website,1_500_000);
    const domain=new URL(website).hostname.replace(/^www\./,'');
    if(new URL(first.url).hostname.replace(/^www\./,'')!==domain)throw new Error('Homepage redirected to another company domain');
    if(!['text/html','application/xhtml+xml'].includes(first.type))throw new Error('No HTML homepage');
    const home=extractWebsite(first.bytes.toString('utf8'),first.url);
    const pages=await Promise.all(home.links.slice(0,3).map(async link=>{
      try{const r=await readPublicResource(link,1_000_000);return new URL(r.url).hostname.replace(/^www\./,'')===domain&&['text/html','application/xhtml+xml'].includes(r.type)?{url:r.url,...extractWebsite(r.bytes.toString('utf8'),r.url)}:null;}catch{return null;}
    }));
    return {home, pages:[{url:first.url,...home},...pages.filter((p):p is NonNullable<typeof p>=>!!p)]};
  }
  async image(candidates:string[],kind:'logo'|'hero'){
    for(const url of candidates.slice(0,3)){
      try{
        const resource=await readPublicResource(url,4_000_000);
        // SVGs with active or external references are rejected before rasterizing.
        if(resource.type==='image/svg+xml'){
          const svg=resource.bytes.toString('utf8');
          if(/<!DOCTYPE|<!ENTITY|<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?!#)|url\(\s*(?!#)|@import/i.test(svg))continue;
        }else if(!['image/png','image/jpeg','image/webp','image/avif','image/gif','image/x-icon','image/vnd.microsoft.icon'].includes(resource.type))continue;
        const image=sharp(resource.bytes,{limitInputPixels:20_000_000,failOn:'warning'}).timeout({seconds:4});
        const meta=await image.metadata();
        if(kind==='hero'&&((meta.width||0)<600||(meta.height||0)<160))continue;
        const bytes=await image.rotate().resize({width:kind==='logo'?600:1920,height:kind==='logo'?300:1080,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();
        if(bytes.length>1_400_000)continue;
        return {dataUrl:'data:image/webp;base64,'+bytes.toString('base64'),source:url};
      }catch{}
    }
    return null;
  }
}
