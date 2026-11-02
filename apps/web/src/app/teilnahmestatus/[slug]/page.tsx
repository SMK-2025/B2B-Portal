"use client";
import styles from "./status.module.css";
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
      }>("/networks/participation/status/" + encodeURIComponent(slug), {
        token,
      });
      if (getPortalSession() !== token) return;
      setEmail(user.email);
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
      <div className={styles.preview} aria-hidden="true" inert>
        <div className={styles.bar}><b>Das Netzwerkpartner-Portal</b><span>Mein Zugang</span></div>
        <div className={styles.tabs}>Startseite　　 Partner entdecken　　 Veranstaltungen　　 PartnerChat</div>
        <div className={styles.hero}><small>SCHÖN, DASS DU DA BIST</small><h2>Willkommen in deinem Business-Netzwerk.</h2><p>Partner entdecken und miteinander ins Gespräch kommen.</p></div>
        <div className={styles.cards}>{[(slug==="bayer04leverkusen"||slug==="bayer-giants")?"Spieltag":"Unser nächstes Treffen","Netzwerk-Mitglieder","Das schwarze Brett","Veranstaltungen"].map(title=><div key={title}><b>{title}</b><i/><i/><i/></div>)}</div>
      </div>
      <section
        className={styles.panel} aria-labelledby="participation-title"
      >
        <small>
          Das Netzwerkpartner-Portal · der Media Online Innovations Group
        </small>
        <h1 id="participation-title">Meine Teilnahmeanfrage</h1>
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
