import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from "@nestjs/common";
import {randomUUID} from "node:crypto";
import {AuthService} from "../auth/auth.service";
import {EmailService} from "../auth/email.service";
import {opaqueToken,tokenHash} from "../auth/password";
import type {NetworkAttendanceRecord,NetworkContentRecord,NetworkContentType,NetworkMembershipRecord,NetworkModule,NetworkOrderRecord,NetworkRecord,NetworkRevenueRecord,NetworkRole} from "../core/domain";
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
  return [...this.store.networks.values()].map(network=>{const membership=this.store.networkMemberships.find(item=>item.networkId===network.id&&item.role==="network_admin"&&item.status==="active"),orders=[...this.store.networkOrders.values()].filter(item=>item.networkId===network.id).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));return{...network,administrator:membership?{...membership,user:this.publicUser(membership.userId)}:null,latestOrder:orders[0]||null}});
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

 remove(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requirePlatformAdmin(actor.id);const network=this.raw(networkId);
  if(input.confirmSlug!==network.slug)throw new BadRequestException("Zur Bestätigung muss die exakte Netzwerk-Kennung angegeben werden.");
  const needIds=new Set([...this.store.needs.values()].filter(item=>item.networkId===networkId).map(item=>item.id));
  const matchIds=new Set([...this.store.matches.values()].filter(item=>needIds.has(item.needId)).map(item=>item.id));
  const conversationIds=new Set([...this.store.conversations.values()].filter(item=>matchIds.has(item.matchId)).map(item=>item.id));
  for(const [id,item] of this.store.networkContents)if(item.networkId===networkId)this.store.networkContents.delete(id);
  for(const [id,item] of this.store.networkAttendances)if(item.networkId===networkId)this.store.networkAttendances.delete(id);
  for(const [id,item] of this.store.networkRevenues)if(item.networkId===networkId)this.store.networkRevenues.delete(id);
  for(const [id,item] of this.store.needs)if(item.networkId===networkId)this.store.needs.delete(id);
  for(const id of matchIds)this.store.matches.delete(id);
  for(const id of conversationIds)this.store.conversations.delete(id);
  for(const [id,item] of this.store.meetings)if(matchIds.has(item.matchId))this.store.meetings.delete(id);
  this.store.messages.splice(0,this.store.messages.length,...this.store.messages.filter(item=>!conversationIds.has(item.conversationId)));
  this.store.networkMemberships.splice(0,this.store.networkMemberships.length,...this.store.networkMemberships.filter(item=>item.networkId!==networkId));
  this.store.activities.splice(0,this.store.activities.length,...this.store.activities.filter(item=>item.data.networkId!==networkId&&(!item.matchId||!matchIds.has(item.matchId))));
  this.store.notifications.splice(0,this.store.notifications.length,...this.store.notifications.filter(item=>item.data.networkId!==networkId));
  this.store.networks.delete(networkId);this.store.networkBySlug.delete(network.slug);
  return{deleted:true,id:networkId,slug:network.slug};
 }

 publicBySlug(slug:string){
  const network=this.bySlug(slug);
  return {id:network.id,slug:network.slug,name:network.name,legalName:network.legalName,websiteUrl:network.websiteUrl,logoUrl:network.logoUrl,primaryColor:network.primaryColor,secondaryColor:network.secondaryColor,colors:{primary:network.primaryColor,secondary:network.secondaryColor},enabledModules:network.enabledModules,settings:network.settings,selfRegistration:network.settings.selfRegistration};
 }

 mine(authorization:string|undefined){
  const user=this.auth.authenticate(authorization);
  return this.store.networkMemberships.filter(item=>item.userId===user.id&&item.status==="active").map(item=>({membership:item,network:this.get(item.networkId),organization:this.store.organizations.get(item.organizationId)}));
 }

 applyAsPartner(authorization:string|undefined,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);
  const organizationId=requiredText(input.organizationId,"Unternehmen",20,100);
  if(!this.store.memberships.some(item=>item.userId===user.id&&item.organizationId===organizationId&&item.role==="admin"))throw new ForbiddenException("Nur Unternehmensadministratoren können einen Netzwerkzugang beantragen.");
  const name=requiredText(input.name,"Netzwerkname",2,160);
  const base=String(input.slug||name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"netzwerk";
  let slug=base,index=2;while(this.store.networkBySlug.has(slug))slug=`${base}-${index++}`;
  const now=new Date().toISOString();
  if(input.authorized!==true||input.responsibilityAccepted!==true||input.pricingAccepted!==true)throw new BadRequestException("Entscheidungsberechtigung, Verantwortung und Preisinformationen müssen bestätigt werden.");
  const network:NetworkRecord={id:randomUUID(),slug,name,legalName:typeof input.legalName==="string"&&input.legalName.trim()?input.legalName.trim():null,websiteUrl:typeof input.websiteUrl==="string"&&input.websiteUrl.trim()?input.websiteUrl.trim():null,logoUrl:null,primaryColor:"#183b34",secondaryColor:"#c5a15a",status:"trial",trialEndsAt:new Date(Date.now()+10*86_400_000).toISOString(),enabledModules:["members","profiles","services","matching","communication","events","community","tasks","documents","analytics","notifications"],settings:{closedNetwork:true,selfRegistration:false,crossNetworkMatching:false,admissionRules:null},createdAt:now,updatedAt:now};
  this.store.networks.set(network.id,network);this.store.networkBySlug.set(slug,network.id);
  this.store.networkMemberships.push(this.record(network.id,organizationId,user.id,"network_admin","active",null));
  this.store.activities.push({id:randomUUID(),matchId:null,organizationId,actorUserId:user.id,type:"network.application.created",visibility:"platform_internal",data:{networkId:network.id,name},createdAt:now});
  return{network,applicationStatus:"trial",message:"Der geschlossene Netzwerk-Testbereich wurde eingerichtet."};
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
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);
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
  if(!userId){const inviteToken=opaqueToken(),now=new Date().toISOString(),requested=String(input.role||"member"),role=["moderator","organization_admin","member"].includes(requested)?requested:"member";const invitation:NetworkContentRecord={id:randomUUID(),networkId,type:"announcement",title:`Einladung ${email}`,description:"Persönliche Netzwerkeinladung",status:"active",createdByUserId:actor.id,assignedToUserId:null,startsAt:null,endsAt:new Date(Date.now()+14*86_400_000).toISOString(),visibility:"administrators",data:{kind:"network_invitation",email,role,inviteTokenHash:tokenHash(inviteToken),usedAt:null},createdAt:now,updatedAt:now};this.store.networkContents.set(invitation.id,invitation);await this.email.sendNetworkInvitation({email,networkName:network.name,networkSlug:network.slug,inviteToken});return{invited:true,email,registrationRequired:true}}
  const company=this.store.memberships.find(item=>item.userId===userId);if(!company)throw new BadRequestException("Das Konto ist noch keinem Unternehmen zugeordnet.");const requested=String(input.role||"member");const role:NetworkRole=["moderator","organization_admin","member"].includes(requested)?requested as NetworkRole:"member";return this.addMember(authorization,networkId,{organizationId:company.organizationId,userId,role});
 }

 membershipStatus(authorization:string|undefined,networkId:string,membershipId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkManagement(actor.id,networkId);const membership=this.store.networkMemberships.find(item=>item.id===membershipId&&item.networkId===networkId);if(!membership)throw new NotFoundException("Netzwerkmitgliedschaft nicht gefunden.");const status=String(input.status);if(!["active","rejected","suspended","left"].includes(status))throw new BadRequestException("Ungültiger Mitgliederstatus.");membership.status=status as NetworkMembershipRecord["status"];membership.reviewedByUserId=actor.id;membership.reviewedAt=new Date().toISOString();membership.updatedAt=membership.reviewedAt;return membership;
 }

 listContent(authorization:string|undefined,networkId:string,type?:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);this.ensureModule(this.raw(networkId),type);
  return [...this.store.networkContents.values()].filter(item=>item.networkId===networkId&&(!type||item.type===type)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }

 createContent(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);const network=this.raw(networkId);
  const allowed:NetworkContentType[]=["event","topic","announcement","poll","task","document","conversation","need","service"];
  const type=String(input.type) as NetworkContentType;if(!allowed.includes(type))throw new BadRequestException("Ungültiger Netzwerkinhalt.");
  this.ensureModule(network,type);this.requireContentCreation(user.id,networkId,type);
  const now=new Date().toISOString();const record:NetworkContentRecord={id:randomUUID(),networkId,type,title:requiredText(input.title,"Titel",2,200),description:requiredText(input.description,"Beschreibung",2,5000),status:["draft","published","active","completed","archived"].includes(String(input.status))?input.status as NetworkContentRecord["status"]:"published",createdByUserId:user.id,assignedToUserId:typeof input.assignedToUserId==="string"&&input.assignedToUserId?input.assignedToUserId:null,startsAt:this.optionalDate(input.startsAt),endsAt:this.optionalDate(input.endsAt),visibility:input.visibility==="administrators"?"administrators":"members",data:typeof input.data==="object"&&input.data!==null?input.data as Record<string,unknown>:{},createdAt:now,updatedAt:now};
  this.store.networkContents.set(record.id,record);this.store.activities.push({id:randomUUID(),matchId:null,organizationId:null,actorUserId:user.id,type:`network.${type}.created`,visibility:"platform_internal",data:{networkId,contentId:record.id,title:record.title},createdAt:now});return record;
 }

 updateContent(authorization:string|undefined,networkId:string,contentId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);const record=this.store.networkContents.get(contentId);if(!record||record.networkId!==networkId)throw new NotFoundException("Netzwerkinhalt nicht gefunden.");this.ensureModule(this.raw(networkId),record.type);this.requireContentUpdate(user.id,networkId,record);
  if(typeof input.title==="string")record.title=requiredText(input.title,"Titel",2,200);if(typeof input.description==="string")record.description=requiredText(input.description,"Beschreibung",2,5000);if(["draft","published","active","completed","archived"].includes(String(input.status)))record.status=input.status as NetworkContentRecord["status"];if(typeof input.data==="object"&&input.data!==null)record.data={...record.data,...input.data as Record<string,unknown>};record.updatedAt=new Date().toISOString();return record;
 }

 attendance(authorization:string|undefined,networkId:string,eventId:string){
  const actor=this.auth.authenticate(authorization);this.requireNetworkAccess(actor.id,networkId);this.event(networkId,eventId);
  const own=this.store.networkMemberships.find(item=>item.networkId===networkId&&item.userId===actor.id&&item.status==="active");
  return [...this.store.networkAttendances.values()].filter(item=>item.networkId===networkId&&item.eventId===eventId&&(this.isNetworkManager(actor.id,networkId)||item.membershipId===own?.id)).map(item=>this.attendanceView(item)).sort((a,b)=>a.memberName.localeCompare(b.memberName,"de"));
 }

 updateOwnAttendance(authorization:string|undefined,networkId:string,eventId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireWritableNetwork(actor.id,networkId);this.event(networkId,eventId);
  const membership=this.store.networkMemberships.find(item=>item.networkId===networkId&&item.userId===actor.id&&item.status==="active");if(!membership)throw new ForbiddenException("Keine aktive Netzwerkmitgliedschaft.");
  return this.saveAttendance(actor.id,networkId,eventId,membership.id,input,false);
 }

 updateMemberAttendance(authorization:string|undefined,networkId:string,eventId:string,membershipId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkManagement(actor.id,networkId);this.event(networkId,eventId);this.member(networkId,membershipId);
  return this.saveAttendance(actor.id,networkId,eventId,membershipId,input,true);
 }

 revenues(authorization:string|undefined,networkId:string){
  const actor=this.auth.authenticate(authorization);this.requireNetworkAdmin(actor.id,networkId);
  return [...this.store.networkRevenues.values()].filter(item=>item.networkId===networkId).map(item=>this.revenueView(item)).sort((a,b)=>b.periodTo.localeCompare(a.periodTo));
 }

 createRevenue(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkAdmin(actor.id,networkId);this.requireWritableNetwork(actor.id,networkId);
  const referringMembershipId=String(input.referringMembershipId||""),beneficiaryMembershipId=String(input.beneficiaryMembershipId||"");this.member(networkId,referringMembershipId);this.member(networkId,beneficiaryMembershipId);
  const periodFrom=this.dateOnly(input.periodFrom,"Zeitraum von"),periodTo=this.dateOnly(input.periodTo,"Zeitraum bis");if(periodTo<periodFrom)throw new BadRequestException("Das Ende des Zeitraums liegt vor dem Beginn.");
  const now=new Date().toISOString(),record:NetworkRevenueRecord={id:randomUUID(),networkId,referringMembershipId,beneficiaryMembershipId,amountNetCents:this.money(input.amount),periodFrom,periodTo,status:this.revenueStatus(input.status),note:this.note(input.note),createdByUserId:actor.id,createdAt:now,updatedAt:now};this.store.networkRevenues.set(record.id,record);return this.revenueView(record);
 }

 updateRevenue(authorization:string|undefined,networkId:string,revenueId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkAdmin(actor.id,networkId);this.requireWritableNetwork(actor.id,networkId);const record=this.store.networkRevenues.get(revenueId);if(!record||record.networkId!==networkId)throw new NotFoundException("Umsatzdatensatz nicht gefunden.");
  if(input.referringMembershipId!==undefined){record.referringMembershipId=String(input.referringMembershipId);this.member(networkId,record.referringMembershipId)}if(input.beneficiaryMembershipId!==undefined){record.beneficiaryMembershipId=String(input.beneficiaryMembershipId);this.member(networkId,record.beneficiaryMembershipId)}if(input.amount!==undefined)record.amountNetCents=this.money(input.amount);if(input.periodFrom!==undefined)record.periodFrom=this.dateOnly(input.periodFrom,"Zeitraum von");if(input.periodTo!==undefined)record.periodTo=this.dateOnly(input.periodTo,"Zeitraum bis");if(record.periodTo<record.periodFrom)throw new BadRequestException("Das Ende des Zeitraums liegt vor dem Beginn.");if(input.status!==undefined)record.status=this.revenueStatus(input.status);if(input.note!==undefined)record.note=this.note(input.note);record.updatedAt=new Date().toISOString();return this.revenueView(record);
 }

 dashboard(authorization:string|undefined,networkId:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);const network=this.raw(networkId),members=this.store.networkMemberships.filter(item=>item.networkId===networkId),contents=[...this.store.networkContents.values()].filter(item=>item.networkId===networkId);return{network,members:{total:members.length,active:members.filter(item=>item.status==="active").length,pending:members.filter(item=>item.status==="pending").length},content:{total:contents.length,events:contents.filter(item=>item.type==="event").length,topics:contents.filter(item=>["topic","announcement","poll"].includes(item.type)).length,tasks:contents.filter(item=>item.type==="task"&&item.status!=="completed").length,documents:contents.filter(item=>item.type==="document").length},recent:contents.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,8)};
 }

 orders(authorization:string|undefined,networkId:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkManagementOrTrialAdmin(user.id,networkId);
  return [...this.store.networkOrders.values()].filter(item=>item.networkId===networkId).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
 }

 order(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization),network=this.raw(networkId);this.requireNetworkManagementOrTrialAdmin(user.id,networkId);
  if(network.status!=="trial")throw new BadRequestException("Eine Buchung aus der Testansicht ist für dieses Netzwerk nicht möglich.");
  if([...this.store.networkOrders.values()].some(item=>item.networkId===networkId&&item.status==="submitted"))throw new ConflictException("Für dieses Netzwerk liegt bereits eine verbindliche Bestellung vor.");
  const billingCycle=String(input.billingCycle);if(!["annual","semiannual"].includes(billingCycle))throw new BadRequestException("Bitte wählen Sie den Abrechnungszeitraum.");
  if(input.authorityConfirmed!==true||input.termsAccepted!==true||input.paymentObligationAccepted!==true)throw new BadRequestException("Für die verbindliche Bestellung müssen alle erforderlichen Erklärungen bestätigt werden.");
  const now=new Date().toISOString();const record:NetworkOrderRecord={
   id:randomUUID(),networkId,orderedByUserId:user.id,
   invoiceCompany:requiredText(input.invoiceCompany,"Rechnungsempfänger",2,200),invoiceContact:requiredText(input.invoiceContact,"Ansprechpartner",2,160),invoiceEmail:requiredText(input.invoiceEmail,"Rechnungs-E-Mail",5,250).toLowerCase(),
   invoiceStreet:requiredText(input.invoiceStreet,"Straße und Hausnummer",3,200),invoicePostalCode:requiredText(input.invoicePostalCode,"Postleitzahl",4,12),invoiceCity:requiredText(input.invoiceCity,"Ort",2,120),invoiceCountry:requiredText(input.invoiceCountry,"Land",2,80),
   billingCycle:billingCycle as NetworkOrderRecord["billingCycle"],purchaseOrderReference:typeof input.purchaseOrderReference==="string"&&input.purchaseOrderReference.trim()?input.purchaseOrderReference.trim().slice(0,120):null,
   monthlyNetCents:39000,setupNetCents:299000,minimumTermMonths:12,termsVersion:"2026-07-22",pricingVersion:"network-2026-07",
   authorityConfirmed:true,termsAccepted:true,paymentObligationAccepted:true,status:"submitted",submittedAt:now,decidedAt:null,decidedByUserId:null
  };
  this.store.networkOrders.set(record.id,record);this.store.activities.push({id:randomUUID(),matchId:null,organizationId:null,actorUserId:user.id,type:"network.order.submitted",visibility:"platform_internal",data:{networkId,orderId:record.id,billingCycle},createdAt:now});
  void this.email.sendNetworkOrderConfirmation({email:record.invoiceEmail,contact:record.invoiceContact,networkName:network.name,orderId:record.id,billingCycle:record.billingCycle}).catch(()=>undefined);
  return record;
 }

 decideOrder(authorization:string|undefined,networkId:string,orderId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requirePlatformAdmin(actor.id);const network=this.raw(networkId),order=this.store.networkOrders.get(orderId);
  if(!order||order.networkId!==networkId)throw new NotFoundException("Bestellung nicht gefunden.");if(order.status!=="submitted")throw new BadRequestException("Diese Bestellung wurde bereits entschieden.");
  const decision=String(input.decision);if(!["accepted","rejected"].includes(decision))throw new BadRequestException("Ungültige Bestellentscheidung.");
  order.status=decision as "accepted"|"rejected";order.decidedAt=new Date().toISOString();order.decidedByUserId=actor.id;
  if(decision==="accepted"){network.status="active";network.trialEndsAt=null;network.settings.selfRegistration=true;network.updatedAt=order.decidedAt}
  this.store.activities.push({id:randomUUID(),matchId:null,organizationId:null,actorUserId:actor.id,type:`network.order.${decision}`,visibility:"platform_internal",data:{networkId,orderId},createdAt:order.decidedAt});return{order,network};
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
 private requireNetworkManagementOrTrialAdmin(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&item.role==="network_admin"))throw new ForbiddenException("Nur die verantwortliche Netzwerkadministration darf diese Buchung verwalten.")}
 private requireNetworkManagement(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;const network=this.raw(networkId);if(network.status==="trial")throw new ForbiddenException("Im 10-Tage-Testzugang ist nur die unverbindliche Ansicht möglich. Zum Speichern, Einladen oder Veröffentlichen muss das Netzwerkportal gebucht und aktiviert werden.");if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&["network_admin","moderator"].includes(item.role)))throw new ForbiddenException("Keine Berechtigung zur Netzwerkverwaltung.")}
 private requireNetworkAccess(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"))throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.")}
 private requireNetworkAdmin(userId:string,networkId:string){if(this.store.users.get(userId)?.accountRole==="platform_admin")return;this.requireWritableNetwork(userId,networkId);if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&item.role==="network_admin"))throw new ForbiddenException("Vermittelte Umsätze sind ausschließlich für berechtigte Netzwerkadministratoren sichtbar.")}
 private requireWritableNetwork(userId:string,networkId:string){this.requireNetworkAccess(userId,networkId);if(this.raw(networkId).status==="trial")throw new ForbiddenException("Die Testansicht ist schreibgeschützt.")}
 private isNetworkManager(userId:string,networkId:string){return this.store.users.get(userId)?.accountRole==="platform_admin"||this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&["network_admin","moderator"].includes(item.role))}
 private event(networkId:string,eventId:string){const event=this.store.networkContents.get(eventId);if(!event||event.networkId!==networkId||event.type!=="event")throw new NotFoundException("Veranstaltung nicht gefunden.");return event}
 private member(networkId:string,membershipId:string){const membership=this.store.networkMemberships.find(item=>item.id===membershipId&&item.networkId===networkId&&item.status==="active");if(!membership)throw new NotFoundException("Aktives Netzwerkmitglied nicht gefunden.");return membership}
 private saveAttendance(actorId:string,networkId:string,eventId:string,membershipId:string,input:Record<string,unknown>,manager:boolean){const membership=this.member(networkId,membershipId),response=String(input.response);if(!["registered","declined"].includes(response))throw new BadRequestException("Bitte An- oder Abmeldung auswählen.");const attendance=manager&&["pending","present","absent"].includes(String(input.attendance))?String(input.attendance) as NetworkAttendanceRecord["attendance"]:"pending",guestNames=Array.isArray(input.guestNames)?input.guestNames.map(String).map(value=>value.trim()).filter(Boolean).slice(0,20):typeof input.guestNames==="string"?input.guestNames.split(/\r?\n|,/).map(value=>value.trim()).filter(Boolean).slice(0,20):[],companionCount=Math.max(0,Math.min(20,Number(input.companionCount)||0)),now=new Date().toISOString(),existing=[...this.store.networkAttendances.values()].find(item=>item.eventId===eventId&&item.membershipId===membershipId);const record:NetworkAttendanceRecord=existing??{id:randomUUID(),networkId,eventId,membershipId,userId:membership.userId,response:"registered",attendance:"pending",guestNames:[],companionCount:0,note:null,updatedByUserId:actorId,createdAt:now,updatedAt:now};record.response=response as NetworkAttendanceRecord["response"];record.attendance=attendance;record.guestNames=guestNames;record.companionCount=companionCount;record.note=this.note(input.note);record.updatedByUserId=actorId;record.updatedAt=now;this.store.networkAttendances.set(record.id,record);return this.attendanceView(record)}
 private attendanceView(record:NetworkAttendanceRecord){const membership=this.member(record.networkId,record.membershipId),user=this.store.users.get(membership.userId),organization=this.store.organizations.get(membership.organizationId);return{...record,memberName:user?`${user.firstName} ${user.lastName}`.trim():"Mitglied",organizationName:organization?.displayName||organization?.legalName||"Unternehmen"}}
 private revenueView(record:NetworkRevenueRecord){const referring=this.member(record.networkId,record.referringMembershipId),beneficiary=this.member(record.networkId,record.beneficiaryMembershipId),name=(membership:NetworkMembershipRecord)=>{const organization=this.store.organizations.get(membership.organizationId),user=this.store.users.get(membership.userId);return{membershipId:membership.id,organizationName:organization?.displayName||organization?.legalName||"Unternehmen",contactName:user?`${user.firstName} ${user.lastName}`.trim():"Mitglied"}};return{...record,referring:name(referring),beneficiary:name(beneficiary)}}
 private money(value:unknown){const normalized=typeof value==="string"?value.replace(/\./g,"").replace(",","."):value,amount=Number(normalized);if(!Number.isFinite(amount)||amount<0)throw new BadRequestException("Bitte einen gültigen Umsatzbetrag eingeben.");return Math.round(amount*100)}
 private dateOnly(value:unknown,label:string){if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new BadRequestException(`${label} fehlt oder ist ungültig.`);return value}
 private revenueStatus(value:unknown):NetworkRevenueRecord["status"]{const status=String(value||"recorded");if(!["recorded","confirmed","paid","cancelled"].includes(status))throw new BadRequestException("Ungültiger Umsatzstatus.");return status as NetworkRevenueRecord["status"]}
 private note(value:unknown){return typeof value==="string"&&value.trim()?value.trim().slice(0,1000):null}
 private requireContentCreation(userId:string,networkId:string,type:NetworkContentType){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;const network=this.raw(networkId);if(network.status==="trial")throw new ForbiddenException("Die Testansicht ist schreibgeschützt.");const membership=this.store.networkMemberships.find(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active");if(!membership)throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.");if(["network_admin","moderator"].includes(membership.role))return;if(!["conversation","need","service","topic","poll"].includes(type))throw new ForbiddenException("Dieser Inhalt kann nur durch die Netzwerkverwaltung angelegt werden.")}
 private requireContentUpdate(userId:string,networkId:string,record:NetworkContentRecord){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;const network=this.raw(networkId);if(network.status==="trial")throw new ForbiddenException("Die Testansicht ist schreibgeschützt.");const membership=this.store.networkMemberships.find(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active");if(!membership)throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.");if(record.createdByUserId!==userId&&!["network_admin","moderator"].includes(membership.role))throw new ForbiddenException("Sie dürfen nur eigene Inhalte bearbeiten.")}
 private ensureModule(network:NetworkRecord,type?:string){if(!type)return;const moduleByType:Partial<Record<NetworkContentType,NetworkModule>>={event:"events",topic:"community",announcement:"community",poll:"community",task:"tasks",document:"documents",conversation:"communication",need:"matching",service:"services"};const module=moduleByType[type as NetworkContentType];if(module&&!network.enabledModules.includes(module))throw new ForbiddenException("Dieses Netzwerkmodul ist nicht freigeschaltet.")}
 private optionalDate(value:unknown){if(typeof value!=="string"||!value.trim())return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new BadRequestException("Ungültiges Datum.");return date.toISOString()}
 private publicUser(userId:string){const user=this.store.users.get(userId);return user?{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email}:null}
}
