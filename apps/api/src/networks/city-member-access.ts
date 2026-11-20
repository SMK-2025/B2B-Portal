import { randomUUID } from "node:crypto";
import type { PortalStore } from "../core/portal.store";
import type { NetworkRecord, NetworkMembershipRecord } from "../core/domain";
import { CITY_NETWORKS, cityNetwork } from "./city-networks";

export function networkKind(network: NetworkRecord): "city" | "club" | "private" {
  if (cityNetwork(network.slug)) return "city";
  return network.settings.networkKind || (["bayer04leverkusen", "bayer-giants", "unternehmerfreunde"].includes(network.slug) ? "club" : "private");
}
const normalize = (value: string) => String(value || "").trim().toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
export function headquartersCity(city: string, country = "") {
  if (country && !["de", "deu", "deutschland", "germany"].includes(normalize(country))) return undefined;
  return CITY_NETWORKS.find(n => normalize(n.city) === normalize(city) || normalize(n.key) === normalize(city));
}
export function eligibleCitySource(store: PortalStore, member: NetworkMembershipRecord) {
  const user=store.users.get(member.userId), network=store.networks.get(member.networkId);
  if (!user || user.visitorNetworkId || user.accountRole === "platform_admin" || member.cityAccess || member.role === "visitor" || member.status !== "active" || network?.status !== "active") return false;
  if (!store.organizations.get(member.organizationId)?.networkProfile) return false;
  if (!member.complimentaryAccess && !member.centrallyFunded && member.role !== "network_admin") {
    const latest=[...store.networkOrders.values()].filter(o=>o.kind==="member_annual" && o.status==="accepted" && o.networkId===member.networkId && o.orderedByUserId===member.userId).sort((a,b)=>(b.serviceEndsAt||"").localeCompare(a.serviceEndsAt||""))[0];
    if (latest?.serviceEndsAt && Date.parse(latest.serviceEndsAt)<=Date.now()) return false;
  }
  return true;
}
export function premiumInCity(store: PortalStore, userId: string, networkId: string) {
  if (!cityNetwork(store.networks.get(networkId)?.slug || "")) return false;
  const grant=store.users.get(userId)?.cityPremium;
  const source=grant?.enabled ? store.networkMemberships.find(m=>m.id===grant.sourceMembershipId && m.userId===userId) : undefined;
  return Boolean(source && eligibleCitySource(store,source));
}

// Derived access never bypasses an explicit local block, creates an order, changes
// a user's original membership, or copies private chats / orders / applications.
export function reconcileCityMembers(store: PortalStore, userId?: string) {
  const now=new Date().toISOString();
  const desired=new Map<string,{source:NetworkMembershipRecord;reason:"premium"|"club_city"}>();
  const targets=[...store.networks.values()].filter(n=>networkKind(n)==="city" && n.status==="active");
  const sources=store.networkMemberships.filter(m=>(!userId || m.userId===userId) && eligibleCitySource(store,m));
  for (const source of sources) {
    const profile=store.organizations.get(source.organizationId)!.networkProfile!;
    if(profile.status!=="published")continue;
    if (networkKind(store.networks.get(source.networkId)!)!=="club") continue;
    const city=headquartersCity(profile.city,profile.country);
    const target=targets.find(n=>n.slug===city?.slug);
    if (target && target.id!==source.networkId) desired.set(`${source.userId}:${target.id}`,{source,reason:"club_city"});
  }
  for (const user of store.users.values()) {
    if(userId && user.id!==userId)continue;
    const grant=user.cityPremium;
    const source=grant?.enabled ? sources.find(m=>m.id===grant.sourceMembershipId && m.userId===user.id) : undefined;
    if (!source) continue;
    for (const target of targets) if(target.id!==source.networkId) desired.set(`${user.id}:${target.id}`,{source,reason:"premium"});
  }
  for (const [key,entry] of desired) {
    const targetId=key.slice(entry.source.userId.length+1);
    let member=store.networkMemberships.find(m=>m.userId===entry.source.userId && m.networkId===targetId);
    if (member && !member.cityAccess) continue;
    if (member && member.status!=="active" && !(member.status==="left" && member.cityAccess?.managedInactive)) continue;
    const sourceOrg=store.organizations.get(entry.source.organizationId)!;
    const visibleProfile=sourceOrg.networkProfile?.status==="published"?sourceOrg.networkProfile:undefined;
    if (!member) {
      const organizationId=randomUUID();
      store.organizations.set(organizationId,{
        id:organizationId,cityProfileSourceId:sourceOrg.id,cityProfileSourceVersion:sourceOrg.networkProfile?.updatedAt,legalName:sourceOrg.legalName,displayName:sourceOrg.displayName,
        role:sourceOrg.role,websiteUrl:sourceOrg.websiteUrl,emailDomain:sourceOrg.emailDomain,reviewStatus:sourceOrg.reviewStatus,
        submittedAt:null,approvedAt:sourceOrg.approvedAt,createdAt:now,networkProfile:structuredClone(visibleProfile),
      });
      store.memberships.push({userId:entry.source.userId,organizationId,role:"admin"});
      member={id:randomUUID(),networkId:targetId,userId:entry.source.userId,organizationId,role:"member",status:"active",complimentaryAccess:true,invitedByUserId:null,reviewedByUserId:null,reviewedAt:now,createdAt:now,updatedAt:now};
      store.networkMemberships.push(member);
    }
    const link={sourceMembershipId:entry.source.id,reason:entry.reason};
    if(JSON.stringify(member.cityAccess)!==JSON.stringify(link) || member.status!=="active") {
      member.cityAccess=link;member.status="active";member.updatedAt=now;
    }
    const organization=store.organizations.get(member.organizationId);
    if (organization) {
      // Explicitly synchronized company presentation only. Local content stays local.
      const sourceChanged=organization.cityProfileSourceId!==sourceOrg.id || organization.cityProfileSourceVersion!==sourceOrg.networkProfile?.updatedAt || organization.networkProfile?.status!==visibleProfile?.status;
      organization.cityProfileSourceId=sourceOrg.id;
      organization.legalName=sourceOrg.legalName;organization.displayName=sourceOrg.displayName;
      organization.websiteUrl=sourceOrg.websiteUrl;
      if(sourceChanged) { organization.networkProfile=structuredClone(visibleProfile); organization.cityProfileSourceVersion=sourceOrg.networkProfile?.updatedAt; }
    }
  }
  for (const member of store.networkMemberships) {
    if ((userId && member.userId!==userId) || !member.cityAccess || desired.has(`${member.userId}:${member.networkId}`) || member.status!=="active") continue;
    member.status="left";member.cityAccess.managedInactive=true;member.updatedAt=now;
  }
}
