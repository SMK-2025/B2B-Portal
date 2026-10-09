import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from "@nestjs/common";
import {randomUUID} from "node:crypto";
import {AuthService} from "../auth/auth.service";
import {EmailService} from "../auth/email.service";
import {opaqueToken,tokenHash} from "../auth/password";
import type {NetworkAttendanceRecord,NetworkContentRecord,NetworkContentType,NetworkMembershipRecord,NetworkModule,NetworkOrderRecord,NetworkPartnerProfile,NetworkRecord,NetworkRevenueRecord,NetworkRole} from "../core/domain";
import {PortalStore} from "../core/portal.store";
import {emailAddress,requiredText,safeUrl} from "../core/validation";
import {allProductModuleIds,expandNetworkModules,NETWORK_COMPLETE_UNIT_NET_CENTS,NETWORK_INCLUDED_MODULES,NETWORK_MODULE_CATALOG,NETWORK_SETUP_NET_CENTS} from "./network-module-catalog";

@Injectable()
export class NetworksService{
 constructor(@Inject(PortalStore)private readonly store:PortalStore,@Inject(AuthService)private readonly auth:AuthService,@Inject(EmailService)private readonly email:EmailService){}

 create(authorization:string|undefined,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requirePlatformAdmin(user.id);
  const slug=requiredText(input.slug,"Netzwerk-Kennung",3,80).toLowerCase();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new BadRequestException("Die Netzwerk-Kennung darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.");
  if(this.store.networkBySlug.has(slug))throw new ConflictException("Diese Netzwerk-Kennung ist bereits vergeben.");
  const now=new Date().toISOString();const network:NetworkRecord={id:randomUUID(),slug,name:requiredText(input.name,"Netzwerkname",2,160),legalName:typeof input.legalName==="string"&&input.legalName.trim()?input.legalName.trim():null,websiteUrl:typeof input.websiteUrl==="string"&&input.websiteUrl.trim()?input.websiteUrl.trim():null,logoUrl:null,primaryColor:"#536bdb",secondaryColor:"#30264f",status:"draft",trialEndsAt:null,enabledModules:[...NETWORK_INCLUDED_MODULES],settings:{closedNetwork:true,selfRegistration:false,crossNetworkMatching:false,admissionRules:null,setupCompletedAt:null},createdAt:now,updatedAt:now};
  this.store.networks.set(network.id,network);this.store.networkBySlug.set(network.slug,network.id);return network;
 }

 adminList(authorization:string|undefined){
  const user=this.auth.authenticate(authorization);this.requirePlatformAdmin(user.id);
  return [...this.store.networks.values()].map(network=>{const membership=this.store.networkMemberships.find(item=>item.networkId===network.id&&item.role==="network_admin"&&item.status==="active"),orders=[...this.store.networkOrders.values()].filter(item=>item.networkId===network.id).map(item=>this.normalizeOrder(item)).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));return{...network,administrator:membership?{...membership,user:this.publicUser(membership.userId)}:null,latestOrder:orders[0]||null}});
 }

 moduleCatalog(){return{modules:NETWORK_MODULE_CATALOG,completeUnitNetCents:NETWORK_COMPLETE_UNIT_NET_CENTS,setupNetCents:NETWORK_SETUP_NET_CENTS,currency:"EUR",billingUnit:"active_network_user",includedModules:NETWORK_INCLUDED_MODULES}}

 branding(slug:string){
  const network=this.bySlug(slug);const accessible=network.status==="active"||(network.status==="trial"&&Boolean(network.trialEndsAt)&&Date.parse(network.trialEndsAt!)>Date.now());if(!accessible)throw new NotFoundException("Netzwerkportal nicht gefunden.");
  return{slug:network.slug,name:network.name,logoUrl:network.logoUrl,primaryColor:network.primaryColor,secondaryColor:network.secondaryColor,websiteUrl:network.websiteUrl};
 }

 setAccess(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requirePlatformAdmin(user.id);const network=this.raw(networkId);
  const status=input.status;if(!["draft","trial","active","suspended"].includes(String(status)))throw new BadRequestException("Ungültiger Netzwerkstatus.");
  network.status=status as NetworkRecord["status"];network.trialEndsAt=null;
  if(status==="trial"){const days=Number(input.trialDays);if(!Number.isInteger(days)||days<1||days>180)throw new BadRequestException("Testzugänge müssen zwischen 1 und 180 Tagen laufen.");network.trialEndsAt=new Date(Date.now()+days*86_400_000).toISOString();network.enabledModules=expandNetworkModules(allProductModuleIds())}
  network.settings.selfRegistration=false;
  network.updatedAt=new Date().toISOString();return network;
 }

 async appointAdministrator(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requirePlatformAdmin(actor.id);const network=this.raw(networkId);
  const email=requiredText(input.email,"Geschäftliche E-Mail-Adresse",5,250).toLowerCase();
  const userId=this.store.userByEmail.get(email);if(!userId){
   const inviteToken=opaqueToken(),now=new Date().toISOString(),invitation:NetworkContentRecord={id:randomUUID(),networkId,type:"announcement",title:`Initiator-Einladung ${email}`,description:"Persönliche Einladung als Initiator und Netzwerkadministrator",status:"active",createdByUserId:actor.id,assignedToUserId:null,startsAt:null,endsAt:new Date(Date.now()+14*86_400_000).toISOString(),visibility:"administrators",data:{kind:"network_invitation",email,role:"network_admin",inviteTokenHash:tokenHash(inviteToken),usedAt:null},createdAt:now,updatedAt:now};
   this.store.networkContents.set(invitation.id,invitation);await this.email.sendNetworkInvitation({email,networkName:network.name,networkSlug:network.slug,inviteToken});return{invited:true,email,registrationRequired:true,role:"network_admin"};
  }
  let companyMembership=this.store.memberships.find(item=>item.userId===userId);
  if(!companyMembership){const organization=this.createInitiatorOrganization(userId,network);companyMembership={organizationId:organization.id,userId,role:"admin"}}
  const membership=this.addMember(authorization,networkId,{organizationId:companyMembership.organizationId,userId,role:"network_admin"});
  await this.email.sendNetworkAccessGranted({email,networkName:network.name,networkSlug:network.slug});return membership;
 }

 remove(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requirePlatformAdmin(actor.id);const network=this.raw(networkId);
  if(input.confirmSlug!==network.slug)throw new BadRequestException("Zur Bestätigung muss die exakte Netzwerk-Kennung angegeben werden.");
  const networkMemberships=this.store.networkMemberships.filter(item=>item.networkId===networkId);
  const organizationIds=new Set(networkMemberships.map(item=>item.organizationId));
  const userIds=new Set(networkMemberships.map(item=>item.userId).filter(userId=>this.store.users.get(userId)?.accountRole!=="platform_admin"));
  let expanded=true;while(expanded){expanded=false;for(const membership of this.store.memberships){if(userIds.has(membership.userId)&&!organizationIds.has(membership.organizationId)){organizationIds.add(membership.organizationId);expanded=true}if(organizationIds.has(membership.organizationId)&&this.store.users.get(membership.userId)?.accountRole!=="platform_admin"&&!userIds.has(membership.userId)){userIds.add(membership.userId);expanded=true}}}
  const removedNetworkMembershipIds=new Set(this.store.networkMemberships.filter(item=>item.networkId===networkId||organizationIds.has(item.organizationId)||userIds.has(item.userId)).map(item=>item.id));
  const servicePageIds=new Set([...this.store.servicePages.values()].filter(item=>organizationIds.has(item.organizationId)).map(item=>item.id));
  const needIds=new Set([...this.store.needs.values()].filter(item=>item.networkId===networkId||organizationIds.has(item.organizationId)).map(item=>item.id));
  const matchIds=new Set([...this.store.matches.values()].filter(item=>needIds.has(item.needId)||servicePageIds.has(item.servicePageId)||organizationIds.has(item.buyerOrganizationId)||organizationIds.has(item.providerOrganizationId)).map(item=>item.id));
  const conversationIds=new Set([...this.store.conversations.values()].filter(item=>matchIds.has(item.matchId)).map(item=>item.id));
  for(const [id,item] of this.store.networkContents)if(item.networkId===networkId||userIds.has(item.createdByUserId)||userIds.has(item.assignedToUserId||""))this.store.networkContents.delete(id);
  for(const [id,item] of this.store.networkAttendances)if(item.networkId===networkId||removedNetworkMembershipIds.has(item.membershipId)||userIds.has(item.userId)||userIds.has(item.updatedByUserId))this.store.networkAttendances.delete(id);
  for(const [id,item] of this.store.networkRevenues)if(item.networkId===networkId||removedNetworkMembershipIds.has(item.referringMembershipId)||removedNetworkMembershipIds.has(item.beneficiaryMembershipId)||userIds.has(item.createdByUserId))this.store.networkRevenues.delete(id);
  for(const [id,item] of this.store.networkOrders)if(item.networkId===networkId||userIds.has(item.orderedByUserId))this.store.networkOrders.delete(id);
  for(const [id,item] of this.store.servicePages)if(servicePageIds.has(id))this.store.servicePages.delete(id);
  for(const [id] of this.store.needs)if(needIds.has(id))this.store.needs.delete(id);
  for(const id of matchIds)this.store.matches.delete(id);
  for(const id of conversationIds)this.store.conversations.delete(id);
  for(const [id,item] of this.store.meetings)if(matchIds.has(item.matchId)||userIds.has(item.createdByUserId))this.store.meetings.delete(id);
  for(const [id,item] of this.store.teamInvitations)if(organizationIds.has(item.organizationId)||userIds.has(item.invitedByUserId))this.store.teamInvitations.delete(id);
  for(const [id,item] of this.store.favorites)if(userIds.has(item.userId)||organizationIds.has(item.providerOrganizationId)||matchIds.has(item.matchId))this.store.favorites.delete(id);
  for(const [id,item] of this.store.userPreferences)if(userIds.has(item.userId))this.store.userPreferences.delete(id);
  for(const [id,item] of this.store.sessions)if(userIds.has(item.userId))this.store.sessions.delete(id);
  for(const [id,item] of this.store.verificationTokens)if(userIds.has(item.userId))this.store.verificationTokens.delete(id);
  for(const [id,item] of this.store.passwordResetTokens)if(userIds.has(item.userId))this.store.passwordResetTokens.delete(id);
  this.store.messages.splice(0,this.store.messages.length,...this.store.messages.filter(item=>!conversationIds.has(item.conversationId)&&!userIds.has(item.senderUserId)));
  this.store.networkMemberships.splice(0,this.store.networkMemberships.length,...this.store.networkMemberships.filter(item=>!removedNetworkMembershipIds.has(item.id)));
  this.store.memberships.splice(0,this.store.memberships.length,...this.store.memberships.filter(item=>!organizationIds.has(item.organizationId)&&!userIds.has(item.userId)));
  this.store.reviewDecisions.splice(0,this.store.reviewDecisions.length,...this.store.reviewDecisions.filter(item=>!organizationIds.has(item.organizationId)&&!userIds.has(item.reviewerId)));
  this.store.activities.splice(0,this.store.activities.length,...this.store.activities.filter(item=>item.data.networkId!==networkId&&!organizationIds.has(item.organizationId||"")&&!userIds.has(item.actorUserId||"")&&(!item.matchId||!matchIds.has(item.matchId))));
  this.store.notifications.splice(0,this.store.notifications.length,...this.store.notifications.filter(item=>!userIds.has(item.userId)&&item.data.networkId!==networkId));
  for(const organizationId of organizationIds)this.store.organizations.delete(organizationId);
  for(const userId of userIds){const user=this.store.users.get(userId);if(user)this.store.userByEmail.delete(user.email);this.store.users.delete(userId)}
  this.store.networks.delete(networkId);this.store.networkBySlug.delete(network.slug);
  return{deleted:true,id:networkId,slug:network.slug,deletedOrganizations:organizationIds.size,deletedUsers:userIds.size};
 }

 publicBySlug(authorization:string|undefined,slug:string){
  const user=this.auth.authenticate(authorization);const network=this.bySlug(slug);this.requireNetworkAccess(user.id,network.id);
  return {id:network.id,slug:network.slug,name:network.name,legalName:network.legalName,websiteUrl:network.websiteUrl,logoUrl:network.logoUrl,primaryColor:network.primaryColor,secondaryColor:network.secondaryColor,colors:{primary:network.primaryColor,secondary:network.secondaryColor},enabledModules:this.userModules(user.id,network.id),offeredModules:network.enabledModules,settings:network.settings,selfRegistration:network.settings.selfRegistration};
 }

 mine(authorization:string|undefined){
  const user=this.auth.authenticate(authorization);
  return this.store.networkMemberships.filter(item=>item.userId===user.id&&item.status==="active").map(item=>({membership:item,network:this.get(item.networkId),organization:this.store.organizations.get(item.organizationId)}));
 }

 claimInitiatorInvitation(authorization:string|undefined){
  const user=this.auth.authenticate(authorization);
  const existing=this.store.networkMemberships.find(item=>item.userId===user.id&&item.role==="network_admin"&&item.status==="active");
  if(existing){const network=this.raw(existing.networkId);return{claimed:false,alreadyAssigned:true,network:{id:network.id,slug:network.slug,name:network.name},membership:existing}}
  const invitation=[...this.store.networkContents.values()].filter(item=>item.data.kind==="network_invitation"&&item.data.role==="network_admin"&&item.data.email===user.email&&!item.data.usedAt&&item.endsAt&&Date.parse(item.endsAt)>Date.now()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  if(!invitation)return{claimed:false,alreadyAssigned:false};
  const network=this.raw(invitation.networkId);const accessible=network.status==="active"||(network.status==="trial"&&network.trialEndsAt&&Date.parse(network.trialEndsAt)>Date.now());if(!accessible)throw new BadRequestException("Die Initiator-Einladung ist nicht mehr verfügbar.");
  let companyMembership=this.store.memberships.find(item=>item.userId===user.id);if(!companyMembership){const organization=this.createInitiatorOrganization(user.id,network);companyMembership={organizationId:organization.id,userId:user.id,role:"admin"}}
  const now=new Date().toISOString(),membership=this.record(network.id,companyMembership.organizationId,user.id,"network_admin","active",invitation.createdByUserId);membership.reviewedByUserId=invitation.createdByUserId;membership.reviewedAt=now;membership.updatedAt=now;this.store.networkMemberships.push(membership);invitation.data.usedAt=now;
  return{claimed:true,alreadyAssigned:false,network:{id:network.id,slug:network.slug,name:network.name},membership};
 }

 applyAsPartner(authorization:string|undefined,input:Record<string,unknown>){
  this.auth.authenticate(authorization);void input;
  throw new ForbiddenException("Netzwerkmandanten können ausschließlich durch den Plattforminhaber angelegt werden.");
 }

 apply(authorization:string|undefined,slug:string,input:Record<string,unknown>){
  this.auth.authenticate(authorization);this.bySlug(slug);void input;
  throw new ForbiddenException("Der Beitritt zu diesem geschlossenen Netzwerk ist ausschließlich über einen persönlichen Einladungslink möglich.");
 }

 listMembers(authorization:string|undefined,networkId:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);const showBilling=this.isNetworkInitiator(user.id,networkId),manager=this.isNetworkManager(user.id,networkId),ownOrganizationIds=new Set(this.store.memberships.filter(item=>item.userId===user.id).map(item=>item.organizationId));
  return this.store.networkMemberships.filter(item=>item.networkId===networkId&&item.role!=="network_admin"&&(manager||item.status==="active")).map(item=>{const organization=this.store.organizations.get(item.organizationId),profile=organization?.networkProfile,canSeeProfile=Boolean(profile&&(profile.status==="published"||manager||ownOrganizationIds.has(item.organizationId))),subscription=showBilling?[...this.store.networkOrders.values()].filter(order=>order.networkId===networkId&&order.orderedByUserId===item.userId&&order.status==="accepted").map(order=>this.normalizeOrder(order)).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt))[0]:undefined;return{...item,user:this.publicUser(item.userId),organization:organization?{id:organization.id,displayName:organization.displayName,legalName:organization.legalName,websiteUrl:organization.websiteUrl,networkProfile:canSeeProfile?profile:null}:null,...(showBilling?{billing:subscription?{orderId:subscription.id,status:this.paymentStatus(subscription),dueAt:subscription.paymentDueAt,paidAt:subscription.paidAt,modules:subscription.selectedModules,startsAt:subscription.serviceStartsAt,endsAt:subscription.serviceEndsAt,remainingDays:subscription.serviceEndsAt?Math.max(0,Math.ceil((Date.parse(subscription.serviceEndsAt)-Date.now())/86_400_000)):0}:null}:{})}});
 }

 ownProfile(authorization:string|undefined,networkId:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);const membership=this.store.networkMemberships.find(item=>item.networkId===networkId&&item.userId===user.id&&item.status==="active");if(!membership)throw new ForbiddenException("Kein aktiver Netzwerkzugang.");if(membership.role==="network_admin"||user.accountRole==="platform_admin")throw new ForbiddenException("Initiatoren verwalten das Netzwerk und führen keine eigene Partnerseite.");const organization=this.store.organizations.get(membership.organizationId);if(!organization)throw new NotFoundException("Unternehmen nicht gefunden.");return{organization:{id:organization.id,legalName:organization.legalName,displayName:organization.displayName,websiteUrl:organization.websiteUrl},profile:organization.networkProfile||null,canEdit:membership.role==="organization_admin"};
 }

 updateOwnProfile(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);this.requireEnabledModule(networkId,"profiles",user.id);const membership=this.store.networkMemberships.find(item=>item.networkId===networkId&&item.userId===user.id&&item.status==="active");if(!membership)throw new ForbiddenException("Kein aktiver Netzwerkzugang.");if(membership.role==="network_admin"||user.accountRole==="platform_admin")throw new ForbiddenException("Initiatoren verwalten das Netzwerk und führen keine eigene Partnerseite.");if(membership.role!=="organization_admin")throw new ForbiddenException("Nur der Unternehmensadministrator darf die Partnerseite bearbeiten.");const organization=this.store.organizations.get(membership.organizationId);if(!organization)throw new NotFoundException("Unternehmen nicht gefunden.");const publish=input.publish===true,logoUrl=typeof input.logoUrl==="string"&&input.logoUrl.trim()?input.logoUrl.trim():null;if(logoUrl&&!(logoUrl.startsWith("data:image/")||safeUrl(logoUrl)))throw new BadRequestException("Das Logo muss eine Bilddatei oder eine gültige URL sein.");if(logoUrl?.startsWith("data:image/")&&logoUrl.length>2_000_000)throw new BadRequestException("Die Logodatei ist zu groß. Maximal 1,5 MB.");const previous=organization.networkProfile;const now=new Date().toISOString();const profile:NetworkPartnerProfile={status:publish?"published":"draft",logoUrl,companyName:requiredText(input.companyName||organization.displayName,"Unternehmensname",2,160),tagline:requiredText(input.tagline,"Kurzversprechen",5,180),description:requiredText(input.description,"Unternehmensbeschreibung",30,3000),services:requiredText(input.services,"Leistungen",10,2000),industries:typeof input.industries==="string"?input.industries.trim().slice(0,800):"",street:requiredText(input.street,"Straße und Hausnummer",3,200),postalCode:requiredText(input.postalCode,"Postleitzahl",4,12),city:requiredText(input.city,"Ort",2,120),country:requiredText(input.country||"Deutschland","Land",2,80),websiteUrl:safeUrl(input.websiteUrl),contactName:requiredText(input.contactName,"Ansprechpartner",3,160),contactPosition:requiredText(input.contactPosition,"Position",2,160),contactEmail:emailAddress(input.contactEmail),contactPhone:requiredText(input.contactPhone,"Telefon",5,60),updatedAt:now,publishedAt:publish?(previous?.publishedAt||now):null};organization.networkProfile=profile;organization.displayName=profile.companyName;organization.websiteUrl=profile.websiteUrl;return profile;
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
  const company=this.store.memberships.find(item=>item.userId===userId);if(!company)throw new BadRequestException("Das Konto ist noch keinem Unternehmen zugeordnet.");const requested=String(input.role||"member");const role:NetworkRole=["moderator","organization_admin","member"].includes(requested)?requested as NetworkRole:"member";
  const existing=this.store.networkMemberships.find(item=>item.networkId===networkId&&item.organizationId===company.organizationId&&item.userId===userId&&item.status==="active");
  await this.email.sendNetworkAccessGranted({email,networkName:network.name,networkSlug:network.slug});
  if(existing)return{invited:true,email,registrationRequired:false,alreadyActive:true,membership:existing};
  const membership=this.addMember(authorization,networkId,{organizationId:company.organizationId,userId,role});return{invited:true,email,registrationRequired:false,alreadyActive:false,membership};
 }

 membershipStatus(authorization:string|undefined,networkId:string,membershipId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkManagement(actor.id,networkId);const membership=this.store.networkMemberships.find(item=>item.id===membershipId&&item.networkId===networkId);if(!membership)throw new NotFoundException("Netzwerkmitgliedschaft nicht gefunden.");const status=String(input.status);if(!["active","rejected","suspended","left"].includes(status))throw new BadRequestException("Ungültiger Mitgliederstatus.");membership.status=status as NetworkMembershipRecord["status"];membership.reviewedByUserId=actor.id;membership.reviewedAt=new Date().toISOString();membership.updatedAt=membership.reviewedAt;return membership;
 }

 listContent(authorization:string|undefined,networkId:string,type?:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);this.ensureModule(this.raw(networkId),type,user.id);
  const canSeeAdministrativeContent=this.isNetworkManager(user.id,networkId);
  return [...this.store.networkContents.values()].filter(item=>item.networkId===networkId&&(!type||item.type===type)&&(item.visibility!=="administrators"||canSeeAdministrativeContent)).map(item=>item.type==="event"?{...item,attendanceSummary:this.eventAttendanceSummary(networkId,item.id)}:item).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }

 createContent(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);const network=this.raw(networkId);
  const allowed:NetworkContentType[]=["event","topic","announcement","poll","task","document","conversation","need","service"];
  const type=String(input.type) as NetworkContentType;if(!allowed.includes(type))throw new BadRequestException("Ungültiger Netzwerkinhalt.");
  this.ensureModule(network,type,user.id);this.requireContentCreation(user.id,networkId,type);
  const now=new Date().toISOString();const record:NetworkContentRecord={id:randomUUID(),networkId,type,title:requiredText(input.title,"Titel",2,200),description:requiredText(input.description,"Beschreibung",2,5000),status:["draft","published","active","completed","archived"].includes(String(input.status))?input.status as NetworkContentRecord["status"]:"published",createdByUserId:user.id,assignedToUserId:typeof input.assignedToUserId==="string"&&input.assignedToUserId?input.assignedToUserId:null,startsAt:this.optionalDate(input.startsAt),endsAt:this.optionalDate(input.endsAt),visibility:input.visibility==="administrators"?"administrators":"members",data:typeof input.data==="object"&&input.data!==null?input.data as Record<string,unknown>:{},createdAt:now,updatedAt:now};
  this.store.networkContents.set(record.id,record);this.store.activities.push({id:randomUUID(),matchId:null,organizationId:null,actorUserId:user.id,type:`network.${type}.created`,visibility:"platform_internal",data:{networkId,contentId:record.id,title:record.title},createdAt:now});return record;
 }

 updateContent(authorization:string|undefined,networkId:string,contentId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);const record=this.store.networkContents.get(contentId);if(!record||record.networkId!==networkId)throw new NotFoundException("Netzwerkinhalt nicht gefunden.");this.ensureModule(this.raw(networkId),record.type,user.id);this.requireContentUpdate(user.id,networkId,record);
  if(typeof input.title==="string")record.title=requiredText(input.title,"Titel",2,200);if(typeof input.description==="string")record.description=requiredText(input.description,"Beschreibung",2,5000);if(["draft","published","active","completed","archived"].includes(String(input.status)))record.status=input.status as NetworkContentRecord["status"];
  if(typeof input.data==="object"&&input.data!==null){const data=input.data as Record<string,unknown>;if(record.type==="event"&&data.recapImages!==undefined){if(!Array.isArray(data.recapImages)||data.recapImages.length>6)throw new BadRequestException("Ein Rückblick darf höchstens sechs Bilder enthalten.");for(const image of data.recapImages){if(typeof image!=="string"||!image.startsWith("data:image/")||image.length>2_000_000)throw new BadRequestException("Rückblickbilder müssen Bilddateien mit maximal 1,5 MB sein.")}}record.data={...record.data,...data}}
  record.updatedAt=new Date().toISOString();return record;
 }

 attendance(authorization:string|undefined,networkId:string,eventId:string){
  const actor=this.auth.authenticate(authorization);this.requireNetworkAccess(actor.id,networkId);this.requireEnabledModule(networkId,"events",actor.id);this.event(networkId,eventId);
  const own=this.store.networkMemberships.find(item=>item.networkId===networkId&&item.userId===actor.id&&item.status==="active");
  return [...this.store.networkAttendances.values()].filter(item=>item.networkId===networkId&&item.eventId===eventId&&(this.isNetworkManager(actor.id,networkId)||item.membershipId===own?.id)).map(item=>this.attendanceView(item)).sort((a,b)=>a.memberName.localeCompare(b.memberName,"de"));
 }

 updateOwnAttendance(authorization:string|undefined,networkId:string,eventId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireWritableNetwork(actor.id,networkId);this.requireEnabledModule(networkId,"events",actor.id);this.event(networkId,eventId);
  const membership=this.store.networkMemberships.find(item=>item.networkId===networkId&&item.userId===actor.id&&item.status==="active");if(!membership)throw new ForbiddenException("Keine aktive Netzwerkmitgliedschaft.");
  return this.saveAttendance(actor.id,networkId,eventId,membership.id,input,false);
 }

 updateMemberAttendance(authorization:string|undefined,networkId:string,eventId:string,membershipId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkManagement(actor.id,networkId);this.requireEnabledModule(networkId,"events");this.event(networkId,eventId);this.member(networkId,membershipId);
  return this.saveAttendance(actor.id,networkId,eventId,membershipId,input,true);
 }

 revenues(authorization:string|undefined,networkId:string){
  const actor=this.auth.authenticate(authorization);this.requireNetworkAdmin(actor.id,networkId);this.requireEnabledModule(networkId,"revenue");
  return [...this.store.networkRevenues.values()].filter(item=>item.networkId===networkId).map(item=>this.revenueView(item)).sort((a,b)=>b.periodTo.localeCompare(a.periodTo));
 }

 createRevenue(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkAdmin(actor.id,networkId);this.requireWritableNetwork(actor.id,networkId);this.requireEnabledModule(networkId,"revenue");
  const referringMembershipId=String(input.referringMembershipId||""),beneficiaryMembershipId=String(input.beneficiaryMembershipId||"");this.member(networkId,referringMembershipId);this.member(networkId,beneficiaryMembershipId);
  const periodFrom=this.dateOnly(input.periodFrom,"Zeitraum von"),periodTo=this.dateOnly(input.periodTo,"Zeitraum bis");if(periodTo<periodFrom)throw new BadRequestException("Das Ende des Zeitraums liegt vor dem Beginn.");
  const now=new Date().toISOString(),record:NetworkRevenueRecord={id:randomUUID(),networkId,referringMembershipId,beneficiaryMembershipId,amountNetCents:this.money(input.amount),periodFrom,periodTo,status:this.revenueStatus(input.status),note:this.note(input.note),createdByUserId:actor.id,createdAt:now,updatedAt:now};this.store.networkRevenues.set(record.id,record);return this.revenueView(record);
 }

 updateRevenue(authorization:string|undefined,networkId:string,revenueId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requireNetworkAdmin(actor.id,networkId);this.requireWritableNetwork(actor.id,networkId);this.requireEnabledModule(networkId,"revenue");const record=this.store.networkRevenues.get(revenueId);if(!record||record.networkId!==networkId)throw new NotFoundException("Umsatzdatensatz nicht gefunden.");
  if(input.referringMembershipId!==undefined){record.referringMembershipId=String(input.referringMembershipId);this.member(networkId,record.referringMembershipId)}if(input.beneficiaryMembershipId!==undefined){record.beneficiaryMembershipId=String(input.beneficiaryMembershipId);this.member(networkId,record.beneficiaryMembershipId)}if(input.amount!==undefined)record.amountNetCents=this.money(input.amount);if(input.periodFrom!==undefined)record.periodFrom=this.dateOnly(input.periodFrom,"Zeitraum von");if(input.periodTo!==undefined)record.periodTo=this.dateOnly(input.periodTo,"Zeitraum bis");if(record.periodTo<record.periodFrom)throw new BadRequestException("Das Ende des Zeitraums liegt vor dem Beginn.");if(input.status!==undefined)record.status=this.revenueStatus(input.status);if(input.note!==undefined)record.note=this.note(input.note);record.updatedAt=new Date().toISOString();return this.revenueView(record);
 }

 dashboard(authorization:string|undefined,networkId:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);const network=this.raw(networkId),members=this.store.networkMemberships.filter(item=>item.networkId===networkId),partners=members.filter(item=>item.role!=="network_admin"),contents=[...this.store.networkContents.values()].filter(item=>item.networkId===networkId&&item.data.kind!=="network_invitation");const visible=contents.filter(item=>item.visibility==="members"&&["published","active","completed"].includes(item.status)),events=visible.filter(item=>item.type==="event"),now=new Date().toISOString();const recentMembers=partners.filter(item=>item.status==="active").sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,5).flatMap(item=>{const organization=this.store.organizations.get(item.organizationId);return organization?[{id:item.id,name:organization.displayName,joinedAt:item.updatedAt,logoUrl:organization.networkProfile?.logoUrl||null}]:[]});return{network,members:{total:partners.length,active:partners.filter(item=>item.status==="active").length,pending:partners.filter(item=>item.status==="pending").length},content:{total:contents.length,events:contents.filter(item=>item.type==="event").length,topics:contents.filter(item=>["topic","announcement","poll"].includes(item.type)).length,tasks:contents.filter(item=>item.type==="task"&&item.status!=="completed").length,documents:contents.filter(item=>item.type==="document").length},recent:visible.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,8),recentMembers,upcomingEvents:events.filter(item=>item.startsAt&&item.startsAt>=now).sort((a,b)=>(a.startsAt||"").localeCompare(b.startsAt||"")).slice(0,4),eventRecaps:events.filter(item=>typeof item.data.recapSummary==="string"&&item.data.recapSummary).sort((a,b)=>(b.startsAt||b.updatedAt).localeCompare(a.startsAt||a.updatedAt)).slice(0,4),announcements:visible.filter(item=>item.type==="announcement").sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,4)};
 }

 orders(authorization:string|undefined,networkId:string){
  const user=this.auth.authenticate(authorization);this.requireNetworkAccess(user.id,networkId);const canReview=this.isNetworkInitiator(user.id,networkId);
  return [...this.store.networkOrders.values()].filter(item=>item.networkId===networkId&&(canReview||item.orderedByUserId===user.id)).map(item=>this.normalizeOrder(item)).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
 }

 order(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization),network=this.raw(networkId);this.requireNetworkAccess(user.id,networkId);
  if(network.status!=="active")throw new BadRequestException("Eine persönliche Modulbuchung ist erst im aktivierten Netzwerk möglich.");
  if([...this.store.networkOrders.values()].some(item=>item.networkId===networkId&&item.orderedByUserId===user.id&&["submitted","accepted"].includes(item.status)))throw new ConflictException("Für Ihren Zugang besteht bereits eine aktive oder offene Modulbuchung.");
  const billingCycle=String(input.billingCycle);if(billingCycle!=="annual")throw new BadRequestException("Alle Modulpreise werden für zwölf Monate im Voraus abgerechnet.");
  const participantCount=1;
  const allowed=allProductModuleIds(),offered=network.enabledModules.filter(module=>allowed.includes(module)),pricingMode=input.pricingMode==="complete"?"complete":"individual";if(pricingMode==="complete"&&offered.length!==allowed.length)throw new BadRequestException("Das Komplettpaket ist nur verfügbar, wenn der Initiator alle Module anbietet.");const requested=Array.isArray(input.selectedModules)?input.selectedModules.map(String).filter((item):item is NetworkModule=>offered.includes(item as NetworkModule)):[],selectedModules=pricingMode==="complete"?offered:[...new Set(requested)];
  if(!selectedModules.includes("profiles"))throw new BadRequestException("Das Basis-Modul Unternehmensseiten ist verpflichtend.");
  const moduleUnitPrices=Object.fromEntries(NETWORK_MODULE_CATALOG.filter(item=>selectedModules.includes(item.id)).map(item=>[item.id,item.unitNetCents])) as Partial<Record<NetworkModule,number>>,unitNetCents=pricingMode==="complete"?NETWORK_COMPLETE_UNIT_NET_CENTS:Object.values(moduleUnitPrices).reduce((sum,value)=>sum+(value||0),0),monthlyNetCents=unitNetCents*participantCount;
  if(input.authorityConfirmed!==true||input.termsAccepted!==true||input.paymentObligationAccepted!==true)throw new BadRequestException("Für die verbindliche Bestellung müssen alle erforderlichen Erklärungen bestätigt werden.");
  const now=new Date().toISOString();const record:NetworkOrderRecord={
   id:randomUUID(),networkId,orderedByUserId:user.id,
   invoiceCompany:requiredText(input.invoiceCompany,"Rechnungsempfänger",2,200),invoiceContact:requiredText(input.invoiceContact,"Ansprechpartner",2,160),invoiceEmail:requiredText(input.invoiceEmail,"Rechnungs-E-Mail",5,250).toLowerCase(),
   invoiceStreet:requiredText(input.invoiceStreet,"Straße und Hausnummer",3,200),invoicePostalCode:requiredText(input.invoicePostalCode,"Postleitzahl",4,12),invoiceCity:requiredText(input.invoiceCity,"Ort",2,120),invoiceCountry:requiredText(input.invoiceCountry,"Land",2,80),
   billingCycle:billingCycle as NetworkOrderRecord["billingCycle"],purchaseOrderReference:typeof input.purchaseOrderReference==="string"&&input.purchaseOrderReference.trim()?input.purchaseOrderReference.trim().slice(0,120):null,
   participantCount,selectedModules,pricingMode,moduleUnitPrices,monthlyNetCents,setupNetCents:0,minimumTermMonths:12,termsVersion:"2026-10-08",pricingVersion:"network-user-modules-2026-10",
   authorityConfirmed:true,termsAccepted:true,paymentObligationAccepted:true,status:"accepted",submittedAt:now,decidedAt:now,decidedByUserId:null,paymentStatus:"open",paymentDueAt:new Date(Date.now()+14*86_400_000).toISOString(),paidAt:null,serviceStartsAt:now,serviceEndsAt:new Date(new Date(now).setFullYear(new Date(now).getFullYear()+1)).toISOString()
  };
  this.store.networkOrders.set(record.id,record);this.store.activities.push({id:randomUUID(),matchId:null,organizationId:null,actorUserId:user.id,type:"network.subscription.activated",visibility:"platform_internal",data:{networkId,orderId:record.id,billingCycle},createdAt:now});
  void this.email.sendNetworkOrderConfirmation({email:record.invoiceEmail,contact:record.invoiceContact,networkName:network.name,orderId:record.id,billingCycle:record.billingCycle,monthlyNetCents:record.monthlyNetCents}).catch(()=>undefined);
  return record;
 }

 updateOrderPayment(authorization:string|undefined,networkId:string,orderId:string,input:Record<string,unknown>){const actor=this.auth.authenticate(authorization);this.requirePlatformAdmin(actor.id);const order=this.store.networkOrders.get(orderId);if(!order||order.networkId!==networkId)throw new NotFoundException("Buchung nicht gefunden.");const status=String(input.status);if(!["open","paid","overdue"].includes(status))throw new BadRequestException("Ungültiger Rechnungsstatus.");order.paymentStatus=status as "open"|"paid"|"overdue";order.paidAt=status==="paid"?new Date().toISOString():null;return this.normalizeOrder(order)}

 decideOrder(authorization:string|undefined,networkId:string,orderId:string,input:Record<string,unknown>){
  const actor=this.auth.authenticate(authorization);this.requirePlatformAdmin(actor.id);const network=this.raw(networkId),order=this.store.networkOrders.get(orderId);
  if(!order||order.networkId!==networkId)throw new NotFoundException("Bestellung nicht gefunden.");this.normalizeOrder(order);if(order.status!=="submitted")throw new BadRequestException("Diese Bestellung wurde bereits entschieden.");
  const decision=String(input.decision);if(!["accepted","rejected"].includes(decision))throw new BadRequestException("Ungültige Bestellentscheidung.");
  order.status=decision as "accepted"|"rejected";order.decidedAt=new Date().toISOString();order.decidedByUserId=actor.id;
  if(decision==="accepted")network.updatedAt=order.decidedAt;
  this.store.activities.push({id:randomUUID(),matchId:null,organizationId:null,actorUserId:actor.id,type:`network.order.${decision}`,visibility:"platform_internal",data:{networkId,orderId},createdAt:order.decidedAt});return{order,network};
 }

 updateSettings(authorization:string|undefined,networkId:string,input:Record<string,unknown>){
  const user=this.auth.authenticate(authorization);this.requireNetworkInitiator(user.id,networkId);const network=this.raw(networkId);
  if(typeof input.name==="string")network.name=requiredText(input.name,"Netzwerkname",2,160);if(typeof input.legalName==="string")network.legalName=input.legalName.trim()||null;if(typeof input.websiteUrl==="string")network.websiteUrl=input.websiteUrl.trim()||null;
  if(typeof input.logoUrl==="string"){const logo=input.logoUrl.trim();if(logo&&!(logo.startsWith("data:image/")||safeUrl(logo)))throw new BadRequestException("Das Netzwerklogo muss eine Bilddatei oder gültige URL sein.");if(logo.startsWith("data:image/")&&logo.length>2_000_000)throw new BadRequestException("Das Netzwerklogo ist zu groß. Maximal 1,5 MB.");network.logoUrl=logo||null}if(typeof input.primaryColor==="string"&&/^#[0-9a-f]{6}$/i.test(input.primaryColor))network.primaryColor=input.primaryColor;if(typeof input.secondaryColor==="string"&&/^#[0-9a-f]{6}$/i.test(input.secondaryColor))network.secondaryColor=input.secondaryColor;
  if(Array.isArray(input.enabledModules)){const allowed=allProductModuleIds(),selected=input.enabledModules.map(String).filter((item):item is NetworkModule=>allowed.includes(item as NetworkModule));if(!selected.includes("profiles"))throw new BadRequestException("Unternehmensseiten müssen im Netzwerk angeboten werden.");network.enabledModules=expandNetworkModules(selected)}
  network.settings.closedNetwork=true;network.settings.selfRegistration=false;network.settings.crossNetworkMatching=false;if(typeof input.admissionRules==="string")network.settings.admissionRules=input.admissionRules.trim()||null;network.updatedAt=new Date().toISOString();if(input.completeSetup===true)network.settings.setupCompletedAt=network.updatedAt;return network;
 }

 private record(networkId:string,organizationId:string,userId:string,role:NetworkRole,status:NetworkMembershipRecord["status"],invitedByUserId:string|null):NetworkMembershipRecord{const now=new Date().toISOString();return{id:randomUUID(),networkId,organizationId,userId,role,status,invitedByUserId,reviewedByUserId:null,reviewedAt:null,createdAt:now,updatedAt:now}}
 private createInitiatorOrganization(userId:string,network:NetworkRecord){const websiteUrl=network.websiteUrl;const organization={id:randomUUID(),legalName:network.legalName||network.name,displayName:network.name,role:"network" as const,websiteUrl,emailDomain:websiteUrl?new URL(websiteUrl).hostname.replace(/^www\./,""):null,reviewStatus:"draft" as const,submittedAt:null,approvedAt:null,createdAt:new Date().toISOString()};this.store.organizations.set(organization.id,organization);this.store.memberships.push({organizationId:organization.id,userId,role:"admin"});return organization}
 private bySlug(slug:string){const id=this.store.networkBySlug.get(slug);if(!id)throw new NotFoundException("Netzwerk nicht gefunden.");return this.get(id)}
 private get(id:string){const network=this.raw(id);if(network.status==="active")return network;if(network.status==="trial"&&network.trialEndsAt&&Date.parse(network.trialEndsAt)>Date.now())return network;throw new NotFoundException("Netzwerk nicht gefunden oder nicht freigeschaltet.")}
 private raw(id:string){const network=this.store.networks.get(id);if(!network)throw new NotFoundException("Netzwerk nicht gefunden.");return network}
 private requirePlatformAdmin(userId:string){if(this.store.users.get(userId)?.accountRole!=="platform_admin")throw new ForbiddenException("Nur die Plattformadministration darf Netzwerkpartner freischalten.")}
 private requireNetworkManagementOrTrialAdmin(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&item.role==="network_admin"))throw new ForbiddenException("Nur die verantwortliche Netzwerkadministration darf diese Buchung verwalten.")}
 private requireNetworkInitiator(userId:string,networkId:string){if(!this.isNetworkInitiator(userId,networkId))throw new ForbiddenException("Nur der Initiator des Netzwerks darf Module und Whitelabel-Einstellungen verwalten.")}
 private requireNetworkManagement(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;const network=this.raw(networkId);if(network.status==="trial")throw new ForbiddenException("Im 10-Tage-Testzugang ist nur die unverbindliche Ansicht möglich. Zum Speichern, Einladen oder Veröffentlichen muss das Netzwerkportal gebucht und aktiviert werden.");if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&["network_admin","moderator"].includes(item.role)))throw new ForbiddenException("Keine Berechtigung zur Netzwerkverwaltung.")}
 private requireNetworkAccess(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"))throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.")}
 private requireNetworkAdmin(userId:string,networkId:string){if(this.store.users.get(userId)?.accountRole==="platform_admin")return;this.requireWritableNetwork(userId,networkId);if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&item.role==="network_admin"))throw new ForbiddenException("Vermittelte Umsätze sind ausschließlich für berechtigte Netzwerkadministratoren sichtbar.")}
 private requireWritableNetwork(userId:string,networkId:string){this.requireNetworkAccess(userId,networkId);if(this.raw(networkId).status==="trial")throw new ForbiddenException("Die Testansicht ist schreibgeschützt.")}
 private requireEnabledModule(networkId:string,module:NetworkModule,userId?:string){const network=this.raw(networkId);if(network.status!=="active")return;if(!network.enabledModules.includes(module))throw new ForbiddenException("Dieses Netzwerkmodul wird vom Initiator nicht angeboten.");if(userId&&!this.userModules(userId,networkId).includes(module))throw new ForbiddenException("Dieses Modul ist für Ihren Zugang nicht gebucht.")}
 private normalizeOrder(order:NetworkOrderRecord){order.participantCount=Number.isInteger(order.participantCount)&&order.participantCount>0?order.participantCount:1;order.selectedModules=Array.isArray(order.selectedModules)&&order.selectedModules.length?order.selectedModules:allProductModuleIds();order.pricingMode=order.pricingMode==="individual"?"individual":"complete";order.moduleUnitPrices=order.moduleUnitPrices||{};order.paymentStatus=order.paymentStatus||"open";order.paymentDueAt=order.paymentDueAt||new Date(Date.parse(order.submittedAt)+14*86_400_000).toISOString();order.paidAt=order.paidAt||null;order.serviceStartsAt=order.serviceStartsAt||order.decidedAt||order.submittedAt;order.serviceEndsAt=order.serviceEndsAt||new Date(new Date(order.serviceStartsAt).setFullYear(new Date(order.serviceStartsAt).getFullYear()+1)).toISOString();return order}
 private paymentStatus(order:NetworkOrderRecord){return order.paymentStatus==="open"&&order.paymentDueAt&&Date.parse(order.paymentDueAt)<Date.now()?"overdue":order.paymentStatus||"open"}
 private isNetworkManager(userId:string,networkId:string){return this.store.users.get(userId)?.accountRole==="platform_admin"||this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&["network_admin","moderator"].includes(item.role))}
 private isNetworkInitiator(userId:string,networkId:string){return this.store.users.get(userId)?.accountRole==="platform_admin"||this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&item.role==="network_admin")}
 private userModules(userId:string,networkId:string){const network=this.raw(networkId);if(this.isNetworkInitiator(userId,networkId)||network.status==="trial")return network.enabledModules;const order=[...this.store.networkOrders.values()].filter(item=>item.networkId===networkId&&item.orderedByUserId===userId&&item.status==="accepted").map(item=>this.normalizeOrder(item)).sort((a,b)=>(b.decidedAt||b.submittedAt).localeCompare(a.decidedAt||a.submittedAt))[0];return order?expandNetworkModules(order.selectedModules).filter(module=>network.enabledModules.includes(module)):NETWORK_INCLUDED_MODULES.filter(module=>network.enabledModules.includes(module))}
 private event(networkId:string,eventId:string){const event=this.store.networkContents.get(eventId);if(!event||event.networkId!==networkId||event.type!=="event")throw new NotFoundException("Veranstaltung nicht gefunden.");return event}
 private member(networkId:string,membershipId:string){const membership=this.store.networkMemberships.find(item=>item.id===membershipId&&item.networkId===networkId&&item.status==="active");if(!membership)throw new NotFoundException("Aktives Netzwerkmitglied nicht gefunden.");return membership}
 private saveAttendance(actorId:string,networkId:string,eventId:string,membershipId:string,input:Record<string,unknown>,manager:boolean){const membership=this.member(networkId,membershipId),response=String(input.response);if(!["registered","declined"].includes(response))throw new BadRequestException("Bitte An- oder Abmeldung auswählen.");const attendance=manager&&["pending","present","absent"].includes(String(input.attendance))?String(input.attendance) as NetworkAttendanceRecord["attendance"]:"pending",guestNames=Array.isArray(input.guestNames)?input.guestNames.map(String).map(value=>value.trim()).filter(Boolean).slice(0,20):typeof input.guestNames==="string"?input.guestNames.split(/\r?\n|,/).map(value=>value.trim()).filter(Boolean).slice(0,20):[],companionCount=Math.max(0,Math.min(20,Number(input.companionCount)||0)),now=new Date().toISOString(),existing=[...this.store.networkAttendances.values()].find(item=>item.eventId===eventId&&item.membershipId===membershipId);const record:NetworkAttendanceRecord=existing??{id:randomUUID(),networkId,eventId,membershipId,userId:membership.userId,response:"registered",attendance:"pending",guestNames:[],companionCount:0,note:null,updatedByUserId:actorId,createdAt:now,updatedAt:now};record.response=response as NetworkAttendanceRecord["response"];record.attendance=attendance;record.guestNames=guestNames;record.companionCount=companionCount;record.note=this.note(input.note);record.updatedByUserId=actorId;record.updatedAt=now;this.store.networkAttendances.set(record.id,record);return this.attendanceView(record)}
 private attendanceView(record:NetworkAttendanceRecord){const membership=this.member(record.networkId,record.membershipId),user=this.store.users.get(membership.userId),organization=this.store.organizations.get(membership.organizationId);return{...record,memberName:user?`${user.firstName} ${user.lastName}`.trim():"Mitglied",organizationName:organization?.displayName||organization?.legalName||"Unternehmen"}}
 private eventAttendanceSummary(networkId:string,eventId:string){const registrations=[...this.store.networkAttendances.values()].filter(item=>item.networkId===networkId&&item.eventId===eventId&&item.response==="registered");return{registrations:registrations.length,persons:registrations.reduce((sum,item)=>sum+1+item.companionCount+item.guestNames.length,0)}}
 private revenueView(record:NetworkRevenueRecord){const referring=this.member(record.networkId,record.referringMembershipId),beneficiary=this.member(record.networkId,record.beneficiaryMembershipId),name=(membership:NetworkMembershipRecord)=>{const organization=this.store.organizations.get(membership.organizationId),user=this.store.users.get(membership.userId);return{membershipId:membership.id,organizationName:organization?.displayName||organization?.legalName||"Unternehmen",contactName:user?`${user.firstName} ${user.lastName}`.trim():"Mitglied"}};return{...record,referring:name(referring),beneficiary:name(beneficiary)}}
 private money(value:unknown){const normalized=typeof value==="string"?value.replace(/\./g,"").replace(",","."):value,amount=Number(normalized);if(!Number.isFinite(amount)||amount<0)throw new BadRequestException("Bitte einen gültigen Umsatzbetrag eingeben.");return Math.round(amount*100)}
 private dateOnly(value:unknown,label:string){if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new BadRequestException(`${label} fehlt oder ist ungültig.`);return value}
 private revenueStatus(value:unknown):NetworkRevenueRecord["status"]{const status=String(value||"recorded");if(!["recorded","confirmed","paid","cancelled"].includes(status))throw new BadRequestException("Ungültiger Umsatzstatus.");return status as NetworkRevenueRecord["status"]}
 private note(value:unknown){return typeof value==="string"&&value.trim()?value.trim().slice(0,1000):null}
 private requireContentCreation(userId:string,networkId:string,type:NetworkContentType){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;const network=this.raw(networkId);if(network.status==="trial")throw new ForbiddenException("Die Testansicht ist schreibgeschützt.");const membership=this.store.networkMemberships.find(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active");if(!membership)throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.");if(["network_admin","moderator"].includes(membership.role))return;if(!["conversation","need","service","topic","poll"].includes(type))throw new ForbiddenException("Dieser Inhalt kann nur durch die Netzwerkverwaltung angelegt werden.")}
 private requireContentUpdate(userId:string,networkId:string,record:NetworkContentRecord){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;const network=this.raw(networkId);if(network.status==="trial")throw new ForbiddenException("Die Testansicht ist schreibgeschützt.");const membership=this.store.networkMemberships.find(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active");if(!membership)throw new ForbiddenException("Kein Zugriff auf dieses Netzwerk.");if(record.createdByUserId!==userId&&!["network_admin","moderator"].includes(membership.role))throw new ForbiddenException("Sie dürfen nur eigene Inhalte bearbeiten.")}
 private ensureModule(network:NetworkRecord,type?:string,userId?:string){if(!type)return;const moduleByType:Partial<Record<NetworkContentType,NetworkModule>>={event:"events",topic:"community",announcement:"community",poll:"community",task:"tasks",document:"documents",conversation:"communication",need:"matching",service:"services"};const module=moduleByType[type as NetworkContentType];if(module)this.requireEnabledModule(network.id,module,userId)}
 private optionalDate(value:unknown){if(typeof value!=="string"||!value.trim())return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new BadRequestException("Ungültiges Datum.");return date.toISOString()}
 private publicUser(userId:string){const user=this.store.users.get(userId);return user?{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email}:null}
}
