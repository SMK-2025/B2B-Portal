"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { portalRequest, savePortalSession } from "../lib/portal-api";
export function PartnerLoginForm({
  networkSlug,
  invite,
  email,
  onOnboarding,
}: {
  networkSlug: string;
  invite: string;
  email: string;
  onOnboarding: (token: string, invite: string) => void;
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<{ slug: string; name: string }[]>([]);
  const [challenge, setChallenge] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await portalRequest<{
        token: string;
        challengeId?: string;
        user: { accountRole: string };
      }>(challenge ? "/auth/login/code" : "/auth/login", {
        body: challenge
          ? { challengeId: challenge, code: form.get("code") }
          : { email: form.get("email"), password: form.get("password") },
      });
      if (result.challengeId) {
        setChallenge(result.challengeId);
        return;
      }
      savePortalSession(result.token, form.get("remember") === "on");
      const redirect = new URLSearchParams(window.location.search).get(
        "redirect",
      );
      const safeRedirect =
        redirect?.startsWith("/portal/") && !redirect.includes("\\")
          ? redirect
          : null;
      if (["platform_admin", "reviewer"].includes(result.user.accountRole)) {
        router.push((safeRedirect || "/portal/admin/netzwerke") as never);
        return;
      }
      type LoginNetwork = {
        needsPartnerSetup?: boolean;
        membership: { role: string };
        network: { slug: string; settings?: { setupCompletedAt?: string } };
      };
      let networks = await portalRequest<LoginNetwork[]>("/networks/mine", {
        token: result.token,
      });
      // Existing visitors already have access; claiming invitations is a write
      // operation and must never be attempted with a read-only visitor session.
      if (!networks.some((entry) => entry.membership.role === "visitor")) {
        await portalRequest("/networks/invitations/claim", {
          token: result.token,
          body: {},
        });
        networks = await portalRequest<LoginNetwork[]>("/networks/mine", {
          token: result.token,
        });
      }
      const requested = networks.find((n) =>
        networkSlug ? n.network.slug === networkSlug : true,
      );
      if (requested) {
        const base = `/portal/netzwerk/${requested.network.slug}`;
        const destination =
          safeRedirect &&
          (safeRedirect === base ||
            safeRedirect.startsWith(base + "/") ||
            safeRedirect.startsWith(base + "?"))
            ? safeRedirect
            : base;
        router.push(
          (requested.membership.role === "network_admin" &&
          !requested.network.settings?.setupCompletedAt
            ? `${base}/einstellungen?setup=1`
            : requested.needsPartnerSetup && destination === base
              ? `${base}/profil?einrichten=1`
              : destination) as never,
        );
        return;
      }
      if (networkSlug) {
        const participation = await portalRequest<{
          status: string | null;
          invite?: string;
        }>(
          `/networks/participation/status/${encodeURIComponent(networkSlug)}`,
          { token: result.token },
        );
        if (
          participation.status === "pending" ||
          participation.status === "rejected"
        ) {
          router.replace(
            `/teilnahmestatus/${encodeURIComponent(networkSlug)}` as never,
          );
          return;
        }
        if (participation.status === "approved" && participation.invite) {
          onOnboarding(result.token, participation.invite);
          return;
        }
      }
      if (networkSlug && invite) {
        const personal = await portalRequest<{ invite: string }>(
          "/networks/invitations/shared-resolve",
          { body: { invite, email: form.get("email") } },
        );
        onOnboarding(result.token, personal.invite);
        return;
      }
      if (!networkSlug) {
        const requests = await portalRequest<{ slug: string; name: string }[]>(
          "/networks/participation/mine",
          { token: result.token },
        );
        if (requests.length === 1) {
          router.replace(
            `/teilnahmestatus/${encodeURIComponent(requests[0].slug)}` as never,
          );
          return;
        }
        if (requests.length) {
          setChoices(requests);
          return;
        }
      }
      throw new Error(
        "Für dieses Konto besteht kein aktiver Partnerportal-Zugang. Öffne gegebenenfalls deine persönliche Einladung.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  if (choices.length)
    return (
      <>
        <h1>Dein Netzwerk auswählen</h1>
        {choices.map((n) => (
          <Link
            key={n.slug}
            href={`/teilnahmestatus/${encodeURIComponent(n.slug)}` as never}
          >
            {n.name}
          </Link>
        ))}
      </>
    );
  return (
    <>
      <h1>Willkommen zurück.</h1>
      <p className="lead">Melde dich mit deinem persönlichen Zugang an.</p>
      <form className="formGrid" onSubmit={login}>
        {challenge ? (
          <label className="full">
            Sicherheitscode aus Ihrer E-Mail
            <input
              key="code"
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              name="code"
              required
            />{" "}
            <button type="button" onClick={() => setChallenge("")}>
              Zurück zur Anmeldung
            </button>
          </label>
        ) : (
          <>
            <label className="full">
              E-Mail-Adresse
              <input
                key={email}
                type="email"
                name="email"
                defaultValue={email}
                required
                autoComplete="email"
              />
            </label>
            <label className="full">
              Passwort
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
              />
            </label>
          </>
        )}
        <div className="loginOptions">
          <label>
            <input type="checkbox" name="remember" /> Angemeldet bleiben
          </label>
          <Link
            href={
              `/passwort-vergessen${networkSlug ? `?network=${encodeURIComponent(networkSlug)}` : ""}` as never
            }
          >
            Passwort vergessen?
          </Link>
        </div>
        <button className="primary full" disabled={busy}>
          {busy ? "Anmeldung wird geprüft …" : "Sicher anmelden"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
