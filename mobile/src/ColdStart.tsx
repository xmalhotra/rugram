import { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { catalogFlows } from '../../shared/flow-catalog';
import { planFromMapFlow } from '../../shared/map-flow';
import { mapFlowTemplateById } from '../../shared/map-flow-templates';
import { predictBodyFlow } from '../../shared/predicted-body-flow';
import { offeredPurposes, purposes } from '../../shared/purposes';
import {
  confirmLines,
  firstRunResult,
  gymSetupFromAnswers,
  questionsForPurpose,
  type FirstRunAnswers,
} from '../../shared/first-run';
import { localDate } from '../../shared/flow-habits';
import { starterWeeklyLine, suggestStarter } from '../../shared/starter-flow';
import { BodyPicture } from './BodyMap';
import { Button, Chip, EmptyState, ReasonLine, Stepper } from './design/components';
import { Text } from './design/Text';
import { hit, opacity, space, useTheme } from './design/theme';
import { describedCatalogFlow, useFlowMember } from './flow-member';
import { peekFlowSeries } from './flow-series';
import { savePersonalMetric } from './personal-metrics';
import { SeriesSheet } from './SeriesSheet';

/** The first catalogue flow the default view would put in front of this member. */
export function useSuggestedFlow(focusId?: string) {
  const { member } = useFlowMember(focusId);
  const described = catalogFlows.flatMap(flow => {
    const row = describedCatalogFlow(flow);
    return row ? [row] : [];
  });
  const pick = suggestStarter(described, member);
  if (!pick?.flow.flowId) return null;
  return { id: pick.flow.flowId, title: pick.flow.title };
}

/**
 * Whether this member has any series. A failed read counts as having one, so a
 * suggestion never covers a Daily flow we could not see. This does not use the calendar cache.
 */
export function useRoutinePresence() {
  const [state, setState] = useState<'loading' | 'empty' | 'present'>('loading');
  const [stamp, setStamp] = useState(0);
  useEffect(() => {
    let live = true;
    const today = localDate(new Date());
    peekFlowSeries(today, today)
      .then(bundle => {
        if (live) setState(bundle.series.length === 0 ? 'empty' : 'present');
      })
      .catch(() => {
        if (live) setState('present');
      });
    return () => {
      live = false;
    };
  }, [stamp]);
  return { empty: state === 'empty', ready: state !== 'loading', refresh: () => setStamp(value => value + 1) };
}

type Step = { kind: 'opening' } | { kind: 'purpose' } | { kind: 'question'; index: number } | { kind: 'confirm' } | { kind: 'result' };

function QuietButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', paddingHorizontal: space.sm, opacity: pressed || disabled ? opacity.pressed : 1 })}
    >
      <Text variant="callout" style={{ color: C.muted, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * First visit with nothing on the map: what Qram is, one purpose, only that purpose's questions,
 * then a Map flow. Members who already have series never reach this.
 */
export function ColdStart({
  onSavePurpose,
  onUse,
  onStart,
  onExplore,
  onDone,
}: {
  onSavePurpose: (id: string) => Promise<boolean>;
  onUse: (templateId: string) => Promise<void>;
  onStart?: (id: string, title: string) => void;
  onExplore?: () => void;
  onDone: () => void;
}) {
  const { colors: C } = useTheme();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>({ kind: 'opening' });
  const [purposeId, setPurposeId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<FirstRunAnswers>({});
  const [backToConfirm, setBackToConfirm] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const purpose = purposeId ? purposes.find(item => item.id === purposeId) : undefined;
  const questions = purposeId ? questionsForPurpose(purposeId) : [];
  const suggestion = useSuggestedFlow(purpose?.focusId);
  const result = purposeId ? firstRunResult({ purposeId, answers }) : null;
  const selected = result?.kind === 'map-flows' ? (result.fits.find(fit => fit.id === chosenId) ?? result.fits[0]) : null;
  const figureWidth = Math.min(180, Math.max(120, width - 96));

  function choosePurpose(id: string) {
    const changed = purposeId !== id;
    setPurposeId(id);
    setError('');
    if (changed) {
      setAnswers({});
      setChosenId(null);
      setBackToConfirm(false);
    }
    if (!changed && backToConfirm) {
      setStep({ kind: 'confirm' });
      return;
    }
    const next = questionsForPurpose(id);
    setStep(next.length ? { kind: 'question', index: 0 } : { kind: 'confirm' });
  }

  function answer(id: string, value: string | null) {
    setAnswers(current => ({ ...current, [id]: value }));
    setChosenId(null);
    if (step.kind !== 'question') return;
    if (backToConfirm) {
      setBackToConfirm(false);
      setStep({ kind: 'confirm' });
      return;
    }
    const next = step.index + 1;
    setStep(next < questions.length ? { kind: 'question', index: next } : { kind: 'confirm' });
  }

  function back() {
    setError('');
    if (step.kind === 'purpose') setStep({ kind: 'opening' });
    else if (step.kind === 'question') {
      if (backToConfirm) {
        setBackToConfirm(false);
        setStep({ kind: 'confirm' });
      } else if (step.index === 0) setStep({ kind: 'purpose' });
      else setStep({ kind: 'question', index: step.index - 1 });
    } else if (step.kind === 'confirm') {
      setStep(questions.length ? { kind: 'question', index: questions.length - 1 } : { kind: 'purpose' });
    } else if (step.kind === 'result') setStep({ kind: 'confirm' });
  }

  async function startShown() {
    if (!purposeId || !suggestion || busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = await onSavePurpose(purposeId);
      if (!saved) throw new Error('Try again.');
      onStart?.(suggestion.id, suggestion.title);
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
      setBusy(false);
    }
  }

  async function applyPick() {
    if (!purposeId || !selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = await onSavePurpose(purposeId);
      if (!saved) throw new Error('Try again.');
      const gym = gymSetupFromAnswers(purposeId, answers);
      if (gym.place) await savePersonalMetric('gym.place', { place: gym.place });
      if (gym.minutes) await savePersonalMetric('gym.minutes', { minutes: gym.minutes });
      await onUse(selected.id);
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
      setBusy(false);
    }
  }

  if (step.kind === 'opening') {
    return (
      <View style={{ gap: space.ms }}>
        <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
          Qram means sequence
        </Text>
        <Text variant="body" style={{ color: C.text }}>
          This app gives you a sequence for your day, starting with training.
        </Text>
        <Button title="Continue" onPress={() => setStep({ kind: 'purpose' })} />
      </View>
    );
  }

  if (step.kind === 'purpose') {
    return (
      <View style={{ gap: space.ms }}>
        <Stepper step={1} total={1 + Math.max(questions.length, 1)} label="Purpose" />
        <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
          What are you here for?
        </Text>
        <ReasonLine>One purpose for now. Another Map flow can hold another one later.</ReasonLine>
        <View style={{ gap: space.sm }}>
          {offeredPurposes().map(option => (
            <Chip
              key={option.id}
              title={option.name}
              active={purposeId === option.id}
              disabled={busy}
              onPress={() => choosePurpose(option.id)}
            />
          ))}
        </View>
        <QuietButton label="Back" onPress={back} />
      </View>
    );
  }

  if (step.kind === 'question') {
    const question = questions[step.index];
    if (!question) return null;
    const selectedId = answers[question.id];
    return (
      <View style={{ gap: space.ms }}>
        <Stepper step={step.index + 2} total={questions.length + 1} label={question.prompt} />
        <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
          {question.prompt}
        </Text>
        <ReasonLine>{question.why}</ReasonLine>
        <View style={{ gap: space.sm }}>
          {question.choices.map(choice => (
            <Chip
              key={choice.id}
              title={choice.label}
              active={selectedId === choice.id}
              disabled={busy}
              onPress={() => answer(question.id, choice.id)}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <QuietButton label="Back" onPress={back} />
          <QuietButton label="Skip" onPress={() => answer(question.id, null)} />
        </View>
      </View>
    );
  }

  if (step.kind === 'confirm' && purpose) {
    const lines = confirmLines(purpose.id, answers);
    return (
      <View style={{ gap: space.ms }}>
        <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
          Here is what you said
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Purpose, ${purpose.name}. Change`}
          onPress={() => {
            setBackToConfirm(true);
            setStep({ kind: 'purpose' });
          }}
          style={({ pressed }) => ({ minHeight: hit, gap: space.xxs, opacity: pressed ? opacity.pressed : 1 })}
        >
          <Text variant="footnote" style={{ color: C.muted }}>Purpose</Text>
          <Text variant="headline" style={{ color: C.text }}>{purpose.name}</Text>
        </Pressable>
        {lines.map(line => (
          <Pressable
            key={line.id}
            accessibilityRole="button"
            accessibilityLabel={`${line.prompt} ${line.said}. Change`}
            onPress={() => {
              const index = questions.findIndex(question => question.id === line.id);
              if (index < 0) return;
              setBackToConfirm(true);
              setStep({ kind: 'question', index });
            }}
            style={({ pressed }) => ({ minHeight: hit, gap: space.xxs, opacity: pressed ? opacity.pressed : 1 })}
          >
            <Text variant="footnote" style={{ color: C.muted }}>{line.prompt}</Text>
            <Text variant="headline" style={{ color: C.text }}>{line.said}</Text>
          </Pressable>
        ))}
        <Button title="Continue" onPress={() => setStep({ kind: 'result' })} />
        <QuietButton label="Back" onPress={back} />
      </View>
    );
  }

  if (step.kind === 'result' && result?.kind === 'map-flows' && selected) {
    const template = mapFlowTemplateById(selected.id);
    const figure = template ? predictBodyFlow(planFromMapFlow(template), { level: template.level }) : [];
    return (
      <View style={{ gap: space.md }}>
        <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
          A Map flow for {result.purposeName}
        </Text>
        {result.fits.map(fit => {
          const on = fit.id === selected.id;
          return (
            <Pressable
              key={fit.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${fit.name}. ${fit.reason}`}
              onPress={() => setChosenId(fit.id)}
              style={({ pressed }) => ({ gap: space.sm, opacity: pressed ? opacity.pressed : 1 })}
            >
              {on && figure.length ? <BodyPicture areas={figure} width={figureWidth} /> : null}
              <Text variant="headline" style={{ color: C.text }}>{fit.name}</Text>
              <Text variant="subhead" style={{ color: C.muted }}>
                {fit.styleName} · {fit.level} · {fit.minutes} min
              </Text>
              <ReasonLine>{fit.reason}</ReasonLine>
            </Pressable>
          );
        })}
        {error ? (
          <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
            {error}
          </Text>
        ) : null}
        <Button title="Use this" disabled={busy} onPress={() => void applyPick()} />
        <QuietButton label="Back" onPress={back} disabled={busy} />
      </View>
    );
  }

  if (step.kind === 'result' && result?.kind === 'starter') {
    return (
      <View style={{ gap: space.ms }}>
        <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
          {result.purposeName}
        </Text>
        <ReasonLine>{result.line}</ReasonLine>
        {suggestion ? (
          <>
            <Text variant="headline" style={{ color: C.text }}>{suggestion.title}</Text>
            <ReasonLine>This is a flow to start with.</ReasonLine>
            <Button title="Start" disabled={busy} onPress={() => void startShown()} />
            {error ? (
              <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
                {error}
              </Text>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={result.purposeName}
            description={`${result.line} There is no starter for this yet.`}
            action={onExplore ? { label: 'Browse flows', onPress: onExplore } : undefined}
          />
        )}
        <QuietButton label="Back" onPress={back} />
      </View>
    );
  }

  return null;
}

/** One flow to try today, with a way to put it on the Daily flow. */
export function TodayTryCard({
  focusId,
  onStart,
  onAdded,
}: {
  focusId?: string;
  onStart: (id: string, title: string) => void;
  onAdded?: () => void;
}) {
  const { colors: C } = useTheme();
  const suggestion = useSuggestedFlow(focusId);
  const [adding, setAdding] = useState(false);
  if (!suggestion) return null;
  return (
    <View style={{ gap: space.sm, paddingVertical: space.sm }}>
      <Text accessibilityRole="header" variant="subhead" style={{ color: C.muted }}>
        Today, try…
      </Text>
      <Text variant="section" style={{ color: C.text }}>{suggestion.title}</Text>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Button
          variant="text"
          size="regular"
          title="Start"
          accessibilityLabel={`Start ${suggestion.title}`}
          onPress={() => onStart(suggestion.id, suggestion.title)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${suggestion.title} to Daily flow`}
          onPress={() => setAdding(true)}
          style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
        >
          <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>Add to Daily flow</Text>
        </Pressable>
      </View>
      {adding ? (
        <SeriesSheet
          mode="create"
          title={suggestion.title}
          itemKind="flow"
          itemId={suggestion.id}
          start={localDate(new Date())}
          onClose={() => {
            setAdding(false);
            onAdded?.();
          }}
        />
      ) : null}
    </View>
  );
}

/** The same suggestion under an empty Body flow, with the weekly dose it is aiming at. */
export function BodyFlowStarter({
  focusId,
  onStart,
}: {
  focusId?: string;
  onStart: (id: string, title: string) => void;
}) {
  const { colors: C } = useTheme();
  const suggestion = useSuggestedFlow(focusId);
  return (
    <View style={{ paddingHorizontal: space.md, paddingVertical: space.md, gap: space.sm }}>
      <Text variant="subhead" style={{ color: C.muted }}>{starterWeeklyLine()}</Text>
      {suggestion ? (
        <>
          <Text variant="headline" style={{ color: C.text }}>{suggestion.title}</Text>
          <Button
            variant="text"
            title="Start"
            accessibilityLabel={`Start ${suggestion.title}`}
            onPress={() => onStart(suggestion.id, suggestion.title)}
          />
        </>
      ) : (
        <Text variant="subhead" style={{ color: C.muted }}>Finish any flow and your Body flow starts today.</Text>
      )}
    </View>
  );
}
