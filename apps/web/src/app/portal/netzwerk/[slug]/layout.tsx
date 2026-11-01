import { NetworkShell } from "../../../components/network-shell";
import type { ReactNode } from "react";

export default async function NetworkLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NetworkShell slug={slug} title="" intro="">{children}</NetworkShell>;
}
