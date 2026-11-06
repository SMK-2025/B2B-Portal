import { describe, expect, it } from "vitest";
import { PortalStore } from "./portal.store";
import { provisionKoeln, replaceKoelnLogo } from "./provision-koeln";

function fixture() {
  const s = new PortalStore();
  s.users.set("owner", { id: "owner", accountRole: "platform_admin" } as never);
  s.networks.set("lev", {
    id: "lev",
    slug: "unternehmernetzwerkleverkusen",
    settings: { memberMonthlyNetCents: 2900 },
  } as never);
  return s;
}
describe("owner-requested Cologne provisioning", () => {
  it('replaces only the Cologne logo and preserves all other settings', () => {
    const s = fixture();
    provisionKoeln(s);
    const network = [...s.networks.values()].find(n => n.slug === 'unternehmernetzwerkkoeln')!;
    network.logoUrl = '/images/unternehmernetzwerk-koeln.svg';
    const before = JSON.stringify({...network,logoUrl:null});
    const other = JSON.stringify(s.networks.get('lev'));
    expect(replaceKoelnLogo(s)).toBe(true);
    expect(network.logoUrl).toBe('/images/b2b-matching-logo-brand.png');
    expect(JSON.stringify({...network,logoUrl:null})).toBe(before);
    expect(JSON.stringify(s.networks.get('lev'))).toBe(other);
    expect(replaceKoelnLogo(s)).toBe(false);
    expect(s.operatorMails.size).toBe(0);
  });
  it("creates an isolated active network with approved pricing and no memberships or orders", () => {
    const s = fixture(),
      before = JSON.stringify(s.networks.get("lev"));
    expect(provisionKoeln(s)).toBe(true);
    const n = s.networks.get(s.networkBySlug.get("unternehmernetzwerkkoeln")!)!;
    expect(n).toMatchObject({
      name: "Unternehmernetzwerk Köln",
      status: "active",
      primaryColor: "#c8102e",
      secondaryColor: "#171717",
      settings: {
        closedNetwork: true,
        selfRegistration: false,
        crossNetworkMatching: false,
        memberPaymentModel: "individual",
        memberMonthlyNetCents: 2900,
        memberBilling: {
          months: 12,
          autoRenew: false,
          freeUntil: null,
          paidThrough: null,
        },
      },
    });
    expect(JSON.stringify(s.networks.get("lev"))).toBe(before);
    expect(s.networkOrders.size).toBe(0);
    expect(s.networkMemberships).toHaveLength(0);
    expect(s.operatorMails.size).toBe(0);
    expect([...s.networkContents.values()]).toHaveLength(1);
    expect([...s.networkContents.values()][0]).toMatchObject({
      networkId: n.id,
      type: "topic",
      status: "published",
      data: {
        imageUrl: "/images/koeln-network-blue-hour.webp",
        discussionOpen: true,
      },
    });
  });
  it("does not overwrite later owner edits or recreate deleted networks", () => {
    const s = fixture();
    provisionKoeln(s);
    const id = s.networkBySlug.get("unternehmernetzwerkkoeln")!;
    s.networks.get(id)!.primaryColor = "#ffffff";
    expect(provisionKoeln(s)).toBe(false);
    expect(s.networks.get(id)!.primaryColor).toBe("#ffffff");
    s.networks.delete(id);
    expect(provisionKoeln(s)).toBe(false);
    expect(s.networks.size).toBe(1);
  });
  it("preserves an existing same-slug network and waits for the operator environment", () => {
    const s = fixture();
    s.networks.set("custom", {
      id: "custom",
      slug: "unternehmernetzwerkkoeln",
      name: "Existing",
    } as never);
    provisionKoeln(s);
    expect(s.networks.get("custom")!.name).toBe("Existing");
    expect(s.networks.size).toBe(2);
    expect(provisionKoeln(new PortalStore())).toBe(false);
  });
});
