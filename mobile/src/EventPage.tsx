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
import { useTheme } from './design/theme';
import { useToast } from './design/components';

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
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>···</Text>
          </Pressable>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
      >
        <View
          style={{
            height: 200,
            borderRadius: 20,
            backgroundColor: C.card,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: 120,
              backgroundColor: C.lime,
              opacity: 0.18,
              top: -70,
              right: -50,
            }}
          />
          {event.topic ? (
            <Text
              style={{
                position: 'absolute',
                top: 14,
                left: 16,
                color: C.lime,
                fontSize: 13,
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
          style={{ color: C.text, fontSize: 28, fontWeight: '700', marginTop: 18 }}
        >
          {event.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.text, fontWeight: '700' }}>
              {hostName.trim().charAt(0).toUpperCase() || 'Q'}
            </Text>
          </View>
          <Text style={{ color: C.muted, fontSize: 15, flex: 1 }}>Hosted by {hostName}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.lime, fontSize: 11, fontWeight: '700' }}>{month}</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', lineHeight: 20 }}>
              {day}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{when}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginTop: 2 }}>
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
            gap: 12,
            marginTop: 16,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.text, fontSize: 20 }}>⌖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
              {event.location?.name ?? event.venue}
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, marginTop: 2 }} numberOfLines={2}>
              {event.location?.address ?? event.city}
            </Text>
          </View>
        </Pressable>
        {hasPoint ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open the location in Maps"
            onPress={() => mapsUrl && onLink(mapsUrl)}
            style={{ height: 160, borderRadius: 16, overflow: 'hidden', marginTop: 12 }}
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
              borderRadius: 18,
              padding: 16,
              marginTop: 22,
            }}
          >
            {loading && !view ? (
              <Text style={{ color: C.muted, fontSize: 14 }}>Loading registration…</Text>
            ) : null}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22 }}>
            {view.guests.slice(0, 8).map((guest, index) => (
              <View
                key={guest.id}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  marginLeft: index === 0 ? 0 : -10,
                  backgroundColor: C.line,
                  borderWidth: 2,
                  borderColor: C.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>
                  {guest.name.trim().charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            ))}
            <Text style={{ color: C.muted, fontSize: 15, marginLeft: 12 }}>
              {view.approvedCount ?? view.guests.length} going
            </Text>
          </View>
        ) : null}

        <Text
          accessibilityRole="header"
          style={{ color: C.text, fontSize: 20, fontWeight: '700', marginTop: 28 }}
        >
          About event
        </Text>
        <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24, marginTop: 8 }}>
          {event.description}
        </Text>

        {view?.canManage ? (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 18,
              padding: 16,
              marginTop: 22,
              gap: 14,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ color: C.text, fontSize: 18, fontWeight: '700' }}
            >
              Manage
            </Text>
            {view.answerTally?.map(tally => (
              <View key={tally.questionId} style={{ gap: 4 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                  {tally.label}
                </Text>
                {Object.entries(tally.counts).map(([option, count]) => (
                  <Text key={option} style={{ color: C.muted, fontSize: 14 }}>
                    {option} · {count}
                  </Text>
                ))}
              </View>
            ))}
            {view.requests.map(guest => (
              <View
                key={guest.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
              >
                <Text style={{ color: C.text, fontSize: 15, flexGrow: 1 }} numberOfLines={1}>
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
    <View style={{ gap: 12 }}>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{headline}</Text>
      {view.mode === 'external' ? (
        <LimeButton
          label="Register on organiser site ↗"
          disabled={busy || !event.registrationUrl}
          onPress={() => {
            if (event.registrationUrl) onLink(event.registrationUrl);
          }}
        />
      ) : view.ownStatus === 'approved' ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: C.lime, fontSize: 16, fontWeight: '700' }}>
            ✓ You&apos;re going
          </Text>
          <SecondaryButton label="Cancel registration" disabled={busy} onPress={onCancel} />
        </View>
      ) : view.ownStatus === 'waitlisted' ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
            You&apos;re #{view.waitlistPosition ?? 1} on the waitlist
          </Text>
          <Text style={{ color: C.muted, fontSize: 14 }}>
            We&apos;ll notify you if a seat opens
          </Text>
          <SecondaryButton label="Leave waitlist" disabled={busy} onPress={onLeave} />
        </View>
      ) : view.ownStatus === 'pending' ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: C.info, fontSize: 16, fontWeight: '600' }}>
            Request sent · waiting for the host
          </Text>
          <SecondaryButton label="Withdraw request" disabled={busy} onPress={onLeave} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {view.ownStatus === 'declined' ? (
            <Text style={{ color: C.danger, fontSize: 14 }}>The host declined your request</Text>
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
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{question.label}</Text>
      {question.kind === 'choice' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: selected ? C.lime : C.line,
                  backgroundColor: selected ? C.lime : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: selected ? C.onAccent : C.text,
                    fontSize: 14,
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
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            minHeight: 44,
            fontSize: 16,
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
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: C.lime,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: C.onAccent, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
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
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.line,
        paddingVertical: 12,
        alignItems: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{label}</Text>
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
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{status}</Text>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
