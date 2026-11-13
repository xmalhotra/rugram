import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  formatCardDetail,
  formatEffort,
  formatKnownTotal,
  formatRunCount,
  formatRunWhen,
} from '../../shared/flow-history';
import { Text } from './design/Text';
import { Button, SectionHeader, Skeleton } from './design/components';
import { Glyph } from './design/Glyph';
import { hit, opacity, radius, space, useTheme } from './design/theme';
import { recentRuns } from './flow-runs';

type RecentRun = Awaited<ReturnType<typeof recentRuns>>['runs'][number];

/** Your own recent workouts across every flow. Private: shown only on your own profile. */
export function ProfileWorkouts({
  onResume,
}: {
  onResume: (run: { kind: 'flow' | 'personal'; flowId: string; title: string }) => void;
}) {
  const { colors: C } = useTheme();
  const [runs, setRuns] = useState<RecentRun[] | null>(null);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancel = false;
    setError(false);
    void recentRuns()
      .then(result => {
        if (!cancel) setRuns(result.runs);
      })
      .catch(() => {
        if (!cancel) setError(true);
      });
    return () => {
      cancel = true;
    };
  }, [reloadKey]);

  const shown = all ? (runs ?? []) : (runs ?? []).slice(0, 5);
  const now = new Date();
  return (
    <View style={{ gap: space.ms }}>
      <SectionHeader title="Your workouts" detail="Only you can see this" />
      {error ? (
        <Button
          title="Couldn't load. Try again"
          variant="text"
          accessibilityLabel="Try loading your workouts again"
          onPress={() => setReloadKey(value => value + 1)}
        />
      ) : runs === null ? (
        <Skeleton shape="line" />
      ) : runs.length === 0 ? (
        <Text variant="subhead" style={{ color: C.muted }}>
          Start a flow and every workout shows up here, with what you logged.
        </Text>
      ) : (
        <View style={{ borderRadius: radius.control, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
          {shown.map((run, runIndex) => {
            const done = run.cards.filter(card => card.status === 'done').length;
            const open = openId === run.id;
            const summary = [
              run.status === 'running'
                ? `${done} of ${run.cards.length} done · In progress`
                : formatRunCount(done, run.cards.length, run.status === 'abandoned'),
              formatKnownTotal(run.cards),
              formatEffort(run.effort),
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <View key={run.id} style={{ borderTopWidth: runIndex ? StyleSheet.hairlineWidth : 0, borderColor: C.line }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${run.title}, ${formatRunWhen(run.startedAt, now)}. ${summary}`}
                  accessibilityState={run.status === 'running' ? undefined : { expanded: open }}
                  // A workout in progress opens straight back into it; any other row shows what was logged.
                  onPress={() => (run.status === 'running' ? onResume(run) : setOpenId(open ? null : run.id))}
                  style={({ pressed }) => ({
                    minHeight: 64,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.ms,
                    paddingHorizontal: space.md,
                    paddingVertical: space.ms,
                    opacity: pressed ? opacity.pressed : 1,
                  })}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                    <Text numberOfLines={1} variant="callout" style={{ color: C.text, fontWeight: '600' }}>
                      {run.title}
                    </Text>
                    <Text numberOfLines={1} variant="footnote" style={{ color: C.muted }}>
                      {formatRunWhen(run.startedAt, now)}
                    </Text>
                    <Text numberOfLines={2} variant="footnote" style={{ color: run.status === 'running' ? C.lime : C.muted }}>
                      {summary}
                    </Text>
                  </View>
                  {run.status === 'running' ? (
                    <View
                      pointerEvents="none"
                      style={{
                        minHeight: 40,
                        paddingHorizontal: space.md,
                        borderRadius: radius.pill,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: C.lime,
                      }}
                    >
                      <Text variant="subhead" style={{ color: C.onAccent, fontWeight: '600' }}>In progress ›</Text>
                    </View>
                  ) : (
                    <Text variant="body" style={{ color: C.muted }}>{open ? '⌃' : '⌄'}</Text>
                  )}
                </Pressable>
                {open ? (
                  <View style={{ paddingHorizontal: space.md, paddingBottom: space.ms, gap: space.sm }}>
                    {run.cards.map(card => {
                      const detail = formatCardDetail(card, card.sets) ?? (card.status === 'pending' ? 'Not reached' : '');
                      return (
                        <View key={card.cardId} style={{ flexDirection: 'row', gap: space.ms }}>
                          {card.status === 'done' ? (
                            <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.lime} size={space.md} />
                          ) : (
                            <Text variant="subhead" style={{ width: 16, color: C.muted }}>·</Text>
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text variant="subhead" style={{ color: C.text }}>{card.title}</Text>
                            {detail ? <Text variant="footnote" style={{ color: C.muted }}>{detail}</Text> : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
          {runs.length > 5 ? (
            <View style={{ alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
              <Button
                title={all ? 'Show fewer' : `Show all ${runs.length}`}
                variant="text"
                accessibilityLabel={all ? 'Show fewer workouts' : 'Show all workouts'}
                onPress={() => setAll(value => !value)}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
