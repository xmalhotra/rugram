import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import { Card } from './design/components';
import { useTheme } from './design/theme';
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
  if (!queue) return <Text style={{ color: C.muted }}>Loading flow requests…</Text>;
  return (
    <View style={{ gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 21, fontWeight: '600' }}>
        Flow requests
      </Text>
      {queue.flows.length ? (
        queue.flows.map(flow => (
          <Card key={flow.catalogFlowId}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>{flow.title}</Text>
            <Text style={{ color: C.muted }}>
              {flow.count} {flow.count === 1 ? 'request' : 'requests'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notify requesters for ${flow.title}`}
              accessibilityState={{ disabled: busyId === flow.catalogFlowId }}
              disabled={busyId === flow.catalogFlowId}
              onPress={() => void notify(flow.catalogFlowId)}
              style={{
                alignSelf: 'flex-start',
                minHeight: 40,
                justifyContent: 'center',
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: C.lime,
                opacity: busyId === flow.catalogFlowId ? 0.5 : 1,
              }}
            >
              <Text style={{ color: C.onAccent, fontWeight: '700' }}>Notify requesters</Text>
            </Pressable>
          </Card>
        ))
      ) : (
        <Text style={{ color: C.muted }}>No one has asked for a catalog flow yet.</Text>
      )}
    </View>
  );
}
