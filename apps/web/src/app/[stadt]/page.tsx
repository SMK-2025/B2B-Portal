import CityPage, {
  generateMetadata as cityMetadata,
} from "../netzwerke/[stadt]/page";
import { normalizeCityPath } from "../lib/city-short-link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ stadt: string }>;
};
async function normalized(params: Props["params"]) {
  return { stadt: normalizeCityPath((await params).stadt) };
}
export async function generateMetadata({ params }: Props) {
  return cityMetadata({ params: normalized(params) });
}
export default async function DirectCityLanding({ params }: Props) {
  // Render the complete landing page here. No redirect, rewrite or URL change.
  return CityPage({ params: normalized(params) });
}
