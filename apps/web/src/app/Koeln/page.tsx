import {PublishedMarketing,publishedMetadata} from "../components/published-marketing";
export const dynamic="force-dynamic";
export const metadata=publishedMetadata("koeln");
export default function Page(){return <PublishedMarketing cityKey="koeln"/>;}
