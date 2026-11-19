import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityMarketing } from "../../components/city-marketing";
import { CITY_NETWORKS } from "../../lib/city-networks";
import { normalizeCityPath } from "../../lib/city-short-link";
import { MarketingInfoPage } from "../../components/marketing-info-page";
import { marketingPage, MARKETING_PAGES } from "../../lib/marketing-pages";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ stadt?: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = (await params).stadt || [];
  const key = path[0] ? normalizeCityPath(path[0]) : "";
  const page = marketingPage(key),
    city = CITY_NETWORKS.find((c) => c.key === key);
  const title = page
    ? `${MARKETING_PAGES[page].label} | B2B Matching`
    : city
      ? `Unternehmernetzwerk ${city.city} | B2B Matching`
      : "Unternehmernetzwerke | B2B Matching";
  return {
    title: { absolute: `Vorschau: ${title}` },
    description: page
      ? MARKETING_PAGES[page].description
      : city
        ? `Unternehmen in ${city.city} kennenlernen, Leistungen finden und direkt miteinander sprechen.`
        : "Ihr Unternehmernetzwerk vor Ort und Ihr eigenes Netzwerkportal.",
    robots: { index: false, follow: false },
  };
}
export default async function Preview({
  params,
}: {
  params: Promise<{ stadt?: string[] }>;
}) {
  const path = (await params).stadt;
  const key = path?.[0] ? normalizeCityPath(path[0]) : undefined;
  const page = key ? marketingPage(key) : null;
  if (
    path &&
    (path.length !== 1 || (!page && !CITY_NETWORKS.some((c) => c.key === key)))
  )
    notFound();
  if (page) return <MarketingInfoPage page={page} preview />;
  // This design preview shows the planned contribution model, never a live booking quote.
  return <CityMarketing cityKey={key} preview />;
}
