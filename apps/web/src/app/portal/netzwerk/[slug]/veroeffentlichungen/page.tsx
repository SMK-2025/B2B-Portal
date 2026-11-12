import {NetworkShell} from '../../../../components/network-shell';
import {HomepagePublications} from '../../../../components/homepage-publications';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <NetworkShell slug={slug} title="Öffentliche Homepage-Freigaben" intro="Mitglieder, Veranstaltungen und Rückblicke gezielt für die öffentliche Homepage freigeben."><HomepagePublications/></NetworkShell>}
