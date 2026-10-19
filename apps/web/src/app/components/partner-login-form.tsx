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
  onOnboarding: (token: string) => void;
}) {
  const router = useRouter();
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
        user: { accountRole: string };
      }>("/auth/login", {
        body: { email: form.get("email"), password: form.get("password") },
      });
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
      await portalRequest("/networks/invitations/claim", {
        token: result.token,
        body: {},
      });
      const networks = await portalRequest<
        Array<{
          membership: { role: string };
          network: { slug: string; settings?: { setupCompletedAt?: string } };
        }>
      >("/networks/mine", { token: result.token });
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
            : destination) as never,
        );
        return;
      }
      if (networkSlug && invite) {
        onOnboarding(result.token);
        return;
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
  return (
    <>
      <h1>Willkommen zurück.</h1>
      <p className="lead">Melde dich mit deinem persönlichen Zugang an.</p>
      <form className="formGrid" onSubmit={login}>
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
