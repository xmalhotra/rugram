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
import { Button, Skeleton } from './design/components';
import { Glyph } from './design/Glyph';
import { hit, space, useTheme } from './design/theme';
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
      contentContainerStyle={{ gap: space.xl, paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xxl + bottom }}
    >
      {error ? (
        <View style={{ gap: space.sm }}>
          <Text accessibilityRole="alert" variant="subhead" style={{ color: C.danger }}>
            {error}
          </Text>
          <Button
            variant="text"
            size="regular"
            title="Try again"
            accessibilityLabel="Try again"
            onPress={() => setReloadKey(value => value + 1)}
          />
        </View>
      ) : runs === null ? (
        <Skeleton shape="line" />
      ) : runs.length === 0 ? (
        <Text variant="callout" style={{ color: C.muted }}>
          Nothing here yet. Finish this flow and it shows up here.
        </Text>
      ) : (
        <>
          {current ? (
            <View style={{ gap: space.ms }}>
              <Text variant="footnote" style={{ color: C.text, fontWeight: '600' }}>
                In progress
              </Text>
              <Text variant="callout" style={{ color: C.text }}>
                {formatRunWhen(current.startedAt, new Date())}
              </Text>
              <Text variant="subhead" style={{ color: C.muted }}>
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
                  <View key={card.cardId} style={{ gap: space.xxs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms }}>
                      <Text variant="callout" style={{ color: C.text, flex: 1 }}>
                        {card.title}
                      </Text>
                      {mark === '✓' ? (
                        <View accessibilityLabel="Done">
                          <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.lime} size={space.md} />
                        </View>
                      ) : mark ? (
                        <Text
                          variant="footnote"
                          style={{
                            color: mark === 'Up next' ? C.lime : C.muted,
                            fontWeight: mark === 'Up next' ? '600' : '400',
                          }}
                        >
                          {mark}
                        </Text>
                      ) : null}
                    </View>
                    {detail ? (
                      <Text variant="footnote" style={{ color: C.muted }}>
                        {detail}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
              {onResume ? (
                <Button title="Resume" accessibilityLabel="Resume" onPress={onResume} />
              ) : null}
              <Text variant="footnote" style={{ color: C.muted }}>
                Starting again keeps this run here.
              </Text>
            </View>
          ) : null}
          {past.length ? (
            <View style={{ gap: space.ms }}>
              <Text variant="footnote" style={{ color: C.text, fontWeight: '600' }}>
                Past
              </Text>
              {past.map(run => {
                const open = openId === run.id;
                const done = run.cards.filter(card => card.status === 'done').length;
                const summary = formatRunCount(done, run.cards.length, run.status === 'abandoned');
                const total = formatKnownTotal(run.cards);
                const when = formatRunWhen(run.startedAt, new Date());
                return (
                  <View key={run.id} style={{ gap: space.sm }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${when}. ${summary}${total ? `. ${total}` : ''}`}
                      accessibilityState={{ expanded: open }}
                      onPress={() => setOpenId(open ? null : run.id)}
                      style={{ minHeight: hit, justifyContent: 'center', gap: space.xxs }}
                    >
                      <Text variant="callout" style={{ color: C.text }}>
                        {when}
                      </Text>
                      <Text variant="footnote" style={{ color: C.muted }}>
                        {summary}
                        {total ? ` · ${total}` : ''}
                      </Text>
                      {formatEffort(run.effort) ? (
                        <Text variant="footnote" style={{ color: C.muted }}>
                          {formatEffort(run.effort)}
                        </Text>
                      ) : null}
                    </Pressable>
                    {open
                      ? run.cards.map(card => {
                          const detail = formatCardDetail(card, card.sets);
                          return (
                            <View key={card.cardId} style={{ gap: space.xxs, paddingLeft: space.sm }}>
                              <Text variant="callout" style={{ color: C.text }}>
                                {card.title}
                              </Text>
                              {detail ? (
                                <Text variant="footnote" style={{ color: C.muted }}>
                                  {detail}
                                </Text>
                              ) : null}
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
