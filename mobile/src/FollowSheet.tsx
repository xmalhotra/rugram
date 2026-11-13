import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import {
  defaultFollowAfter,
  defaultFollowSessions,
  followLengths,
  followPlan,
  slotOneWarning,
  suggestReplacement,
  type FollowThen,
  type FollowWhere,
  type TheirFlow,
} from '../../shared/follow';
import { mapFlowSlotCount } from '../../shared/map-flow';
import { formatSeriesDate } from '../../shared/flow-series';
import { planFromMapFlow, followedMapFlow } from '../../shared/map-flow';
import { comparePredictions, planAddingFlow, predictBodyFlow, type BodyPlan } from '../../shared/predicted-body-flow';
import { BodyPicture } from './BodyMap';
import { Text } from './design/Text';
import { Chip, Sheet } from './design/components';
import { ReasonLine, Stepper, StickyActionBar } from './design/states';
import { space, useTheme } from './design/theme';
import { useFlowMember } from './flow-member';
import { startFollow } from './follow';
import { shareAct } from './share';
import { localDate } from '../../shared/flow-habits';
import { useMapFlows } from './map-flows';

function afterPlan(plan: BodyPlan, where: FollowWhere, their: TheirFlow): BodyPlan {
  const flow = {
    id: their.source?.id ?? their.title,
    kind: 'flow' as const,
    ...(their.items?.length ? { items: their.items.map(item => ({ exerciseId: item.exerciseId, sets: item.sets })) } : {}),
  };
  if (where.kind === 'add') return planAddingFlow(plan, flow);
  return {
    days: plan.days.map(day => ({
      flows: day.flows.map(item => (item.id === where.flowId ? { ...item, id: flow.id, ...(flow.items ? { items: flow.items } : {}) } : item)),
    })),
  };
}

function lengthLabel(sessions: 1 | 4 | null) {
  return followLengths.find(item => item.sessions === sessions)?.label ?? '4 sessions';
}

/** Three questions, each with a default, then the dates this trial covers. */
export function FollowSheet({
  theirFlow,
  focusId,
  onClose,
  postId,
}: {
  theirFlow: TheirFlow;
  focusId?: string | null;
  onClose: () => void;
  /** When this follow starts from a post, the post records it. */
  postId?: string;
}) {
  const { colors: C } = useTheme();
  const { width } = useWindowDimensions();
  const today = localDate(new Date());
  const map = useMapFlows(today);
  const { member } = useFlowMember(focusId ?? undefined);
  const followed = map.list ? followedMapFlow(map.list.flows, map.list.follows, today) : null;
  const suggestion = useMemo(
    () => (theirFlow.kind === 'map' ? null : suggestReplacement(theirFlow, followed?.flow ?? null, today)),
    [theirFlow, followed?.flow, today],
  );
  const [step, setStep] = useState(0);
  const [where, setWhere] = useState<FollowWhere | null>(null);
  const [sessions, setSessions] = useState<1 | 4 | null>(theirFlow.kind === 'daily' ? 1 : defaultFollowSessions);
  const [after, setAfter] = useState<FollowThen>(defaultFollowAfter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedDates, setSavedDates] = useState<string[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  const [replaceSlot, setReplaceSlot] = useState<number | null>(null);
  const slots = map.list?.flows ?? [];
  const slotsFull = theirFlow.kind === 'map' && slots.length >= mapFlowSlotCount;
  const chosen = useMemo<FollowWhere>(() => where ?? suggestion?.where ?? { kind: 'add', date: today }, [where, suggestion, today]);
  const mine = suggestion?.where.kind === 'replace' ? suggestion.title : 'your flow';
  const plan = useMemo(() => {
    if (theirFlow.kind === 'map' || !followed?.flow) return null;
    return followPlan({
      theirFlow,
      myMapFlow: followed.flow,
      where: chosen,
      sessions,
      after,
      today,
      slots: map.list?.flows ?? [],
    });
  }, [theirFlow, followed?.flow, chosen, sessions, after, today, map.list?.flows]);
  const before = useMemo(
    () => (followed?.flow ? predictBodyFlow(planFromMapFlow(followed.flow), { level: member.level }) : []),
    [followed?.flow, member.level],
  );
  const afterFigure = useMemo(() => {
    if (!followed?.flow || plan?.kind !== 'series') return before;
    return predictBodyFlow(afterPlan(planFromMapFlow(followed.flow), plan.where, theirFlow), { level: member.level });
  }, [followed?.flow, plan, theirFlow, member.level, before]);
  const lines = comparePredictions(before, afterFigure);
  const figureWidth = Math.min(150, Math.max(120, Math.round((width - 64) / 2)));
  const dates = plan?.kind === 'series' ? plan.dates : savedDates;
  const dateLine = dates.map(date => formatSeriesDate(date)).join(', ');

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const choice = {
        ...(theirFlow.kind === 'map'
          ? replaceSlot != null
            ? { replaceSlot, confirmBase: replaceSlot === 1 }
            : {}
          : { where: chosen, sessions, after }),
        today,
      };
      const list = postId
        ? await shareAct({ action: 'follow', postId, ...choice })
        : await startFollow({ theirFlow, ...choice });
      setSavedDates((list.follows ?? []).find(item => item.status === 'active')?.dates ?? dates);
      setSlot(list.placedSlot ?? null);
      setStep(theirFlow.kind === 'map' ? 1 : 3);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function back() {
    if (step === 0 || (theirFlow.kind === 'map' && step === 0)) {
      onClose();
      return;
    }
    setError('');
    setStep(current => Math.max(0, current - 1));
  }

  const result = theirFlow.kind === 'map' ? step === 1 : step === 3;
  const title = result ? 'Following' : theirFlow.title;
  const question = theirFlow.kind === 'daily' ? followLengths.filter(item => item.sessions === 1) : [...followLengths];

  return (
    <Sheet title={title} presentation="modal" navigation={step === 0 ? 'close' : 'back'} onClose={step === 0 ? onClose : back}>
      {theirFlow.kind !== 'map' && !result ? (
        <Stepper step={step + 1} total={3} label={step === 0 ? 'Where' : step === 1 ? 'How long' : 'Then'} />
      ) : null}
      {theirFlow.kind !== 'map' && (step === 2 || result) ? (
        <View style={{ flexDirection: 'row', gap: space.ms, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', gap: space.xs }}>
            <BodyPicture areas={before} width={figureWidth} />
            <Text variant="footnote" style={{ color: C.muted }}>Now</Text>
          </View>
          <View style={{ alignItems: 'center', gap: space.xs }}>
            <BodyPicture areas={afterFigure} width={figureWidth} />
            <Text variant="footnote" style={{ color: C.muted }}>After</Text>
          </View>
        </View>
      ) : null}
      {lines.length && (step === 2 || result) && theirFlow.kind !== 'map' ? <ReasonLine>{lines.join('. ')}</ReasonLine> : null}
      {theirFlow.kind === 'map' && !result ? (
        <View style={{ gap: space.sm }}>
          <Text variant="body" style={{ color: C.text }}>
            {slotsFull ? 'All five slots are in use. Choose one to replace.' : 'This copies the Map flow into a free slot.'}
          </Text>
          <ReasonLine>Weights and logs stay with {theirFlow.fromName}.</ReasonLine>
          {slotsFull
            ? [...slots]
                .sort((a, b) => a.slot - b.slot)
                .map(item => (
                  <View key={item.id} style={{ gap: space.xs }}>
                    <Chip
                      title={`Replace slot ${item.slot} · ${item.name}`}
                      active={replaceSlot === item.slot}
                      onPress={() => setReplaceSlot(item.slot)}
                    />
                    {item.slot === 1 && replaceSlot === 1 ? <ReasonLine>{slotOneWarning}</ReasonLine> : null}
                  </View>
                ))
            : null}
        </View>
      ) : null}
      {step === 0 && theirFlow.kind !== 'map' ? (
        <View style={{ gap: space.sm }}>
          {suggestion?.where.kind === 'replace' ? (
            <Chip
              title={`Replace ${suggestion.title}`}
              active={chosen.kind === 'replace'}
              onPress={() => setWhere(suggestion.where)}
            />
          ) : null}
          <Chip
            title={`Add on ${formatSeriesDate(suggestion?.where.kind === 'add' ? suggestion.where.date : chosen.kind === 'add' ? chosen.date : today)}`}
            active={chosen.kind === 'add'}
            onPress={() => setWhere(suggestion?.where.kind === 'add' ? suggestion.where : { kind: 'add', date: today })}
          />
          {suggestion ? <ReasonLine>{suggestion.reason}</ReasonLine> : null}
        </View>
      ) : null}
      {step === 1 && theirFlow.kind !== 'map' ? (
        <View style={{ gap: space.sm }}>
          {question.map(item => (
            <Chip
              key={item.label}
              title={item.label}
              active={sessions === item.sessions}
              onPress={() => setSessions(item.sessions)}
            />
          ))}
          {theirFlow.kind === 'daily' ? <ReasonLine>A shared Daily flow is one day.</ReasonLine> : null}
        </View>
      ) : null}
      {step === 2 && theirFlow.kind !== 'map' ? (
        <View style={{ gap: space.sm }}>
          <Chip title={`Go back to ${mine}`} active={after === 'return'} onPress={() => setAfter('return')} />
          <Chip title="Keep it" active={after === 'keep'} onPress={() => setAfter('keep')} />
          <ReasonLine>{after === 'return' ? `${mine} comes back on its own.` : 'This becomes your Custom flow.'}</ReasonLine>
        </View>
      ) : null}
      {result ? (
        <View style={{ gap: space.sm }}>
          <Text variant="section" style={{ color: C.text }}>
            {theirFlow.kind === 'map' ? `Copied into slot ${slot ?? ''}` : `Following ${theirFlow.title}`}
          </Text>
          <ReasonLine>
            {theirFlow.kind === 'map'
              ? `From ${theirFlow.fromName}. Weights and logs were left behind.`
              : sessions == null
                ? `From ${formatSeriesDate(dates[0] ?? today)}, until you stop. from ${theirFlow.fromName}.`
                : `${lengthLabel(sessions)}. ${dateLine}. from ${theirFlow.fromName}.`}
          </ReasonLine>
          {theirFlow.kind !== 'map' ? <ReasonLine>Stop following is on your Daily flow.</ReasonLine> : null}
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
          {error}
        </Text>
      ) : null}
      <StickyActionBar
        busy={busy}
        primary={{
          label: result ? 'Done' : replaceSlot === 1 ? 'Replace slot 1' : 'Continue',
          disabled: theirFlow.kind === 'map' && slotsFull && replaceSlot == null && !result,
          onPress: () => {
            if (result) onClose();
            else if (theirFlow.kind === 'map' || step === 2) void confirm();
            else setStep(current => current + 1);
          },
        }}
      />
    </Sheet>
  );
}
