"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPortalSession, portalRequest } from "../lib/portal-api";

type Session = { valid: boolean; accountRole: string };

export function AdminAccessGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );
  useEffect(() => {
    const token = getPortalSession();
    if (!token) {
      setState("denied");
      return;
    }
    portalRequest<Session>("/auth/session/check", { method: "POST", token })
      .then((session) => {
        if (["platform_admin", "reviewer"].includes(session.accountRole))
          setState("allowed");
        else {
          setState("denied");
          router.replace("/portal/unternehmen");
        }
      })
      .catch(() => setState("denied"));
  }, [router]);
  if (state === "allowed") return <>{children}</>;
  if (state === "checking")
    return (
      <main className="adminGate">
        <div>
          <span>ADMINISTRATION</span>
          <h1>Zugangsberechtigung wird geprüft.</h1>
          <p>Ihre geschützte Sitzung wird mit dem Portalserver abgeglichen.</p>
        </div>
      </main>
    );
  return (
    <main className="adminGate">
      <div>
        <span>GESCHÜTZTER BEREICH</span>
        <h1>Bitte als Plattformadministrator anmelden.</h1>
        <p>
          Die Netzwerk- und Portalverwaltung ist nicht öffentlich zugänglich.
        </p>
        <Link href="/anmelden">Zur sicheren Anmeldung</Link>
      </div>
    </main>
  );
}
