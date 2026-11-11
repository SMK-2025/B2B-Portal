import type { Ref } from "react";

/** Shared company identity for directory cards and the owner's page overview. */
export function CompanyCardHero({ image, companyName, services, targetRef }: {
  image?: string | null;
  companyName: string;
  services?: string;
  targetRef?: Ref<HTMLDivElement>;
}) {
  return <div ref={targetRef} className={`networkMemberHero${image ? " hasImage" : ""}`}>
    {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span className="networkMemberHeroPattern" />}
    <div className="networkMemberHeroContent">
      <h3>{companyName}</h3>
      {services && <div className="networkMemberHeroFacts">{services.split(/[,;\n]/).map(value => value.trim()).filter(Boolean).slice(0, 3).map((value,index) => <span key={`${index}:${value}`}>{value}</span>)}</div>}
    </div>
  </div>;
}
