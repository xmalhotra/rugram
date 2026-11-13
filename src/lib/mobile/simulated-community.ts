import 'server-only';
import { simulatedAccounts } from '../../../shared/auth';
import { simulatedPhoneUser } from '../store';
import { editPersonalFlow } from './personal-flows';
import { communityAction } from './community';
import { beginRun, postRun, saveRun } from '../flow-run-store';
import { changeRegistration } from '../event-registration-store';
import { state } from './state';
import type { CityEvent } from '../../../shared/mobile';

declare global {
  var qramSimulatedCommunity: Promise<void> | undefined;
}

type Card = [sourceFlowId: string, cardId: string];
const authored: { title: string; description: string; cards: Card[] }[] = [
  {
    title: 'Calm morning',
    description: 'Two easy drinks and one core move before the day starts.',
    cards: [
      ['lifestyle-morning-drinks', 'morning-drink-water'],
      ['lifestyle-morning-drinks', 'morning-drink-lemon-honey'],
      ['workout-core-foundations', 'workout-core-foundations:visual:1'],
    ],
  },
  {
    title: 'Pull day basics',
    description: 'Grip and row cues I use every pull day, plus the one supplement worth it.',
    cards: [
      ['workout-enhance-gym-techniques', 'gym-technique-neutral-grip'],
      ['workout-enhance-gym-techniques', 'gym-technique-chest-supported-row'],
      ['workout-cindy', 'cindy-pull-up'],
      ['supplements-strength', 'training-supplement-creatine'],
    ],
  },
  {
    title: 'Easy run week',
    description: 'Run/walk to intervals, fuelled by a banana.',
    cards: [
      ['running-styles', 'running-style-run-walk'],
      ['running-styles', 'running-style-easy'],
      ['running-styles', 'running-style-intervals'],
      ['nutrition-pre-running', 'nutrition-item-banana'],
    ],
  },
  {
    title: 'Animal warm-up',
    description: 'Four crawls that wake up the whole body in five minutes.',
    cards: [
      ['workout-animal-movements', 'workout-animal-bear'],
      ['workout-animal-movements', 'workout-animal-crab'],
      ['workout-animal-movements', 'workout-animal-ape'],
      ['workout-animal-movements', 'workout-animal-frog'],
    ],
  },
  {
    title: 'Deep work setup',
    description: 'Desk, sound and one habit for a protected focus block.',
    cards: [
      ['coding-work-setups', 'coding-setup-single'],
      ['coding-focus-audio', 'coding-audio-ambient'],
      ['coding-programmer-habits', 'coding-habit-maker'],
    ],
  },
];
// Indexes are 0-based positions in simulatedAccounts and `authored`.
const follows: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 3],
  [2, 0],
  [2, 1],
  [3, 2],
  [3, 4],
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
];
const upvotes: [number, number][] = [
  [1, 0],
  [2, 0],
  [4, 0],
  [0, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [0, 2],
  [1, 2],
  [2, 3],
  [4, 3],
  [3, 4],
];
const reposts: [number, number][] = [
  [1, 0],
  [4, 1],
  [2, 3],
  [0, 2],
];
const saves: [number, number][] = [
  [2, 0],
  [3, 1],
];

/** Aarav (curator) hosts a 3-seat breakfast with a waitlist and signup questions. */
function hostedEvent(curatorId: string, now = Date.now()): CityEvent {
  const day = new Date(now + 5 * 86400000);
  day.setUTCHours(3, 0, 0, 0); // 8:30 AM India time once 30 minutes are added
  return {
    id: 'demo-founders-breakfast',
    title: 'Founders breakfast',
    city: 'Hyderabad',
    country: 'IN',
    topic: 'Tech',
    venue: 'T-Hub',
    location: {
      name: 'T-Hub',
      address: 'IIIT Hyderabad Campus, Gachibowli, Hyderabad, Telangana',
      lat: 17.4455,
      lng: 78.3489,
    },
    startsAt: new Date(day.getTime() + 30 * 60000).toISOString(),
    endsAt: new Date(day.getTime() + 150 * 60000).toISOString(),
    registrationClosesAt: null,
    registrationMode: 'approval',
    requireApproval: false,
    waitlist: true,
    guestCapacity: 3,
    questions: [
      { id: 'meal', label: 'Meal', kind: 'choice', options: ['Veg', 'Non-veg', 'Jain'], required: true },
      { id: 'company', label: 'Company', kind: 'text', required: false },
    ],
    organizers: [{ name: 'Aarav' }],
    capacity: 0,
    price: 0,
    entryFee: 0,
    feeNote: 'Free. Simulated event for testing seats and the waitlist.',
    description:
      'A small breakfast for founders building in Hyderabad. Three seats, so the waitlist fills fast: withdraw and the next person in line gets your seat.',
    audience: 'Open to anyone in Hyderabad.',
    outcomes: ['Meet two or three founders over breakfast.'],
    sourceUrls: [],
    checkedAt: new Date(now).toISOString(),
    registrationStatus: 'Registration link available',
    createdBy: curatorId,
    status: 'published',
    simulation: true,
  };
}

async function seed() {
  const users = await Promise.all(
    simulatedAccounts.map(account => simulatedPhoneUser(account.phone)),
  );
  // Seats fill in order: Meera, Kabir and Zoya get the three; Rohan waits at #1.
  const event = hostedEvent(users[0].id);
  if (!state.catalog.some(item => item.id === event.id)) state.catalog.push(event);
  const meals = ['Veg', 'Non-veg', 'Veg', 'Jain'];
  for (const [index, guest] of users.slice(1).entries())
    await changeRegistration(guest, event.id, 'request', undefined, { meal: meals[index] });
  const personalIds = authored.map(() => `personal-${crypto.randomUUID()}`);
  const published: string[] = [];
  for (const [index, flow] of authored.entries()) {
    const [first, ...rest] = flow.cards;
    const id = personalIds[index];
    await editPersonalFlow(users[index], {
      action: 'personal-flow-create',
      id,
      name: flow.title,
      sourceFlowId: first[0],
      cardId: first[1],
    });
    for (const [sourceFlowId, cardId] of rest)
      await editPersonalFlow(users[index], {
        action: 'personal-flow-add',
        id,
        sourceFlowId,
        cardId,
      });
    const result = await communityAction(users[index], {
      action: 'publish',
      personalFlowId: id,
      description: flow.description,
    });
    published.push(result.id!);
  }
  for (const [who, whom] of follows)
    await communityAction(users[who], {
      action: 'follow',
      authorId: users[whom].id,
      enabled: true,
    });
  for (const [who, flow] of upvotes)
    await communityAction(users[who], { action: 'upvote', id: published[flow], enabled: true });
  for (const [who, flow] of reposts)
    await communityAction(users[who], { action: 'repost', id: published[flow], enabled: true });
  for (const [who, flow] of saves)
    await communityAction(users[who], {
      action: 'save',
      id: published[flow],
      personalFlowId: `personal-${crypto.randomUUID()}`,
    });
  // Aarav edits after Kabir saved a copy, so Kabir sees an update and version history.
  await editPersonalFlow(users[0], {
    action: 'personal-flow-add',
    id: personalIds[0],
    sourceFlowId: 'lifestyle-morning-drinks',
    cardId: 'morning-drink-coffee',
  });
  await communityAction(users[0], {
    action: 'publish',
    personalFlowId: personalIds[0],
    description: authored[0].description,
  });
  // A few "I did this" logs, so timelines show activity as well as posts.
  const logs: [number, number, string][] = [
    [2, 3, 'Skipped intervals, legs still sore from Sunday.'],
    [0, 4, ''],
    [3, 4, 'Five minutes before standup. Bear crawl is brutal.'],
  ];
  for (const [who, cardsDone, note] of logs) {
    const started = await beginRun(users[who], {
      kind: 'personal',
      id: personalIds[who],
      level: 'Regular',
    });
    const state = {
      ...started.run.state,
      phase: 'finished' as const,
      cards: started.run.state.cards.map((card, index) =>
        index < cardsDone
          ? { ...card, status: 'done' as const, seconds: card.targetSeconds }
          : card,
      ),
    };
    await saveRun(users[who], started.run.id, state);
    await postRun(users[who], started.run.id, note);
  }
}

/** Local demo only: five accounts that publish, follow, upvote, repost, save and edit. Runs once per server. */
export function seedSimulatedCommunity() {
  globalThis.qramSimulatedCommunity ??= seed().catch(error => {
    globalThis.qramSimulatedCommunity = undefined;
    throw error;
  });
  return globalThis.qramSimulatedCommunity;
}
