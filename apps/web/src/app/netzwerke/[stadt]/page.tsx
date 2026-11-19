import {PublishedMarketing,publishedMetadata} from "../../components/published-marketing";
import {CITY_NETWORKS} from "../../lib/city-networks";
import {normalizeCityPath} from "../../lib/city-short-link";
import {notFound} from "next/navigation";
export const dynamic="force-dynamic";
type Props={params:Promise<{stadt:string}>};
export async function generateMetadata({params}:Props){const key=normalizeCityPath((await params).stadt);if(!CITY_NETWORKS.some(c=>c.key===key))notFound();return publishedMetadata(key);}
export default async function Page({params}:Props){return <PublishedMarketing cityKey={normalizeCityPath((await params).stadt)}/>;}
