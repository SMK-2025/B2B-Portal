import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from "@nestjs/common";
import {randomUUID} from "node:crypto";
import {AuthService} from "../auth/auth.service";
import {EmailService} from "../auth/email.service";
import type {NetworkContentRecord,NetworkContentType,NetworkMembershipRecord,NetworkModule,NetworkRecord,NetworkRole} from "../core/domain";
import {PortalStore} from "../core/portal.store";
import {requiredText} from "../core/validation";

@Injectable()
export class NetworksService{
 constructor(@Inject(PortalStore)private readonly store:PortalStore,@Inject(AuthService)private readonly auth:AuthService,@Inject(EmailService)private readonly email:EmailService){}

 create(authorization:string|undefined,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requirePlatformAdmin(user.id);
  const slug=requiredText(input.slug,"Netzwerk-Kennung",3,80).toLowerCase();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new BadRequestException("Die Netzwerk-Kennung darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.");
  if(this.store.networkBySlug.has(slug))throw new ConflictException("Diese Netzwerk-Kennung ist bereits vergeben.");
  const now=new Date().toISOString();const network:NetworkRecord={id:randomUUID(),slug,name:requiredText(input.name,"Netzwerkname",2,160),legalName:typeof input.legalName==="string"&&input.legalName.trim()?input.legalName.trim():null,websiteUrl:typeof input.websiteUrl==="string"&&input.websiteUrl.trim()?input.websiteUrl.trim():null,logoUrl:null,primaryColor:"#183b34",secondaryColor:"#c5a15a",status:"draft",trialEndsAt:null,enabledModules:this.modules(input.enabledModules),settings:{closedNetwork:true,selfRegistration:false,crossNetworkMatching:false,admissionRules:null},createdAt:now,updatedAt:now};
  this.store.networks.set(network.id,network);this.store.networkBySlug.set(network.slug,network.id);return network;
 }

 adminList(authorization:string|undefined){
  const user=this.auth.authenticate(authorization);this.requirePlatformAdmin(user.id);
  return [...this.store.networks.values()].map(network=>{const membership=this.store.networkMemberships.find(item=>item.networkId===network.id&&item.role==="network_admin"&&item.status==="active");return{...network,administrator:membership?{...membership,user:this.publicUser(membership.userId)}:null}});
 }

 setAccess(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requirePlatformAdmin(user.id);const network=this.raw(networkId);
  const status=input.status;if(!["draft","trial","active","suspended"].includes(String(status)))throw new BadRequestException("Ungültiger Netzwerkstatus.");
  network.status=status as NetworkRecord["status"];network.trialEndsAt=null;
  if(status==="trial"){const days=Number(input.trialDays);if(!Number.isInteger(days)||days<1||days>180)throw new BadRequestException("Testzugänge müssen zwischen 1 und 180 Tagen laufen.");network.trialEndsAt=new Date(Date.now()+days*86_400_000).toISOString()}
  if(typeof input.selfRegistration==="boolean")network.settings.selfRegistration=input.selfRegistration;
  network.updatedAt=new Date().toISOString();return network;
 }

 appointAdministrator(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requirePlatformAdmin(actor.id);this.raw(networkId);
  const email=requiredText(input.email,"Geschäftliche E-Mail-Adresse",5,250).toLowerCase();
  const userId=this.store.userByEmail.get(email);if(!userId)throw new NotFoundException("Für diese E-Mail-Adresse wurde noch kein Benutzerkonto gefunden.");
  const companyMembership=this.store.memberships.find(item=>item.userId===userId);
  if(!companyMembership)throw new BadRequestException("Das Benutzerkonto ist noch keinem Unternehmen zugeordnet.");
  return this.addMember(authorization,networkId,{organizationId:companyMembership.organizationId,userId,role:"network_admin"});
 }

 publicBySlug(slug:string){
  const network=this.bySlug(slug);
  return {id:network.id,slug:network.slug,name:network.name,legalName:network.legalName,websiteUrl:network.websiteUrl,logoUrl:network.logoUrl,primaryColor:network.primaryColor,secondaryColor:network.secondaryColor,colors:{primary:network.primaryColor,secondary:network.secondaryColor},enabledModules:network.enabledModules,settings:network.settings,selfRegistration:network.settings.selfRegistration};
 }

 mine(authorization:string|undefined){
  const user=this.auth.authenticate(authorization);
  return this.store.networkMemberships.filter(item=>item.userId===user.id&&item.status==="active").map(item=>({membership:item,network:this.get(item.networkId),organization:this.store.organizations.get(item.organizationId)}));
 }

 apply(authorization:string|undefined,slug:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);const network=this.bySlug(slug);
  if(!network.settings.selfRegistration)throw new ForbiddenException("Dieses Netzwerk nimmt keine eigenständigen Registrierungen an.");
  const organizationId=requiredText(input.organizationId,"Unternehmen",20,100);
  if(!this.store.memberships.some(item=>item.userId===user.id&&item.organizationId===organizationId&&item.role==="admin"))throw new ForbiddenException("Nur Unternehmensadministratoren können eine Netzwerkmitgliedschaft beantragen.");
  const existing=this.store.networkMemberships.find(item=>item.networkId===network.id&&item.organizationId===organizationId&&!["rejected","left"].includes(item.status));
  if(existing)throw new ConflictException("Für dieses Unternehmen besteht bereits eine Mitgliedschaft oder ein offener Antrag.");
  const membership=this.record(network.id,organizationId,user.id,"organization_admin","pending",null);
  this.store.networkMemberships.push(membership);return membership;
 }

 listMembers(authorization:string|undefined,networkId:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkManagement(user.id,networkId);
  return this.store.networkMemberships.filter(item=>item.networkId===networkId).map(item=>({...item,user:this.publicUser(item.userId),organization:this.store.organizations.get(item.organizationId)}));
 }

 review(authorization:string|undefined,networkId:string,membershipId:string,input:Record<string,unknown>){
  const reviewer=this.auth.authenticate(authorization);this.requireNetworkManagement(reviewer.id,networkId);
  const membership=this.store.networkMemberships.find(item=>item.id===membershipId&&item.networkId===networkId);
  if(!membership)throw new NotFoundException("Netzwerkmitgliedschaft nicht gefunden.");
  if(membership.status!=="pending")throw new BadRequestException("Nur offene Mitgliedschaftsanträge können entschieden werden.");
  const decision=input.decision;if(decision!=="active"&&decision!=="rejected")throw new BadRequestException("Ungültige Entscheidung.");
  membership.status=decision;membership.reviewedByUserId=reviewer.id;membership.reviewedAt=new Date().toISOString();membership.updatedAt=membership.reviewedAt;
  return membership;
 }

 addMember(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkManagement(actor.id,networkId);
  const organizationId=requiredText(input.organizationId,"Unternehmen",20,100);const userId=requiredText(input.userId,"Benutzer",20,100);
  const role=input.role as NetworkRole;if(!["network_admin","moderator","organization_admin","member"].includes(role))throw new BadRequestException("Ungültige Netzwerkrolle.");
  if(role==="network_admin"&&actor.accountRole!=="platform_admin")throw new ForbiddenException("Nur die Plattformadministration darf Netzwerkadministratoren ernennen.");
  if(!this.store.organizations.has(organizationId)||!this.store.users.has(userId))throw new NotFoundException("Benutzer oder Unternehmen nicht gefunden.");
  const existing=this.store.networkMemberships.find(item=>item.networkId===networkId&&item.organizationId===organizationId&&item.userId===userId&&item.status==="active");
  if(existing){
   if(actor.accountRole==="platform_admin"&&existing.role!==role){existing.role=role;existing.reviewedByUserId=actor.id;existing.reviewedAt=new Date().toISOString();existing.updatedAt=existing.reviewedAt;return existing}
   throw new ConflictException("Die Person ist bereits aktives Netzwerkmitglied.");
  }
  const membership=this.record(networkId,organizationId,userId,role,"active",actor.id);membership.reviewedByUserId=actor.id;membership.reviewedAt=membership.createdAt;
  this.store.networkMemberships.push(membership);return membership;
 }

 async inviteMember(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkManagement(actor.id,networkId);const network=this.raw(networkId);const email=requiredText(input.email,"Geschäftliche E-Mail-Adresse",5,250).toLowerCase(),userId=this.store.userByEmail.get(email);
  if(!userId){await this.email.sendNetworkInvitation({email,networkName:network.name,networkSlug:network.slug});return{invited:true,email,registrationRequired:true}}
  const company=this.store.memberships.find(item=>item.userId===userId);if(!company)throw new BadRequestException("Das Konto ist noch keinem Unternehmen zugeordnet.");const requested=String(input.role||"member");const role:NetworkRole=["moderator","organization_admin","member"].includes(requested)?requested as NetworkRole:"member";return this.addMember(authorization,networkId,{organizationId:company.organizationId,userId,role});
 }

 membershipStatus(authorization:string|undefined,networkId:string,membershipId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkManagement(actor.id,networkId);const membership=this.store.networkMemberships.find(item=>item.id===membershipId&&item.networkId===networkId);if(!membership)throw new NotFoundException("Netzwerkmitgliedschaft nicht gefunden.");const status=String(input.status);if(!["active","rejected","suspended","left"].includes(status))throw new BadRequestException("Ungültiger Mitgliederstatus.");membership.status=status as NetworkMembershipRecord["status"];membership.reviewedByUserId=actor.id;membership.reviewedAt=new Date().toISOString();membership.updatedAt=membership.reviewedAt;return membership;
 }

 listContent(authorization:string|undefined,networkId:string,type?:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);this.raw(networkId);
  return [...this.store.networkContents.values()].filter(item=>item.networkId===networkId&&(!type||item.type===type)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }

 createContent(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requireNetworkManagement(user.id,networkId);this.raw(networkId);
  const allowed:NetworkContentType[]=["event","topic","announcement","poll","task","document","conversation","need","service"];
  const type=String(input.type) as NetworkContentType;if(!allowed.includes(type))throw new BadRequestException("Ungültiger Netzwerkinhalt.");
  const now=new Date().toISOString();const record:NetworkContentRecord={id:randomUUID(),networkId,type,title:requiredText(input.title,"Titel",2,200),description:requiredText(input.description,"Beschreibung",2,5000),status:["draft","published","active","completed","archived"].includes(String(input.status))?input.status as NetworkContentRecord["status"]:"published",createdByUserId:user.id,assignedToUserId:typeof input.assignedToUserId==="string"&&input.assignedToUserId?input.assignedToUserId:null,startsAt:this.optionalDate(input.startsAt),endsAt:this.optionalDate(input.endsAt),visibility:input.visibility==="administrators"?"administrators":"members",data:typeof input.data==="object"&&input.data!==null?input.data as Record<string,unknown>:{},createdAt:now,updatedAt:now};
  this.store.networkContents.set(record.id,record);this.store.activities.push({id:randomUUID(),matchId:null,organizationId:null,actorUserId:user.id,type:`network.${type}.created`,visibility:"platform_internal",data:{networkId,contentId:record.id,title:record.title},createdAt:now});return record;
 }

 updateContent(authorization:string|undefined,networkId:string,contentId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requireNetworkManagement(user.id,networkId);const record=this.store.networkContents.get(contentId);if(!record||record.networkId!==networkId)throw new NotFoundException("Netzwerkinhalt nicht gefunden.");
  if(typeof input.title==="string")record.title=requiredText(input.title,"Titel",2,200);if(typeof input.description==="string")record.description=requiredText(input.description,"Beschreibung",2,5000);if(["draft","published","active","completed","archived"].includes(String(input.status)))record.status=input.status as NetworkContentRecord["status"];if(typeof input.data==="object"&&input.data!==null)record.data={...record.data,...input.data as Record<string,unknown>};record.updatedAt=new Date().toISOString();return record;
 }

 dashboard(authorization:string|undefined,networkId:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);const network=this.raw(networkId),members=this.store.networkMemberships.filter(item=>item.networkId===networkId),contents=[...this.store.networkContents.values()].filter(item=>item.networkId===networkId);return{network,members:{total:members.length,active:members.filter(item=>item.status==="active").length,pending:members.filter(item=>item.status==="pending").length},content:{total:contents.length,events:contents.filter(item=>item.type==="event").length,topics:contents.filter(item=>["topic","announcement","poll"].includes(item.type)).length,tasks:contents.filter(item=>item.type==="task"&&item.status!=="completed").length,documents:contents.filter(item=>item.type==="document").length},recent:contents.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,8)};
 }

 updateSettings(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requireNetworkManagement(user.id,networkId);const network=this.raw(networkId);
  if(typeof input.name==="string")network.name=requiredText(input.name,"Netzwerkname",2,160);if(typeof input.legalName==="string")network.legalName=input.legalName.trim()||null;if(typeof input.websiteUrl==="string")network.websiteUrl=input.websiteUrl.trim()||null;if(typeof input.logoUrl==="string")network.logoUrl=input.logoUrl.trim()||null;if(typeof input.primaryColor==="string"&&/^#[0-9a-f]{6}$/i.test(input.primaryColor))network.primaryColor=input.primaryColor;if(typeof input.secondaryColor==="string"&&/^#[0-9a-f]{6}$/i.test(input.secondaryColor))network.secondaryColor=input.secondaryColor;
  if(typeof input.closedNetwork==="boolean")network.settings.closedNetwork=input.closedNetwork;if(typeof input.selfRegistration==="boolean")network.settings.selfRegistration=input.selfRegistration;if(typeof input.crossNetworkMatching==="boolean")network.settings.crossNetworkMatching=input.crossNetworkMatching;if(typeof input.admissionRules==="string")network.settings.admissionRules=input.admissionRules.trim()||null;if(Array.isArray(input.enabledModules))network.enabledModules=this.modules(input.enabledModules);network.updatedAt=new Date().toISOString();return network;
 }

 private record(networkId:string,organizationId:string,userId:string,role:NetworkRole,status:NetworkMembershipRecord["status"],invitedByUserId:string|null):NetworkMembershipRecord{const now=new Date().toISOString();return{id:randomUUID(),networkId,organizationId,userId,role,status,invitedByUserId,reviewedByUserId:null,reviewedAt:null,createdAt:now,updatedAt:now}}
 private bySlug(slug:string){const id=this.store.networkBySlug.get(slug);if(!id)throw new NotFoundException("Netzwerk nicht gefunden.");return this.get(id)}
 private get(id:string){const network=this.raw(id);if(network.status==="active")return network;if(network.status==="trial"&&network.trialEndsAt&&Date.parse(network.trialEndsAt)>Date.now())return network;throw new NotFoundException("Netzwerk nicht gefunden oder nicht freigeschaltet.")}
 private raw(id:string){const network=this.store.networks.get(id);if(!network)throw new NotFoundException("Netzwerk nicht gefunden.");return network}
 private modules(value:unknown):NetworkModule[]{const allowed:NetworkModule[]=["members","profiles","services","matching","communication","events","community","tasks","documents","analytics","notifications"];if(!Array.isArray(value))return["members","profiles"];return [...new Set(value.map(String).filter((item):item is NetworkModule=>allowed.includes(item as NetworkModule)))]}
 private requirePlatformAdmin(userId:string){if(this.store.users.get(userId)?.accountRole!=="platform_admin")throw new ForbiddenException("Nur die Plattformadministration darf Netzwerkpartner freischalten.")}
 private requireNetworkManagement(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&["network_admin","moderator"].includes(item.role)))throw new ForbiddenException("Keine Berechtigung zur Netzwerkverwaltung.")}
 private requireNetworkAccess(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"))throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.")}
 private optionalDate(value:unknown){if(typeof value!=="string"||!value.trim())return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new BadRequestException("Ungültiges Datum.");return date.toISOString()}
 private publicUser(userId:string){const user=this.store.users.get(userId);return user?{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email}:null}
}
