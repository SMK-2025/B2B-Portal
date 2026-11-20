import {describe,it,expect} from "vitest";
import {PortalStore} from "../core/portal.store";
import {AuthService} from "../auth/auth.service";
import {EmailService} from "../auth/email.service";
import {tokenHash} from "../auth/password";
import {NetworksService} from "./networks.service";
import {CITY_NETWORKS} from "./city-networks";
import {reconcileCityMembers,headquartersCity,networkKind,premiumInCity} from "./city-member-access";
import {fullPortalModules} from "./annual-membership";
import type {NetworkRecord,NetworkPartnerProfile,NetworkMembershipRecord} from "../core/domain";

function fixture(){
  const store=new PortalStore(),now=new Date().toISOString();
  store.networkMemberships.splice(0);store.networks.clear();store.networkBySlug.clear();store.organizations.clear();store.users.clear();store.memberships.splice(0);store.networkOrders.clear();store.networkContents.clear();store.notifications.splice(0);
  function network(id:string,slug:string):NetworkRecord{const n:NetworkRecord={id,slug,name:slug,legalName:null,websiteUrl:null,logoUrl:null,primaryColor:"#123456",secondaryColor:"#234567",status:"active",trialEndsAt:null,enabledModules:fullPortalModules(),settings:{closedNetwork:true,selfRegistration:true,crossNetworkMatching:false,admissionRules:null},createdAt:now,updatedAt:now};store.networks.set(id,n);store.networkBySlug.set(slug,id);return n;}
  for(const city of CITY_NETWORKS)network(city.key,city.slug);
  const club=network("club","bayer04leverkusen"),privateNetwork=network("private","other-private");
  for(const [id,role] of [["operator","platform_admin"],["lerros","user"],["dortmund-member","user"],["stranger","user"]] as const){store.users.set(id,{id,email:id+"@example.invalid",firstName:id,lastName:"Test",passwordHash:"unused",accountRole:role,emailVerifiedAt:now,createdAt:now});store.sessions.set(tokenHash(id),{tokenHash:tokenHash(id),userId:id,expiresAt:new Date(Date.now()+86400000).toISOString()});}
  const profile:NetworkPartnerProfile={status:"published",companyName:"Example Brand",tagline:"Teams ausstatten",description:"Company",services:"Mode",industries:"Handel",street:"Musterweg 1",postalCode:"40210",city:"Düsseldorf",country:"Deutschland",websiteUrl:"https://example.invalid",contactName:"Alex Test",contactPosition:"GF",contactEmail:"alex@example.invalid",contactPhone:"123456",logoUrl:null,updatedAt:now,publishedAt:now};
  store.organizations.set("company",{id:"company",legalName:"Example GmbH",displayName:"Example Brand",role:"both",websiteUrl:"https://example.invalid",emailDomain:"example.invalid",reviewStatus:"approved",submittedAt:null,approvedAt:now,createdAt:now,networkProfile:profile});
  store.memberships.push({userId:"lerros",organizationId:"company",role:"admin"});
  const source:NetworkMembershipRecord={id:"source",networkId:club.id,userId:"lerros",organizationId:"company",role:"member",status:"active",centrallyFunded:true,invitedByUserId:null,reviewedByUserId:null,reviewedAt:now,createdAt:now,updatedAt:now};store.networkMemberships.push(source);
  const service=new NetworksService(store,new AuthService(store),new EmailService());
  return {store,source,profile,service,network,club,privateNetwork,operator:"Bearer operator",member:"Bearer lerros",now};
}
describe("operator premium / club headquarters city memberships",()=>{
  it("matches exact German headquarters, never guesses cities or adds foreign club access",()=>{
    const f=fixture();reconcileCityMembers(f.store);
    const added=f.store.networkMemberships.filter(m=>m.cityAccess);
    expect(added).toHaveLength(1);expect(added[0].networkId).toBe("duesseldorf");expect(added[0].role).toBe("member");
    expect(f.store.networkOrders.size).toBe(0);expect(f.store.notifications).toHaveLength(0);
    expect(headquartersCity("Koeln")?.key).toBe("koeln");expect(headquartersCity("Düsseldorf","USA")).toBeUndefined();expect(headquartersCity("bei Düsseldorf")).toBeUndefined();
    expect(networkKind(f.club)).toBe("club");expect(networkKind(f.privateNetwork)).toBe("private");
    expect(()=>f.service.participants(f.member,"private")).toThrow();
  });
  it("one operator grant covers all 50 cities, new city provisioning, and survives a store roundtrip",async()=>{
    const f=fixture();f.store.networks.delete("berlin");
    await f.service.setCityMemberAccess(f.operator,"lerros",{enabled:true,sourceMembershipId:"source"});
    expect(f.store.networkMemberships.filter(m=>m.cityAccess&&m.status==="active")).toHaveLength(49);
    f.network("berlin",CITY_NETWORKS.find(c=>c.key==="berlin")!.slug);reconcileCityMembers(f.store);
    expect(f.service.mine(f.member)).toHaveLength(51);expect(premiumInCity(f.store,"lerros","dortmund")).toBe(true);expect(premiumInCity(f.store,"lerros","club")).toBe(false);
    const before=f.store.snapshot();reconcileCityMembers(f.store);expect(f.store.snapshot()).toBe(before);
    const state=JSON.parse(before);expect(state.users.find(([id]:[string])=>id==="lerros")[1].cityPremium.enabled).toBe(true);expect(state.networkMemberships.filter((m:NetworkMembershipRecord)=>m.cityAccess)).toHaveLength(50);
    expect(f.store.networkOrders.size).toBe(0);
    expect(f.service.listMembers(f.operator,"dortmund")[0].premium).toBe(true);
  });
  it("syncs published company presentation only, protects source editing, and propagates unpublishing",async()=>{
    const f=fixture();await f.service.setCityMemberAccess(f.operator,"lerros",{enabled:true,sourceMembershipId:"source"});
    const target=f.store.networkMemberships.find(m=>m.networkId==="dortmund")!;
    const org=f.store.organizations.get(target.organizationId)!;
    expect(org.id).not.toBe("company");expect(org.networkProfile).not.toBe(f.profile);
    f.profile.tagline="Aktualisierte Leistung";f.profile.updatedAt=new Date(Date.now()+1000).toISOString();reconcileCityMembers(f.store);expect(org.networkProfile!.tagline).toBe(f.profile.tagline);
    expect(f.service.ownProfile(f.member,"dortmund").sourceProfileSlug).toBe("bayer04leverkusen");
    expect(()=>f.service.updateOwnProfile(f.member,"dortmund",{})).toThrow(/zentral/);
    f.profile.status="draft";reconcileCityMembers(f.store);expect(org.networkProfile).toBeUndefined();
  });
  it("withdrawal keeps the club, home city and independent memberships; does not erase chats",async()=>{
    const f=fixture();await f.service.setCityMemberAccess(f.operator,"lerros",{enabled:true,sourceMembershipId:"source"});
    const berlin=f.store.networkMemberships.find(m=>m.networkId==="berlin")!;delete berlin.cityAccess;
    f.store.networkContents.set("chat",{id:"chat",networkId:"dortmund",type:"conversation",status:"published",visibility:"members",title:"Privat",description:"",createdByUserId:"lerros",assignedToUserId:null,startsAt:null,endsAt:null,data:{participantUserIds:["lerros","dortmund-member"],messages:[]},createdAt:f.now,updatedAt:f.now});
    await f.service.setCityMemberAccess(f.operator,"lerros",{enabled:false});
    expect(f.store.networkMemberships.filter(m=>m.userId==="lerros"&&m.status==="active").map(m=>m.networkId).sort()).toEqual(["berlin","club","duesseldorf"]);
    expect(f.store.networkContents.has("chat")).toBe(true);expect(premiumInCity(f.store,"lerros","berlin")).toBe(false);
    expect(()=>f.service.thread(f.member,"dortmund","chat")).toThrow();
  });
  it("blocks self-grant, local administrator grant, forged source and protected city classification",async()=>{
    const f=fixture();expect(()=>f.service.cityMemberAccess(f.member,"lerros")).toThrow();
    await expect(f.service.setCityMemberAccess(f.member,"lerros",{enabled:true,sourceMembershipId:"source"})).rejects.toThrow();
    await expect(f.service.setCityMemberAccess(f.operator,"stranger",{enabled:true,sourceMembershipId:"source"})).rejects.toThrow();
    await expect(f.service.setNetworkKind(f.operator,"dortmund",{kind:"club"})).rejects.toThrow();
  });
  it("honors explicit local blocks and source suspension, and updates home city without premium",async()=>{
    const f=fixture();reconcileCityMembers(f.store);
    f.profile.city="Dortmund";reconcileCityMembers(f.store);
    expect(f.store.networkMemberships.find(m=>m.networkId==="duesseldorf")!.status).toBe("left");
    const dortmund=f.store.networkMemberships.find(m=>m.networkId==="dortmund")!;dortmund.status="suspended";
    await f.service.setCityMemberAccess(f.operator,"lerros",{enabled:true,sourceMembershipId:"source"});expect(dortmund.status).toBe("suspended");
    f.source.status="suspended";reconcileCityMembers(f.store);expect(f.store.networkMemberships.some(m=>m.userId==="lerros"&&m.status==="active")).toBe(false);
  });
  it("Dortmund conversations and notifications remain private and are never read through another network",async()=>{
    const f=fixture();await f.service.setCityMemberAccess(f.operator,"lerros",{enabled:true,sourceMembershipId:"source"});
    f.store.networkMemberships.push({...f.source,id:"other",userId:"dortmund-member",networkId:"dortmund"});
    f.store.networkContents.set("dortmund-chat",{id:"dortmund-chat",networkId:"dortmund",type:"conversation",status:"published",visibility:"members",title:"Gespräch",description:"Nur Dortmund",createdByUserId:"dortmund-member",assignedToUserId:null,startsAt:null,endsAt:null,data:{participantUserIds:["lerros","dortmund-member"],messages:[]},createdAt:f.now,updatedAt:f.now});
    expect(f.service.thread(f.member,"dortmund","dortmund-chat").description).toBe("Nur Dortmund");
    expect(()=>f.service.thread(f.member,"duesseldorf","dortmund-chat")).toThrow();
    expect(()=>f.service.thread("Bearer stranger","dortmund","dortmund-chat")).toThrow();
    f.service.reply(f.member,"dortmund","dortmund-chat",{kind:"message",body:"Antwort nur nach Dortmund"});
    expect(f.store.networkContents.size).toBe(1);
    f.store.notifications.push({id:"note",userId:"lerros",type:"network.message",data:{networkId:"dortmund",contentId:"dortmund-chat",title:"Nachricht"},readAt:null,createdAt:f.now});
    const inbox=f.service.accountNetworkInbox(f.member);expect(inbox.find(n=>n.id==="note")?.network.slug).toBe("unternehmernetzwerkdortmund");
    expect(f.service.networkNotifications(f.member,"duesseldorf").some(n=>n.id==="note")).toBe(false);
  });
});
