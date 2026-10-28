import {notFound} from 'next/navigation';
import {NetworkShell} from '../../../../components/network-shell';
import {HomepagePublications} from '../../../../components/homepage-publications';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(slug!=='unternehmerfreunde')notFound();return <NetworkShell slug={slug} networkName="Unternehmerfreunde" title="Öffentliche Homepage-Freigaben" intro="Mitglieder, Veranstaltungen und Rückblicke gezielt für die öffentliche Homepage freigeben."><HomepagePublications/></NetworkShell>}
