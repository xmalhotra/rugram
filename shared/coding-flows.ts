import type { HabitFlow } from './mobile';
import { techResourceFlowIds } from './tech-resources';

/** Tech browse entries. Older setup, audio, and habit flows stay in the library for saved records. */
export const codingCollectionIds: string[] = [...techResourceFlowIds];
export const legacyCodingCourseIds = [
  'tech-web-first-page',
  'tech-ai-small-experiment',
  'tech-cloud-safe-lab',
  'tech-security-first-lab',
];
export type CodingAtlas = 'coding-setups' | 'coding-audio' | 'coding-habits';
type Source = { title: string; url: string };
export type CodingCard = {
  id: string;
  title: string;
  atlas: CodingAtlas;
  row: number;
  benefits: readonly { title: string; description: string }[];
  frames: readonly [string, string, string, string, string];
  sourceNote: string;
  sources: readonly Source[];
  action?: { title: string; url: string };
};
const workstation: Source = {
  title: 'HSE · workstation checklist',
  url: 'https://www.hse.gov.uk/pubns/ck1.pdf',
};
const linus: Source = {
  title: 'Linus Torvalds · Linux.com interview · June 2012',
  url: 'https://www.linux.com/news/30-linux-kernel-developers-30-weeks-linus-torvalds/',
};
const ambient: Source = {
  title: 'musicForProgramming · official mix library',
  url: 'https://musicforprogramming.net/',
};
const groove: Source = { title: 'SomaFM · Groove Salad', url: 'https://somafm.com/groovesalad/' };
const graham: Source = {
  title: 'Paul Graham · Maker’s Schedule · July 2009',
  url: 'https://www.paulgraham.com/makersschedule.html',
};
const karpathy: Source = {
  title: 'Andrej Karpathy · A Recipe for Training Neural Networks · April 2019',
  url: 'https://karpathy.github.io/2019/04/25/recipe/',
};
const vitalik: Source = {
  title: 'Vitalik Buterin · ETHPanda interview, authorised transcript · October 2024',
  url: 'https://wublock.substack.com/p/vitalik-envisions-the-world-100-years',
};

export const codingCards: CodingCard[] = [
  {
    id: 'coding-setup-compact',
    title: 'Compact laptop desk',
    atlas: 'coding-setups',
    row: 0,
    frames: [
      'Clear a small work surface',
      'Raise the screen securely',
      'Bring a separate keyboard and mouse close',
      'Adjust your seat and foot support',
      'Check comfort before you begin',
    ],
    benefits: [
      {
        title: 'Make a small space usable',
        description:
          'Keep the essentials within reach without needing a large desk or an extra monitor.',
      },
      {
        title: 'Adjust screen and hands separately',
        description:
          'A stable laptop stand with a separate keyboard and mouse lets you change the screen position without raising your hands.',
      },
    ],
    sourceNote:
      'A setup idea adapted from the HSE workstation checklist, not an individual ergonomic assessment. Use a stable support and change position regularly.',
    sources: [workstation],
  },
  {
    id: 'coding-setup-single',
    title: 'One-monitor home office',
    atlas: 'coding-setups',
    row: 1,
    frames: [
      'Choose your main display',
      'Connect your laptop',
      'Place keyboard and mouse within reach',
      'Adjust viewing position and glare',
      'Work facing your main screen',
    ],
    benefits: [
      {
        title: 'Give your work one focal point',
        description:
          'Keep your main work in front of you, with a laptop available as an optional secondary screen.',
      },
      {
        title: 'Make the desk repeatable',
        description:
          'Leave the input devices and screen in a comfortable arrangement so starting the next session takes fewer adjustments.',
      },
    ],
    sourceNote:
      'An optional equipment arrangement, not a recommendation to buy a monitor. Check screen readability, reflections, reach and comfort using the HSE checklist.',
    sources: [workstation],
  },
  {
    id: 'coding-setup-dual',
    title: 'Two screens, clear roles',
    atlas: 'coding-setups',
    row: 2,
    frames: [
      'Position your main screen ahead',
      'Place a second screen beside it',
      'Connect and align the displays',
      'Separate main work from reference',
      'Check reach and head movement',
    ],
    benefits: [
      {
        title: 'Keep references in view',
        description:
          'An optional second display can hold documentation while the main display holds your work.',
      },
      {
        title: 'Avoid adding clutter for its own sake',
        description:
          'Give each display a clear role. More monitors are not a guarantee of better work; one display may fit you better.',
      },
    ],
    sourceNote:
      'A layout example informed by the HSE workstation checklist. Arrange for the task and your comfort, rather than copying the generated scene exactly.',
    sources: [workstation],
  },
  {
    id: 'coding-setup-sit-stand',
    title: 'Change your working position',
    atlas: 'coding-setups',
    row: 3,
    frames: [
      'Begin with a comfortable seated setup',
      'Stand up and clear the chair',
      'Adjust a suitable desk',
      'Recheck screen and keyboard height',
      'Try a comfortable standing period',
    ],
    benefits: [
      {
        title: 'Introduce variety',
        description:
          'A suitable adjustable desk offers another working position; standing all day is not the goal.',
      },
      {
        title: 'Keep the setup adaptable',
        description:
          'Recheck the screen and input devices whenever desk height changes. A normal break away from the desk is an option too.',
      },
    ],
    sourceNote:
      'Optional setup variation, not a posture prescription or a reason to buy equipment. Follow the desk instructions, keep cables clear and move away from the screen for breaks.',
    sources: [workstation],
  },
  {
    id: 'coding-audio-silence',
    title: 'Silence is a valid playlist',
    atlas: 'coding-audio',
    row: 0,
    frames: [
      'Leave the headphones aside',
      'Quiet optional notifications',
      'Close distracting tabs',
      'Try a quiet work block',
      'Notice whether silence suits the task',
    ],
    benefits: [
      {
        title: 'Remove one source of competition',
        description:
          'Try working without music when lyrics or changing tracks pull your attention away.',
      },
      {
        title: 'Choose what suits you',
        description: 'Silence is an option, not a rule. Compare it with audio on your own tasks.',
      },
    ],
    sourceNote:
      'In his June 2012 interview, Linus Torvalds described preferring a silent office. This is a dated personal preference, not a claim about his current routine or proof that silence works best for everyone.',
    sources: [linus],
  },
  {
    id: 'coding-audio-ambient',
    title: 'An ambient coding mix',
    atlas: 'coding-audio',
    row: 1,
    frames: [
      'Choose comfortable headphones if wanted',
      'Put them on comfortably',
      'Pick a musicForProgramming mix',
      'Try it quietly during one task',
      'Pause and compare with silence',
    ],
    benefits: [
      {
        title: 'Make audio a deliberate choice',
        description:
          'Browse a dedicated mix library instead of repeatedly changing tracks during a work block.',
      },
      {
        title: 'Keep control of the distraction',
        description:
          'Use a comfortable volume and turn the mix off if it makes reading or thinking harder.',
      },
    ],
    sourceNote:
      'An editorial audio option from the official musicForProgramming library. No programmer endorsement, special-frequency claim or productivity guarantee. Opens externally only when you choose it.',
    sources: [ambient],
    action: { title: 'Open musicForProgramming', url: ambient.url },
  },
  {
    id: 'coding-audio-groove',
    title: 'Low-key downtempo',
    atlas: 'coding-audio',
    row: 2,
    frames: [
      'Choose the Groove Salad station',
      'Set a comfortable low volume',
      'Use headphones if you prefer',
      'Try the station during one task',
      'Pause before deciding what suits you',
    ],
    benefits: [
      {
        title: 'Try a different sound',
        description:
          'Groove Salad offers ambient and downtempo music when you want a steady background rather than choosing individual songs.',
      },
      {
        title: 'Keep it optional',
        description:
          'Use it for tasks where you enjoy audio, and return to silence whenever the sound competes with the work.',
      },
    ],
    sourceNote:
      'Station description checked on SomaFM’s official site. This is an editorial suggestion, not an influential programmer’s claimed playlist. External streaming may use mobile data; nothing auto-plays here.',
    sources: [groove],
    action: { title: 'Open Groove Salad', url: groove.url },
  },
  {
    id: 'coding-habit-maker',
    title: 'Paul Graham · protect a block',
    atlas: 'coding-habits',
    row: 0,
    frames: [
      'Look at the commitments in your day',
      'Reserve a realistic focus block',
      'Quiet avoidable interruptions',
      'Stay with one chosen task',
      'Leave a next-step note',
    ],
    benefits: [
      {
        title: 'Give a task room to develop',
        description:
          'An uninterrupted block can make space to understand a problem without repeatedly switching to meetings.',
      },
      {
        title: 'Fit focus around real commitments',
        description:
          'Choose a block you can actually protect; no late nights or fixed half-day minimum are required.',
      },
    ],
    sourceNote:
      'Adapted from Paul Graham’s July 2009 essay about maker and manager schedules. The five-frame habit is our adaptation, not his verified present-day timetable.',
    sources: [graham],
  },
  {
    id: 'coding-habit-small',
    title: 'Linus Torvalds · start small',
    atlas: 'coding-habits',
    row: 1,
    frames: [
      'Notice the work competing for attention',
      'Choose one small, useful concern',
      'Set the other tasks aside',
      'Work on that bounded change',
      'Review what you finished',
    ],
    benefits: [
      {
        title: 'Make starting concrete',
        description:
          'A small, specific concern gives the session a clearer aim than trying to improve everything at once.',
      },
      {
        title: 'Build from something understandable',
        description:
          'Review one change before increasing scope, rather than measuring the session by how much complexity you added.',
      },
    ],
    sourceNote:
      'Adapted from Linus Torvalds’s June 2012 advice to contributors to start small and address one concern. Not a reconstruction of his daily schedule.',
    sources: [linus],
  },
  {
    id: 'coding-habit-experiment',
    title: 'Andrej Karpathy · check the idea',
    atlas: 'coding-habits',
    row: 2,
    frames: [
      'Write what you expect to happen',
      'Inspect an input or small example',
      'Try one simple experiment',
      'Compare the result with your expectation',
      'Record what to investigate next',
    ],
    benefits: [
      {
        title: 'Make progress inspectable',
        description:
          'A stated expectation gives you something concrete to compare with the result of a small experiment.',
      },
      {
        title: 'Avoid unverified complexity',
        description:
          'Work from a simpler starting point and investigate surprises before adding several changes at once.',
      },
    ],
    sourceNote:
      'A work-habit adaptation of Karpathy’s April 2019 first-person essay on his neural-network process. It is not a coding lesson, a universal debugging method or a claim about his current daily routine.',
    sources: [karpathy],
  },
  {
    id: 'coding-habit-walk',
    title: 'Vitalik Buterin · a portable reset',
    atlas: 'coding-habits',
    row: 3,
    frames: [
      'Leave a note before stopping',
      'Step away from the desk',
      'Choose a safe place to walk',
      'Take a comfortable walking break',
      'Return and read your next step',
    ],
    benefits: [
      {
        title: 'Take a break without extra equipment',
        description:
          'A comfortable walk is one way to leave the desk when your location or schedule changes.',
      },
      {
        title: 'Make returning easier',
        description: 'A brief stopping note keeps the next action available when you come back.',
      },
    ],
    sourceNote:
      'Ethereum co-founder Vitalik Buterin discussed walking and running while travelling in an October 2024 ETHPanda interview. Source: an authorised transcript, which warns of transcription errors. Our desk-break sequence and stopping note are an adaptation, not a routine he claimed to follow.',
    sources: [vitalik],
  },
];

export function codingCard(id: string) {
  return codingCards.find(card => card.id === id);
}
export const codingCardFlows: HabitFlow[] = codingCards.map(card => ({
  id: card.id,
  title: card.title,
  area: 'Tech',
  pathId: 'coding',
  goal: 'Coding',
  description: card.benefits[0].description,
  level: 'Make it your own',
  rhythm: 'Around your existing coding time',
  milestone: 'Try one useful change that fits your real work.',
  review:
    'Did the idea make the session easier to start or organise? Keep it only if it suited you.',
  guidance: card.sourceNote,
  sources: [...card.sources],
  sessionGuide: {
    collection:
      card.atlas === 'coding-setups'
        ? 'Work setups'
        : card.atlas === 'coding-audio'
          ? 'Coding playlists'
          : 'Programmer habits',
    label: 'Habits around the work',
    format: '5 visual frames',
    equipment: 'Use what you already have',
    reviewedOn: '2026-10-24',
    cards: card.frames.map((body, index) => ({
      id: `frame-${index + 1}`,
      title: body,
      metric: `Frame ${index + 1} of 5`,
      body,
      illustration: 'workout',
    })),
  },
  steps: [
    {
      id: 'choose',
      title: 'Choose an idea that fits',
      cue: 'Check that the idea suits your task, space and preferences.',
      duration: 'Before your work session',
    },
    {
      id: 'try',
      title: 'Try one useful change',
      cue: card.frames[0],
      duration: 'During your next work session',
    },
    {
      id: 'review',
      title: 'Notice what helped',
      cue: 'Keep, adapt or skip the idea based on your own experience.',
      duration: 'After the session',
    },
  ],
}));
const legacyCollectionIds = [
  'coding-work-setups',
  'coding-focus-audio',
  'coding-programmer-habits',
] as const;
export const legacyCodingCollectionIds = [...legacyCollectionIds];
const collections = [
  {
    id: legacyCollectionIds[0],
    atlas: 'coding-setups',
    title: 'Work setups',
    description:
      'Four ways to arrange a home workspace, from a compact laptop desk to two screens.',
    format: '4 workspace ideas',
  },
  {
    id: legacyCollectionIds[1],
    atlas: 'coding-audio',
    title: 'Coding playlists',
    description:
      'Try silence, an ambient mix or a downtempo station. Choose the sound that suits your work.',
    format: '3 focus-audio choices',
  },
  {
    id: legacyCollectionIds[2],
    atlas: 'coding-habits',
    title: 'Programmer habits',
    description:
      'Four small habits adapted from published accounts by Graham, Torvalds, Karpathy and Buterin.',
    format: '4 sourced habit ideas',
  },
];
export const codingFlows: HabitFlow[] = collections.map(collection => {
  const cards = codingCards.filter(card => card.atlas === collection.atlas);
  const first = codingCardFlows.find(flow => flow.id === cards[0].id)!;
  return {
    ...first,
    id: collection.id,
    title: collection.title,
    description: collection.description,
    relatedFlowIds: cards.map(card => card.id),
    sessionGuide: {
      ...first.sessionGuide!,
      collection: collection.title,
      label: collection.title,
      format: collection.format,
    },
    sources: [
      ...new Map(cards.flatMap(card => card.sources).map(source => [source.url, source])).values(),
    ],
    steps: [
      {
        id: 'choose',
        title: 'Choose one idea to try',
        cue: 'Open the flow and find an idea that fits your next coding session.',
        duration: 'Before you begin',
      },
      {
        id: 'try',
        title: 'Make one useful change',
        cue: 'Use the frames to try the idea with the space, time and equipment you already have.',
        duration: 'At your own pace',
      },
      {
        id: 'review',
        title: 'Keep what helped',
        cue: 'Notice whether it suited your work. Adapt it or choose another idea.',
        duration: 'After your session',
      },
    ],
  };
});
export const codingMedia = Object.fromEntries(
  codingCards.map(card => [card.id, { atlas: card.atlas, row: card.row }]),
);
export const codingCollectionChildren = Object.fromEntries(
  codingFlows.map(flow => [flow.id, flow.relatedFlowIds!]),
);
