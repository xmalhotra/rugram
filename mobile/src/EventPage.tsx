import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { CityEvent } from '../../shared/mobile';
import type { EventQuestion, EventRegistrationView } from '../../shared/event-registration';
import { formatDate } from '../../shared/format';
import { eventMapsUrl, locationMapsUrl } from '../../shared/event-maps';
import { api } from './api';
import MapView, { Marker } from 'react-native-maps';
import { DetailSurface } from './design/DetailSurface';
import { ScreenBackground } from './design/ScreenBackground';
import { PageBar } from './design/PageBar';
import { Text } from './design/Text';
import { hit, opacity, radius, space, stroke, textRoles, useTheme } from './design/theme';
import { Button, SectionHeader, Skeleton, useToast } from './design/components';

type RegistrationAction = {
  action: 'request' | 'cancel' | 'approve' | 'decline';
  eventId: string;
  guestId?: string;
  answers?: Record<string, string>;
};

/** A Luma-style event page: cover, registration, guests, and host tools. */
export function EventPage(props: {
  event: CityEvent;
  isHost: boolean;
  onClose: () => void;
  onShare: () => void;
  onLink: (url: string) => void;
}) {
  const { event, isHost, onClose, onShare, onLink } = props;
  const { colors: C } = useTheme();
  const toast = useToast();
  const [view, setView] = useState<EventRegistrationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const hostName = event.organizers?.[0]?.name ?? 'Qram';
  const mapsUrl = event.location ? locationMapsUrl(event.location) : eventMapsUrl(event);
  const lat = event.location?.lat;
  const lng = event.location?.lng;
  // Apple Maps on iPhone (Google on Android) draws the pin without any API key.
  const hasPoint = typeof lat === 'number' && typeof lng === 'number';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setView(
        await api<EventRegistrationView>(
          `/api/mobile/registrations?eventId=${encodeURIComponent(event.id)}`,
        ),
      );
    } catch (reason) {
      toast({
        kind: 'error',
        message: reason instanceof Error ? reason.message : 'Try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [event.id, toast]);

  useEffect(() => {
    void load();
  }, [load]);


  async function submit(body: RegistrationAction) {
    setBusy(true);
    try {
      setView(await api<EventRegistrationView>('/api/mobile/registrations', body));
    } catch (reason) {
      toast({
        kind: 'error',
        message: reason instanceof Error ? reason.message : 'Try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  function register() {
    const given: Record<string, string> = {};
    for (const [id, value] of Object.entries(answers)) {
      const trimmed = value.trim();
      if (trimmed) given[id] = trimmed;
    }
    void submit({ action: 'request', eventId: event.id, answers: given });
  }

  function confirmCancel() {
    Alert.alert('Cancel registration', 'Cancel your registration for this event?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel registration',
        style: 'destructive',
        onPress: () => {
          void submit({ action: 'cancel', eventId: event.id });
        },
      },
    ]);
  }

  const month = formatDate(event.startsAt, { month: 'short' }).toUpperCase();
  const day = formatDate(event.startsAt, { day: 'numeric' });
  const when = formatDate(event.startsAt, { weekday: 'long', day: 'numeric', month: 'long' });
  const startTime = formatDate(event.startsAt, { hour: 'numeric', minute: '2-digit' });
  const endTime = event.endsAt
    ? formatDate(event.endsAt, { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <DetailSurface onClose={onClose} fullScreen presentation="inline">
      <ScreenBackground />
      <PageBar
        title=""
        onBack={onClose}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share"
            onPress={onShare}
            hitSlop={8}
            style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="section" style={{ color: C.text }}>···</Text>
          </Pressable>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 140 }}
      >
        <View
          style={{
            height: 200,
            borderRadius: radius.card,
            backgroundColor: C.card,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: radius.pill,
              backgroundColor: C.lime,
              opacity: 0.18,
              top: -70,
              right: -50,
            }}
          />
          {event.topic ? (
            <Text
              variant="footnote"
              style={{
                position: 'absolute',
                top: space.md,
                left: space.md,
                color: C.lime,
                fontWeight: '600',
              }}
            >
              {event.topic === 'Other' && event.topicLabel ? event.topicLabel : event.topic}
            </Text>
          ) : null}
        </View>

        <Text
          accessibilityRole="header"
          accessibilityLabel={isHost ? `${event.title}. You manage this event.` : event.title}
          variant="title"
          style={{ color: C.text, marginTop: space.md }}
        >
          {event.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, marginTop: space.ms }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              backgroundColor: C.card,
              borderWidth: stroke.line,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.text, fontWeight: '600' }}>
              {hostName.trim().charAt(0).toUpperCase() || 'Q'}
            </Text>
          </View>
          <Text variant="subhead" style={{ color: C.muted, flex: 1 }}>Hosted by {hostName}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.ms, marginTop: space.lg }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.small,
              backgroundColor: C.card,
              borderWidth: stroke.line,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="caption" style={{ color: C.lime, fontWeight: '600' }}>{month}</Text>
            <Text variant="headline" style={{ color: C.text }}>
              {day}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{when}</Text>
            <Text variant="subhead" style={{ color: C.muted, marginTop: space.xxs }}>
              {endTime ? `${startTime} – ${endTime}` : startTime}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${event.location?.name ?? event.venue} in maps`}
          disabled={!mapsUrl}
          onPress={() => {
            if (mapsUrl) onLink(mapsUrl);
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.ms,
            marginTop: space.md,
            opacity: pressed ? opacity.pressed : 1,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.small,
              backgroundColor: C.card,
              borderWidth: stroke.line,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="section" style={{ color: C.text }}>⌖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="callout" style={{ color: C.text, fontWeight: '600' }} numberOfLines={1}>
              {event.location?.name ?? event.venue}
            </Text>
            <Text variant="subhead" style={{ color: C.muted, marginTop: space.xxs }} numberOfLines={2}>
              {event.location?.address ?? event.city}
            </Text>
          </View>
        </Pressable>
        {hasPoint ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open the location in Maps"
            onPress={() => mapsUrl && onLink(mapsUrl)}
            style={{ height: 160, borderRadius: radius.control, overflow: 'hidden', marginTop: space.ms }}
          >
            <MapView
              key={`${lat},${lng}`}
              pointerEvents="none"
              style={{ flex: 1 }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              userInterfaceStyle="dark"
              initialRegion={{
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={{ latitude: lat, longitude: lng }} />
            </MapView>
          </Pressable>
        ) : null}

        {loading || view ? (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: radius.card,
              padding: space.md,
              marginTop: space.xl,
            }}
          >
            {loading && !view ? <Skeleton shape="line" /> : null}
            {view ? (
              <RegistrationCard
                event={event}
                view={view}
                busy={busy}
                answers={answers}
                onAnswer={(id, value) => setAnswers(current => ({ ...current, [id]: value }))}
                onRegister={register}
                onCancel={confirmCancel}
                onLeave={() => void submit({ action: 'cancel', eventId: event.id })}
                onLink={onLink}
              />
            ) : null}
          </View>
        ) : null}

        {view && view.guests.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xl }}>
            {view.guests.slice(0, 8).map((guest, index) => (
              <View
                key={guest.id}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.pill,
                  marginLeft: index === 0 ? 0 : -space.ms,
                  backgroundColor: C.line,
                  borderWidth: stroke.active,
                  borderColor: C.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="footnote" style={{ color: C.text, fontWeight: '600' }}>
                  {guest.name.trim().charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            ))}
            <Text variant="subhead" style={{ color: C.muted, marginLeft: space.ms }}>
              {view.approvedCount ?? view.guests.length} going
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: space.xl }}>
          <SectionHeader title="About event" />
        </View>
        <Text variant="callout" style={{ color: C.muted, marginTop: space.sm }}>
          {event.description}
        </Text>

        {view?.canManage ? (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: radius.card,
              padding: space.md,
              marginTop: space.xl,
              gap: space.md,
            }}
          >
            <SectionHeader title="Manage" />
            {view.answerTally?.map(tally => (
              <View key={tally.questionId} style={{ gap: space.xs }}>
                <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
                  {tally.label}
                </Text>
                {Object.entries(tally.counts).map(([option, count]) => (
                  <Text key={option} variant="subhead" style={{ color: C.muted }}>
                    {option} · {count}
                  </Text>
                ))}
              </View>
            ))}
            {view.requests.map(guest => (
              <View
                key={guest.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}
              >
                <Text variant="subhead" style={{ color: C.text, flexGrow: 1 }} numberOfLines={1}>
                  {guest.name}
                </Text>
                <StatusPill status={guest.status} />
                {guest.status === 'pending' ? (
                  <>
                    <MiniAction
                      label="Approve"
                      color={C.lime}
                      disabled={busy}
                      onPress={() =>
                        void submit({ action: 'approve', eventId: event.id, guestId: guest.id })
                      }
                    />
                    <MiniAction
                      label="Decline"
                      color={C.danger}
                      disabled={busy}
                      onPress={() =>
                        void submit({ action: 'decline', eventId: event.id, guestId: guest.id })
                      }
                    />
                  </>
                ) : null}
                {guest.status === 'approved' ? (
                  <MiniAction
                    label="Remove"
                    color={C.danger}
                    disabled={busy}
                    onPress={() =>
                      void submit({ action: 'decline', eventId: event.id, guestId: guest.id })
                    }
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </DetailSurface>
  );
}

function RegistrationCard({
  event,
  view,
  busy,
  answers,
  onAnswer,
  onRegister,
  onCancel,
  onLeave,
  onLink,
}: {
  event: CityEvent;
  view: EventRegistrationView;
  busy: boolean;
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
  onRegister: () => void;
  onCancel: () => void;
  onLeave: () => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const approved = view.approvedCount ?? 0;
  const capacity = view.capacity ?? event.guestCapacity ?? event.capacity;
  const remaining = capacity - approved;
  const full = remaining <= 0;
  const waitlistCount = view.waitlistCount ?? 0;
  const headline = `${approved} going${full ? ' · Full' : ` · ${remaining} spots left`}${
    waitlistCount > 0 ? ` · ${waitlistCount} on waitlist` : ''
  }`;

  return (
    <View style={{ gap: space.ms }}>
      <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{headline}</Text>
      {view.mode === 'external' ? (
        <LimeButton
          label="Register on organiser site ↗"
          disabled={busy || !event.registrationUrl}
          onPress={() => {
            if (event.registrationUrl) onLink(event.registrationUrl);
          }}
        />
      ) : view.ownStatus === 'approved' ? (
        <View style={{ gap: space.ms }}>
          <Text variant="callout" style={{ color: C.lime, fontWeight: '600' }}>
            ✓ You&apos;re going
          </Text>
          <SecondaryButton label="Cancel registration" disabled={busy} onPress={onCancel} />
        </View>
      ) : view.ownStatus === 'waitlisted' ? (
        <View style={{ gap: space.sm }}>
          <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>
            You&apos;re #{view.waitlistPosition ?? 1} on the waitlist
          </Text>
          <Text variant="subhead" style={{ color: C.muted }}>
            We&apos;ll notify you if a seat opens
          </Text>
          <SecondaryButton label="Leave waitlist" disabled={busy} onPress={onLeave} />
        </View>
      ) : view.ownStatus === 'pending' ? (
        <View style={{ gap: space.ms }}>
          <Text variant="callout" style={{ color: C.info, fontWeight: '600' }}>
            Request sent · waiting for the host
          </Text>
          <SecondaryButton label="Withdraw request" disabled={busy} onPress={onLeave} />
        </View>
      ) : (
        <View style={{ gap: space.ms }}>
          {view.ownStatus === 'declined' ? (
            <Text variant="subhead" style={{ color: C.danger }}>The host declined your request</Text>
          ) : null}
          {(event.questions ?? []).map(question => (
            <QuestionField
              key={question.id}
              question={question}
              value={answers[question.id] ?? ''}
              onChange={value => onAnswer(question.id, value)}
            />
          ))}
          <LimeButton
            label={
              full && event.waitlist
                ? 'Join waitlist'
                : full
                  ? 'Event is full'
                  : view.requireApproval
                    ? 'Request to join'
                    : 'Register'
            }
            disabled={busy || (full && !event.waitlist)}
            onPress={onRegister}
          />
        </View>
      )}
    </View>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: EventQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>{question.label}</Text>
      {question.kind === 'choice' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(question.options ?? []).map(option => {
            const selected = value === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${option}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(option)}
                style={{
                  paddingHorizontal: space.ms,
                  paddingVertical: space.sm,
                  borderRadius: radius.control,
                  borderWidth: stroke.line,
                  borderColor: selected ? C.lime : C.line,
                  backgroundColor: selected ? C.lime : 'transparent',
                }}
              >
                <Text
                  variant="subhead"
                  style={{
                    color: selected ? C.onAccent : C.text,
                    fontWeight: '600',
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChange}
          maxLength={200}
          multiline
          placeholder="Your answer"
          placeholderTextColor={C.muted}
          accessibilityLabel={question.label}
          style={{
            color: C.text,
            borderWidth: stroke.line,
            borderColor: C.line,
            borderRadius: radius.small,
            paddingHorizontal: space.ms,
            paddingVertical: space.ms,
            minHeight: hit,
            fontSize: textRoles.callout.fontSize,
          }}
        />
      )}
    </View>
  );
}

function LimeButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      title={label}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
    />
  );
}

function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radius.control,
        borderWidth: stroke.line,
        borderColor: C.line,
        paddingVertical: space.ms,
        alignItems: 'center',
        opacity: disabled ? 0.5 : pressed ? opacity.pressed : 1,
      })}
    >
      <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function StatusPill({ status }: { status: string }) {
  const { colors: C } = useTheme();
  const color =
    status === 'approved'
      ? C.lime
      : status === 'declined'
        ? C.danger
        : status === 'pending'
          ? C.info
          : C.muted;
  return (
    <View
      style={{
        paddingHorizontal: space.sm,
        paddingVertical: space.xs,
        borderRadius: radius.small,
        borderWidth: stroke.line,
        borderColor: color,
      }}
    >
      <Text variant="caption" style={{ color, fontWeight: '600' }}>{status}</Text>
    </View>
  );
}

function MiniAction({
  label,
  color,
  onPress,
  disabled,
}: {
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors: C } = useTheme();
  return (
    <Button
      variant="text"
      size="regular"
      title={label}
      accessibilityLabel={label}
      destructive={color === C.danger}
      disabled={disabled}
      onPress={onPress}
    />
  );
}
