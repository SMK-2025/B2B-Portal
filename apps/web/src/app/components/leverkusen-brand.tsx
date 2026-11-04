"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { portalRequest } from "../lib/portal-api";

type Brand = { primaryColor?: string; secondaryColor?: string };
const valid = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
function contrast(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => {
      const c = parseInt(v, 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? "#000000"
    : "#ffffff";
}

export function LeverkusenBrand({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState({ primary: "#0723f2", dark: "#000000" });
  useEffect(() => {
    let active = true;
    void portalRequest<Brand>(
      "/networks/branding/unternehmernetzwerkleverkusen",
    )
      .then((data) => {
        if (active)
          setBrand((previous) => ({
            primary: valid(data.primaryColor)
              ? data.primaryColor
              : previous.primary,
            dark: valid(data.secondaryColor)
              ? data.secondaryColor
              : previous.dark,
          }));
      })
      .catch(() => {
        /* Keep the last known network branding if unavailable. */
      });
    return () => {
      active = false;
    };
  }, []);
  const style = {
    "--lev-brand": brand.primary,
    "--lev-dark": brand.dark,
    "--lev-on-brand": contrast(brand.primary),
    "--lev-on-dark": contrast(brand.dark),
  } as CSSProperties;
  return (
    <div className="v2 levPublic" style={style}>
      {children}
    </div>
  );
}
