import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "B2B Match Portal",
  description: "Vertrauliche Geschäftsanbahnung mit geprüften Dienstleistern"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
