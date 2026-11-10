import { tokenHash } from "../auth/password";
import type { MailingLead, MailingList } from "./mailing.types";

// Old imports had no batch id. Recover their boundaries from retained source and
// timestamps, without changing contacts, permissions, deliveries or suppression.
export function mailingLists(leads: MailingLead[], networkId: string) {
  const lists = new Map<string, MailingList & { leadIds: string[] }>();
  const add = (list: MailingList, lead: MailingLead) => {
    let entry = lists.get(list.id);
    if (!entry) lists.set(list.id, (entry = { ...list, leadIds: [] }));
    if (!entry.leadIds.includes(lead.id)) entry.leadIds.push(lead.id);
  };
  const scoped = leads.filter((l) => l.networkId === networkId);
  for (const lead of scoped)
    for (const list of lead.lists || []) add(list, lead);
  const legacy = scoped
    .filter((l) => !l.lists?.length)
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
  const groups = new Map<
    string,
    { list: MailingList; last: string; count: number }
  >();
  for (const lead of legacy) {
    const source = lead.source || "Bisheriger Import";
    let group = groups.get(source);
    if (
      !group ||
      group.count >= 500 ||
      Date.parse(lead.createdAt) - Date.parse(group.last) > 60_000
    ) {
      const id =
        "legacy-" +
        tokenHash(`${networkId}:${source}:${lead.createdAt}:${lead.id}`).slice(
          0,
          24,
        );
      group = {
        list: { id, name: source, source, createdAt: lead.createdAt },
        last: lead.createdAt,
        count: 0,
      };
      groups.set(source, group);
    }
    add(group.list, lead);
    group.last = lead.createdAt;
    group.count++;
  }
  return [...lists.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
