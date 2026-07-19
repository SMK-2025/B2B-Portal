import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException} from "@nestjs/common";
import {randomUUID} from "node:crypto";
import {AuthService} from "../auth/auth.service";
import type {NetworkMembershipRecord,NetworkRole} from "../core/domain";
import {PortalStore} from "../core/portal.store";
import {requiredText} from "../core/validation";

@Injectable()
export class NetworksService{
 constructor(@Inject(PortalStore)private readonly store:PortalStore,@Inject(AuthService)private readonly auth:AuthService){}

 publicBySlug(slug:string){
  const network=this.bySlug(slug);
  return {id:network.id,slug:network.slug,name:network.name,websiteUrl:network.websiteUrl,logoUrl:network.logoUrl,colors:{primary:network.primaryColor,secondary:network.secondaryColor},enabledModules:network.enabledModules,selfRegistration:network.settings.selfRegistration};
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
  if(!this.store.organizations.has(organizationId)||!this.store.users.has(userId))throw new NotFoundException("Benutzer oder Unternehmen nicht gefunden.");
  if(this.store.networkMemberships.some(item=>item.networkId===networkId&&item.organizationId===organizationId&&item.userId===userId&&item.status==="active"))throw new ConflictException("Die Person ist bereits aktives Netzwerkmitglied.");
  const membership=this.record(networkId,organizationId,userId,role,"active",actor.id);membership.reviewedByUserId=actor.id;membership.reviewedAt=membership.createdAt;
  this.store.networkMemberships.push(membership);return membership;
 }

 private record(networkId:string,organizationId:string,userId:string,role:NetworkRole,status:NetworkMembershipRecord["status"],invitedByUserId:string|null):NetworkMembershipRecord{const now=new Date().toISOString();return{id:randomUUID(),networkId,organizationId,userId,role,status,invitedByUserId,reviewedByUserId:null,reviewedAt:null,createdAt:now,updatedAt:now}}
 private bySlug(slug:string){const id=this.store.networkBySlug.get(slug);if(!id)throw new NotFoundException("Netzwerk nicht gefunden.");return this.get(id)}
 private get(id:string){const network=this.store.networks.get(id);if(!network||network.status!=="active")throw new NotFoundException("Netzwerk nicht gefunden.");return network}
 private requireNetworkManagement(userId:string,networkId:string){const user=this.store.users.get(userId);if(user?.accountRole==="platform_admin")return;if(!this.store.networkMemberships.some(item=>item.userId===userId&&item.networkId===networkId&&item.status==="active"&&["network_admin","moderator"].includes(item.role)))throw new ForbiddenException("Keine Berechtigung zur Netzwerkverwaltung.")}
 private publicUser(userId:string){const user=this.store.users.get(userId);return user?{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email}:null}
}
