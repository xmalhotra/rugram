import type { BootstrapPayload, RugramRecommendation, RugramRecommendationResult, RoutineComponent } from "./types";

type Candidate = RoutineComponent & { score: number };

const goalPatterns: Array<{ pattern: RegExp; componentIds: string[]; weight: number }> = [
  { pattern: /\b(run|running|runner|5k|10k|race|cardio|endurance)\b/i, componentIds: ["easy-run", "bolt-fuel", "daily-walk", "sleep-window"], weight: 20 },
  { pattern: /\b(sleep|tired|rest|recover|recovery|bed|energy)\b/i, componentIds: ["sleep-window", "cr7-light", "messi-prep", "cr7-water"], weight: 20 },
  { pattern: /\b(strength|strong|muscle|workout|fitness|exercise)\b/i, componentIds: ["strength-basics", "daily-walk", "sleep-window", "quinoa-breakfast"], weight: 20 },
  { pattern: /\b(food|eat|breakfast|nutrition|meal|diet)\b/i, componentIds: ["quinoa-breakfast", "messi-food", "cr7-water", "messi-prep"], weight: 20 },
  { pattern: /\b(focus|stress|calm|mind|anxious|pressure)\b/i, componentIds: ["cr7-breathing", "messi-prep", "daily-walk", "sleep-window"], weight: 20 },
  { pattern: /\b(consisten|habit|routine|organis|plan|busy)\b/i, componentIds: ["messi-prep", "daily-walk", "cr7-water", "sleep-window"], weight: 6 },
];

function concise(text: string, maxLength: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function componentReason(component: RoutineComponent, goal: string) {
  const detail = component.placement === "preference"
    ? `It supports ${component.profileGroup?.toLowerCase() ?? component.category.toLowerCase()} without adding another timed task.`
    : `It is a realistic ${component.durationLabel.toLowerCase()} step toward ${goal.toLowerCase()}.`;
  return concise(detail, 190);
}

export function recommendFromCatalog(goal: string, data: Pick<BootstrapPayload, "components" | "timeline">): RugramRecommendationResult {
  const normalizedGoal = concise(goal, 320);
  const ownedIds = new Set(data.timeline.map((entry) => entry.componentId));
  const candidates: Candidate[] = data.components
    .filter((component) => !ownedIds.has(component.id))
    .map((component) => ({ ...component, score: component.evidenceLevel === "reviewed" ? 2 : 0 }));

  for (const { pattern, componentIds, weight } of goalPatterns) {
    if (!pattern.test(normalizedGoal)) continue;
    componentIds.forEach((id, index) => {
      const candidate = candidates.find((component) => component.id === id);
      if (candidate) candidate.score += weight - index * 2;
    });
  }

  const recommendations = candidates
    .sort((first, second) => second.score - first.score || first.title.localeCompare(second.title))
    .slice(0, 3)
    .map<RugramRecommendation>((component) => ({ componentId: component.id, reason: componentReason(component, normalizedGoal) }));

  const profileContext = data.timeline.length
    ? "These extend your current profile instead of repeating what you already added."
    : "Start with one small choice, then see how it fits before adding more.";

  return {
    goal: normalizedGoal,
    guidance: concise(profileContext, 220),
    recommendations,
    engine: "catalog",
  };
}

const modelOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    guidance: { type: "string" },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { componentId: { type: "string" }, reason: { type: "string" } },
        required: ["componentId", "reason"],
      },
    },
  },
  required: ["guidance", "recommendations"],
} as const;

type ModelSuggestion = { componentId?: unknown; reason?: unknown };
type ModelOutput = { guidance?: unknown; recommendations?: ModelSuggestion[] };

function validModelResult(value: ModelOutput, fallback: RugramRecommendationResult, data: Pick<BootstrapPayload, "components" | "timeline">): RugramRecommendationResult | null {
  if (typeof value.guidance !== "string" || !Array.isArray(value.recommendations)) return null;
  const availableIds = new Set(data.components.filter((component) => !data.timeline.some((entry) => entry.componentId === component.id)).map((component) => component.id));
  const usedIds = new Set<string>();
  const recommendations = value.recommendations.flatMap((item) => {
    if (typeof item.componentId !== "string" || typeof item.reason !== "string" || !availableIds.has(item.componentId) || usedIds.has(item.componentId)) return [];
    usedIds.add(item.componentId);
    return [{ componentId: item.componentId, reason: concise(item.reason, 190) }];
  }).slice(0, 3);
  if (!recommendations.length) return null;
  return { ...fallback, guidance: concise(value.guidance, 260), recommendations, engine: "openai" };
}

export async function recommendWithRugram(goal: string, data: Pick<BootstrapPayload, "components" | "timeline" | "publications" | "creators" | "followingCreatorIds">): Promise<RugramRecommendationResult> {
  const fallback = recommendFromCatalog(goal, data);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || fallback.recommendations.length === 0) return fallback;

  const available = data.components
    .filter((component) => !data.timeline.some((entry) => entry.componentId === component.id))
    .map((component) => ({ id: component.id, title: component.title, category: component.category, placement: component.placement, profileGroup: component.profileGroup, duration: component.durationLabel, evidence: component.evidenceLevel, description: component.description }));
  const existing = data.timeline.map((entry) => data.components.find((component) => component.id === entry.componentId)).filter(Boolean).map((component) => ({ title: component?.title, category: component?.category, placement: component?.placement }));
  const followed = data.creators.filter((creator) => data.followingCreatorIds.includes(creator.id)).map((creator) => creator.name);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_QRAM_MODEL ?? process.env.OPENAI_BETTERHABITS_MODEL ?? process.env.OPENAI_RUGRAM_MODEL ?? "gpt-5-mini",
        store: false,
        instructions: "You are Qram, a cautious routine guide. Recommend only IDs in the provided available_components list. Do not diagnose, give medical, nutrition, or training prescriptions, or claim outcomes. Prefer small, realistic, non-duplicative choices. A preference does not belong on a timeline. Return at most three items and explain each in plain language.",
        input: JSON.stringify({ goal: fallback.goal, existing_profile: existing, followed_creators: followed, available_components: available }),
        text: { format: { type: "json_schema", name: "rugram_routine_recommendation", strict: true, schema: modelOutputSchema } },
      }),
    });
    if (!response.ok) return fallback;
    const body = await response.json() as { output_text?: unknown };
    if (typeof body.output_text !== "string") return fallback;
    return validModelResult(JSON.parse(body.output_text) as ModelOutput, fallback, data) ?? fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
