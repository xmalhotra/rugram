import { Pressable, View } from 'react-native';
import { helpsLine, itemForCheck } from '../../shared/daily-flow-item';
import { dailyFlowItems } from '../../shared/daily-flow-item-data';
import { pickList, pickOnItem, type PickCandidate } from '../../shared/daily-flow-picks';
import type { WrittenDayView } from '../../shared/purposes';
import { gymFlowById } from '../../shared/gym-flows';
import { Button, Sheet } from './design/components';
import { ReasonLine } from './design/states';
import { Text } from './design/Text';
import { hit, space, useTheme } from './design/theme';
import { useOutbound } from './OutboundLink';

export function DailyItemFacts({
  id,
  name,
  purposeId,
  pickLabel,
  onSeePicks,
}: {
  id: string;
  name: string;
  purposeId?: string;
  pickLabel?: string;
  onSeePicks?: (category: string) => void;
}) {
  const { colors: C } = useTheme();
  const open = useOutbound();
  const item = itemForCheck(dailyFlowItems, id, name);
  if (!item) return null;
  const helps = helpsLine(item, purposeId);
  return (
    <View style={{ paddingHorizontal: space.md, paddingBottom: space.ms, gap: space.xs }}>
      <Text variant="subhead" style={{ color: C.text }}>
        {item.amount} · {item.timing}
      </Text>
      {helps ? <Text variant="subhead" style={{ color: C.muted }}>{helps}</Text> : null}
      {pickLabel ? <Text variant="subhead" style={{ color: C.text }}>{pickLabel}</Text> : null}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Source, ${item.source.title}`}
        onPress={() => void open(item.source.url)}
        style={{ minHeight: hit, justifyContent: 'center' }}
      >
        <Text variant="subhead" style={{ color: C.lime }}>{item.source.title}</Text>
      </Pressable>
      {item.pickCategory && onSeePicks ? (
        <Button
          variant="text"
          title="See picks"
          accessibilityLabel={`See picks for ${item.name}`}
          onPress={() => onSeePicks(item.pickCategory!)}
        />
      ) : null}
    </View>
  );
}

export function WrittenDayCard({
  day,
  flowTitle,
  purposeId,
  pickLabel,
  onStart,
  onSeePicks,
}: {
  day: WrittenDayView;
  flowTitle: string;
  purposeId?: string;
  pickLabel?: (id: string, name: string) => string | undefined;
  onStart: (id: string, title: string) => void;
  onSeePicks?: (category: string) => void;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ paddingHorizontal: space.md, paddingVertical: space.ms, gap: space.sm }}>
      <Text variant="footnote" style={{ color: C.muted }}>{day.slot}</Text>
      <Text variant="headline" style={{ color: C.text }}>{flowTitle}</Text>
      <ReasonLine>Written for {day.purposeName}. You can swap it.</ReasonLine>
      <Button
        variant="text"
        title="Start"
        accessibilityLabel={`Start ${flowTitle}`}
        onPress={() => onStart(day.flowId, flowTitle)}
      />
      {day.items.map(item => (
        <View key={item.id} style={{ marginHorizontal: -space.md }}>
          <Text variant="callout" style={{ color: C.text, fontWeight: '600', paddingHorizontal: space.md }}>{item.name}</Text>
          <DailyItemFacts
            id={item.id}
            name={item.name}
            purposeId={purposeId}
            pickLabel={pickLabel?.(item.id, item.name)}
            onSeePicks={onSeePicks}
          />
        </View>
      ))}
    </View>
  );
}

export function flowTitleFor(flowId: string, titles: readonly { id: string; title: string }[]) {
  return titles.find(flow => flow.id === flowId)?.title ?? gymFlowById(flowId)?.title ?? flowId;
}

export function ItemPicksSheet({
  category,
  products,
  savedIds,
  boughtIds,
  onClose,
}: {
  category: string;
  products: readonly PickCandidate[];
  savedIds: readonly string[];
  boughtIds: readonly string[];
  onClose: () => void;
}) {
  const { colors: C } = useTheme();
  const open = useOutbound();
  const item = dailyFlowItems.find(row => row.pickCategory === category);
  const list = pickList({ pickCategory: category }, products);
  return (
    <Sheet title={item ? `${item.name} picks` : 'Picks'} presentation="modal" onClose={onClose}>
      <ReasonLine>{list.criteria.join(' · ')}</ReasonLine>
      <ReasonLine>{list.placement}</ReasonLine>
      {list.picks.map(row => {
        const held = pickOnItem({ pickCategory: category }, products, savedIds, boughtIds);
        const mark = held?.id === row.product.id ? held.how : '';
        return (
          <View key={row.product.id} style={{ paddingVertical: space.sm, gap: space.xs }}>
            <Text variant="headline" style={{ color: C.text }}>
              {row.product.title}
              {mark ? ` · ${mark}` : ''}
            </Text>
            {row.reasons.map(reason => (
              <Text key={reason} variant="subhead" style={{ color: C.muted }}>
                {reason}
              </Text>
            ))}
            {row.product.url ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open the listing for ${row.product.title}`}
                onPress={() => void open(row.product.url)}
                style={{ minHeight: hit, justifyContent: 'center' }}
              >
                <Text variant="subhead" style={{ color: C.lime, fontWeight: '600' }}>Open listing</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {list.picks.length === 0 ? <ReasonLine>No brands are in the catalogue for this yet.</ReasonLine> : null}
    </Sheet>
  );
}
