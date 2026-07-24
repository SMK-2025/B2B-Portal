import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { PortalStore } from "../core/portal.store";
import type { MatchRecord, NeedRecord, ServicePageRecord } from "../core/domain";
import { OpenAiMatchingService } from "./openai-matching.service";

@Injectable()
export class MatchingService {
  constructor(
    @Inject(PortalStore) private readonly store: PortalStore,
    @Inject(AuthService) private readonly auth: AuthService,
    @Optional()
    private readonly ai: OpenAiMatchingService = new OpenAiMatchingService(),
  ) {}

  async recalculate(needId: string) {
    const need = this.need(needId);
    if (need.status !== "active") return [];
    const networkOrganizations = need.networkId
      ? new Set(
          this.store.networkMemberships
            .filter(
              (membership) =>
                membership.networkId === need.networkId &&
                membership.status === "active",
            )
            .map((membership) => membership.organizationId),
        )
      : null;
    const pages = [...this.store.servicePages.values()].filter(
      (page) =>
        page.matchingEligible &&
        page.reviewStatus === "approved" &&
        page.organizationId !== need.organizationId &&
        page.categoryId === need.categoryId &&
        (!networkOrganizations ||
          networkOrganizations.has(page.organizationId)),
    );
    const matches = pages.map((page) => this.ruleMatch(need, page));
    const assessments = await this.ai.assess(need, pages);
    for (const match of matches) {
      const assessment = assessments.get(match.servicePageId);
      if (!assessment) continue;
      const ruleScore = match.score;
      match.score = Math.round(
        ruleScore * 0.55 +
          assessment.semanticScore * 0.25 +
          assessment.analysisScore * 0.2,
      );
      match.components = {
        ...match.components,
        rules: ruleScore,
        semantic: assessment.semanticScore,
        aiAnalysis: assessment.analysisScore,
      };
      match.explanation = [
        ...match.explanation,
        assessment.explanation,
        ...assessment.strengths.map((value) => `Stärke: ${value}`),
        ...assessment.risks.map((value) => `Prüfpunkt: ${value}`),
      ];
    }
    return matches.sort((left, right) => right.score - left.score);
  }

  buyerMatches(authHeader: string | undefined, needId: string) {
    const user = this.auth.authenticate(authHeader);
    const need = this.need(needId);
    this.requireMember(user.id, need.organizationId);
    return [...this.store.matches.values()].filter(
      (match) => match.needId === needId,
    );
  }

  buyerMatchDetails(authHeader: string | undefined, needId: string) {
    return this.buyerMatches(authHeader, needId).map((match) => {
      const servicePage = this.store.servicePages.get(match.servicePageId);
      const provider = this.store.organizations.get(
        match.providerOrganizationId,
      );
      if (!servicePage || !provider)
        throw new NotFoundException(
          "Dienstleisterprofil des Matches nicht gefunden.",
        );
      return {
        match,
        servicePage,
        provider: {
          id: provider.id,
          displayName: provider.displayName,
          legalName: provider.legalName,
          websiteUrl: provider.websiteUrl,
          profileData: provider.profileData || {},
        },
      };
    });
  }

  release(authHeader: string | undefined, matchId: string) {
    const user = this.auth.authenticate(authHeader);
    const match = this.match(matchId);
    this.requireMember(user.id, match.buyerOrganizationId);
    if (!["buyer_review", "deferred"].includes(match.status))
      throw new BadRequestException("Der Match kann nicht freigegeben werden.");
    match.status = "released_anonymously";
    match.buyerDecisionAt = new Date().toISOString();
    return match;
  }

  rejectBuyer(authHeader: string | undefined, matchId: string) {
    const user = this.auth.authenticate(authHeader);
    const match = this.match(matchId);
    this.requireMember(user.id, match.buyerOrganizationId);
    match.status = "rejected_by_buyer";
    match.buyerDecisionAt = new Date().toISOString();
    return match;
  }

  providerInbox(authHeader: string | undefined) {
    const user = this.auth.authenticate(authHeader);
    const organizations = new Set(
      this.store.memberships
        .filter((membership) => membership.userId === user.id)
        .map((membership) => membership.organizationId),
    );
    return [...this.store.matches.values()]
      .filter(
        (match) =>
          organizations.has(match.providerOrganizationId) &&
          [
            "released_anonymously",
            "provider_interested",
            "mutual_match",
          ].includes(match.status),
      )
      .map((match) => ({
        match,
        need: this.anonymousNeed(this.need(match.needId)),
      }));
  }

  providerDecision(
    authHeader: string | undefined,
    matchId: string,
    interested: boolean,
  ) {
    const user = this.auth.authenticate(authHeader);
    const match = this.match(matchId);
    this.requireMember(user.id, match.providerOrganizationId);
    if (match.status !== "released_anonymously")
      throw new BadRequestException(
        "Der Match kann nicht beantwortet werden.",
      );
    match.status = interested ? "provider_interested" : "rejected_by_provider";
    match.providerDecisionAt = new Date().toISOString();
    return match;
  }

  releaseIdentity(authHeader: string | undefined, matchId: string) {
    const user = this.auth.authenticate(authHeader);
    const match = this.match(matchId);
    this.requireMember(user.id, match.buyerOrganizationId);
    if (match.status !== "provider_interested")
      throw new BadRequestException(
        "Die Identität kann erst nach Interesse des Dienstleisters freigegeben werden.",
      );
    match.status = "mutual_match";
    match.identityReleasedAt = new Date().toISOString();
    return match;
  }

  private ruleMatch(need: NeedRecord, page: ServicePageRecord) {
    const existing = [...this.store.matches.values()].find(
      (match) =>
        match.needId === need.id && match.servicePageId === page.id,
    );
    if (
      existing &&
      [
        "rejected_by_buyer",
        "rejected_by_provider",
        "mutual_match",
      ].includes(existing.status)
    )
      return existing;
    const skillHits = need.requiredSkills.length
      ? need.requiredSkills.filter((skill) =>
          page.skills.some(
            (candidate) =>
              candidate.toLowerCase() === skill.toLowerCase(),
          ),
        ).length / need.requiredSkills.length
      : 1;
    const industry = need.preferredIndustries.length
      ? need.preferredIndustries.some((value) =>
          page.targetIndustries
            .map((candidate) => candidate.toLowerCase())
            .includes(value.toLowerCase()),
        )
        ? 1
        : 0.45
      : 1;
    const delivery = need.deliveryModes.some((mode) =>
      page.deliveryModes.includes(mode),
    )
      ? 1
      : 0;
    const region =
      !need.region ||
      page.serviceRegions.some(
        (value) =>
          value.toLowerCase().includes(need.region!.toLowerCase()) ||
          value.toLowerCase() === "deutschland",
      )
        ? 1
        : 0.35;
    const score = Math.round(
      (0.4 * skillHits +
        0.2 * industry +
        0.2 * delivery +
        0.2 * region) *
        100,
    );
    const components = {
      skills: Math.round(skillHits * 100),
      industry: Math.round(industry * 100),
      delivery: delivery * 100,
      region: Math.round(region * 100),
    };
    const explanation = [
      `${components.skills} % der Pflichtfähigkeiten stimmen überein.`,
      delivery
        ? "Das gewünschte Liefermodell wird angeboten."
        : "Das gewünschte Liefermodell fehlt.",
      region === 1
        ? "Die regionale Anforderung wird erfüllt."
        : "Die regionale Abdeckung ist nur teilweise passend.",
    ];
    if (existing) {
      existing.score = score;
      existing.components = components;
      existing.explanation = explanation;
      return existing;
    }
    const match: MatchRecord = {
      id: randomUUID(),
      needId: need.id,
      servicePageId: page.id,
      buyerOrganizationId: need.organizationId,
      providerOrganizationId: page.organizationId,
      score,
      components,
      explanation,
      status: "buyer_review",
      buyerDecisionAt: null,
      providerDecisionAt: null,
      identityReleasedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.store.matches.set(match.id, match);
    return match;
  }

  private anonymousNeed(need: NeedRecord) {
    return {
      id: need.id,
      networkId: need.networkId,
      title: need.title,
      description: need.description,
      categoryId: need.categoryId,
      requiredSkills: need.requiredSkills,
      preferredIndustries: need.preferredIndustries,
      region: need.region,
      deliveryModes: need.deliveryModes,
    };
  }

  private need(id: string) {
    const value = this.store.needs.get(id);
    if (!value) throw new NotFoundException("Bedarf nicht gefunden.");
    return value;
  }

  private match(id: string) {
    const value = this.store.matches.get(id);
    if (!value) throw new NotFoundException("Match nicht gefunden.");
    return value;
  }

  private requireMember(userId: string, organizationId: string) {
    if (
      !this.store.memberships.some(
        (membership) =>
          membership.userId === userId &&
          membership.organizationId === organizationId,
      )
    )
      throw new ForbiddenException();
  }
}
