import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { Text } from './design/Text';
import type { CityEvent } from '../../shared/mobile';
import type { EventRegistrationView, HostedEventAction } from '../../shared/event-registration';
import { registrationPresentation } from '../../shared/event-presentation';
import { api } from './api';
import { useSession } from './session';
import { Badge, Button, Card, Choice } from './design/components';
import { radius, space, useTheme } from './design/theme';
import { Disclosure } from './Disclosure';
import { EventHosts } from './EventHosts';
import { AddToCalendar } from './AddToCalendar';

export function EventRegistrationPanel({
  event,
  showHosts = true,
}: {
  event: CityEvent;
  showHosts?: boolean;
}) {
  return <RegistrationSession key={event.id} event={event} showHosts={showHosts} />;
}
function RegistrationSession({ event, showHosts }: { event: CityEvent; showHosts: boolean }) {
  const { colors: C } = useTheme();
  const { data, refresh } = useSession();
  const [value, setValue] = useState<EventRegistrationView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const revision = useRef(0);
  const [now, setNow] = useState(Date.now());
  const [guestFilter, setGuestFilter] = useState('Pending');
  const copy = { color: C.muted } as const;
  const heading = { color: C.text } as const;
  const load = useCallback(async () => {
    if (event.registrationMode !== 'approval') return;
    const request = ++revision.current;
    setBusy(true);
    setError('');
    try {
      const result = await api<EventRegistrationView>(
        '/api/mobile/registrations?eventId=' + encodeURIComponent(event.id),
      );
      if (request === revision.current) setValue(result);
    } catch (e) {
      if (request === revision.current)
        setError(e instanceof Error ? e.message : 'Could not load registration.');
    } finally {
      if (request === revision.current) setBusy(false);
    }
  }, [event.id, event.registrationMode]);
  useEffect(() => {
    setValue(null);
    setConfirming(false);
    void load();
    return () => {
      revision.current++;
    };
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  async function act(
    action: 'request' | 'cancel' | 'approve' | 'decline' | HostedEventAction,
    guestId?: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError('');
    const request = ++revision.current;
    try {
      const result = await api<EventRegistrationView>('/api/mobile/registrations', {
        action,
        eventId: event.id,
        ...(guestId ? { guestId } : {}),
      });
      if (request === revision.current) {
        setValue(result);
        setConfirming(false);
      }
      await refresh();
    } catch (e) {
      if (request === revision.current)
        setError(e instanceof Error ? e.message : 'Could not update registration.');
    } finally {
      if (request === revision.current) setBusy(false);
    }
  }
  if (event.registrationMode !== 'approval') return showHosts ? <EventHosts event={event} /> : null;
  const currentEvent = {
    ...event,
    status: value?.eventStatus ?? event.status,
    registrationStatus: value?.registrationStatus ?? event.registrationStatus,
  };
  const state = value ? registrationPresentation(currentEvent, value, now) : null;
  const capacity = value?.capacity ?? event.guestCapacity ?? 0;
  const approved = value?.approvedCount ?? 0;
  const visibleRequests =
    value?.requests.filter(guest =>
      guestFilter === 'Pending'
        ? guest.status === 'pending'
        : guestFilter === 'Going'
          ? guest.status === 'approved'
          : ['cancelled', 'declined'].includes(guest.status),
    ) ?? [];
  return (
    <View style={{ gap: space.lg }}>
      {showHosts && <EventHosts event={event} />}
      {event.simulation && <Badge>DEMO EVENT · no real ticket or booking</Badge>}
      <Card>
        <Badge>{value?.canManage ? 'HOST WORKSPACE · FREE EVENT' : 'REGISTRATION · FREE'}</Badge>
        {value && (
          <View style={{ gap: space.sm }}>
            <Text variant="section" style={heading}>
              {approved} / {capacity} places confirmed
            </Text>
            <View
              style={{ height: 5, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}
            >
              <View
                style={{
                  height: 5,
                  width: `${capacity ? Math.min(100, (approved / capacity) * 100) : 0}%`,
                  backgroundColor: C.lime,
                }}
              />
            </View>
            <Text variant="footnote" style={copy}>
              {Math.max(0, capacity - approved)} places remaining · pending requests do not reserve
              a place
            </Text>
          </View>
        )}
        {!value && !error && (
          <View style={{ flexDirection: 'row', gap: space.ms, alignItems: 'center', minHeight: 48 }}>
            <ActivityIndicator color={C.lime} />
            <Text variant="callout" style={copy}>Checking your place…</Text>
          </View>
        )}
        {value && state && !value.canManage && (
          <>
            <Text
              accessibilityLiveRegion="polite"
              variant="section"
              style={{ ...heading, color: state.title === 'You’re going' ? C.lime : C.text }}
            >
              {state.title}
            </Text>
            <Text variant="callout" style={copy}>{state.detail}</Text>
            {confirming && state.canRequest ? (
              <>
                <Text variant="section" style={heading}>Your request</Text>
                <Text variant="callout" style={copy}>{data?.user.name ?? 'Your signed-in profile'}</Text>
                <Text variant="callout" style={copy}>
                  If approved, your display name is visible to other approved guests. Your phone
                  number stays private.
                </Text>
                <Button
                  title={busy ? 'Sending…' : 'Send request'}
                  disabled={busy}
                  onPress={() => void act('request')}
                />
                <Button
                  title="Not now"
                  secondary
                  disabled={busy}
                  onPress={() => setConfirming(false)}
                />
              </>
            ) : (
              state.canRequest && (
                <Button title={state.action} disabled={busy} onPress={() => setConfirming(true)} />
              )
            )}
            {state.canCancel && (
              <Button
                title={value.ownStatus === 'pending' ? 'Withdraw request' : 'Cancel registration'}
                secondary
                disabled={busy}
                onPress={() =>
                  Alert.alert(
                    value.ownStatus === 'pending' ? 'Withdraw your request?' : 'Cancel your place?',
                    'Your request or place will be removed, and guest names will no longer be visible.',
                    [
                      { text: 'Keep it', style: 'cancel' },
                      {
                        text: 'Confirm cancellation',
                        style: 'destructive',
                        onPress: () => void act('cancel'),
                      },
                    ],
                  )
                }
              />
            )}
          </>
        )}
        {error && (
          <>
            <Text accessibilityRole="alert" variant="callout" style={{ ...copy, color: C.danger }}>
              {error}
            </Text>
            <Button title="Try again" secondary disabled={busy} onPress={() => void load()} />
          </>
        )}
      </Card>
      {value && (
        <>
          {(value.ownStatus === 'approved' || value.canManage) && (
            <AddToCalendar event={currentEvent} />
          )}
          <Disclosure title={'Guests · ' + (value.approvedCount ?? 0) + ' going'}>
            {value.canViewAttendees ? (
              value.guests.length ? (
                value.guests.map(guest => (
                  <View
                    key={guest.id}
                    style={{ minHeight: 48, flexDirection: 'row', gap: space.ms, alignItems: 'center' }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: radius.pill,
                        backgroundColor: C.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: C.lime, fontWeight: '600' }}>
                        {guest.name.slice(0, 1)}
                      </Text>
                    </View>
                    <Text variant="callout" style={{ color: C.text, flex: 1 }}>{guest.name}</Text>
                  </View>
                ))
              ) : (
                <Text variant="callout" style={copy}>You’ll see guests here once places are confirmed.</Text>
              )
            ) : (
              <Text variant="callout" style={copy}>Guest names unlock after the host approves you.</Text>
            )}
            <Badge>Confirmed registrations, not checked-in attendance.</Badge>
          </Disclosure>
          {value.canManage && (
            <Disclosure
              title={
                'Manage guests · ' +
                (value.pendingCount ??
                  value.requests.filter(guest => guest.status === 'pending').length) +
                ' pending'
              }
            >
              <Choice
                label="Guest list"
                value={guestFilter}
                options={['Pending', 'Going', 'Not going']}
                onChange={setGuestFilter}
              />
              {visibleRequests.length === 0 && <Text variant="callout" style={copy}>No guests in this group.</Text>}
              {visibleRequests.map(guest => (
                <Card key={guest.id}>
                  <Text variant="section" style={heading}>{guest.name}</Text>
                  <Badge>{guest.status}</Badge>
                  {guest.status === 'pending' && (
                    <Button
                      title="Approve"
                      disabled={
                        busy ||
                        currentEvent.status !== 'published' ||
                        Date.parse(event.startsAt) <= now ||
                        currentEvent.registrationStatus === 'Cancelled' ||
                        approved >= capacity
                      }
                      onPress={() => void act('approve', guest.id)}
                    />
                  )}
                  {['pending', 'approved'].includes(guest.status) && (
                    <Button
                      title={guest.status === 'approved' ? 'Remove place' : 'Decline'}
                      secondary
                      disabled={busy}
                      onPress={() =>
                        Alert.alert(
                          'Update this guest?',
                          guest.name + ' will no longer have an approved place.',
                          [
                            { text: 'Keep', style: 'cancel' },
                            {
                              text: 'Confirm',
                              style: 'destructive',
                              onPress: () => void act('decline', guest.id),
                            },
                          ],
                        )
                      }
                    />
                  )}
                </Card>
              ))}
            </Disclosure>
          )}
          {value.canManage && (
            <Disclosure title="Event controls">
              <Text variant="callout" style={copy}>
                {currentEvent.status === 'pending'
                  ? 'Awaiting admin publication. Guest registration opens only after approval.'
                  : currentEvent.registrationStatus === 'Cancelled'
                    ? 'This event is cancelled. Registration is disabled.'
                    : 'Closing registration keeps existing places. Cancelling the event stops all new requests and approvals.'}
              </Text>
              {currentEvent.status === 'published' &&
                currentEvent.registrationStatus !== 'Cancelled' &&
                Date.parse(event.startsAt) > now && (
                  <>
                    <Button
                      title={
                        currentEvent.registrationStatus === 'Closed'
                          ? 'Reopen registration'
                          : 'Close registration'
                      }
                      secondary
                      disabled={busy}
                      onPress={() =>
                        void act(
                          currentEvent.registrationStatus === 'Closed'
                            ? 'reopen-event'
                            : 'close-event',
                        )
                      }
                    />
                    <Button
                      title="Cancel event"
                      secondary
                      destructive
                      disabled={busy}
                      onPress={() =>
                        Alert.alert(
                          'Cancel this event?',
                          'This cannot be reopened here. Registration stops; existing records are retained. No email or SMS notifications are sent yet.',
                          [
                            { text: 'Keep event', style: 'cancel' },
                            {
                              text: 'Cancel event',
                              style: 'destructive',
                              onPress: () => void act('cancel-event'),
                            },
                          ],
                        )
                      }
                    />
                  </>
                )}
            </Disclosure>
          )}
          <Button
            title={busy ? 'Updating…' : 'Check for updates'}
            secondary
            disabled={busy}
            onPress={() => void load()}
          />
        </>
      )}
    </View>
  );
}
