import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { reportReasons, type MemberReport } from '../../shared/reports';
import { formatDate } from '../../shared/format';
import { api } from './api';
import { Button, Chip, Field } from './design/components';
import { Text } from './design/Text';
import { Disclosure } from './Disclosure';
import { useTheme } from './design/theme';
import { useToast } from './design/states';
export function ReportIssue({ kind, itemId }: { kind: 'pick' | 'event'; itemId: string }) {
  const { colors: C } = useTheme();
  const toast = useToast();
  const [report, setReport] = useState<MemberReport | null>(null);
  const [reason, setReason] = useState<(typeof reportReasons)[number]>('Wrong price');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  async function load() {
    const request = ++revision.current;
    setError('');
    setReady(false);
    try {
      const result = await api<{ report: MemberReport | null }>(
        `/api/mobile/reports?kind=${kind}&itemId=${encodeURIComponent(itemId)}`,
      );
      if (request === revision.current) {
        setReport(result.report);
        setReady(true);
      }
    } catch (e) {
      if (request === revision.current)
        setError(e instanceof Error ? e.message : 'Could not load report status.');
    }
  }
  useEffect(() => {
    setReport(null);
    setNote('');
    setReason(kind === 'event' ? 'Wrong date/venue' : 'Wrong price');
    void load();
    return () => {
      revision.current++;
    };
  }, [kind, itemId]);
  async function submit() {
    if (busy || !ready) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ report: MemberReport }>('/api/mobile/reports', {
        action: 'create',
        kind,
        itemId,
        reason,
        note,
      });
      setReport(result.report);
      toast({ kind: 'success', message: 'Thanks — our team will re-check this.' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send report.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Disclosure title="Report an issue">
      <View style={{ gap: 12 }}>
        {report ? (
          <>
            <Text style={{ color: C.muted }}>
              You reported this on {formatDate(new Date(report.createdAt))}.
            </Text>
            {report.outcome && <Text style={{ color: C.text }}>Reviewed: {report.outcome}</Text>}
          </>
        ) : ready ? (
          <>
            <Text style={{ color: C.muted }}>Your identity is not shared with creators.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {reportReasons.map(value => (
                <Chip
                  key={value}
                  title={value}
                  active={reason === value}
                  onPress={() => setReason(value)}
                />
              ))}
            </View>
            <Field
              label="Optional note"
              value={note}
              onChange={value => setNote(value.replace(/[\r\n]/g, ' ').slice(0, 200))}
              maxLength={200}
            />
            <Button
              title={busy ? 'Sending…' : 'Send report'}
              disabled={busy}
              onPress={() => void submit()}
            />
          </>
        ) : !error ? (
          <Text style={{ color: C.muted }}>Checking report status…</Text>
        ) : null}
        {error && (
          <>
            <Text accessibilityRole="alert" style={{ color: C.danger }}>
              {error}
            </Text>
            {!ready && <Button title="Retry" secondary onPress={() => void load()} />}
          </>
        )}
      </View>
    </Disclosure>
  );
}
