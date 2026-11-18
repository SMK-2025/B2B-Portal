import cities from "../../../../api/src/networks/city-networks.json";

export const CITY_NETWORKS = cities.map(city => ({
  ...city,
  slug: `unternehmernetzwerk${city.key.replace(/-/g, "")}`,
  route: city.key === "koeln" ? "/Koeln" : city.key === "leverkusen" ? "/Leverkusen" : `/${city.key}`,
}));
export const cityNetwork = (slug: string) => CITY_NETWORKS.find(city => city.slug === slug);
export const acceptsParticipation = (slug: string) => Boolean(cityNetwork(slug)) || ["unternehmerfreunde", "bayer04leverkusen"].includes(slug);
