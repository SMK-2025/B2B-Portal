"use client";
import { NetworkText } from "./network-text-editor";
import { useId, useRef, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
export function NetworkReferralButton({ networkId, embedded=false }: { networkId: string; embedded?: boolean }) {
  const ReferralSurface = embedded ? "article" : "dialog";
  const [busy, setBusy] = useState(false);
  const referralDialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [referralLink, setReferralLink] = useState(""),
    [recipient, setRecipient] = useState(""),
    [informed, setInformed] = useState(false),
    [feedback, setFeedback] = useState("");
  async function recommend(send: boolean) {
    setBusy(true);
    setFeedback("");
    try {
      const { path } = await portalRequest<{ path: string }>(
        `/networks/${networkId}/referral`,
        {
          token: getPortalSession() || "",
          body: send ? { email: recipient, permission: true } : {},
        },
      );
      const link = new URL(path, window.location.origin).href;
      setReferralLink("");
      if (send) {
        setRecipient("");
        setInformed(false);
        setFeedback("Empfehlung versendet.");
      } else {
        try {
          await navigator.clipboard.writeText(link);
          setFeedback("Persönlicher Link kopiert.");
        } catch {
          setReferralLink(link);
          setFeedback("Bitte den Link im Feld kopieren.");
        }
      }
    } catch (e) {
      setFeedback(
        e instanceof Error ? e.message : "Empfehlung fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!embedded && <button
        className="networkReferralNavAction"
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setFeedback("");
          setReferralLink("");
          setInformed(false);
          setRecipient("");
          referralDialog.current?.showModal();
        }}
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4" />
        </svg>
        <NetworkText id="ui.network-referral-button.2489be64eb08abd2">
          Netzwerk empfehlen
        </NetworkText>
      </button>}
      <ReferralSurface
        ref={embedded ? undefined : referralDialog}
        aria-labelledby={titleId}
        className={`referralDialog${embedded ? ' referralInline' : ''}`}
      >
        <div className="referralHeader">
          <div>
            <span className="referralEyebrow">
              <NetworkText id="ui.network-referral-button.7cc1fa36f7c99b7e">
                Persönliche Einladung
              </NetworkText>
            </span>
            <h2 id={titleId}>
              <NetworkText id="ui.network-referral-button.2489be64eb08abd2">
                Netzwerk empfehlen
              </NetworkText>
            </h2>
          </div>
          {!embedded && <button
            type="button"
            className="referralClose"
            aria-label="Schließen"
            onClick={() => referralDialog.current?.close()}
          >
            ×
          </button>}
        </div>
        <div className="referralBody">
          <p>
            <NetworkText id="ui.network-referral-button.90f14d000c7170ab">
              Lade jemanden per E-Mail ein oder teile deinen persönlichen
              Empfehlungslink.
            </NetworkText>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void recommend(true);
            }}
          >
            <label className="referralField">
              <NetworkText id="ui.network-referral-button.ef1a7d642e82acee">
                E-Mail-Adresse des Empfängers
              </NetworkText>
              <input
                type="email"
                placeholder="name@unternehmen.de"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </label>
            <label className="referralConsent">
              <input
                type="checkbox"
                required
                checked={informed}
                onChange={(e) => setInformed(e.target.checked)}
              />
              <span>
                <NetworkText id="ui.network-referral-button.a68d8d77afe9657d">
                  Der Empfänger wurde bereits über die Einladung informiert.
                </NetworkText>
              </span>
            </label>
            <small>
              <NetworkText id="ui.network-referral-button.0211b9f584992b04">
                Mit dem Versand bestätigst du, dass der Empfänger die Einladung
                per E-Mail erhalten möchte.
              </NetworkText>
            </small>
            <button className="referralSend" disabled={busy}>
              <NetworkText id="ui.network-referral-button.a40d1146888cf30e">
                Empfehlung senden
              </NetworkText>
            </button>
          </form>
          <div className="referralDivider">
            <NetworkText id="ui.network-referral-button.b81d9593a3f6c4f7">
              oder
            </NetworkText>
          </div>
          <button
            className="referralCopy"
            type="button"
            disabled={busy}
            onClick={() => recommend(false)}
          >
            <NetworkText id="ui.network-referral-button.bd54d4fdbec40151">
              Persönlichen Link kopieren
            </NetworkText>
          </button>
          {referralLink && (
            <input
              className="referralFallback"
              aria-label="Persönlicher Empfehlungslink"
              readOnly
              value={referralLink}
              onFocus={(e) => e.target.select()}
            />
          )}
          <div role="status">{feedback}</div>
        </div>
      </ReferralSurface>
    </>
  );
}
