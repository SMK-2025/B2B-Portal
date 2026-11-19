import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" }
    ] }, ...["/portal/:path*", "/anmelden", "/registrieren", "/email-bestaetigen", "/konto-email-bestaetigen", "/zugang-uebernehmen", "/teilnahmestatus/:path*", "/entwurf-manus/:path*", "/entwurf-homepage/:path*", "/entwurf-kommunikation/:path*", "/entwurf-startseite/:path*", "/passwort-vergessen", "/passwort-zuruecksetzen", "/team-einladung"].map(source => ({source, headers:[{key:"X-Robots-Tag",value:"noindex, nofollow"}]}))];
  }
};

export default nextConfig;
