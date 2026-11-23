import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../portal-ui.css";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function PortalLayout({ children }: { children: ReactNode }) { return children; }
