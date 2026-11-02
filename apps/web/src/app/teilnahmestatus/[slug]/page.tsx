"use client";
import styles from "./status.module.css";
import {NetworkDashboardWorkspace,type LockedDashboardBrand} from "../../components/network-dashboard-workspace";
import type {CSSProperties} from "react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  clearPortalSession,
  getPortalSession,
  portalRequest,
} from "../../lib/portal-api";

export default function ParticipationStatusPage() {
  const { slug } = useParams<{ slug: string }>(),
    router = useRouter();
  const login =
    "/registrieren?" + new URLSearchParams({ network: slug, mode: "login" });
  const [status, setStatus] = useState("loading"),
    [preview,setPreview]=useState<LockedDashboardBrand|null>(null),
    [email, setEmail] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    const token = getPortalSession();
    if (!token) {
      router.replace(login as never);
      return;
    }
    setError("");
    setStatus("loading");
    try {
      const user = await portalRequest<{ email: string }>(
        "/auth/session/check",
        { token, body: {} },
      );
      const result = await portalRequest<{
        status: string | null;
        invite?: string;
        preview?:LockedDashboardBrand;
      }>("/networks/participation/status/" + encodeURIComponent(slug), {
        token,
      });
      if (getPortalSession() !== token) return;
      setEmail(user.email);
      setPreview(result.preview?.slug===slug?result.preview:null);
      if (result.status === "approved" && result.invite) {
        router.replace(
          ("/registrieren?" +
            new URLSearchParams({
              network: slug,
              invite: result.invite,
              onboarding: "1",
            })) as never,
        );
        return;
      }
      if (!result.status) {
        const mine = await portalRequest<{ network: { slug: string } }[]>(
          "/networks/mine",
          { token },
        );
        if (mine.some((x) => x.network.slug === slug)) {
          router.replace(
            ("/portal/netzwerk/" + encodeURIComponent(slug)) as never,
          );
          return;
        }
      }
      setStatus(result.status || "unknown");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof Error ? e.message : "Status konnte nicht geladen werden.",
      );
    }
  }, [slug, login, router]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main className={styles.stage}>
      {preview?.slug===slug && <div className={styles.preview} aria-hidden="true" inert style={{"--network-accent":preview.primaryColor,"--network-primary":preview.secondaryColor} as CSSProperties}>
        <div className={styles.bar}>{preview.logoUrl && <img src={preview.logoUrl} alt="" style={{maxWidth:76,maxHeight:44,objectFit:"contain"}}/>}<b>Das Netzwerkpartner-Portal</b><span style={{marginLeft:"auto"}}>Mein Zugang</span></div>
        <div className={styles.tabs} style={{background:preview.secondaryColor}}>Startseite　 {preview.modules.includes("profiles")&&"Partner entdecken　"}{preview.modules.includes("events")&&"Veranstaltungen　"}{preview.modules.includes("communication")&&"PartnerChat"}</div>
        <div className="networkPortal" style={{display:"block"}}><NetworkDashboardWorkspace slug={slug} preview={preview}/></div>
      </div>}
      <section
        className={styles.panel} aria-labelledby="participation-title"
      >
        <small>
          Das Netzwerkpartner-Portal · der Media Online Innovations Group
        </small>
        <h1 id="participation-title">Meine Teilnahmeanfrage</h1>
        {preview?.slug===slug && <p>Dein Netzwerk: <strong>{preview.name}</strong></p>}
        {email && (
          <p>
            Angemeldet als <strong>{email}</strong>
          </p>
        )}
        <div aria-live="polite">
          {status === "loading" ? (
            <p>Dein Status wird geladen …</p>
          ) : status === "pending" ? (
            <>
              <h2>In Prüfung</h2>
              <p>
                Deine E-Mail-Adresse ist bestätigt. Wir prüfen jetzt deinen
                Bezug zum Netzwerk und informieren dich per E-Mail, sobald deine
                Anfrage entschieden ist.
              </p>
              <p>
                Bis zur Freigabe kannst du hier deinen Status einsehen.
                Mitgliederverzeichnis, PartnerChat und Unternehmensseite sind
                noch gesperrt.
              </p>
            </>
          ) : status === "rejected" ? (
            <>
              <h2>Nicht freigegeben</h2>
              <p>
                Bei Fragen zu deiner Anfrage erreichst du uns unter{" "}
                <a href="mailto:service@b2b-matching.de">
                  service@b2b-matching.de
                </a>
                .
              </p>
            </>
          ) : (
            <p>
              {error ||
                "Für diesen Zugang liegt keine offene Teilnahmeanfrage vor."}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="portalPrimary"
            disabled={status === "loading"}
            onClick={() => void load()}
          >
            Status prüfen
          </button>
          <button
            className="portalSecondary"
            onClick={() => {
              clearPortalSession();
              router.replace(login as never);
            }}
          >
            Abmelden
          </button>
        </div>
      </section>
    </main>
  );
}
