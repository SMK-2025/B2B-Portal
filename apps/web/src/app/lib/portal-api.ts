export const portalApiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function portalRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; token?: string } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${portalApiUrl}/api${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: {
        accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "content-type": "application/json" }),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new Error(
      "Der Portalserver ist momentan nicht erreichbar. Bitte versuchen Sie es gleich noch einmal.",
    );
  }

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(" ")
      : data.message;
    throw new Error(
      typeof message === "string"
        ? message
        : "Die Anfrage konnte nicht verarbeitet werden.",
    );
  }
  return data as T;
}

export function savePortalSession(token: string, remember: boolean) {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  other.removeItem("b2b-matching-session");
  target.setItem("b2b-matching-session", token);
}

export function getPortalSession() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("b2b-matching-session") ??
    sessionStorage.getItem("b2b-matching-session")
  );
}

export function routeForRole(role: "buyer" | "provider" | "both" | undefined) {
  return role === "provider" ? "/portal/dienstleister" : "/portal/unternehmen";
}
