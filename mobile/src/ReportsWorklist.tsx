import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { reportOutcomes, type MemberReport } from '../../shared/reports';
import { formatDate } from '../../shared/format';
import { api } from './api';
import { Button, Card } from './design/components';
import { Text } from './design/Text';
import { space, useTheme } from './design/theme';
import { useToast } from './design/states';
import { Disclosure } from './Disclosure';
type Worklist = { items: MemberReport[]; total: number; nextCursor: string | null };
export function ReportsWorklist() {
  const { colors: C } = useTheme();
  const toast = useToast();
  const [value, setValue] = useState<Worklist | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load(cursor = '') {
    setBusy(true);
    setError('');
    try {
      const result = await api<Worklist>(
        `/api/mobile/reports?view=open${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      setValue(previous => ({
        ...result,
        items: cursor ? [...(previous?.items ?? []), ...result.items] : result.items,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reports.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function resolve(id: string, outcome: (typeof reportOutcomes)[number]) {
    if (busy) return;
    setBusy(true);
    try {
      await api('/api/mobile/reports', { action: 'resolve', id, outcome });
      toast({ message: 'Report resolved. The reporter has an inbox update.', kind: 'success' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resolve report.');
    } finally {
      setBusy(false);
    }
  }
  const groups = [...new Set(value?.items.map(item => `${item.kind}:${item.itemId}`) ?? [])];
  return (
    <View style={{ gap: space.md }}>
      <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
        Member reports{value ? ` · ${value.total}` : ''}
      </Text>
      <Text style={{ color: C.muted }}>
        Review the item before recording an outcome. Resolving a report does not edit or archive the
        listing.
      </Text>
      {groups.map(key => {
        const rows = value!.items.filter(item => `${item.kind}:${item.itemId}` === key);
        return (
          <Card key={key}>
            <Text variant="headline" style={{ color: C.text }}>{rows[0].title}</Text>
            <Text style={{ color: C.muted }}>
              {rows.length} loaded report{rows.length === 1 ? '' : 's'} · {rows[0].kind}
            </Text>
            {rows.map(item => (
              <Disclosure
                key={item.id}
                title={`${item.reason} · ${formatDate(new Date(item.createdAt))}`}
              >
                <Text style={{ color: C.text }}>{item.note || 'No additional note.'}</Text>
                {reportOutcomes.map(outcome => (
                  <Button
                    key={outcome}
                    title={`Resolve: ${outcome}`}
                    secondary
                    disabled={busy}
                    onPress={() => void resolve(item.id, outcome)}
                  />
                ))}
              </Disclosure>
            ))}
          </Card>
        );
      })}
      {value?.total === 0 && <Text style={{ color: C.muted }}>No open member reports.</Text>}
      {error && (
        <Text accessibilityRole="alert" style={{ color: C.danger }}>
          {error}
        </Text>
      )}
      <Button
        title={busy ? 'Loading…' : 'Refresh reports'}
        secondary
        disabled={busy}
        onPress={() => void load()}
      />
      {value?.nextCursor && (
        <Button
          title="Load more reports"
          secondary
          disabled={busy}
          onPress={() => void load(value.nextCursor!)}
        />
      )}
    </View>
  );
}
