import { validContributionCents } from "./member-contribution";
export { contributionRegistrationHref } from "./member-contribution";
const key = (network: string) => `b2b:contribution:v1:${network.toLowerCase()}`;
export function saveContributionSelection(network: string, cents: number) {
  if (validContributionCents(String(cents)) === null) return;
  try {
    localStorage.setItem(key(network), String(cents));
  } catch {
    /* URL still carries the selection. */
  }
}
export function readContributionSelection(network: string): number | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const matches =
    params.get("network")?.toLowerCase() === network.toLowerCase();
  if (matches && params.has("selectedMonthlyNetCents")) {
    const cents = validContributionCents(params.get("selectedMonthlyNetCents"));
    if (cents !== null) saveContributionSelection(network, cents);
    return cents;
  }
  try {
    return validContributionCents(localStorage.getItem(key(network)));
  } catch {
    return null;
  }
}
export function selectedContributionText(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
