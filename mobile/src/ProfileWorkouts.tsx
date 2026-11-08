import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  formatCardDetail,
  formatEffort,
  formatKnownTotal,
  formatRunCount,
  formatRunWhen,
} from '../../shared/flow-history';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
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
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
          Your workouts
        </Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>Only you can see this</Text>
      </View>
      {error ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try loading your workouts again"
          onPress={() => setReloadKey(value => value + 1)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>Couldn't load. Try again</Text>
        </Pressable>
      ) : runs === null ? (
        <Text style={{ color: C.muted, fontSize: 15 }}>Loading…</Text>
      ) : runs.length === 0 ? (
        <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
          Start a flow and every workout shows up here, with what you logged.
        </Text>
      ) : (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
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
              <View key={run.id} style={{ borderTopWidth: runIndex ? 0.5 : 0, borderColor: C.line }}>
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
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text numberOfLines={1} style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
                      {run.title}
                    </Text>
                    <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
                      {formatRunWhen(run.startedAt, now)}
                    </Text>
                    <Text numberOfLines={2} style={{ color: run.status === 'running' ? C.lime : C.muted, fontSize: 13 }}>
                      {summary}
                    </Text>
                  </View>
                  {run.status === 'running' ? (
                    <View
                      pointerEvents="none"
                      style={{
                        minHeight: 40,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: C.lime,
                      }}
                    >
                      <Text style={{ color: C.onAccent, fontSize: 14, fontWeight: '700' }}>In progress ›</Text>
                    </View>
                  ) : (
                    <Text style={{ color: C.muted, fontSize: 18 }}>{open ? '⌃' : '⌄'}</Text>
                  )}
                </Pressable>
                {open ? (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}>
                    {run.cards.map(card => {
                      const detail = formatCardDetail(card, card.sets) ?? (card.status === 'pending' ? 'Not reached' : '');
                      return (
                        <View key={card.cardId} style={{ flexDirection: 'row', gap: 10 }}>
                          <Text style={{ width: 16, color: card.status === 'done' ? C.lime : C.muted, fontSize: 14 }}>
                            {card.status === 'done' ? '✓' : '·'}
                          </Text>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ color: C.text, fontSize: 14 }}>{card.title}</Text>
                            {detail ? <Text style={{ color: C.muted, fontSize: 13 }}>{detail}</Text> : null}
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={all ? 'Show fewer workouts' : 'Show all workouts'}
              onPress={() => setAll(value => !value)}
              style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: 0.5, borderColor: C.line }}
            >
              <Text style={{ color: C.lime, fontSize: 15, fontWeight: '600' }}>{all ? 'Show fewer' : `Show all ${runs.length}`}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
