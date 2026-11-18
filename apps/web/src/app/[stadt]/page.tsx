import { notFound, permanentRedirect } from "next/navigation";
import { activeCityNetworks } from "../lib/active-city-networks";
import { CITY_NETWORKS } from "../lib/city-networks";
import { cityLinkDestination, normalizeCityPath } from "../lib/city-short-link";

export const dynamic = "force-dynamic";

export default async function CityShortLink({ params, searchParams }: {
  params: Promise<{stadt: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const key = normalizeCityPath((await params).stadt);
  if (!CITY_NETWORKS.some(city => city.key === key)) notFound();
  const city = (await activeCityNetworks()).find(city => city.key === key);
  if (!city) notFound();
  // Preserve existing indexed URLs and campaign attribution parameters.
  permanentRedirect(cityLinkDestination(city.route, await searchParams) as never);
}
