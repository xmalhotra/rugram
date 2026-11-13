import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { addCalendarDays, formatSeriesDate } from '../../shared/flow-series';
import type { FlowLevel, TrainPlace } from '../../shared/flow-defaults';
import { localDate } from '../../shared/flow-habits';
import { comparePredictions } from '../../shared/predicted-body-flow';
import { regimeAhead, type MapFlow } from '../../shared/map-flow';
import { mapFlowStyleById } from '../../shared/map-flow-styles';
import { mapFlowTemplates, type MapFlowTemplate } from '../../shared/map-flow-templates';
import { purposes } from '../../shared/purposes';
import { BodyPicture } from './BodyMap';
import { Badge, Button, Card, EmptyState, ReasonLine, SectionHeader, Sheet, Skeleton } from './design/components';
import { Text } from './design/Text';
import { hit, layout, opacity, space, useTheme } from './design/theme';
import { useMapFlows, type MapFlowCard } from './map-flows';

const levelOrder: Record<FlowLevel, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

function placeWord(place: TrainPlace) {
  if (place === 'gym') return 'Gym';
  if (place === 'dumbbells') return 'Dumbbells';
  return 'Bodyweight';
}

function styleSummary(styleId: string) {
  return mapFlowStyleById(styleId)?.summary ?? mapFlowStyleById(styleId)?.name ?? styleId;
}

function templateReason(template: MapFlowTemplate, purposeId: string | undefined, level: FlowLevel) {
  const purpose = purposeId ? purposes.find(item => item.id === purposeId) : undefined;
  const matchesPurpose = Boolean(purpose && template.purposeIds.includes(purpose.id));
  const matchesLevel = template.level === level;
  if (matchesPurpose && matchesLevel && purpose) return `Matches ${purpose.name} · ${template.level}`;
  if (matchesPurpose && purpose) return `Matches ${purpose.name}`;
  if (matchesLevel) return `Your level · ${template.level}`;
  return null;
}

function dayLines(flow: MapFlow, from: string | null) {
  if (from) return regimeAhead(flow, from, 4).map(day => `${formatSeriesDate(day.date)} · ${day.name}`);
  return flow.days.map((day, index) => `${index + 1} · ${day.name}`);
}

/**
 * Five Map flow slots. The followed card opens its days. Another card compares the two
 * predicted figures before a follow. An empty slot adds one from Qram or a copy.
 */
export function MapFlowShelf({ purposeId, level }: { purposeId?: string; level: FlowLevel }) {
  const { colors: C } = useTheme();
  const { width } = useWindowDimensions();
  const today = localDate(new Date());
  const tomorrow = addCalendarDays(today, 1);
  const { list, loading, error, change, reload } = useMapFlows(today);
  const [open, setOpen] = useState<null | { kind: 'days' | 'switch'; id: string } | { kind: 'add'; slot: number }>(null);
  const [pick, setPick] = useState<null | { source: 'template' | 'copy'; id: string; name: string; summary: string }>(null);
  const [result, setResult] = useState<null | { title: string; lines: string[] }>(null);
  const [shelfResult, setShelfResult] = useState<null | { title: string; lines: string[] }>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const figureWidth = Math.max(96, Math.min(120, Math.floor((width - 96) / 2)));
  const flows = list?.flows ?? [];
  const followed = flows.find(flow => flow.id === list?.followedId) ?? null;

  function close() {
    setOpen(null);
    setPick(null);
    setResult(null);
    setProblem('');
    setBusy(false);
  }

  function openCard(flow: MapFlowCard) {
    setShelfResult(null);
    setResult(null);
    setProblem('');
    setOpen(list?.followedId === flow.id ? { kind: 'days', id: flow.id } : { kind: 'switch', id: flow.id });
  }

  async function run(task: () => Promise<{ title: string; lines: string[] }>, where: 'sheet' | 'shelf') {
    if (busy) return;
    setBusy(true);
    setProblem('');
    try {
      const next = await task();
      if (where === 'sheet') setResult(next);
      else {
        setShelfResult(next);
        close();
      }
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function follow(flow: MapFlowCard, from: string) {
    return run(async () => {
      await change({ action: 'follow', mapFlowId: flow.id, from });
      return {
        title: `Following ${flow.name} from ${formatSeriesDate(from)}.`,
        lines: dayLines(flow, from),
      };
    }, 'sheet');
  }

  function backToBase(where: 'sheet' | 'shelf') {
    const base = flows.find(flow => flow.slot === 1);
    if (!base) return;
    return run(async () => {
      await change({ action: 'base', from: today });
      return {
        title: `Back to ${base.name} from ${formatSeriesDate(today)}.`,
        lines: dayLines(base, today),
      };
    }, where);
  }

  function addToSlot(slot: number) {
    if (!pick) return;
    return run(async () => {
      const next =
        pick.source === 'template'
          ? await change({ action: 'create', templateId: pick.id, slot, start: today })
          : await change({ action: 'copy', mapFlowId: pick.id, slot, start: today });
      const made = next.flows.find(flow => flow.slot === slot);
      const following = Boolean(made && next.followedId === made.id);
      const still = next.flows.find(flow => flow.id === next.followedId);
      return {
        title: made
          ? following
            ? `${made.name} is in slot ${slot}, and you are following it.`
            : `${made.name} is in slot ${slot}. You are still following ${still?.name ?? 'your Map flow'}.`
          : 'Added.',
        lines: made ? dayLines(made, following ? today : null) : [],
      };
    }, 'sheet');
  }

  const opened = open && open.kind !== 'add' ? flows.find(flow => flow.id === open.id) ?? null : null;
  const slots = [1, 2, 3, 4, 5] as const;

  const emptySlots = slots.filter(slot => !flows.some(flow => flow.slot === slot));
  const baseEmpty = emptySlots.includes(1);
  const canGoBack = Boolean(followed && followed.slot !== 1 && flows.some(flow => flow.slot === 1));
  function openAdd(slot: number) {
    setPick(null);
    setResult(null);
    setProblem('');
    setShelfResult(null);
    setOpen({ kind: 'add', slot });
  }

  return (
    <View style={{ gap: layout.cards }}>
      <SectionHeader
        title="Map flow"
        detail={
          followed
            ? `Following ${followed.name}. One regime at a time.`
            : flows.length
              ? 'Five slots. One regime at a time.'
              : 'A Map flow is a regime: Daily flows in a pattern. Keep up to five and follow one at a time.'
        }
        action={canGoBack && !busy ? { label: 'Back to base', onPress: () => void backToBase('shelf') } : undefined}
      />
      {shelfResult ? (
        <Card>
          <Text variant="headline" style={{ color: C.text }}>
            {shelfResult.title}
          </Text>
          {shelfResult.lines.map(line => (
            <Text key={line} variant="subhead" style={{ color: C.text }}>
              {line}
            </Text>
          ))}
          <Button variant="text" title="Done" onPress={() => setShelfResult(null)} />
        </Card>
      ) : null}
      {loading && !list ? <Skeleton shape="card" /> : null}
      {error && !list ? (
        <EmptyState title="Map flow" description={error} action={{ label: 'Try again', onPress: () => void reload() }} />
      ) : null}
      {list
        ? flows
            .slice()
            .sort((a, b) => a.slot - b.slot)
            .map(flow => {
              const following = flow.id === list.followedId;
              return (
                <Card
                  key={flow.id}
                  accessibilityLabel={`${flow.name}. ${flow.styleName}.${following ? ' Following.' : ''}`}
                  onPress={() => openCard(flow)}
                >
                  <View style={{ flexDirection: 'row', gap: space.ms, alignItems: 'center' }}>
                    <BodyPicture areas={flow.figure} width={figureWidth} />
                    <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                      <Text variant="headline" style={{ color: C.text }}>
                        {flow.name}
                      </Text>
                      <Text variant="subhead" style={{ color: C.muted }}>
                        {flow.slot === 1 ? `Base · ${flow.styleName}` : flow.styleName}
                      </Text>
                      {following ? <Badge>Following</Badge> : null}
                    </View>
                  </View>
                </Card>
              );
            })
        : null}
      {list && baseEmpty ? (
        // Base comes first: it is the Map flow the member comes back to.
        <Card>
          <Text variant="headline" style={{ color: C.text }}>
            Base
          </Text>
          <Text variant="subhead" style={{ color: C.muted }}>
            The Map flow you come back to.
          </Text>
          <Button title="Add a Map flow" accessibilityLabel="Base. Add a Map flow" onPress={() => openAdd(1)} />
        </Card>
      ) : null}
      {list && !baseEmpty && emptySlots.length ? (
        // Empty slots share one card, so the shelf stays short.
        <Card>
          <Text variant="headline" style={{ color: C.text }}>
            {emptySlots.length === 1 ? '1 empty slot' : `${emptySlots.length} empty slots`}
          </Text>
          <Button
            variant="text"
            title="Add a Map flow"
            accessibilityLabel={`Add a Map flow to slot ${emptySlots[0]}`}
            onPress={() => openAdd(emptySlots[0])}
          />
        </Card>
      ) : null}
      {open?.kind === 'days' && opened ? (
        <Sheet title={opened.name} presentation="modal" onClose={close}>
          <Text variant="subhead" style={{ color: C.muted }}>{styleSummary(opened.styleId)}</Text>
          <Badge>Following</Badge>
          {opened.days.map((day, index) => (
            <Text key={`${day.name}-${index}`} variant="body" style={{ color: C.text }}>
              {index + 1} · {day.name}
            </Text>
          ))}
        </Sheet>
      ) : null}
      {open?.kind === 'switch' && opened ? (
        <Sheet title={result ? 'Following' : opened.name} presentation="modal" onClose={close}>
          {result ? (
            <View style={{ gap: space.sm }}>
              <Text variant="headline" style={{ color: C.text }}>{result.title}</Text>
              {result.lines.map(line => (
                <Text key={line} variant="callout" style={{ color: C.text }}>
                  {line}
                </Text>
              ))}
            </View>
          ) : (
            <View style={{ gap: space.ms }}>
              <View style={{ flexDirection: 'row', gap: space.ms }}>
                {followed ? (
                  <View style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
                    <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>{followed.name}</Text>
                    <BodyPicture areas={followed.figure} width={figureWidth} />
                    <Text variant="footnote" style={{ color: C.muted, textAlign: 'center' }}>{followed.styleName}</Text>
                  </View>
                ) : null}
                <View style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
                  <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>{opened.name}</Text>
                  <BodyPicture areas={opened.figure} width={figureWidth} />
                  <Text variant="footnote" style={{ color: C.muted, textAlign: 'center' }}>{opened.styleName}</Text>
                </View>
              </View>
              <View style={{ gap: space.xxs }}>
                {(followed ? comparePredictions(followed.figure, opened.figure) : []).map(line => (
                  <ReasonLine key={line}>{line}</ReasonLine>
                ))}
                {followed && comparePredictions(followed.figure, opened.figure).length === 0 ? (
                  <ReasonLine>The areas stay the same</ReasonLine>
                ) : null}
                {!followed ? <ReasonLine>You are not following a Map flow yet.</ReasonLine> : null}
              </View>
              {problem ? (
                <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
                  {problem}
                </Text>
              ) : null}
              <Button title="Follow from today" disabled={busy} onPress={() => void follow(opened, today)} />
              <Button title="Follow from tomorrow" secondary disabled={busy} onPress={() => void follow(opened, tomorrow)} />
              {followed && followed.slot !== 1 && flows.some(flow => flow.slot === 1) ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to base"
                  disabled={busy}
                  onPress={() => void backToBase('sheet')}
                  style={({ pressed }) => ({ minHeight: hit, alignItems: 'center', justifyContent: 'center', opacity: pressed || busy ? opacity.pressed : 1 })}
                >
                  <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>Back to base</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </Sheet>
      ) : null}
      {open?.kind === 'add' ? (
        <Sheet title="Add a Map flow" presentation="modal" onClose={close}>
          {result ? (
            <View style={{ gap: space.sm }}>
              <Text variant="headline" style={{ color: C.text }}>{result.title}</Text>
              {result.lines.map(line => (
                <Text key={line} variant="callout" style={{ color: C.text }}>
                  {line}
                </Text>
              ))}
            </View>
          ) : pick ? (
            <View style={{ gap: space.sm }}>
              <Text variant="headline" style={{ color: C.text }}>
                Add {pick.name} to {open.slot === 1 ? 'base' : `slot ${open.slot}`}?
              </Text>
              <ReasonLine>{pick.summary}</ReasonLine>
              {problem ? (
                <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
                  {problem}
                </Text>
              ) : null}
              <Button title="Add" disabled={busy} onPress={() => void addToSlot(open.slot)} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                disabled={busy}
                onPress={() => {
                  setPick(null);
                  setProblem('');
                }}
                style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
              >
                <Text variant="callout" style={{ color: C.text }}>Back</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: space.md }}>
              <Text variant="subhead" style={{ color: C.muted }}>
                Qram&apos;s shelf, or a copy of one you already have. Weights and logs stay behind on a copy.
              </Text>
              {purposes.map(purpose => {
                const rows = mapFlowTemplates
                  .filter(template => template.purposeIds.includes(purpose.id))
                  .slice()
                  .sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || a.name.localeCompare(b.name));
                if (!rows.length) return null;
                return (
                  <View key={purpose.id} style={{ gap: space.sm }}>
                    <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{purpose.name}</Text>
                    {rows.map(template => {
                      const reason = templateReason(template, purposeId, level);
                      const styleName = mapFlowStyleById(template.styleId)?.name ?? template.styleId;
                      return (
                        <Pressable
                          key={template.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${template.name}. ${styleName}. ${template.level}`}
                          onPress={() =>
                            setPick({
                              source: 'template',
                              id: template.id,
                              name: template.name,
                              summary: styleSummary(template.styleId),
                            })
                          }
                          style={({ pressed }) => ({ minHeight: hit, gap: space.xxs, opacity: pressed ? opacity.pressed : 1 })}
                        >
                          <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{template.name}</Text>
                          <Text variant="subhead" style={{ color: C.muted }}>
                            {styleName} · {template.level} · {placeWord(template.place)}
                          </Text>
                          {reason ? <ReasonLine>{reason}</ReasonLine> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
              {flows.length ? (
                <View style={{ gap: space.sm }}>
                  <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>A copy of yours</Text>
                  {flows.map(flow => (
                    <Pressable
                      key={flow.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Copy ${flow.name}`}
                      onPress={() =>
                        setPick({
                          source: 'copy',
                          id: flow.id,
                          name: flow.name,
                          summary: `A copy of ${flow.name}. ${styleSummary(flow.styleId)} Weights and logs stay on the original.`,
                        })
                      }
                      style={({ pressed }) => ({ minHeight: hit, justifyContent: 'center', opacity: pressed ? opacity.pressed : 1 })}
                    >
                      <Text variant="callout" style={{ color: C.text }}>{flow.name}</Text>
                      <Text variant="subhead" style={{ color: C.muted }}>{flow.styleName}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </Sheet>
      ) : null}
    </View>
  );
}
