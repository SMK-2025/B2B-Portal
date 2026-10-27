import {BadRequestException,Body,Controller,Get,Header,Headers,Inject,NotFoundException,ForbiddenException,Param,Post,Req,HttpException} from '@nestjs/common';
import {AuthService} from '../auth/auth.service';
import {PortalStore} from '../core/portal.store';
import {homepageFields,projectHomepage,type HomepageGrant} from './homepage-publication';
import {randomUUID} from 'node:crypto';
type Kind=keyof typeof homepageFields;
@Controller('networks/homepage')
export class HomepagePublicationController {
  private requests=new Map<string,{count:number;until:number}>();
  constructor(@Inject(PortalStore) private readonly store:PortalStore,@Inject(AuthService) private readonly auth:AuthService){}
  private network(slug:string){
    if(slug!=='unternehmerfreunde')throw new NotFoundException();
    const id=this.store.networkBySlug.get(slug),network=id?this.store.networks.get(id):null;
    if(!network||network.status!=='active')throw new NotFoundException();
    return network;
  }
  private manager(auth:string|undefined,networkId:string){const user=this.auth.authenticate(auth);if(user.accountRole!=='platform_admin'&&!this.store.networkMemberships.some(m=>m.networkId===networkId&&m.userId===user.id&&m.status==='active'&&m.role==='network_admin'))throw new ForbiddenException('Nur die Netzwerkleitung verwaltet öffentliche Freigaben.');return user;}
  private records(networkId:string,kind:Kind){return kind==='members'?this.store.networkMemberships.filter(m=>m.networkId===networkId):[...this.store.networkContents.values()].filter(c=>c.networkId===networkId&&c.type==='event');}
  @Get(':slug/feed')
  @Header('Cache-Control','no-store, max-age=0')
  @Header('CDN-Cache-Control','no-store')
  @Header('X-Content-Type-Options','nosniff')
  feed(@Param('slug') slug:string,@Req() req:{ip?:string}){
    const now=Date.now();for(const [ip,bucket] of this.requests)if(bucket.until<now)this.requests.delete(ip);
    const ip=req.ip||'unknown',bucket=this.requests.get(ip)||{count:0,until:now+60000};
    if(this.requests.size>=10000&&!this.requests.has(ip)||++bucket.count>120)throw new HttpException('Zu viele Anfragen.',429);
    this.requests.set(ip,bucket);
    const network=this.network(slug);
    const list=(kind:Kind)=>this.records(network.id,kind).map(record=>projectHomepage(kind,record,'organizationId' in record?this.store.organizations.get(record.organizationId)?.networkProfile:null)).filter(Boolean);
    return {version:1,network:slug,generatedAt:new Date().toISOString(),members:list('members'),events:list('events'),recaps:list('recaps')};
  }
  @Get(':slug/manage')
  @Header('Cache-Control','no-store')
  manage(@Param('slug') slug:string,@Headers('authorization') authorization:string|undefined){const network=this.network(slug);this.manager(authorization,network.id);return Object.fromEntries((Object.keys(homepageFields) as Kind[]).map(kind=>[kind,this.records(network.id,kind).map(record=>({id:record.id,title:'organizationId' in record?this.store.organizations.get(record.organizationId)?.displayName:record.title,grant:record.homepageGrants?.[kind]||{enabled:false,fields:[],rightsConfirmed:false},preview:projectHomepage(kind,record,'organizationId' in record?this.store.organizations.get(record.organizationId)?.networkProfile:null)}))]));}
  @Post(':slug/:kind/:id')
  @Header('Cache-Control','no-store')
  update(@Param('slug') slug:string,@Param('kind') kind:Kind,@Param('id') id:string,@Headers('authorization') authorization:string|undefined,@Body() body:Record<string,unknown>){
    const network=this.network(slug),user=this.manager(authorization,network.id);
    if(!Object.hasOwn(homepageFields,kind))throw new BadRequestException('Unbekannter Inhaltstyp.');
    const record=this.records(network.id,kind).find(r=>r.id===id);if(!record)throw new NotFoundException();
    if(typeof body.enabled!=='boolean')throw new BadRequestException('Explizite Freigabe erforderlich.');
    const fields=Array.isArray(body.fields)?body.fields:[];
    if(fields.some(f=>typeof f!=='string'||!(homepageFields[kind] as readonly string[]).includes(f)))throw new BadRequestException('Nicht erlaubtes öffentliches Feld.');
    if(body.enabled&&(body.rightsConfirmed!==true||!fields.includes('title')||!fields.includes('description')))throw new BadRequestException('Veröffentlichungsrechte sowie Titel und Beschreibung müssen bestätigt sein.');
    const grant:HomepageGrant={enabled:body.enabled,fields:[...new Set(fields as string[])],rightsConfirmed:body.rightsConfirmed===true,updatedAt:new Date().toISOString(),approvedBy:user.id};
    const candidate={...record,homepageGrants:{...record.homepageGrants,[kind]:grant}};
    if(body.enabled&&!projectHomepage(kind,candidate,'organizationId' in record?this.store.organizations.get(record.organizationId)?.networkProfile:null))throw new BadRequestException('Inhalt unvollständig oder intern: Veranstaltung benötigt Bild, Beginn, Ort, Veranstalter, Bedingungen und Kosten. Profil muss aktiv und im Portal veröffentlicht sein.');
    record.homepageGrants=candidate.homepageGrants;
    this.store.activities.push({id:randomUUID(),matchId:null,organizationId:null,actorUserId:user.id,type:body.enabled?'homepage.publication.approved':'homepage.publication.revoked',visibility:'platform_internal',data:{networkId:network.id,kind,recordId:id,fields:grant.fields},createdAt:grant.updatedAt});
    return {enabled:grant.enabled,updatedAt:grant.updatedAt};
  }
}
