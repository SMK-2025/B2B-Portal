"use client";
import { useEffect, useMemo, useState } from "react";
import { partnerVCard, type ContactCardData } from "../lib/partner-vcard";

export function PartnerBusinessCard({ profile }: { profile: ContactCardData }) {
  const vcard = useMemo(
    () => partnerVCard(profile),
    [
      profile.companyName,
      profile.contactName,
      profile.contactPosition,
      profile.contactEmail,
      profile.contactPhone,
      profile.street,
      profile.postalCode,
      profile.city,
      profile.country,
      profile.websiteUrl,
    ],
  );
  const [qr, setQr] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setQr("");
    setError("");
    import("qrcode")
      .then((module) =>
        module.default.toDataURL(vcard, {
          errorCorrectionLevel: "M",
          margin: 4,
          width: 512,
          color: { dark: "#102235", light: "#ffffff" },
        }),
      )
      .then((value) => {
        if (active) setQr(value);
      })
      .catch(() => {
        if (active)
          setError(
            "Der QR-Code konnte nicht erstellt werden. Du kannst den Kontakt direkt herunterladen.",
          );
      });
    return () => {
      active = false;
    };
  }, [vcard]);
  function saveContact() {
    const url = URL.createObjectURL(
      new Blob([vcard], { type: "text/vcard;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download =
      (profile.contactName || profile.companyName || "Kontakt")
        .replace(/[^\p{L}\p{N} _-]/gu, "")
        .slice(0, 100) + ".vcf";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
  return (
    <div className="partnerBusinessCardWrap">
      <div className="partnerBusinessCard">
        <div className="partnerBusinessIdentity">
          <div className="partnerBusinessLogo">
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={`Logo ${profile.companyName}`} />
            ) : (
              <strong>{profile.companyName}</strong>
            )}
          </div>
          <span className="partnerBusinessEyebrow">
            DEIN KONTAKT IM NETZWERK
          </span>
          <h4>{profile.contactName || profile.companyName}</h4>
          {profile.contactPosition && (
            <p className="partnerBusinessPosition">{profile.contactPosition}</p>
          )}
          <strong className="partnerBusinessCompany">
            {profile.companyName}
          </strong>
          <div className="partnerBusinessDetails">
            {profile.contactEmail && (
              <a href={`mailto:${profile.contactEmail}`}>
                {profile.contactEmail}
              </a>
            )}
            {profile.contactPhone && (
              <a href={`tel:${profile.contactPhone.replace(/[^+\d]/g, "")}`}>
                {profile.contactPhone}
              </a>
            )}
            {(profile.street || profile.city) && (
              <address>
                {profile.street}
                <br />
                {profile.postalCode} {profile.city}
                {profile.country && (
                  <>
                    <br />
                    {profile.country}
                  </>
                )}
              </address>
            )}
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Firmenhomepage ↗
              </a>
            )}
          </div>
        </div>
        <div className="partnerBusinessQr">
          {qr ? (
            <img
              src={qr}
              alt={`QR-Code zum Speichern des Kontakts ${profile.contactName || profile.companyName}`}
            />
          ) : (
            <div className="partnerQrPlaceholder" role="status">
              {error || "QR-Code wird erstellt …"}
            </div>
          )}
          <strong>Scannen & Kontakt speichern</strong>
          <small>
            Mit der Handykamera scannen und den Kontakt im Adressbuch
            übernehmen.
          </small>
        </div>
      </div>
      <button
        type="button"
        className="partnerContactDownload"
        onClick={saveContact}
      >
        ↓ Kontakt speichern (.vcf)
      </button>
      <small className="partnerCardPrivacy">
        Der QR-Code enthält nur die hier angezeigten Kontaktdaten – keinen
        Zugang zum Portal.
      </small>
    </div>
  );
}
