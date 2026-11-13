import assert from 'node:assert/strict';
import test from 'node:test';
import { bodyFlow, type LoggedSet } from '../shared/body-flow';
import { placeCanDo, type FlowLevel } from '../shared/flow-defaults';
import {
  addCalendarDays,
  calendarWeekday,
  occurrences,
  type FlowSeries,
  type SeriesCompletion,
  type SeriesException,
  type SeriesOccurrence,
} from '../shared/flow-series';
import { focusDayLines, planNextWeek, type FocusFlow, type FocusPlanInput, type FocusSuggestion } from '../shared/focus-planner';
import { gymFlowById, gymFlows, type GymFlow } from '../shared/gym-flows';
import { mainSetsFor } from '../shared/series-impact';
import { muscleAreas, type MuscleArea } from '../shared/muscle-map';

const level: FlowLevel = 'Beginner';

function weekly(id: string, itemId: string, start: string, createdAt: string): FlowSeries {
  return {
    id,
    itemKind: 'flow',
    itemId,
    start,
    time: { checkpoint: 'Morning' },
    recurrence: { kind: 'weekly', every: 1, days: [calendarWeekday(start)] },
    end: { kind: 'never' },
    createdAt,
  };
}

function once(id: string, itemId: string, start: string, createdAt: string): FlowSeries {
  return {
    id,
    itemKind: 'flow',
    itemId,
    start,
    time: { checkpoint: 'Morning' },
    recurrence: { kind: 'once' },
    end: { kind: 'never' },
    createdAt,
  };
}

function flow(partial: Partial<FocusFlow> & Pick<FocusFlow, 'id' | 'title' | 'main'>): FocusFlow {
  return {
    itemKind: 'flow',
    level: 'Beginner',
    goals: ['strength'],
    equipment: 'bodyweight',
    minutes: 30,
    live: true,
    ...partial,
  };
}

function fromGym(gym: GymFlow): FocusFlow {
  const flowLevel: FlowLevel = gym.level === 'Intermediate' || gym.level === 'Advanced' ? gym.level : 'Beginner';
  return flow({
    id: gym.id,
    title: gym.title,
    level: flowLevel,
    goals: gym.id.startsWith('cal-') ? [] : ['strength', 'size'],
    equipment: gym.id.startsWith('cal-') ? 'bodyweight' : 'gym',
    minutes: 45,
    main: mainSetsFor(gym.items.map(item => ({ exerciseId: item.exerciseId, sets: item.sets }))).map(row => ({
      area: row.area,
      sets: row.mainSets,
    })),
  });
}

function filled(overrides: Partial<Record<MuscleArea, number>>) {
  return muscleAreas.map(area => {
    const sets = overrides[area.id] ?? 12;
    return { area: area.id, sets, mainSets: sets };
  });
}

function base(extra: Partial<FocusPlanInput>): FocusPlanInput {
  return {
    weekStart: '2026-11-09',
    today: '2026-11-15',
    bodyFlow: { areas: filled({}), cardioMinutes: 0 },
    series: [],
    occurrences: [],
    completions: [],
    graduations: [],
    member: { level, place: 'gym', minutes: 45, goals: ['strength', 'size'] },
    flows: [],
    ...extra,
  };
}

function oneSentence(reason: string) {
  assert.equal(reason.includes('\n'), false, reason);
  assert.equal(reason.endsWith('.'), true, reason);
  assert.equal(reason.slice(0, -1).includes('.'), false, reason);
}

function idsOf(change: FocusSuggestion['change']) {
  if (change.type === 'once' || change.type === 'replace') return change.itemId;
  return null;
}

test('a week with no finished work suggests nothing', () => {
  const input = base({
    bodyFlow: { areas: filled({ quads: 0, hamstrings: 0, glutes: 0, calves: 0, 'hip-flexors': 0 }), cardioMinutes: 0 },
  });
  input.bodyFlow = { areas: muscleAreas.map(area => ({ area: area.id, sets: 0, mainSets: 0 })), cardioMinutes: 0 };
  assert.deepEqual(planNextWeek(input), []);
});

test('an empty area with nothing planned is added on a free day, and only a flow the member can run', () => {
  const home = flow({ id: 'home-legs', title: 'Home legs', equipment: 'bodyweight', main: [{ area: 'quads', sets: 6 }] });
  const gym = flow({ id: 'gym-legs', title: 'Gym legs', equipment: 'gym', main: [{ area: 'quads', sets: 8 }] });
  const input = base({
    bodyFlow: { areas: filled({ quads: 0, hamstrings: 0, glutes: 0, calves: 0, 'hip-flexors': 0 }), cardioMinutes: 0 },
    flows: [gym, home],
    member: { level, place: 'bodyweight', minutes: 45, goals: ['strength'] },
    completions: [{ itemKind: 'flow', itemId: 'something', date: '2026-11-09' }],
  });
  const suggestions = planNextWeek(input);
  const added = suggestions.find(item => item.kind === 'add');
  assert.ok(added);
  assert.equal(added.reason, 'First week, legs had 0 sets.');
  assert.equal(idsOf(added.change), 'home-legs');
  assert.equal(added.change.type === 'once' && added.change.date, added.day);
  assert.equal(suggestions.some(item => idsOf(item.change) === 'gym-legs'), false);
  suggestions.forEach(item => oneSentence(item.reason));
});

test('a priority area stays a gap until the top of its band', () => {
  const forearm = flow({ id: 'forearm-work', title: 'Forearms', equipment: 'gym', minutes: 30, main: [{ area: 'forearms', sets: 4 }] });
  const member = { level, place: 'gym' as const, minutes: 45, goals: ['strength' as const], priorities: ['forearms' as const] };
  const added = planNextWeek(
    base({
      bodyFlow: { areas: filled({ forearms: 4 }), cardioMinutes: 150 },
      flows: [forearm],
      member,
    }),
  ).find(item => item.kind === 'add');
  assert.ok(added);
  assert.equal(added.reason, 'Forearms are a priority.');
  oneSentence(added.reason);

  const stillLow = planNextWeek(
    base({
      bodyFlow: { areas: filled({ forearms: 2 }), cardioMinutes: 150 },
      flows: [forearm],
      member,
    }),
  ).find(item => item.kind === 'add');
  assert.equal(stillLow?.reason, 'Forearms are a priority.');

  const topped = planNextWeek(
    base({
      bodyFlow: { areas: filled({ forearms: 6 }), cardioMinutes: 150 },
      flows: [forearm],
      member,
    }),
  );
  assert.equal(topped.some(item => item.reason === 'Forearms are a priority.'), false);
});

test('a flow the member has outgrown is not suggested', () => {
  const easy = flow({ id: 'easy', title: 'Easy legs', level: 'Beginner', main: [{ area: 'quads', sets: 6 }] });
  const input = base({
    bodyFlow: { areas: filled({ quads: 0, hamstrings: 0, glutes: 0, calves: 0, 'hip-flexors': 0 }), cardioMinutes: 0 },
    flows: [easy],
    member: { level: 'Intermediate', place: 'gym', goals: ['strength'] },
    completions: [{ itemKind: 'flow', itemId: 'done', date: '2026-11-09' }],
  });
  assert.equal(planNextWeek(input).some(item => idsOf(item.change) === 'easy'), false);
});

test('a planned flow that already covers the area is kept when that area is on target', () => {
  const back = flow({ id: 'back', title: 'Back + Biceps', main: [{ area: 'lats', sets: 9 }] });
  const series = [weekly('back-series', 'back', '2026-11-09', '2026-11-01T00:00:00.000Z')];
  const completions: SeriesCompletion[] = [{ itemKind: 'flow', itemId: 'back', date: '2026-11-09' }];
  const input = base({
    bodyFlow: { areas: filled({}), cardioMinutes: 0 },
    series,
    occurrences: occurrences(series, [], '2026-11-09', '2026-11-22', completions),
    completions,
    flows: [back],
  });
  const kept = planNextWeek(input).find(item => item.kind === 'keep' && item.title === 'Back + Biceps');
  assert.ok(kept);
  assert.equal(kept.reason, 'On target.');
  assert.deepEqual(kept.change, { type: 'keep' });
});

test('a missed session is offered on the first free day', () => {
  const push = flow({ id: 'push', title: 'Push', main: [{ area: 'chest', sets: 6 }] });
  const series = [
    weekly('push-series', 'push', '2026-11-11', '2026-11-01T00:00:00.000Z'),
    weekly('other', 'push', '2026-11-16', '2026-11-01T00:00:00.000Z'),
  ];
  // Monday of next week is taken. Wednesday this week was not done.
  const occurrencesThis = occurrences(series, [], '2026-11-09', '2026-11-22', []);
  const input = base({
    series,
    occurrences: occurrencesThis,
    flows: [push],
    completions: [{ itemKind: 'flow', itemId: 'other', date: '2026-11-01' }],
    bodyFlow: { areas: filled({}), cardioMinutes: 0 },
  });
  const missed = planNextWeek(input).filter(item => item.kind === 'missed');
  assert.ok(missed.length >= 1);
  assert.equal(missed[0]?.reason, 'You missed Push.');
  assert.equal(missed[0]?.day, '2026-11-17');
  assert.equal(missed[0]?.change.type, 'move');
});

test('two heavy days in a row move the newer one, and a day the member moved stays put', () => {
  const legs = flow({ id: 'legs', title: 'Legs', equipment: 'gym', main: [{ area: 'quads', sets: 6 }] });
  const quiet = flow({ id: 'quiet', title: 'Quiet', main: [{ area: 'biceps', sets: 2 }] });
  const series = [
    weekly('fri', 'legs', '2026-11-20', '2026-11-01T00:00:00.000Z'),
    weekly('thu', 'legs', '2026-11-19', '2026-11-20T00:00:00.000Z'),
    weekly('wed', 'quiet', '2026-11-18', '2026-11-01T00:00:00.000Z'),
  ];
  const rows = occurrences(series, [], '2026-11-16', '2026-11-22', []);
  const moved: SeriesOccurrence[] = rows.map(row => (row.seriesId === 'thu' ? { ...row, moved: true } : row));
  const open = base({
    weekStart: '2026-11-09',
    today: '2026-11-15',
    series,
    occurrences: rows,
    flows: [legs, quiet],
    completions: [{ itemKind: 'flow', itemId: 'legs', date: '2026-11-01' }],
    bodyFlow: { areas: filled({ quads: 2, hamstrings: 2, glutes: 2, calves: 2, 'hip-flexors': 2 }), cardioMinutes: 0 },
  });
  // The reviewed week is 9 Nov. Next week holds Thursday 19 and Friday 20.
  const suggestions = planNextWeek(open);
  const move = suggestions.find(item => item.kind === 'move');
  assert.ok(move);
  assert.equal(move.reason, 'Legs need 48 hours.');
  assert.equal(move.day, '2026-11-17');
  assert.deepEqual(move.change, { type: 'move', seriesId: 'thu', from: '2026-11-19', to: '2026-11-17' });
  assert.equal('time' in move.change, false);

  const locked = planNextWeek({ ...open, occurrences: moved });
  assert.equal(
    locked.some(item => item.change.type === 'move' && item.change.seriesId === 'thu'),
    false,
  );
});

test('a series whose clock time the member set is not rescheduled', () => {
  const legs = flow({ id: 'legs', title: 'Legs', equipment: 'gym', main: [{ area: 'quads', sets: 6 }] });
  const series = [
    weekly('fri', 'legs', '2026-11-20', '2026-11-01T00:00:00.000Z'),
    { ...weekly('thu', 'legs', '2026-11-19', '2026-11-20T00:00:00.000Z'), time: { checkpoint: 'Morning' as const, at: '07:00' } },
  ];
  const input = base({
    series,
    occurrences: occurrences(series, [], '2026-11-16', '2026-11-22', []),
    flows: [legs],
    timedSeriesIds: ['thu'],
    completions: [{ itemKind: 'flow', itemId: 'legs', date: '2026-11-01' }],
    bodyFlow: { areas: filled({ quads: 2, hamstrings: 2, glutes: 2, calves: 2, 'hip-flexors': 2 }), cardioMinutes: 0 },
  });
  const suggestions = planNextWeek(input);
  assert.equal(
    suggestions.some(item => item.change.type !== 'keep' && 'seriesId' in item.change && item.change.seriesId === 'thu'),
    false,
  );
});

test('a Customflow is not replaced, and a graduated flow can be', () => {
  const current = flow({ id: 'press', title: 'Press', main: [{ area: 'chest', sets: 2 }] });
  const better = flow({ id: 'press-next', title: 'Press next', main: [{ area: 'chest', sets: 6 }] });
  const legs = flow({ id: 'legs', title: 'Legs', equipment: 'gym', main: [{ area: 'quads', sets: 6 }] });
  const series = [weekly('press-series', 'press', '2026-11-11', '2026-11-01T00:00:00.000Z')];
  const shared = base({
    series,
    occurrences: occurrences(series, [], '2026-11-09', '2026-11-22', []),
    flows: [current, better, legs],
    completions: [{ itemKind: 'flow', itemId: 'press', date: '2026-11-11' }],
    bodyFlow: { areas: filled({ chest: 2, 'upper-chest': 2 }), cardioMinutes: 0 },
  });
  const replaced = planNextWeek(shared).find(item => item.kind === 'replace');
  assert.ok(replaced);
  assert.equal(replaced.change.type === 'replace' && replaced.change.itemId, 'press-next');
  const kept = planNextWeek({ ...shared, customIds: ['press'] });
  assert.equal(kept.some(item => item.kind === 'replace'), false);

  const graduated = planNextWeek({
    ...shared,
    flows: [current, { ...better, id: 'graduated-next', title: 'Next press' }],
    graduations: [{ flowId: 'press', nextId: 'graduated-next', nextTitle: 'Next press' }],
  }).find(item => item.kind === 'replace');
  assert.equal(graduated?.reason, "You've outgrown Press.");
  assert.equal(graduated?.title, 'Next press');
});

test('the same exercises for 3 weeks rotate to another flow for that area', () => {
  const current = flow({ id: 'back', title: 'Back + Biceps', level: 'Intermediate', equipment: 'gym', main: [{ area: 'lats', sets: 9 }] });
  const other = flow({ id: 'rows', title: 'Pull-up and row day', level: 'Intermediate', equipment: 'gym', main: [{ area: 'lats', sets: 8 }] });
  const series = [weekly('back-series', 'back', '2026-11-09', '2026-11-01T00:00:00.000Z')];
  const completions: SeriesCompletion[] = ['2026-10-26', '2026-11-02', '2026-11-09'].map(date => ({
    itemKind: 'flow' as const,
    itemId: 'back',
    date,
  }));
  const input = base({
    series,
    occurrences: occurrences(series, [], '2026-11-09', '2026-11-22', completions),
    completions,
    flows: [current, other],
    bodyFlow: { areas: filled({}), cardioMinutes: 160 },
  });
  const rotated = planNextWeek(input).find(item => item.kind === 'replace');
  assert.ok(rotated);
  assert.equal(rotated.reason, 'Back + Biceps has used the same exercises for 3 weeks.');
  assert.equal(rotated.title, 'Pull-up and row day');
});

test('an area planned once, still under its low target, is offered a second day', () => {
  const legs = flow({ id: 'legs', title: 'Legs', equipment: 'gym', main: [{ area: 'quads', sets: 2 }] });
  const series = [weekly('legs-series', 'legs', '2026-11-20', '2026-11-01T00:00:00.000Z')];
  const input = base({
    series,
    occurrences: occurrences(series, [], '2026-11-16', '2026-11-22', []),
    flows: [legs],
    completions: [{ itemKind: 'flow', itemId: 'legs', date: '2026-11-06' }],
    bodyFlow: {
      areas: filled({ quads: 2, hamstrings: 2, glutes: 2, calves: 2, 'hip-flexors': 2 }),
      cardioMinutes: 0,
    },
  });
  const added = planNextWeek(input).find(item => item.kind === 'add');
  assert.ok(added);
  assert.equal(added.reason, 'Legs need a second day.');
});

test('suggestions stop at five', () => {
  const flows = Array.from({ length: 8 }, (_, index) =>
    flow({ id: `flow-${index}`, title: `Flow ${index}`, main: [{ area: 'lats', sets: 6 }] }),
  );
  const series = flows.map((item, index) => weekly(`series-${index}`, item.id, '2026-11-09', `2026-11-0${index}T00:00:00.000Z`));
  const input = base({
    series,
    occurrences: occurrences(series, [], '2026-11-09', '2026-11-22', []),
    flows,
    completions: [{ itemKind: 'flow', itemId: 'flow-0', date: '2026-11-09' }],
  });
  assert.ok(planNextWeek(input).length <= 5);
});

test('before and after names every day of next week', () => {
  const added = planNextWeek(
    base({
      bodyFlow: { areas: filled({ quads: 0, hamstrings: 0, glutes: 0, calves: 0, 'hip-flexors': 0 }), cardioMinutes: 0 },
      flows: [flow({ id: 'legs', title: 'Legs', equipment: 'gym', main: [{ area: 'quads', sets: 6 }] })],
      completions: [{ itemKind: 'flow', itemId: 'done', date: '2026-11-09' }],
    }),
  ).find(item => item.kind === 'add');
  assert.ok(added);
  const lines = focusDayLines({
    nextWeekStart: '2026-11-16',
    next: [],
    suggestions: [added],
    enabled: [added.id],
  });
  assert.equal(lines.length, 7);
  const changed = lines.find(line => line.date === added.day);
  assert.equal(changed?.before, 'Rest');
  assert.equal(changed?.after, 'Legs');
  assert.match(changed?.line ?? '', /: Rest → Legs$/);
  assert.equal(lines.filter(line => line.after === 'Legs').length, 1);
});

test("Arjun's month: the first review, a missed day, recovery, then a change of exercises", () => {
  assert.equal(calendarWeekday('2026-11-09'), 1);
  const catalogue = gymFlows.filter(item => item.items.length).map(fromGym);
  const run = flow({
    id: 'run-5k',
    title: '5 km run',
    goals: ['fitness'],
    equipment: 'bodyweight',
    minutes: 30,
    main: [],
    cardioMinutes: 32,
  });
  const flows = [...catalogue, run];
  const backId = 'gym-back-biceps';
  const upperId = 'cal-upper-beginner';
  assert.equal(gymFlowById(backId)?.title, 'Back + Biceps');
  assert.equal(gymFlowById(upperId)?.title, 'Upper Body at Home');

  const series: FlowSeries[] = [
    weekly('back', backId, '2026-11-09', '2026-11-01T00:00:00.000Z'),
    weekly('upper', upperId, '2026-11-11', '2026-11-01T01:00:00.000Z'),
    weekly('run', 'run-5k', '2026-11-14', '2026-11-01T02:00:00.000Z'),
  ];
  const exceptions: SeriesException[] = [];
  const done: { flowId: string; date: string }[] = [];

  function setsFor(flowId: string, date: string): LoggedSet[] {
    const gym = gymFlowById(flowId);
    if (!gym) return [];
    return gym.items.flatMap(item => Array.from({ length: item.sets }, () => ({ date, exerciseId: item.exerciseId })));
  }

  function completions(): SeriesCompletion[] {
    return done.map(item => ({ itemKind: 'flow' as const, itemId: item.flowId, date: item.date }));
  }

  function review(sunday: string) {
    const weekStart = addCalendarDays(sunday, -6);
    const weekEnd = sunday;
    const logs = done.flatMap(item => setsFor(item.flowId, item.date)).filter(set => set.date >= weekStart && set.date <= weekEnd);
    const cardio = done
      .filter(item => item.flowId === 'run-5k' && item.date >= weekStart && item.date <= weekEnd)
      .map(item => ({ date: item.date, minutes: 32 }));
    const map = bodyFlow(logs, cardio, { from: weekStart, to: weekEnd });
    const nextEnd = addCalendarDays(weekStart, 13);
    const input: FocusPlanInput = {
      weekStart,
      today: sunday,
      bodyFlow: { areas: map.areas, cardioMinutes: map.cardioMinutes },
      series,
      occurrences: occurrences(series, exceptions, weekStart, nextEnd, completions()),
      completions: completions(),
      graduations: [],
      member: { level, place: 'gym', minutes: 45, goals: ['strength', 'size'] },
      flows,
    };
    const suggestions = planNextWeek(input);
    assert.ok(suggestions.length <= 5);
    for (const item of suggestions) {
      oneSentence(item.reason);
      const flowId = idsOf(item.change);
      if (flowId) {
        const chosen = flows.find(entry => entry.id === flowId);
        assert.ok(chosen?.live);
        assert.equal(placeCanDo(chosen.equipment, 'gym'), true);
        assert.ok(chosen.level === 'Beginner' || chosen.level === 'Intermediate' || chosen.level === 'Advanced');
      }
      const change = item.change;
      if (change.type === 'move' || change.type === 'replace') {
        const row = input.occurrences.find(entry => entry.seriesId === change.seriesId && entry.original === change.from);
        assert.equal(row?.moved ?? false, false);
        if (change.type === 'move') assert.equal(Object.keys(change).includes('time'), false);
      }
    }
    return { suggestions, input };
  }

  function accept(suggestions: FocusSuggestion[]) {
    for (const item of suggestions) {
      const change = item.change;
      if (change.type === 'replace') exceptions.push({ seriesId: change.seriesId, date: change.from, change: 'skip' });
      if (change.type === 'once' || change.type === 'replace') {
        const date = change.type === 'once' ? change.date : change.date;
        const time = change.type === 'once' ? change.time : change.time;
        const itemId = change.itemId;
        const itemKind = change.itemKind;
        series.push(once(`once-${item.id}`, itemId, date, '2026-11-15T00:00:00.000Z'));
        series[series.length - 1] = { ...series[series.length - 1]!, itemKind, time };
      }
      if (change.type === 'move') exceptions.push({ seriesId: change.seriesId, date: change.from, change: { date: change.to } });
    }
  }

  // Week 1. Back, upper body, and the Saturday run. Nothing before that.
  done.push({ flowId: backId, date: '2026-11-09' }, { flowId: upperId, date: '2026-11-11' }, { flowId: 'run-5k', date: '2026-11-14' });
  const week1 = review('2026-11-15');
  const legs = week1.suggestions.find(item => item.kind === 'add' && /legs had 0 sets/i.test(item.reason));
  assert.ok(legs, week1.suggestions.map(item => `${item.kind} ${item.day} ${item.reason}`).join(' | '));
  assert.match(legs.reason, /first week/i);
  assert.equal(calendarWeekday(legs.day), 5);
  const kept = week1.suggestions.find(item => item.kind === 'keep' && item.title === 'Back + Biceps');
  assert.equal(kept?.reason, 'On target.');
  accept(week1.suggestions.filter(item => item.kind === 'add'));

  // Week 2. Monday and Friday done, Wednesday missed.
  done.push({ flowId: backId, date: '2026-11-16' }, { flowId: 'run-5k', date: '2026-11-21' });
  const friday = series.find(item => item.id.startsWith('once-'));
  if (friday) done.push({ flowId: friday.itemId, date: friday.start });
  const week2 = review('2026-11-22');
  const missed = week2.suggestions.find(item => item.kind === 'missed');
  assert.ok(missed, week2.suggestions.map(item => item.reason).join(' | '));
  assert.match(missed.reason, /^You missed /);
  assert.equal(missed.day, '2026-11-24');

  // He adds a Thursday leg session beside Friday's legs. The next review separates them.
  const legFlow = legs.change.type === 'once' ? legs.change.itemId : 'gym-legs-squat-pattern-start';
  series.push(weekly('legs-fri', legFlow, '2026-12-04', '2026-11-18T00:00:00.000Z'));
  series.push(weekly('legs-thu', legFlow, '2026-12-03', '2026-11-27T00:00:00.000Z'));
  done.push(
    { flowId: backId, date: '2026-11-23' },
    { flowId: upperId, date: '2026-11-25' },
    { flowId: 'run-5k', date: '2026-11-28' },
  );
  const week3 = review('2026-11-29');
  const moved = week3.suggestions.find(item => item.kind === 'move');
  assert.ok(moved, week3.suggestions.map(item => `${item.kind} ${item.reason}`).join(' | '));
  assert.equal(moved.reason, 'Legs need 48 hours.');
  assert.equal(moved.day, '2026-12-01');
  assert.equal(moved.change.type === 'move' && moved.change.seriesId, 'legs-thu');

  // Three weeks of the same back session, and a week he actually did, so the next plan can change the exercises.
  done.push(
    { flowId: backId, date: '2026-11-30' },
    { flowId: upperId, date: '2026-12-02' },
    { flowId: legFlow, date: '2026-12-03' },
    { flowId: legFlow, date: '2026-12-04' },
    { flowId: 'run-5k', date: '2026-12-05' },
  );
  const week4 = review('2026-12-06');
  const rotated = week4.suggestions.find(item => item.kind === 'replace' && /3 weeks/.test(item.reason));
  assert.ok(rotated, week4.suggestions.map(item => item.reason).join(' | '));
  assert.equal(rotated.change.type === 'replace' && rotated.change.itemId === backId, false);
});
