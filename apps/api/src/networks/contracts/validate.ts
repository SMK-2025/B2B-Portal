import schema from "./homepage-v1.json";
export function matches(value: any, rule: any): boolean {
  if ("const" in rule && value !== rule.const) return false;
  if (rule.enum && !rule.enum.includes(value)) return false;
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    const type =
      value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    if (!types.includes(type)) return false;
  }
  if (
    typeof value === "string" &&
    ((rule.minLength && value.trim().length < rule.minLength) ||
      (rule.maxLength && value.length > rule.maxLength) ||
      (rule.pattern && !new RegExp(rule.pattern).test(value)))
  )
    return false;
  if (Array.isArray(value)) {
    if (rule.maxItems && value.length > rule.maxItems) return false;
    if (rule.items && !value.every((x) => matches(x, rule.items))) return false;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (rule.required?.some((k: string) => !Object.hasOwn(value, k)))
      return false;
    for (const [k, r] of Object.entries(rule.properties || {}))
      if (Object.hasOwn(value, k) && !matches(value[k], r)) return false;
  }
  return true;
}
export function assertContract(feed: any): void {
  const envelope = {
    ...schema,
    properties: {
      ...schema.properties,
      members: { type: "array", maxItems: 1000 },
      events: { type: "array", maxItems: 1000 },
      recaps: { type: "array", maxItems: 1000 },
    },
  };
  if (!matches(feed, envelope)) throw Error("PUBLIC_FEED_ENVELOPE_INVALID");
  for (const kind of ["members", "events", "recaps"]) {
    const ids = new Set();
    for (const item of feed[kind]) {
      if (
        !matches(item, (schema.properties as any)[kind].items) ||
        ids.has(item.id)
      )
        throw Error("PUBLIC_FEED_RECORD_INVALID");
      ids.add(item.id);
    }
  }
}
