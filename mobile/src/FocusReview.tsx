import { useState } from 'react';
import { Pressable, Switch, View, useWindowDimensions } from 'react-native';
import { focusDayLines } from '../../shared/focus-planner';
import { calendarWeekday, formatSeriesDate } from '../../shared/flow-series';
import { localDate } from '../../shared/flow-habits';
import type { MuscleArea } from '../../shared/muscle-map';
import { BodyShadeMap } from './BodyMap';
import { Glyph } from './design/Glyph';
import { Text } from './design/Text';
import { Button, SectionHeader, Sheet, Skeleton } from './design/components';
import { hit, radius, size, space, useTheme } from './design/theme';
import { applyFocusPlan, undoFocusPlan, useFocusPlan, type FocusSuggestion } from './focus-plan';
import { useDailyChecks } from './daily-checks';
import { useSession } from './session';
import { itemForCheck } from '../../shared/daily-flow-item';
import { dailyFlowItems } from '../../shared/daily-flow-item-data';
import { applyItemProposal, itemStageProposals, memberPurposeId, purposeWeek } from '../../shared/purposes';
import { ReasonLine } from './design/states';
import { useFlowFollows } from './follow';

const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function verb(kind: FocusSuggestion['kind']) {
  if (kind === 'add') return 'Add';
  if (kind === 'replace') return 'Switch to';
  if (kind === 'keep') return 'Keep';
  return 'Move';
}

function Review({ mode }: { mode: 'card' | 'sheet' }) {
  const { colors: C } = useTheme();
  const { width } = useWindowDimensions();
  const today = localDate(new Date());
  const plan = useFocusPlan(today);
  const follows = useFlowFollows(today);
  const session = useSession();
  const { checks, update } = useDailyChecks(session.data?.user.id);
  const purposeId = memberPurposeId({
    purposeId: session.data?.profile.purposeId,
    demoMode: session.data?.demoMode,
  });
  const presentItemIds = checks.items.flatMap(item => {
    const known = itemForCheck(dailyFlowItems, item.id, item.name);
    return known ? [known.id] : [];
  });
  const proposals = purposeId
    ? itemStageProposals({
        purposeId,
        week: purposeWeek(session.data?.profile.purposeStartedOn, today),
        presentItemIds,
      })
    : [];
  const [itemOff, setItemOff] = useState<string[]>([]);
  const chosenItems = proposals.filter(item => !itemOff.includes(item.id));
  const [off, setOff] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const data = plan.data;
  const applied = new Set(data?.appliedIds ?? []);
  const chosen = (data?.suggestions ?? []).filter(item => !applied.has(item.id) && !off.includes(item.id)).map(item => item.id);
  const lines = data
    ? focusDayLines({
        nextWeekStart: data.nextWeekStart,
        next: data.next,
        suggestions: data.suggestions,
        enabled: [...data.appliedIds, ...chosen],
      })
    : [];
  const shades: Partial<Record<MuscleArea, number>> = {};
  if (data) {
    for (const area of data.areas) shades[area.area] = area.shade;
  }

  async function apply() {
    if (!data || busy || !chosen.length) return;
    setBusy(true);
    setError('');
    try {
      await applyFocusPlan(today, chosen);
      setOff([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function undo(id: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await undoFocusPlan(today, id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function addItems() {
    if (!chosenItems.length) return;
    update(current => chosenItems.reduce((state, proposal) => applyItemProposal(state, proposal), current));
    setItemOff([]);
  }

  if (mode === 'card' && !plan.loading && !plan.error && data && data.suggestions.length === 0 && data.planned === 0 && proposals.length === 0 && follows.reviewLines.length === 0) return null;
  const mapWidth = Math.min(260, Math.max(180, width - 64));
  return (
    <View style={{ borderRadius: radius.control, backgroundColor: C.card, paddingBottom: space.sm, gap: space.xs }}>
      <View style={{ paddingHorizontal: space.md, paddingTop: space.md }}>
        <SectionHeader title="This week" />
      </View>
      {plan.loading && !data ? (
        <View style={{ paddingHorizontal: space.md, paddingVertical: space.ms }}>
          <Skeleton shape="line" />
        </View>
      ) : null}
      {plan.error ? (
        <View style={{ paddingHorizontal: space.md, gap: space.xs }}>
          <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
            {plan.error}
          </Text>
          <Button
            variant="text"
            title="Try again"
            accessibilityLabel="Try loading this week again"
            onPress={() => void plan.reload()}
          />
        </View>
      ) : null}
      {data ? (
        <View style={{ gap: space.sm }}>
          <Text variant="headline" style={{ color: C.text, paddingHorizontal: space.md }}>
            {data.planned ? `${data.done} of ${data.planned} done` : 'Nothing planned'}
          </Text>
          {data.plannedDays.map(day => (
            <View
              key={`${day.date}:${day.title}`}
              accessible
              accessibilityLabel={`${day.done ? '✓' : '○'} ${weekday[calendarWeekday(day.date) - 1]} ${day.title}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md }}
            >
              {day.done ? (
                <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.muted} size={space.md} />
              ) : (
                <Text variant="subhead" style={{ color: C.text }}>○</Text>
              )}
              <Text variant="subhead" style={{ color: day.done ? C.muted : C.text }}>
                {weekday[calendarWeekday(day.date) - 1]} {day.title}
              </Text>
            </View>
          ))}
          <View style={{ alignItems: 'center', paddingVertical: space.sm }}>
            <BodyShadeMap
              shades={shades}
              width={mapWidth}
              label="This week, front and back. Each area is shaded by its sets against the target."
            />
          </View>
          {data.suggestions.map(item => {
            const on = !off.includes(item.id);
            const label = `${formatSeriesDate(item.day)}, ${verb(item.kind)} ${item.title}`;
            const done = applied.has(item.id);
            return (
              <View key={item.id} style={{ paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.xxs, minHeight: hit }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
                  <View style={{ flex: 1, gap: space.xxs }}>
                    <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{label}</Text>
                    <Text variant="subhead" style={{ color: C.muted }}>{item.reason}</Text>
                  </View>
                  {done ? (
                    <Button
                      variant="text"
                      size="regular"
                      title="Undo"
                      accessibilityLabel={`Undo ${label}`}
                      disabled={busy}
                      onPress={() => void undo(item.id)}
                    />
                  ) : (
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityLabel={`${label}. ${item.reason}`}
                      accessibilityState={{ checked: on, disabled: busy }}
                      onPress={() => setOff(current => (current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]))}
                      style={{ minWidth: size.button, minHeight: hit, alignItems: 'flex-end', justifyContent: 'center' }}
                    >
                      <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
                        <Switch
                          accessibilityLabel={label}
                          value={on}
                          onValueChange={() => undefined}
                          trackColor={{ true: C.lime, false: C.line }}
                          thumbColor={C.card}
                        />
                      </View>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          {follows.reviewLines.map(line => (
            <Text key={line} variant="subhead" style={{ color: C.text, paddingHorizontal: space.md }}>
              {line}
            </Text>
          ))}
          {lines.map(line => (
            <Text key={line.date} variant="subhead" style={{ color: line.before === line.after ? C.muted : C.text, paddingHorizontal: space.md }}>
              {line.line}
            </Text>
          ))}
          {proposals.map(item => {
            const on = !itemOff.includes(item.id);
            return (
              <View key={item.id} style={{ paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.xxs, minHeight: hit }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
                  <View style={{ flex: 1, gap: space.xxs }}>
                    <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>Add {item.name}</Text>
                    <ReasonLine>{item.reason}</ReasonLine>
                  </View>
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel={`Add ${item.name}. ${item.reason}`}
                    accessibilityState={{ checked: on }}
                    onPress={() => setItemOff(current => (current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]))}
                    style={{ minWidth: size.button, minHeight: hit, alignItems: 'flex-end', justifyContent: 'center' }}
                  >
                    <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
                      <Switch
                        accessibilityLabel={`Add ${item.name}`}
                        value={on}
                        onValueChange={() => undefined}
                        trackColor={{ true: C.lime, false: C.line }}
                        thumbColor={C.card}
                      />
                    </View>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {proposals.length ? (
            <View style={{ marginHorizontal: space.md, marginTop: space.sm }}>
              <Button
                variant="secondary"
                title="Add to your day"
                disabled={chosenItems.length === 0}
                onPress={addItems}
              />
            </View>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger, paddingHorizontal: space.md }}>
              {error}
            </Text>
          ) : null}
          <View style={{ marginHorizontal: space.md, marginTop: space.sm }}>
            <Button
              title="Apply to next week"
              disabled={busy || chosen.length === 0}
              onPress={() => void apply()}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The Sunday card at the top of Yours. */
export function FocusReviewCard() {
  return <Review mode="card" />;
}

/** The same review, opened from Body flow. */
export function FocusReviewSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="This week" presentation="modal" onClose={onClose}>
      <Review mode="sheet" />
    </Sheet>
  );
}
