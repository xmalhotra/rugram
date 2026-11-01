import type { HabitFlow } from './mobile';

export type TechResourceLink = { title: string; detail: string; url: string };

export type TechResource = {
  id: string;
  title: string;
  summary: string;
  links: readonly TechResourceLink[];
};

/** Written resources only. These cards do not use generated people or pose frames. */
export const techResources = [
  {
    id: 'tech-fde-resources',
    title: 'FDE resources',
    summary: 'Public explanations of forward deployed engineering, from the people who named the role.',
    links: [
      {
        title: 'Dev versus Delta',
        detail: 'Palantir’s own account of product engineers and forward deployed engineers.',
        url: 'https://blog.palantir.com/dev-versus-delta-demystifying-engineering-roles-at-palantir-ad44c2a6e87',
      },
      {
        title: 'A day as a forward deployed software engineer',
        detail: 'What the work looks like with a customer, in Palantir’s words.',
        url: 'https://blog.palantir.com/a-day-in-the-life-of-a-palantir-forward-deployed-software-engineer-45ef2de257b1',
      },
      {
        title: 'Forward deployed engineering, in the architecture notes',
        detail: 'How Palantir describes the method inside its architecture center.',
        url: 'https://palantir.com/docs/foundry/architecture-center/overview/',
      },
    ],
  },
  {
    id: 'tech-current-ai-agent',
    title: 'Current AI agent',
    summary: 'When a simple model call is enough, and when an agent is actually the right shape.',
    links: [
      {
        title: 'Building effective agents',
        detail: 'Anthropic’s December 2024 engineering note. Start simple, then add steps.',
        url: 'https://www.anthropic.com/engineering/building-effective-agents',
      },
      {
        title: 'Agent patterns, with code',
        detail: 'The cookbook that sits next to that note: chaining, routing, and evaluator loops.',
        url: 'https://github.com/anthropics/anthropic-cookbook/blob/main/patterns/agents/README.md',
      },
    ],
  },
  {
    id: 'tech-value-for-money',
    title: 'Value for money',
    summary: 'Judge a purchase by repair, measured reviews, and years of use. Not by a posed photo.',
    links: [
      {
        title: 'Repairability',
        detail: 'iFixit publishes teardowns and repair scores you can read before you buy.',
        url: 'https://www.ifixit.com/Right-to-Repair',
      },
      {
        title: 'Measured monitor reviews',
        detail: 'RTINGS tests displays with the same method, so two models can be compared.',
        url: 'https://www.rtings.com/monitor',
      },
    ],
  },
  {
    id: 'tech-cards',
    title: 'Cards',
    summary: 'A card is a fee schedule and a reward rule. Read those before it pays for equipment.',
    links: [
      {
        title: 'Credit card basics',
        detail: 'Reserve Bank of India directions on how credit and debit cards are issued and run.',
        url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13155',
      },
    ],
  },
  {
    id: 'tech-monitor-setup',
    title: 'Best monitor setup',
    summary: 'A useful setup is the one you can read, reach, and stay with. The checklist is the resource.',
    links: [
      {
        title: 'Display screen checklist',
        detail: 'Health and Safety Executive workstation checklist, including the screen.',
        url: 'https://www.hse.gov.uk/pubns/ck1.pdf',
      },
      {
        title: 'Working with a display',
        detail: 'When a workstation should be looked at again, from the same authority.',
        url: 'https://www.hse.gov.uk/msd/dse/assessment.htm',
      },
    ],
  },
] as const satisfies readonly TechResource[];

export const techResourceFlowIds = techResources.map(item => item.id);

export function techResource(id: string) {
  return techResources.find(item => item.id === id);
}

export const techResourceFlows: HabitFlow[] = techResources.map(resource => ({
  id: resource.id,
  title: resource.title,
  area: 'Tech',
  pathId: 'coding',
  goal: 'Tech',
  description: resource.summary,
  level: 'Read the source',
  rhythm: 'When you are choosing tools or a setup',
  milestone: 'You can name the resource you would open first.',
  review: 'Was the source still the right one for the decision in front of you?',
  guidance:
    'These are public references, not a buying list, a course, or a picture of a person at a desk.',
  sources: resource.links.map(link => ({ title: link.title, url: link.url })),
  sessionGuide: {
    collection: 'Tech',
    label: resource.title,
    format: `${resource.links.length} ${resource.links.length === 1 ? 'resource' : 'resources'}`,
    equipment: 'None',
    reviewedOn: '2026-10-26',
    cards: resource.links.map(link => ({
      id: link.url,
      title: link.title,
      metric: 'Resource',
      body: link.detail,
      illustration: 'workout',
    })),
  },
  steps: [
    {
      id: 'read',
      title: 'Open one source',
      cue: resource.summary,
      duration: 'When you need it',
    },
  ],
}));
