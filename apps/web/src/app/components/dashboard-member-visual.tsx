"use client";

import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import {MemberPortrait} from './member-portrait';

export function DashboardMemberVisual({ networkId, membershipId, logo, company,photo,contactName }: {
  photo?:string|null;
  contactName?:string;
  networkId: string;
  membershipId?: string;
  logo: string | null;
  company: string;
}) {
  const [hero, setHero] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setHero(null);
    const token = getPortalSession();
    if (!networkId || !membershipId || !token) return;
    void portalRequest<{ heroImageUrl: string | null }>(
      `/networks/${networkId}/memberships/${encodeURIComponent(membershipId)}/hero`,
      { token },
    ).then(value => { if (active) setHero(value.heroImageUrl); }).catch(() => {});
    return () => { active = false; };
  }, [networkId, membershipId]);

  return (
    <span className={`loungeMemberVisual${hero ? " hasHero" : ""}`}>
      {hero && <img className="loungeMemberHeroImage" src={hero} alt="" onError={() => setHero(null)} />}
      {hero && <span className="loungeMemberHeroOverlay" aria-hidden="true" />}
      {photo&&<span className="loungeMemberIdentity"><MemberPortrait photo={photo} name={contactName}/><span className="loungeMemberTileLogo">{logo?<img src={logo} alt=""/>:<b>{company.slice(0,2)}</b>}</span></span>}
      {!photo&&<span className="loungeMemberTileLogo">
        {logo ? <img src={logo} alt="" /> : <b>{company.slice(0, 2)}</b>}
      </span>}
    </span>
  );
}
