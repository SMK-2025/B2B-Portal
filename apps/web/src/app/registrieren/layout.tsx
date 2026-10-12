import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { title: "Einladung zum Partnerportal", robots: { index: false, follow: false } };
export default function RegistrationLayout({ children }: { children: ReactNode }) { return children; }
