import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from './design/Text';
import { Button, Card, SectionHeader, Skeleton } from './design/components';
import { space, useTheme } from './design/theme';
import { useToast } from './design/states';
import { flowInterestAdmin, notifyCatalogFlow, type FlowInterestAdmin } from './flow-interest';

export function FlowRequestAdmin() {
  const { colors: C } = useTheme();
  const toast = useToast();
  const [queue, setQueue] = useState<FlowInterestAdmin | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  async function load() {
    try {
      setQueue(await flowInterestAdmin());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load flow requests.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function notify(catalogFlowId: string) {
    setBusyId(catalogFlowId);
    try {
      const result = await notifyCatalogFlow(catalogFlowId);
      toast({
        message: result.notified
          ? `Notified ${result.notified} ${result.notified === 1 ? 'person' : 'people'}`
          : 'No new requesters to notify',
        kind: 'success',
      });
    } catch (cause) {
      toast({
        message: cause instanceof Error ? cause.message : 'Could not notify requesters.',
        kind: 'error',
      });
    } finally {
      setBusyId('');
    }
  }
  if (error)
    return (
      <Text accessibilityRole="alert" style={{ color: C.danger }}>
        {error}
      </Text>
    );
  if (!queue) return <Skeleton shape="block" />;
  return (
    <View style={{ gap: space.md }}>
      <SectionHeader title="Flow requests" />
      {queue.flows.length ? (
        queue.flows.map(flow => (
          <Card key={flow.catalogFlowId}>
            <Text variant="headline" style={{ color: C.text }}>
              {flow.title}
            </Text>
            <Text style={{ color: C.muted }}>
              {flow.count} {flow.count === 1 ? 'request' : 'requests'}
            </Text>
            <Button
              title="Notify requesters"
              accessibilityLabel={`Notify requesters for ${flow.title}`}
              disabled={busyId === flow.catalogFlowId}
              fit
              size="regular"
              onPress={() => void notify(flow.catalogFlowId)}
            />
          </Card>
        ))
      ) : (
        <Text style={{ color: C.muted }}>No one has asked for a catalog flow yet.</Text>
      )}
    </View>
  );
}
