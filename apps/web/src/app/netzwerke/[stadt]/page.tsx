import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CityLanding } from "../../components/city-landing";
import { activeCityNetworks } from "../../lib/active-city-networks";

export const dynamic = "force-dynamic";
type Props = {params: Promise<{stadt: string}>};

async function resolveCity(params: Props["params"]) {
  const {stadt} = await params;
  const city = (await activeCityNetworks()).find(city => city.key === stadt);
  if (!city) notFound();
  return city;
}
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const city = await resolveCity(params);
  const title = `Unternehmernetzwerk ${city.city} | Kontakte & Kooperationen`;
  const description = `Ihr eigenes Unternehmernetzwerk in ${city.city}, ${city.region}: Unternehmen kennenlernen, Leistungen finden, Angebote teilen und direkt im Mitglieder-Chat sprechen. Jetzt Mitgliedschaft anfragen.`;
  return {title,description,alternates:{canonical:city.route},openGraph:{title,description,url:city.route,type:"website",locale:"de_DE",siteName:"B2B Matching"}};
}
export default async function Page({params}:Props) {
  const city = await resolveCity(params);
  if (city.key === "koeln" || city.key === "leverkusen") permanentRedirect(city.route as never);
  return <CityLanding city={city.city} slug={city.slug} route={city.route} primary="#536bdb" image="/images/network-meeting-home.webp" districts={[]} region={city.region} newCity />;
}
