import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyImport, companyFields, companyWebsite } from "./company-import";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("optional company homepage import", () => {
  it("rejects local URLs, credentials and non-HTTPS", () => {
    for (const url of [
      "http://example.de",
      "https://localhost",
      "https://127.0.0.1",
      "https://[::1]",
      "https://user:secret@example.de",
      "https://app.internal",
    ])
      expect(() => companyWebsite(url)).toThrow();
    expect(companyWebsite("https://example.de/?token=secret").href).toBe(
      "https://example.de/",
    );
  });
  it("requires configuration without making requests", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(
      new CompanyImport().generate("member", "https://example.de"),
    ).rejects.toThrow(/nicht eingerichtet/);
  });
  it("returns a sourced draft, never saves data and rate limits repeated imports", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    const draft = Object.fromEntries(
      Object.keys(companyFields).map((k) => [k, ""]),
    );
    draft.companyName = "Beispiel GmbH";
    draft.description =
      "Ein belegter Unternehmensentwurf für die Partnerseite.";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "completed",
          output: [
            {
              type: "web_search_call",
              action: {
                sources: [
                  { url: "https://example.de/ueber-uns" },
                  { url: "https://other.de/" },
                ],
              },
            },
            { content: [{ type: "output_text", text: "Belegte Recherche" }] },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "completed",
          output: [
            { content: [{ type: "output_text", text: JSON.stringify(draft) }] },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetcher);
    const importer = new CompanyImport(),
      result = await importer.generate("member", "https://example.de");
    expect(result.reviewRequired).toBe(true);
    expect(result.draft.companyName).toBe("Beispiel GmbH");
    expect(result.sources).toEqual(["https://example.de/ueber-uns"]);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).store).toBe(false);
    await expect(
      importer.generate("member", "https://example.de"),
    ).rejects.toThrow(/Minute/);
  });
  it("does not invent data if the homepage has no sources", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ status: "completed", output: [] }),
        }),
    );
    await expect(
      new CompanyImport().generate("member", "https://example.de"),
    ).rejects.toThrow(/nichts gespeichert/);
  });
});
