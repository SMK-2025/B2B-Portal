import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { PortalStore } from "../core/portal.store";
import type { NeedRecord } from "../core/domain";
import { requiredText } from "../core/validation";
import { MatchingService } from "./matching.service";
@Injectable()
export class NeedsService{
  constructor(@Inject(PortalStore)private readonly store:PortalStore,@Inject(AuthService)private readonly auth:AuthService,@Inject(MatchingService)private readonly matching:MatchingService){}
  create(authHeader:string|undefined,organizationId:string,input:Record<string,unknown>){const user=this.auth.authenticate(authHeader);if(!this.store.memberships.some(m=>m.userId===user.id&&m.organizationId===organizationId))throw new ForbiddenException();const org=this.store.organizations.get(organizationId);if(!org||org.reviewStatus!=="approved")throw new ForbiddenException("Unternehmen nicht freigegeben.");const networkId=typeof input.networkId==="string"&&input.networkId.trim()?input.networkId.trim():null;if(networkId&&!this.store.networkMemberships.some(m=>m.networkId===networkId&&m.organizationId===organizationId&&m.status==="active"))throw new ForbiddenException("Das Unternehmen ist in diesem Netzwerk nicht aktiv.");const categoryId=requiredText(input.categoryId,"Kategorie",1,100);if(!this.store.categories.has(categoryId))throw new BadRequestException("Unbekannte Kategorie.");const modes=this.arr(input.deliveryModes) as NeedRecord["deliveryModes"];if(!modes.length||modes.some(x=>!["online","onsite","hybrid"].includes(x)))throw new BadRequestException("Ungültiges Liefermodell.");const need:NeedRecord={id:randomUUID(),organizationId,networkId,title:requiredText(input.title,"Titel",5,150),description:requiredText(input.description,"Beschreibung",40,5000),categoryId,requiredSkills:this.arr(input.requiredSkills),preferredIndustries:this.arr(input.preferredIndustries),region:typeof input.region==="string"&&input.region.trim()?input.region.trim():null,deliveryModes:modes,status:"draft",createdAt:new Date().toISOString()};this.store.needs.set(need.id,need);return need;}
  activate(authHeader:string|undefined,id:string){const user=this.auth.authenticate(authHeader);const need=this.store.needs.get(id);if(!need)throw new BadRequestException("Bedarf nicht gefunden.");if(!this.store.memberships.some(m=>m.userId===user.id&&m.organizationId===need.organizationId))throw new ForbiddenException();need.status="active";return {need,matches:this.matching.recalculate(id)};}
  private arr(value:unknown){return Array.isArray(value)?[...new Set(value.map(String).map(v=>v.trim()).filter(Boolean))]:[];}
}
