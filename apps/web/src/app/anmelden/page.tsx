"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("mode", "login");
    if (!params.get("network")) {
      const slug = params
        .get("redirect")
        ?.match(/^\/portal\/netzwerk\/([^/?#]+)/)?.[1];
      if (slug) params.set("network", slug);
    }
    router.replace(`/registrieren?${params.toString()}` as never);
  }, [router]);
  return (
    <main className="networkAccessState">
      <section>
        <h1>Dein Partnerportal wird geöffnet …</h1>
      </section>
    </main>
  );
}
