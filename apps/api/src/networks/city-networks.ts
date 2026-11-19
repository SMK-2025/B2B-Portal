import cities from "./city-networks.json";

export const CITY_NETWORKS = cities.map(city => ({
  ...city,
  slug: `unternehmernetzwerk${city.key.replace(/-/g, "")}`,
  route: city.key === "koeln" ? "/Koeln" : city.key === "leverkusen" ? "/Leverkusen" : `/${city.key}`,
}));
export const cityNetwork = (slug: string) => CITY_NETWORKS.find(city => city.slug === slug);
export const acceptsParticipation = (slug: string) => Boolean(cityNetwork(slug)) || ["unternehmerfreunde", "bayer04leverkusen"].includes(slug);

export const CITY_BRAND = {primaryColor:"#536bdb",secondaryColor:"#30264f",logoUrl:"/images/b2b-matching-logo-full.png"} as const;
export function cityBrand<T extends {slug:string;primaryColor:string;secondaryColor:string;logoUrl:string|null}>(network:T):T {
  return cityNetwork(network.slug) ? {...network,...CITY_BRAND} : network;
}
