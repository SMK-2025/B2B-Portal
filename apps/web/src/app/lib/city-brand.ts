import { cityNetwork } from "./city-networks";
export const CITY_BRAND = {
  primaryColor: "#536bdb",
  secondaryColor: "#30264f",
  logoUrl: "/images/b2b-matching-logo-full.png",
} as const;
export function ownCityBrand<
  T extends {
    slug: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
  },
>(brand: T): T {
  return cityNetwork(brand.slug) ? { ...brand, ...CITY_BRAND } : brand;
}
