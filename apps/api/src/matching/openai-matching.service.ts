import { Injectable, Logger } from "@nestjs/common";
import type { NeedRecord, ServicePageRecord } from "../core/domain";

export interface AiMatchAssessment {
  semanticScore: number;
  analysisScore: number;
  strengths: string[];
  risks: string[];
  explanation: string;
}

interface EmbeddingResponse {
  data?: Array<{ index: number; embedding: number[] }>;
}

interface ResponsesApiResult {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}

@Injectable()
export class OpenAiMatchingService {
  private readonly logger = new Logger(OpenAiMatchingService.name);

  enabled(): boolean {
    return process.env.OPENAI_MATCHING_ENABLED === "true";
  }

  async assess(
    need: NeedRecord,
    pages: ServicePageRecord[],
  ): Promise<Map<string, AiMatchAssessment>> {
    if (!this.enabled() || !pages.length) return new Map();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        "OPENAI_MATCHING_ENABLED ist aktiv, aber OPENAI_API_KEY fehlt. Regel-Matching bleibt aktiv.",
      );
      return new Map();
    }
    try {
      const embeddings = await this.embeddings(apiKey, [
        this.needText(need),
        ...pages.map((page) => this.pageText(page)),
      ]);
      const semanticScores = new Map(
        pages.map((page, index) => [
          page.id,
          this.percent(this.cosine(embeddings[0], embeddings[index + 1])),
        ]),
      );
      const candidates = [...pages]
        .sort(
          (left, right) =>
            (semanticScores.get(right.id) ?? 0) -
            (semanticScores.get(left.id) ?? 0),
        )
        .slice(0, 10);
      const analyses = await this.analyze(apiKey, need, candidates, semanticScores);
      return new Map(
        pages.map((page) => {
          const semanticScore = semanticScores.get(page.id) ?? 0;
          const analysis = analyses.get(page.id);
          return [
            page.id,
            {
              semanticScore,
              analysisScore: analysis?.analysisScore ?? semanticScore,
              strengths: analysis?.strengths ?? [],
              risks: analysis?.risks ?? [],
              explanation:
                analysis?.explanation ??
                `Die semantische Übereinstimmung beträgt ${semanticScore} %.`,
            },
          ];
        }),
      );
    } catch (error) {
      this.logger.error(
        "OpenAI-Matchanalyse fehlgeschlagen. Regel-Matching bleibt aktiv.",
        error instanceof Error ? error.stack : String(error),
      );
      return new Map();
    }
  }

  private async embeddings(apiKey: string, input: string[]): Promise<number[][]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
        input,
        encoding_format: "float",
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI Embeddings: HTTP ${response.status}`);
    const payload = (await response.json()) as EmbeddingResponse;
    const ordered = [...(payload.data ?? [])].sort(
      (left, right) => left.index - right.index,
    );
    if (ordered.length !== input.length)
      throw new Error("OpenAI hat nicht alle Embeddings zurückgegeben.");
    return ordered.map((item) => item.embedding);
  }

  private async analyze(
    apiKey: string,
    need: NeedRecord,
    pages: ServicePageRecord[],
    semanticScores: Map<string, number>,
  ): Promise<
    Map<string, Omit<AiMatchAssessment, "semanticScore">>
  > {
    if (!pages.length) return new Map();
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MATCH_MODEL || "gpt-5.6-terra",
        reasoning: { effort: "low" },
        input: [
          {
            role: "system",
            content:
              "Du bewertest anonymisierte B2B-Dienstleistungsmatches. Bewerte ausschließlich fachliche Eignung, Anforderungen, Branchenkontext, Liefermodell, Region und erkennbare Risiken. Erfinde keine Angaben. Personenbezogene oder geschützte Merkmale dürfen niemals berücksichtigt werden.",
          },
          {
            role: "user",
            content: JSON.stringify({
              need: this.needPayload(need),
              candidates: pages.map((page) => ({
                id: page.id,
                semanticScore: semanticScores.get(page.id) ?? 0,
                service: this.pagePayload(page),
              })),
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "b2b_match_assessments",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["matches"],
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "servicePageId",
                      "analysisScore",
                      "strengths",
                      "risks",
                      "explanation",
                    ],
                    properties: {
                      servicePageId: { type: "string" },
                      analysisScore: {
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
                      },
                      strengths: {
                        type: "array",
                        maxItems: 5,
                        items: { type: "string" },
                      },
                      risks: {
                        type: "array",
                        maxItems: 5,
                        items: { type: "string" },
                      },
                      explanation: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI Responses: HTTP ${response.status}`);
    const payload = (await response.json()) as ResponsesApiResult;
    const text = payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("OpenAI hat keine strukturierte Analyse geliefert.");
    const parsed = JSON.parse(text) as {
      matches?: Array<{
        servicePageId: string;
        analysisScore: number;
        strengths: string[];
        risks: string[];
        explanation: string;
      }>;
    };
    const allowed = new Set(pages.map((page) => page.id));
    return new Map(
      (parsed.matches ?? [])
        .filter((item) => allowed.has(item.servicePageId))
        .map((item) => [
          item.servicePageId,
          {
            analysisScore: this.clamp(item.analysisScore),
            strengths: item.strengths.slice(0, 5),
            risks: item.risks.slice(0, 5),
            explanation: item.explanation.slice(0, 1200),
          },
        ]),
    );
  }

  private needText(need: NeedRecord): string {
    return JSON.stringify(this.needPayload(need));
  }

  private pageText(page: ServicePageRecord): string {
    return JSON.stringify(this.pagePayload(page));
  }

  private needPayload(need: NeedRecord) {
    return {
      title: need.title,
      description: need.description,
      categoryId: need.categoryId,
      requiredSkills: need.requiredSkills,
      preferredIndustries: need.preferredIndustries,
      region: need.region,
      deliveryModes: need.deliveryModes,
      details: need.details ?? [],
    };
  }

  private pagePayload(page: ServicePageRecord) {
    return {
      title: page.title,
      summary: page.summary,
      description: page.description,
      categoryId: page.categoryId,
      skills: page.skills,
      targetIndustries: page.targetIndustries,
      serviceRegions: page.serviceRegions,
      deliveryModes: page.deliveryModes,
    };
  }

  private cosine(left: number[], right: number[]): number {
    if (!left?.length || left.length !== right?.length) return 0;
    let dot = 0;
    let leftLength = 0;
    let rightLength = 0;
    for (let index = 0; index < left.length; index += 1) {
      dot += left[index] * right[index];
      leftLength += left[index] ** 2;
      rightLength += right[index] ** 2;
    }
    if (!leftLength || !rightLength) return 0;
    return dot / (Math.sqrt(leftLength) * Math.sqrt(rightLength));
  }

  private percent(value: number): number {
    return this.clamp(Math.round(Math.max(0, value) * 100));
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
