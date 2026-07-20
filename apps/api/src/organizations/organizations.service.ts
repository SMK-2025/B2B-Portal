import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { PortalStore } from "../core/portal.store";
import type { OrganizationRole } from "../core/domain";
import type { OrganizationRecord } from "../core/domain";
import { requiredText, safeUrl } from "../core/validation";

@Injectable()
export class OrganizationsService {
  constructor(@Inject(PortalStore) private readonly store: PortalStore, @Inject(AuthService) private readonly auth: AuthService) {}
  create(authorization: string | undefined, input: Record<string, unknown>) {
    const user = this.auth.authenticate(authorization); if (!user.emailVerifiedAt) throw new ForbiddenException("E-Mail-Adresse nicht bestätigt.");
    const role = input.role as OrganizationRole; if (!["buyer","provider","both"].includes(role)) throw new BadRequestException("Ungültige Unternehmensrolle.");
    const requestedNetwork=typeof input.networkSlug==="string"&&input.networkSlug.trim()?this.store.networks.get(this.store.networkBySlug.get(input.networkSlug.trim())||""):undefined;
    const networkAccessible=requestedNetwork&&(requestedNetwork.status==="active"||(requestedNetwork.status==="trial"&&requestedNetwork.trialEndsAt&&Date.parse(requestedNetwork.trialEndsAt)>Date.now()));
    if(typeof input.networkSlug==="string"&&input.networkSlug.trim()&&!networkAccessible)throw new BadRequestException("Das gewählte Netzwerk wurde nicht gefunden oder durch die Plattformadministration noch nicht freigeschaltet.");
    if(requestedNetwork&&!requestedNetwork.settings.selfRegistration)throw new ForbiddenException("Dieses Netzwerk nimmt keine eigenständigen Registrierungen an.");
    const websiteUrl = safeUrl(input.websiteUrl); const organization:OrganizationRecord = { id: randomUUID(), legalName: requiredText(input.legalName,"Rechtlicher Firmenname",2,200), displayName: requiredText(input.displayName,"Anzeigename",2,200), role, websiteUrl, emailDomain: websiteUrl ? new URL(websiteUrl).hostname.replace(/^www\./,"") : null, reviewStatus: "draft", submittedAt: null, approvedAt: null, createdAt: new Date().toISOString() };
    this.store.organizations.set(organization.id, organization); this.store.memberships.push({ organizationId: organization.id, userId: user.id, role: "admin" });
    if(requestedNetwork){
      const now=new Date().toISOString();this.store.networkMemberships.push({id:randomUUID(),networkId:requestedNetwork.id,organizationId:organization.id,userId:user.id,role:"organization_admin",status:"pending",invitedByUserId:null,reviewedByUserId:null,reviewedAt:null,createdAt:now,updatedAt:now});
    }
    return organization;
  }
  submit(authorization: string | undefined, organizationId: string) {
    const user = this.auth.authenticate(authorization); this.requireAdmin(user.id, organizationId); const organization = this.get(organizationId);
    if (organization.reviewStatus !== "draft" && organization.reviewStatus !== "changes_requested") throw new BadRequestException("Das Profil kann in diesem Status nicht eingereicht werden.");
    organization.reviewStatus = "submitted"; organization.submittedAt = new Date().toISOString(); return organization;
  }
  updateProfile(authorization:string|undefined,organizationId:string,input:Record<string,unknown>){
    const user=this.auth.authenticate(authorization);this.requireAdmin(user.id,organizationId);const organization=this.get(organizationId);
    const source=input.profileData;if(!source||typeof source!=="object"||Array.isArray(source))throw new BadRequestException("Profildaten fehlen.");
    organization.profileData=Object.fromEntries(Object.entries(source as Record<string,unknown>).filter(([,value])=>typeof value==="string"||typeof value==="boolean")) as Record<string,string|boolean>;
    organization.profileUpdatedAt=new Date().toISOString();
    if(organization.reviewStatus==="draft"||organization.reviewStatus==="changes_requested"){organization.reviewStatus="submitted";organization.submittedAt=organization.profileUpdatedAt;}
    return organization;
  }
  listMine(authorization: string | undefined) { const user = this.auth.authenticate(authorization); const ids = this.store.memberships.filter(m=>m.userId===user.id).map(m=>m.organizationId); return ids.map(id=>this.get(id)); }
  get(id: string) { const organization=this.store.organizations.get(id); if(!organization) throw new NotFoundException("Unternehmen nicht gefunden."); return organization; }
  private requireAdmin(userId:string, organizationId:string) { if(!this.store.memberships.some(m=>m.userId===userId&&m.organizationId===organizationId&&m.role==="admin")) throw new ForbiddenException(); }
}
