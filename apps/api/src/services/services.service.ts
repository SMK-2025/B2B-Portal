import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { PortalStore } from "../core/portal.store";
import type { ServicePageRecord } from "../core/domain";
import { requiredText } from "../core/validation";

@Injectable()
export class ServicesService {
  constructor(@Inject(PortalStore) private readonly store:PortalStore,@Inject(AuthService) private readonly auth:AuthService){
    if(!store.categories.size) [
      ["it","Informationstechnologie",null],["it-security","IT-Sicherheit","it"],["consulting","Unternehmensberatung",null],
      ["marketing","Marketing und Kommunikation",null],["hr","Personal und Recruiting",null],["facility","Facility Management",null]
    ].forEach(([id,name,parentId])=>store.categories.set(id!,{id:id!,name:name!,parentId:parentId??null,slug:id!,active:true}));
  }
  categories(){return [...this.store.categories.values()].filter(c=>c.active);}
  create(authHeader:string|undefined,organizationId:string,input:Record<string,unknown>){
    const user=this.auth.authenticate(authHeader); this.requireAdmin(user.id,organizationId); const organization=this.store.organizations.get(organizationId);
    if(!organization||organization.reviewStatus!=="approved") throw new ForbiddenException("Das Unternehmen muss zuerst freigegeben sein.");
    if(!["provider","both"].includes(organization.role)) throw new ForbiddenException("Die Dienstleisterrolle ist nicht aktiviert.");
    const categoryId=requiredText(input.categoryId,"Kategorie",1,100); if(!this.store.categories.has(categoryId)) throw new BadRequestException("Unbekannte Kategorie.");
    const page:ServicePageRecord={id:randomUUID(),organizationId,title:requiredText(input.title,"Leistungstitel",5,150),summary:requiredText(input.summary,"Kurzbeschreibung",20,300),description:requiredText(input.description,"Leistungsbeschreibung",80,5000),categoryId,skills:this.stringArray(input.skills,"Fähigkeiten"),targetIndustries:this.stringArray(input.targetIndustries,"Zielbranchen"),serviceRegions:this.stringArray(input.serviceRegions,"Regionen"),deliveryModes:this.deliveryModes(input.deliveryModes),reviewStatus:"draft",publicVisibility:false,matchingEligible:false,version:1,submittedAt:null,approvedAt:null,createdAt:new Date().toISOString()};
    this.store.servicePages.set(page.id,page); return page;
  }
  submit(authHeader:string|undefined,id:string){const user=this.auth.authenticate(authHeader);const page=this.get(id);this.requireAdmin(user.id,page.organizationId);if(!["draft","changes_requested"].includes(page.reviewStatus))throw new BadRequestException("Die Leistungsseite kann nicht eingereicht werden.");page.reviewStatus="submitted";page.submittedAt=new Date().toISOString();page.matchingEligible=false;return page;}
  mine(authHeader:string|undefined){const user=this.auth.authenticate(authHeader);const orgs=new Set(this.store.memberships.filter(m=>m.userId===user.id).map(m=>m.organizationId));return [...this.store.servicePages.values()].filter(p=>orgs.has(p.organizationId));}
  update(authHeader:string|undefined,id:string,input:Record<string,unknown>){const user=this.auth.authenticate(authHeader);const page=this.get(id);this.requireAdmin(user.id,page.organizationId);if(!["draft","changes_requested"].includes(page.reviewStatus))throw new BadRequestException("Diese Leistungsseite kann im aktuellen Status nicht bearbeitet werden.");if(typeof input.title==="string")page.title=requiredText(input.title,"Leistungstitel",5,150);if(typeof input.summary==="string")page.summary=requiredText(input.summary,"Kurzbeschreibung",20,300);if(typeof input.description==="string")page.description=requiredText(input.description,"Leistungsbeschreibung",80,5000);if(typeof input.categoryId==="string"){const categoryId=requiredText(input.categoryId,"Kategorie",1,100);if(!this.store.categories.has(categoryId))throw new BadRequestException("Unbekannte Kategorie.");page.categoryId=categoryId;}if(Array.isArray(input.skills))page.skills=this.stringArray(input.skills,"Fähigkeiten");if(Array.isArray(input.targetIndustries))page.targetIndustries=this.stringArray(input.targetIndustries,"Zielbranchen");if(Array.isArray(input.serviceRegions))page.serviceRegions=this.stringArray(input.serviceRegions,"Regionen");if(Array.isArray(input.deliveryModes))page.deliveryModes=this.deliveryModes(input.deliveryModes);page.reviewStatus="draft";page.version+=1;page.submittedAt=null;page.matchingEligible=false;page.publicVisibility=false;return page;}
  duplicate(authHeader:string|undefined,id:string){const user=this.auth.authenticate(authHeader);const source=this.get(id);this.requireAdmin(user.id,source.organizationId);const copy:ServicePageRecord={...source,id:randomUUID(),title:`${source.title} (Kopie)`,skills:[...source.skills],targetIndustries:[...source.targetIndustries],serviceRegions:[...source.serviceRegions],deliveryModes:[...source.deliveryModes],reviewStatus:"draft",publicVisibility:false,matchingEligible:false,version:1,submittedAt:null,approvedAt:null,createdAt:new Date().toISOString()};this.store.servicePages.set(copy.id,copy);return copy;}
  remove(authHeader:string|undefined,id:string){const user=this.auth.authenticate(authHeader);const page=this.get(id);this.requireAdmin(user.id,page.organizationId);if(!["draft","changes_requested","rejected"].includes(page.reviewStatus))throw new BadRequestException("Eine eingereichte oder aktive Leistungsseite kann nicht gelöscht werden.");this.store.servicePages.delete(id);return{deleted:true,id};}
  get(id:string){const page=this.store.servicePages.get(id);if(!page)throw new NotFoundException("Leistungsseite nicht gefunden.");return page;}
  approve(reviewerId:string,id:string,decision:"approved"|"changes_requested"|"rejected",reason:string){const page=this.get(id);if(page.reviewStatus!=="submitted")throw new BadRequestException("Nur eingereichte Leistungsseiten können geprüft werden.");requiredText(reason,"Begründung",5,1000);page.reviewStatus=decision;page.approvedAt=decision==="approved"?new Date().toISOString():null;page.matchingEligible=decision==="approved";page.publicVisibility=decision==="approved";return page;}
  reviewQueue(){return [...this.store.servicePages.values()].filter(p=>p.reviewStatus==="submitted");}
  private requireAdmin(userId:string,organizationId:string){if(!this.store.memberships.some(m=>m.userId===userId&&m.organizationId===organizationId&&m.role==="admin"))throw new ForbiddenException();}
  private stringArray(value:unknown,field:string){if(!Array.isArray(value))return [];const result=[...new Set(value.map(v=>String(v).trim()).filter(Boolean))];if(result.length>30)throw new BadRequestException(`${field}: maximal 30 Einträge.`);return result;}
  private deliveryModes(value:unknown){const values=this.stringArray(value,"Liefermodelle");if(!values.length||values.some(v=>!["online","onsite","hybrid"].includes(v)))throw new BadRequestException("Mindestens ein gültiges Liefermodell ist erforderlich.");return values as ("online"|"onsite"|"hybrid")[];}
}
