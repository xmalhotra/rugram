import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  formatCardDetail,
  formatCardMark,
  formatEffort,
  formatKnownTotal,
  formatRunCount,
  formatRunWhen,
  type HistoryRun,
} from '../../shared/flow-history';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { space } from './design/tokens';
import { flowRunHistory } from './flow-runs';

export function FlowHistory({
  kind,
  id,
  bottom,
  onResume,
}: {
  kind: 'flow' | 'personal';
  id: string;
  bottom: number;
  onResume: (() => void) | null;
}) {
  const { colors: C } = useTheme();
  const [runs, setRuns] = useState<HistoryRun[] | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setError('');
    void flowRunHistory(kind, id)
      .then(result => {
        if (!cancel) setRuns(result.runs);
      })
      .catch(reason => {
        if (!cancel) {
          setRuns(null);
          setError(reason instanceof Error ? reason.message : 'Try again.');
        }
      });
    return () => {
      cancel = true;
    };
  }, [kind, id, reloadKey]);

  const current = runs?.find(run => run.status === 'running') ?? null;
  const past = runs?.filter(run => run !== current) ?? [];

  return (
    <ScrollView
      style={{ flex: 1, marginHorizontal: -space.lg }}
      contentContainerStyle={{ gap: 22, paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: 32 + bottom }}
    >
      {error ? (
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="alert" style={{ color: C.danger, fontSize: 15 }}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() => setReloadKey(value => value + 1)}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: C.lime, fontSize: 16, fontWeight: '700' }}>Try again</Text>
          </Pressable>
        </View>
      ) : runs === null ? (
        <Text style={{ color: C.muted, fontSize: 16 }}>Loading…</Text>
      ) : runs.length === 0 ? (
        <Text style={{ color: C.muted, fontSize: 16 }}>Nothing here yet. Finish this flow and it shows up here.</Text>
      ) : (
        <>
          {current ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>In progress</Text>
              <Text style={{ color: C.text, fontSize: 16 }}>{formatRunWhen(current.startedAt, new Date())}</Text>
              <Text style={{ color: C.muted, fontSize: 15 }}>
                {formatRunCount(
                  current.cards.filter(card => card.status === 'done').length,
                  current.cards.length,
                )}
              </Text>
              {current.cards.map((card, index) => {
                const pending = current.cards.findIndex(item => item.status === 'pending');
                const mark = formatCardMark(card.status, index === pending);
                const detail = card.status === 'done' ? formatCardDetail(card, card.sets) : null;
                return (
                  <View key={card.cardId} style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ color: C.text, fontSize: 16, flex: 1 }}>{card.title}</Text>
                      {mark === '✓' ? (
                        <Text accessibilityLabel="Done" style={{ color: C.lime, fontSize: 18, fontWeight: '700' }}>
                          ✓
                        </Text>
                      ) : mark ? (
                        <Text style={{ color: mark === 'Up next' ? C.lime : C.muted, fontSize: 13, fontWeight: mark === 'Up next' ? '700' : '400' }}>
                          {mark}
                        </Text>
                      ) : null}
                    </View>
                    {detail ? <Text style={{ color: C.muted, fontSize: 13 }}>{detail}</Text> : null}
                  </View>
                );
              })}
              {onResume ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Resume"
                  onPress={onResume}
                  style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lime }}
                >
                  <Text style={{ color: C.onAccent, fontSize: 18, fontWeight: '700' }}>Resume</Text>
                </Pressable>
              ) : null}
              <Text style={{ color: C.muted, fontSize: 13 }}>Starting again keeps this run here.</Text>
            </View>
          ) : null}
          {past.length ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>Past</Text>
              {past.map(run => {
                const open = openId === run.id;
                const done = run.cards.filter(card => card.status === 'done').length;
                const summary = formatRunCount(done, run.cards.length, run.status === 'abandoned');
                const total = formatKnownTotal(run.cards);
                const when = formatRunWhen(run.startedAt, new Date());
                return (
                  <View key={run.id} style={{ gap: 8 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${when}. ${summary}${total ? `. ${total}` : ''}`}
                      accessibilityState={{ expanded: open }}
                      onPress={() => setOpenId(open ? null : run.id)}
                      style={{ minHeight: 48, justifyContent: 'center', gap: 2 }}
                    >
                      <Text style={{ color: C.text, fontSize: 16 }}>{when}</Text>
                      <Text style={{ color: C.muted, fontSize: 13 }}>
                        {summary}
                        {total ? ` · ${total}` : ''}
                      </Text>
                      {formatEffort(run.effort) ? (
                        <Text style={{ color: C.muted, fontSize: 13 }}>{formatEffort(run.effort)}</Text>
                      ) : null}
                    </Pressable>
                    {open
                      ? run.cards.map(card => {
                          const detail = formatCardDetail(card, card.sets);
                          return (
                            <View key={card.cardId} style={{ gap: 2, paddingLeft: 8 }}>
                              <Text style={{ color: C.text, fontSize: 16 }}>{card.title}</Text>
                              {detail ? <Text style={{ color: C.muted, fontSize: 13 }}>{detail}</Text> : null}
                            </View>
                          );
                        })
                      : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
