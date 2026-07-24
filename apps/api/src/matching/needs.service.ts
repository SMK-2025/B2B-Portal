import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { PortalStore } from "../core/portal.store";
import type { NeedRecord } from "../core/domain";
import { requiredText } from "../core/validation";
import { MatchingService } from "./matching.service";

@Injectable()
export class NeedsService {
  constructor(
    @Inject(PortalStore) private readonly store:PortalStore,
    @Inject(AuthService) private readonly auth:AuthService,
    @Inject(MatchingService) private readonly matching:MatchingService,
  ) {}

  create(authHeader:string|undefined,organizationId:string,input:Record<string,unknown>) {
    const user=this.auth.authenticate(authHeader);
    if(!this.store.memberships.some(m=>m.userId===user.id&&m.organizationId===organizationId))throw new ForbiddenException();
    const organization=this.store.organizations.get(organizationId);
    if(!organization||!["submitted","approved"].includes(organization.reviewStatus))throw new ForbiddenException("Das Unternehmensprofil muss zuerst eingereicht werden.");
    const networkId=typeof input.networkId==="string"&&input.networkId.trim()?input.networkId.trim():null;
    if(networkId&&!this.store.networkMemberships.some(m=>m.networkId===networkId&&m.organizationId===organizationId&&m.status==="active"))throw new ForbiddenException("Das Unternehmen ist in diesem Netzwerk nicht aktiv.");
    const modes=this.arr(input.deliveryModes) as NeedRecord["deliveryModes"];
    if(!modes.length||modes.some(mode=>!["online","onsite","hybrid"].includes(mode)))throw new BadRequestException("Ungültiges Liefermodell.");
    const submitted=Boolean(input.submitForReview);
    const now=new Date().toISOString();
    const details=Array.isArray(input.details)?input.details.flatMap(item=>{
      if(!item||typeof item!=="object")return [];
      const record=item as Record<string,unknown>;
      return typeof record.label==="string"&&typeof record.value==="string"?[{label:record.label.slice(0,200),value:record.value.slice(0,5000)}]:[];
    }):[];
    const need:NeedRecord={
      id:randomUUID(),organizationId,networkId,
      title:requiredText(input.title,"Titel",5,150),
      description:requiredText(input.description,"Beschreibung",10,5000),
      categoryId:requiredText(input.categoryId,"Kategorie",1,100),
      requiredSkills:this.arr(input.requiredSkills),
      preferredIndustries:this.arr(input.preferredIndustries),
      region:typeof input.region==="string"&&input.region.trim()?input.region.trim():null,
      deliveryModes:modes,status:submitted?"submitted":"draft",createdAt:now,
      submittedAt:submitted?now:null,reviewedAt:null,reviewReason:null,details,
    };
    this.store.needs.set(need.id,need);
    return need;
  }

  listMine(authHeader:string|undefined,organizationId:string) {
    const user=this.auth.authenticate(authHeader);
    if(!this.store.memberships.some(m=>m.userId===user.id&&m.organizationId===organizationId))throw new ForbiddenException();
    return [...this.store.needs.values()].filter(need=>need.organizationId===organizationId);
  }

  update(authHeader:string|undefined,id:string,input:Record<string,unknown>){
    const user=this.auth.authenticate(authHeader);const need=this.owned(user.id,id);
    if(!["draft","changes_requested","paused"].includes(need.status))throw new BadRequestException("Dieser Bedarf kann im aktuellen Status nicht bearbeitet werden.");
    if(typeof input.title==="string")need.title=requiredText(input.title,"Titel",5,150);
    if(typeof input.description==="string")need.description=requiredText(input.description,"Beschreibung",10,5000);
    if(typeof input.categoryId==="string")need.categoryId=requiredText(input.categoryId,"Kategorie",1,100);
    if(Array.isArray(input.requiredSkills))need.requiredSkills=this.arr(input.requiredSkills);
    if(Array.isArray(input.preferredIndustries))need.preferredIndustries=this.arr(input.preferredIndustries);
    if(typeof input.region==="string")need.region=input.region.trim()||null;
    if(Array.isArray(input.deliveryModes)){const modes=this.arr(input.deliveryModes) as NeedRecord["deliveryModes"];if(!modes.length||modes.some(mode=>!["online","onsite","hybrid"].includes(mode)))throw new BadRequestException("Ungültiges Liefermodell.");need.deliveryModes=modes;}
    if(Array.isArray(input.details))need.details=input.details.flatMap(item=>{if(!item||typeof item!=="object")return[];const record=item as Record<string,unknown>;return typeof record.label==="string"&&typeof record.value==="string"?[{label:record.label.slice(0,200),value:record.value.slice(0,5000)}]:[]});
    need.status="draft";need.submittedAt=null;need.reviewedAt=null;need.reviewReason=null;return need;
  }

  duplicate(authHeader:string|undefined,id:string){const user=this.auth.authenticate(authHeader);const source=this.owned(user.id,id);const copy:NeedRecord={...source,id:randomUUID(),title:`${source.title} (Kopie)`,status:"draft",createdAt:new Date().toISOString(),submittedAt:null,reviewedAt:null,reviewReason:null,details:source.details?.map(item=>({...item}))};this.store.needs.set(copy.id,copy);return copy;}
  remove(authHeader:string|undefined,id:string){const user=this.auth.authenticate(authHeader);const need=this.owned(user.id,id);if(!["draft","changes_requested","rejected","paused","closed"].includes(need.status))throw new BadRequestException("Ein aktiver oder eingereichter Bedarf kann nicht gelöscht werden.");this.store.needs.delete(id);for(const [matchId,match]of this.store.matches)if(match.needId===id)this.store.matches.delete(matchId);return{deleted:true,id};}
  submit(authHeader:string|undefined,id:string){const user=this.auth.authenticate(authHeader);const need=this.owned(user.id,id);if(!["draft","changes_requested"].includes(need.status))throw new BadRequestException("Dieser Bedarf kann nicht eingereicht werden.");need.status="submitted";need.submittedAt=new Date().toISOString();need.reviewedAt=null;need.reviewReason=null;return need;}
  pause(authHeader:string|undefined,id:string){const user=this.auth.authenticate(authHeader);const need=this.owned(user.id,id);if(need.status!=="active")throw new BadRequestException("Nur ein aktiver Bedarf kann pausiert werden.");need.status="paused";return need;}

  reviewQueue(){return [...this.store.needs.values()].filter(need=>need.status==="submitted");}

  async decide(id:string,decision:"approved"|"changes_requested"|"rejected",reason:string){
    const need=this.store.needs.get(id);
    if(!need)throw new BadRequestException("Bedarf nicht gefunden.");
    if(need.status!=="submitted")throw new BadRequestException("Nur eingereichte Bedarfe können geprüft werden.");
    need.status=decision==="approved"?"active":decision;
    need.reviewedAt=new Date().toISOString();
    need.reviewReason=reason;
    if(need.status==="active")await this.matching.recalculate(id);
    return need;
  }

  async activate(authHeader:string|undefined,id:string){
    const user=this.auth.authenticate(authHeader);const need=this.store.needs.get(id);
    if(!need)throw new BadRequestException("Bedarf nicht gefunden.");
    if(!this.store.memberships.some(m=>m.userId===user.id&&m.organizationId===need.organizationId))throw new ForbiddenException();
    if(need.status!=="paused")throw new BadRequestException("Nur ein pausierter Bedarf kann reaktiviert werden.");
    need.status="active";return {need,matches:await this.matching.recalculate(id)};
  }

  private owned(userId:string,id:string){const need=this.store.needs.get(id);if(!need)throw new BadRequestException("Bedarf nicht gefunden.");if(!this.store.memberships.some(m=>m.userId===userId&&m.organizationId===need.organizationId))throw new ForbiddenException();return need;}

  private arr(value:unknown){return Array.isArray(value)?[...new Set(value.map(String).map(v=>v.trim()).filter(Boolean))]:[];}
}
