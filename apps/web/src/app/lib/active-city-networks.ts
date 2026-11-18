import "server-only";
import { CITY_NETWORKS } from "./city-networks";

export async function activeCityNetworks() {
  const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!api) return [];
  try {
    const response = await fetch(`${api}/api/networks/cities/public`, {cache:"no-store", signal:AbortSignal.timeout(10000)});
    if (!response.ok) return [];
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];
    const active = new Set(data.filter(item => item && typeof item === "object" && "slug" in item).map(item => item.slug));
    return CITY_NETWORKS.filter(city => active.has(city.slug));
  } catch { return []; }
}
