"use client";
import { useEffect } from "react";
import { portalRequest } from "../lib/portal-api";
import { authorizedMailingToken } from "../lib/mailing-token";
export function MailingAttributionBridge() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("ml");
    if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return;
    // The existing privacy choice can only restrict tracking, never replace
    // the separate evidence checked by the server. No new tracking storage.
    let recorded = false;
    const record = () => {
      if (recorded || !authorizedMailingToken()) return;
      recorded = true;
      void portalRequest("/mailings/public/view", {
        body: { token, path: window.location.pathname },
      }).catch(() => {});
    };
    record();
    window.addEventListener("consent-updated", record);
    const propagate = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const url = new URL(anchor.href, location.origin);
      if (
        url.origin === location.origin &&
        ["/registrieren", "/Leverkusen", "/anmelden"].includes(url.pathname)
      ) {
        if (authorizedMailingToken()) url.searchParams.set("ml", token);
        else url.searchParams.delete("ml");
        anchor.href = url.toString();
      }
    };
    document.addEventListener("click", propagate, true);
    return () => {
      document.removeEventListener("click", propagate, true);
      window.removeEventListener("consent-updated", record);
    };
  }, []);
  return null;
}
