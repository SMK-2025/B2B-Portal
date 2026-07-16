import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { PortalStore } from "../core/portal.store";
import { requiredText } from "../core/validation";
import { ServicesService } from "../services/services.service";

@Injectable()
export class AdminService {
  constructor(@Inject(PortalStore) private readonly store: PortalStore,@Inject(AuthService) private readonly auth:AuthService,@Inject(ServicesService) private readonly services:ServicesService) {}
  queue(authorization:string|undefined) { this.requireReviewer(authorization); return [...this.store.organizations.values()].filter(o=>o.reviewStatus==="submitted"); }
  decide(authorization:string|undefined,organizationId:string,input:Record<string,unknown>) {
    const reviewer=this.requireReviewer(authorization); const organization=this.store.organizations.get(organizationId); if(!organization) throw new BadRequestException("Unternehmen nicht gefunden.");
    if(organization.reviewStatus!=="submitted") throw new BadRequestException("Nur eingereichte Profile können entschieden werden.");
    const decision=input.decision; if(!["approved","changes_requested","rejected"].includes(String(decision))) throw new BadRequestException("Ungültige Entscheidung.");
    const reason=requiredText(input.reason,"Begründung",5,1000); organization.reviewStatus=decision as "approved"|"changes_requested"|"rejected"; if(decision==="approved") organization.approvedAt=new Date().toISOString();
    const record={id:randomUUID(),organizationId,reviewerId:reviewer.id,decision:decision as "approved"|"changes_requested"|"rejected",reason,createdAt:new Date().toISOString()}; this.store.reviewDecisions.push(record); return {organization,decision:record};
  }
  serviceQueue(authorization:string|undefined){this.requireReviewer(authorization);return this.services.reviewQueue();}
  decideService(authorization:string|undefined,serviceId:string,input:Record<string,unknown>){const reviewer=this.requireReviewer(authorization);const decision=String(input.decision);if(!["approved","changes_requested","rejected"].includes(decision))throw new BadRequestException("Ungültige Entscheidung.");return this.services.approve(reviewer.id,serviceId,decision as "approved"|"changes_requested"|"rejected",requiredText(input.reason,"Begründung",5,1000));}
  private requireReviewer(authorization:string|undefined) { const user=this.auth.authenticate(authorization); if(!["platform_admin","reviewer"].includes(user.accountRole)) throw new ForbiddenException("Prüfberechtigung erforderlich."); return user; }
}
