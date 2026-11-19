import { describe, it, expect } from "vitest";
import { applyCityContributionDefaults, defaultCityContributionSettings, bookingNetwork } from "./member-contribution";
import type { NetworkRecord, NetworkContentRecord } from "../core/domain";
const network=(slug:string)=>({id:slug,slug,settings:{memberPaymentModel:"individual",memberMonthlyNetCents:2900,closedNetwork:true,launchPromotion:{id:"old",enabled:true,limit:100,freeMonths:6}},primaryColor:"red"}) as NetworkRecord;
describe("automatic city contribution defaults",()=>{
  it("migrates existing cities once, preserves promises and leaves independent networks byte-for-byte unchanged",()=>{
    const city=network("unternehmernetzwerkkoeln"), bayer=network("bayer04leverkusen");
    const original=structuredClone(bayer), prior=structuredClone(city.settings);
    const invitation: NetworkContentRecord={id:"invite",networkId:city.id,type:"announcement",title:"Einladung",description:"",status:"active",createdByUserId:"owner",assignedToUserId:null,startsAt:null,endsAt:new Date(Date.now()+86400000).toISOString(),visibility:"administrators",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),data:{kind:"network_invitation",role:"member"}};
    const store={networks:new Map([[city.id,city],[bayer.id,bayer]]),networkContents:new Map([[invitation.id,invitation]])};
    expect(applyCityContributionDefaults(store)).toEqual({updated:1,protectedRequests:1});
    expect(city.settings).toMatchObject({memberMonthlyNetCents:990,memberBilling:{months:12},memberContribution:{enabled:true},launchPromotion:{enabled:false,freeMonths:0}});
    expect(bookingNetwork(city,invitation).settings).toMatchObject(prior);
    expect(bayer).toEqual(original);
    const version=city.settings.memberBilling!.version;
    city.settings.memberContribution!.enabled=false;
    city.settings.memberMonthlyNetCents=3900;
    city.settings.launchPromotion!.freeMonths=3;
    expect(applyCityContributionDefaults(store)).toEqual({updated:0,protectedRequests:0});
    expect(city.settings).toMatchObject({memberMonthlyNetCents:3900,memberBilling:{version},memberContribution:{enabled:false},launchPromotion:{freeMonths:3}});
  });
  it("gives a newly created city its own standard twelve-month pricing",()=>{
    const city=network("unternehmernetzwerkberlin");
    expect(defaultCityContributionSettings(city)).toMatchObject({memberMonthlyNetCents:990,memberPaymentModel:"individual",billingMode:"standard",memberBilling:{months:12,autoRenew:false},memberContribution:{enabled:true},launchPromotion:{freeMonths:0,enabled:false}});
  });
});
