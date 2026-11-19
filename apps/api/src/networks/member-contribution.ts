import {BadRequestException} from "@nestjs/common";
import type {NetworkRecord,NetworkContentRecord} from "../core/domain";
import {cityNetwork} from "./city-networks";
import {memberBillingSettings} from "./member-billing-settings";

export const CONTRIBUTION_MINIMUM = 990;
export const CITY_CONTRIBUTION_VERSION = "city-contribution-990-12m-v1";
export function defaultCityContributionSettings(network: NetworkRecord): NetworkRecord["settings"] {
  const before=network.settings;
  return {...before,memberPaymentModel:"individual",billingMode:"standard",memberMonthlyNetCents:CONTRIBUTION_MINIMUM,
    memberContribution:{enabled:true,minimumMonthlyNetCents:CONTRIBUTION_MINIMUM,version:CITY_CONTRIBUTION_VERSION,activatedAt:new Date().toISOString()},
    memberBilling:memberBillingSettings({months:12,automaticInvoices:before.memberBilling?.automaticInvoices===true},network.slug),
    launchPromotion:{id:before.launchPromotion?.id||`city-launch-${network.id}`,enabled:false,limit:before.launchPromotion?.limit||100,freeMonths:0}};
}
export function applyCityContributionDefaults(store: {networks:Map<string,NetworkRecord>;networkContents:Map<string,NetworkContentRecord>}) {
  let updated=0,protectedRequests=0;
  for(const network of store.networks.values()) {
    // Any stored policy, including an operator-disabled one, is an intentional override.
    if(!cityNetwork(network.slug) || network.settings.memberContribution !== undefined) continue;
    for(const request of store.networkContents.values()) {
      if(request.networkId!==network.id || request.data.kind!=="network_invitation" || request.data.role!=="member" || request.data.usedAt || request.data.priorBillingSettings || !request.endsAt || Date.parse(request.endsAt)<=Date.now()) continue;
      const before=network.settings;
      request.data.priorBillingSettings=structuredClone({memberMonthlyNetCents:before.memberMonthlyNetCents,memberBilling:before.memberBilling,memberPaymentModel:before.memberPaymentModel,billingMode:before.billingMode,launchPromotion:before.launchPromotion});
      protectedRequests++;
    }
    network.settings=defaultCityContributionSettings(network);
    updated++;
  }
  return {updated,protectedRequests};
}
export function contributionPolicy(network:NetworkRecord) {
  const policy=network.settings.memberContribution;
  return cityNetwork(network.slug) && policy?.enabled && network.settings.memberPaymentModel!=="network" && network.settings.billingMode!=="cooperation_free" ? policy : null;
}
export function contributionPrice(network:NetworkRecord,value:unknown) {
  const policy=contributionPolicy(network);
  if(!policy) return null;
  const cents=value===undefined?policy.minimumMonthlyNetCents:value;
  if(typeof cents!=="number"||!Number.isSafeInteger(cents)||cents<policy.minimumMonthlyNetCents||cents>100_000_000)
    throw new BadRequestException("Bitte einen gültigen Monatsbeitrag ab 9,90 € netto mit höchstens zwei Nachkommastellen angeben.");
  return cents;
}
// Only server-stored snapshots are considered, never fields from the request body.
export function bookingNetwork(network:NetworkRecord,invitation?:NetworkContentRecord):NetworkRecord {
  const snapshot=invitation?.networkId===network.id ? invitation.data.priorBillingSettings : null;
  if(!snapshot || typeof snapshot!=="object") return network;
  const prior=snapshot as Partial<NetworkRecord["settings"]>;
  return {...network,settings:{...network.settings,memberMonthlyNetCents:prior.memberMonthlyNetCents,memberBilling:prior.memberBilling,memberPaymentModel:prior.memberPaymentModel,billingMode:prior.billingMode,launchPromotion:prior.launchPromotion,memberContribution:undefined}};
}
