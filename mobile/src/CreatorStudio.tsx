import { formatDate } from '../../shared/format';
import React from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { Text } from './design/Text';
import { Button, Heading, Card, Badge } from './design/components';
import { space, useTheme } from './design/theme';
import type { CityEvent, Product, MobilePayload } from '../../shared/mobile';
type Props = {
  data: MobilePayload;
  busy: boolean;
  startEditor: (kind: 'product' | 'event' | 'endorse') => void;
  startEventEditor: () => void;
  setSelectedEvent: (event: CityEvent) => void;
  onEdit: (item: Product | CityEvent) => void;
  onWithdraw: (id: string) => Promise<boolean>;
};
export function CreatorStudio({
  data,
  busy,
  startEditor,
  startEventEditor,
  setSelectedEvent,
  onEdit,
  onWithdraw,
}: Props) {
  const { colors: C } = useTheme();
  const s = StyleSheet.create({
    h2: {
      color: C.text,
      marginVertical: space.xs,
    },
    copy: { color: C.muted, marginVertical: space.xs },
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.sm,
      paddingVertical: space.xs,
    },
    section: { color: C.text, marginTop: space.md },
  });
  return (
    <>
      <Heading
        eyebrow="CREATOR STUDIO"
        title="Share what works."
        copy="Submit useful products and bring your community together. Add source links when you vouch for a product."
      />
      <Card>
        <Text variant="heading" style={s.h2}>
          Events · {data.creatorEventQuota?.used ?? 0} / {data.creatorEventQuota?.limit ?? 2}{' '}
          submitted this month
        </Text>
        <Text variant="body" style={s.copy}>
          {data.creatorEventQuota?.remaining ?? 0} remaining. Resets{' '}
          {data.creatorEventQuota
            ? formatDate(new Date(data.creatorEventQuota.resetsAt), {
                timeZone: 'Asia/Kolkata',
              })
            : 'next month'}{' '}
          IST. Every submission needs admin approval.
        </Text>
      </Card>
      <View style={s.wrap}>
        <Button title="Submit product" onPress={() => startEditor('product')} />
        <Button
          title="Host an event"
          secondary
          disabled={busy || !data.creatorEventQuota?.remaining}
          onPress={() => startEventEditor()}
        />
      </View>
      <Text variant="section" style={s.section}>Your submissions</Text>
      {[...data.products, ...data.events]
        .filter(item => item.createdBy === data.user.id)
        .map(item => (
          <Card key={item.id}>
            <Badge>
              {item.withdrawnAt
                ? 'Withdrawn'
                : item.status === 'pending'
                  ? 'In review'
                  : item.status === 'archived'
                    ? 'Needs changes'
                    : 'Live'}
            </Badge>
            <Text variant="heading" style={s.h2}>{item.title}</Text>
            {item.reviewNote && <Text variant="body" style={s.copy}>{item.reviewNote}</Text>}
            {item.status === 'pending' && (
              <>
                <Button
                  title="Edit submission"
                  secondary
                  disabled={busy}
                  onPress={() => onEdit(item)}
                />
                <Button
                  title="Withdraw"
                  secondary
                  destructive
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      'Withdraw this submission?',
                      'It will not be published. Event submissions still count towards this month’s allowance.',
                      [
                        { text: 'Keep in review', style: 'cancel' },
                        {
                          text: 'Withdraw',
                          style: 'destructive',
                          onPress: () => void onWithdraw(item.id),
                        },
                      ],
                    )
                  }
                />
              </>
            )}
            {'city' in item && (
              <Button
                title="View event & manage registrations"
                secondary
                onPress={() => setSelectedEvent(item)}
              />
            )}
          </Card>
        ))}
      <Text variant="body" style={s.copy}>
        Your submissions appear here while an admin reviews them. Open a published product in Picks
        to add your backing.
      </Text>
    </>
  );
}
