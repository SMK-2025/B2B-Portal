import { afterEach, describe, expect, it, vi } from "vitest";
import type { NeedRecord, ServicePageRecord } from "../core/domain";
import { OpenAiMatchingService } from "./openai-matching.service";

const need: NeedRecord = {
  id: "need-1",
  organizationId: "buyer-1",
  networkId: null,
  title: "Sicherheitsprüfung eines Kundenportals",
  description: "Gesucht wird ein OWASP-basierter Penetrationstest.",
  categoryId: "it-security",
  requiredSkills: ["OWASP"],
  preferredIndustries: ["Industrie"],
  region: "Deutschland",
  deliveryModes: ["online"],
  status: "active",
  createdAt: "2026-07-24T00:00:00.000Z",
  details: [],
};

const page: ServicePageRecord = {
  id: "service-1",
  organizationId: "provider-1",
  title: "Web Application Penetration Testing",
  summary: "Prüfung geschäftskritischer Webanwendungen.",
  description: "OWASP-Tests, Bericht und priorisierte Maßnahmen.",
  categoryId: "it-security",
  skills: ["Web Security"],
  targetIndustries: ["Industrie"],
  serviceRegions: ["Deutschland"],
  deliveryModes: ["online"],
  reviewStatus: "approved",
  publicVisibility: true,
  matchingEligible: true,
  version: 1,
  submittedAt: "2026-07-24T00:00:00.000Z",
  approvedAt: "2026-07-24T00:00:00.000Z",
  createdAt: "2026-07-24T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MATCHING_ENABLED;
});

describe("OpenAiMatchingService", () => {
  it("bleibt bei deaktiviertem Feature-Schalter vollständig lokal", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await new OpenAiMatchingService().assess(need, [page]);
    expect(result.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("kombiniert Embeddings mit einer strukturierten Matchanalyse", async () => {
    process.env.OPENAI_MATCHING_ENABLED = "true";
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              { index: 0, embedding: [1, 0] },
              { index: 1, embedding: [0.9, 0.1] },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      matches: [
                        {
                          servicePageId: "service-1",
                          analysisScore: 91,
                          strengths: ["Passender Sicherheitsfokus"],
                          risks: ["Zertifikate noch prüfen"],
                          explanation:
                            "Leistung und Bedarf passen fachlich sehr gut zusammen.",
                        },
                      ],
                    }),
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new OpenAiMatchingService().assess(need, [page]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.get("service-1")).toMatchObject({
      semanticScore: 99,
      analysisScore: 91,
      strengths: ["Passender Sicherheitsfokus"],
      risks: ["Zertifikate noch prüfen"],
    });
  });

  it("fällt bei einem OpenAI-Fehler sicher auf das Regel-Matching zurück", async () => {
    process.env.OPENAI_MATCHING_ENABLED = "true";
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Fehler", { status: 500 })),
    );
    const result = await new OpenAiMatchingService().assess(need, [page]);
    expect(result.size).toBe(0);
  });
});
