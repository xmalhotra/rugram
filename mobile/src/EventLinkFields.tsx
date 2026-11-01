import { formatInr, formatDate } from '../../shared/format';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import { Text } from './design/Text';
import { DateTimeField } from './design/components';
import { EventTextField, EventSelectField } from './EventEditorControls';
import { Disclosure } from './Disclosure';
import {
  eventEditorError,
  eventEditorSteps,
  type EventEditorStep,
} from '../../shared/event-editor';
import { useTheme } from './design/theme';
import type { AppSettings } from '../../shared/admin-content';
import type { CityEvent } from '../../shared/mobile';
export function curatedEventForm(
  event?: CityEvent,
  settings?: AppSettings,
): Record<string, string> {
  const sources = event?.sourceUrls ?? (event?.sourceUrl ? [event.sourceUrl] : []);
  return {
    registrationMode: event?.registrationMode ?? 'approval',
    guestCapacity: String(event?.guestCapacity ?? 100),
    organizerName: event?.organizers?.[0]?.name ?? '',
    organizerUrl: event?.organizers?.[0]?.profileUrl ?? '',
    title: event?.title ?? '',
    city: event?.city ?? settings?.eventCities[0] ?? 'Hyderabad',
    country: event?.country ?? settings?.eventCountry ?? 'IN',
    topic: event?.topic ?? settings?.eventTopics[0] ?? 'Tech',
    venue: event?.venue ?? '',
    startsAt: event?.startsAt ?? new Date(Date.now() + 86400000).toISOString(),
    endsAt: event?.endsAt ?? '',
    description: event?.description ?? '',
    registrationUrl: event?.registrationUrl ?? '',
    registrationClosesAt: event?.registrationClosesAt ?? '',
    registrationStatus: event?.registrationStatus ?? 'Registration link available',
    entryFee: event ? (event.entryFee == null ? '' : String(event.entryFee)) : '0',
    feeNote: event?.feeNote ?? '',
    audience: event?.audience ?? '',
    priority: String(event?.editorialPriority?.score ?? 3),
    priorityReason: event?.editorialPriority?.reason ?? '',
    checkedAt: event?.checkedAt ?? new Date().toISOString(),
    ...Object.fromEntries(
      [1, 2, 3, 4].map(index => [`outcome${index}`, event?.outcomes?.[index - 1] ?? '']),
    ),
    ...Object.fromEntries(
      [1, 2, 3, 4, 5].map(index => [`source${index}`, sources[index - 1] ?? '']),
    ),
  };
}
export function curatedEventInput(form: Record<string, string>) {
  return {
    registrationMode: form.registrationMode ?? 'external',
    ...(form.registrationMode === 'approval'
      ? {
          guestCapacity: Number(form.guestCapacity ?? 100),
          organizers: [
            {
              name: form.organizerName ?? '',
              ...(form.organizerUrl?.trim() ? { profileUrl: form.organizerUrl.trim() } : {}),
            },
          ],
        }
      : {}),
    title: form.title ?? '',
    city: form.city ?? 'Hyderabad',
    country: form.country ?? 'IN',
    topic: form.topic ?? 'Tech',
    venue: form.venue ?? '',
    startsAt: new Date(form.startsAt).toISOString(),
    ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}),
    description: form.description ?? '',
    registrationUrl: form.registrationUrl ?? '',
    registrationClosesAt: form.registrationClosesAt
      ? new Date(form.registrationClosesAt).toISOString()
      : null,
    registrationStatus: form.registrationStatus ?? 'Check provider',
    entryFee: form.entryFee?.trim() ? Number(form.entryFee) : null,
    feeNote: form.feeNote ?? '',
    audience: form.audience ?? '',
    outcomes: [1, 2, 3, 4].map(index => form[`outcome${index}`]?.trim()).filter(Boolean),
    editorialPriority: { score: Number(form.priority), reason: form.priorityReason ?? '' },
    sourceUrls: [1, 2, 3, 4, 5].map(index => form[`source${index}`]?.trim()).filter(Boolean),
    checkedAt: new Date(form.checkedAt).toISOString(),
  };
}
export function EventLinkFields({
  form,
  onChange,
  creator = false,
  settings,
  busy = false,
  onSubmit,
  editing = false,
}: {
  settings?: AppSettings;
  form: Record<string, string>;
  onChange: (key: string, value: string) => void;
  creator?: boolean;
  busy?: boolean;
  onSubmit: () => void;
  editing?: boolean;
}) {
  const { colors: C } = useTheme();
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [error, setError] = useState('');
  const step = eventEditorSteps.includes(form._eventStep as EventEditorStep)
    ? (form._eventStep as EventEditorStep)
    : 'Basics';
  const index = eventEditorSteps.indexOf(step);
  const hosted = form.registrationMode !== 'external';
  const names = ['About', 'When & where', 'Guests', 'Review'];
  const titles = [
    'What are you planning?',
    'Set the place and time.',
    'Who’s coming?',
    'Ready to share?',
  ];
  const copy = { color: C.muted, fontSize: 14, lineHeight: 21 } as const;
  useEffect(() => {
    Keyboard.dismiss();
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);
  function update(key: string, value: string) {
    setError('');
    onChange(key, value);
  }
  function field(
    key: string,
    label: string,
    extra: Partial<React.ComponentProps<typeof EventTextField>> = {},
  ) {
    return (
      <EventTextField
        key={key}
        label={label}
        value={form[key] ?? ''}
        onChange={value => update(key, value)}
        {...extra}
      />
    );
  }
  function advance() {
    const message = eventEditorError(form, step, creator);
    if (message) {
      setError(message);
      scroll.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (index < 3) {
      update('_eventStep', eventEditorSteps[index + 1]);
      return;
    }
    for (const check of eventEditorSteps) {
      const issue = eventEditorError(form, check, creator);
      if (issue) {
        onChange('_eventStep', check);
        setError(issue);
        return;
      }
    }
    onSubmit();
  }
  const dateLabel = Number.isFinite(Date.parse(form.startsAt))
    ? formatDate(new Date(form.startsAt), { dateStyle: 'medium', timeStyle: 'short' })
    : 'Choose a date';
  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: C.bg }}>
      <View style={{ gap: 8, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {eventEditorSteps.map((item, i) => (
            <View
              key={item}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 3,
                backgroundColor: i <= index ? C.lime : C.line,
              }}
            />
          ))}
        </View>
        <Text style={{ ...copy, fontSize: 12 }}>
          {index + 1} of 4 · {names[index]}
        </Text>
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 18, paddingBottom: 24 }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: C.text, fontSize: 27, lineHeight: 34, fontWeight: '600' }}
        >
          {titles[index]}
        </Text>
        {error && (
          <Text accessibilityRole="alert" style={{ color: C.danger, fontSize: 14, lineHeight: 21 }}>
            {error}
          </Text>
        )}
        {step === 'Basics' && (
          <>
            {field('title', 'Event name', {
              placeholder: 'e.g. Hyderabad builders meetup',
              maxLength: 100,
            })}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { id: 'approval', title: 'Host here', note: 'Free · invite approval' },
                { id: 'external', title: 'Share a link', note: 'Luma, Meetup & more' },
              ].map(mode => (
                <Pressable
                  key={mode.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`${mode.title}. ${mode.note}`}
                  accessibilityState={{ checked: form.registrationMode === mode.id }}
                  disabled={busy}
                  onPress={() => {
                    update('registrationMode', mode.id);
                    if (mode.id === 'approval') {
                      onChange('entryFee', '0');
                      onChange('registrationStatus', 'Registration link available');
                    }
                  }}
                  style={{
                    flex: 1,
                    minHeight: 76,
                    padding: 12,
                    gap: 5,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: form.registrationMode === mode.id ? C.lime : C.line,
                    backgroundColor: C.card,
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                    {mode.title}
                  </Text>
                  <Text style={{ ...copy, fontSize: 12 }}>{mode.note}</Text>
                </Pressable>
              ))}
            </View>
            {!hosted &&
              field('registrationUrl', 'Registration link', {
                link: true,
                maxLength: 2048,
                placeholder: 'https://luma.com/…',
              })}
            {settings && (
              <EventSelectField
                label="Category"
                value={form.topic ?? settings.eventTopics[0]}
                options={settings.eventTopics}
                onChange={value => update('topic', value)}
              />
            )}
            {field('description', 'About the event', {
              multiline: true,
              maxLength: 800,
              placeholder: 'What will happen? Keep it short and useful.',
            })}
          </>
        )}
        {step === 'When' && (
          <>
            <EventSelectField
              label="City"
              value={form.city ?? settings?.eventCities[0] ?? 'Hyderabad'}
              options={settings?.eventCities ?? ['Hyderabad']}
              onChange={value => update('city', value)}
            />
            {field('venue', 'Venue', {
              placeholder: 'Venue name or meeting location',
              maxLength: 160,
            })}
            <View style={{ padding: 14, borderRadius: 14, backgroundColor: C.card }}>
              <DateTimeField
                label="Starts"
                value={form.startsAt ?? ''}
                onChange={value => update('startsAt', value)}
              />
            </View>
            {form.endsAt ? (
              <>
                <DateTimeField
                  label="Ends"
                  value={form.endsAt}
                  onChange={value => update('endsAt', value)}
                />
                <Pressable
                  onPress={() => update('endsAt', '')}
                  accessibilityRole="button"
                  accessibilityLabel="Remove end time"
                  style={{ minHeight: 48, justifyContent: 'center' }}
                >
                  <Text style={{ color: C.lime }}>Remove end time</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add an end time"
                onPress={() =>
                  update('endsAt', new Date(Date.parse(form.startsAt) + 3600000).toISOString())
                }
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                <Text style={{ color: C.lime }}>+ Add an end time</Text>
              </Pressable>
            )}
            <Text style={copy}>Choose a date within the next year.</Text>
          </>
        )}
        {step === 'Guests' && (
          <>
            {hosted && (
              <>
                {field('organizerName', 'Host name', { maxLength: 100 })}
                {field('guestCapacity', 'Guest limit', { numeric: true, placeholder: '100' })}
                <Text style={copy}>
                  Free entry. You approve invite requests; guest names stay private until approval.
                </Text>
              </>
            )}
            {field('audience', 'Who is it for?', {
              placeholder: 'e.g. Developers building with AI',
              maxLength: 300,
            })}
            {field('outcome1', 'One reason to attend', {
              placeholder: 'e.g. Build a working demo with other developers',
              maxLength: 200,
            })}
            <Disclosure title="More guest and registration options">
              {hosted &&
                field('organizerUrl', 'Host profile link (optional)', {
                  link: true,
                  maxLength: 2048,
                })}
              {[2, 3, 4].map(i =>
                field('outcome' + i, 'Reason ' + i + ' (optional)', { maxLength: 200 }),
              )}
              {!hosted &&
                field('entryFee', 'Listed fee in ₹ (optional)', {
                  numeric: true,
                  placeholder: 'Leave blank if unknown',
                })}
              {form.registrationClosesAt ? (
                <>
                  <DateTimeField
                    label="Registration closes"
                    value={form.registrationClosesAt}
                    onChange={value => update('registrationClosesAt', value)}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove registration deadline"
                    onPress={() => update('registrationClosesAt', '')}
                    style={{ minHeight: 48, justifyContent: 'center' }}
                  >
                    <Text style={{ color: C.lime }}>Remove deadline</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add a confirmed registration deadline"
                  onPress={() => update('registrationClosesAt', form.startsAt)}
                  style={{ minHeight: 48, justifyContent: 'center' }}
                >
                  <Text style={{ color: C.lime }}>+ Add a confirmed deadline</Text>
                </Pressable>
              )}
              <EventSelectField
                label="Registration status"
                value={form.registrationStatus ?? 'Check provider'}
                options={[
                  'Check provider',
                  'Tickets coming soon',
                  'Registration link available',
                  'Waitlist',
                  'Sold out',
                  'Closed',
                  'Cancelled',
                ]}
                onChange={value => update('registrationStatus', value)}
              />
              {field('feeNote', 'Price or availability note (optional)', {
                multiline: true,
                maxLength: 500,
              })}
            </Disclosure>
          </>
        )}
        {step === 'Review' && (
          <>
            <View
              style={{
                padding: 18,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: C.line,
                backgroundColor: C.card,
                gap: 10,
              }}
            >
              <Text style={{ color: C.lime, fontSize: 12 }}>
                {hosted ? 'HOSTED IN QRAM' : 'EXTERNAL EVENT'} · {form.topic}
              </Text>
              <Text style={{ color: C.text, fontSize: 23, lineHeight: 30, fontWeight: '600' }}>
                {form.title}
              </Text>
              <Text style={copy}>{dateLabel}</Text>
              <Text style={copy}>
                {form.venue} · {form.city}
              </Text>
              <Text style={{ color: C.text, fontSize: 15 }}>
                {hosted
                  ? 'Free · ' + form.guestCapacity + ' places'
                  : form.entryFee?.trim()
                    ? formatInr(Number(form.entryFee))
                    : 'Fee not confirmed'}
              </Text>
              <Text numberOfLines={3} style={copy}>
                {form.description}
              </Text>
            </View>
            {!hosted &&
              field('source1', 'Official source link', {
                link: true,
                maxLength: 2048,
                placeholder: 'https://…',
              })}
            <Disclosure
              title={hosted ? 'Add references (optional)' : 'More source links (optional)'}
            >
              {(hosted ? [1, 2, 3, 4, 5] : [2, 3, 4, 5]).map(i =>
                field('source' + i, 'Source ' + i + ' (optional)', { link: true, maxLength: 2048 }),
              )}
            </Disclosure>
            {!creator && (
              <>
                <EventSelectField
                  label="Editorial priority"
                  value={form.priority ?? '3'}
                  options={['1', '2', '3', '4', '5']}
                  onChange={value => update('priority', value)}
                />
                {field('priorityReason', 'Why this priority?', {
                  placeholder: 'Explain the relevance, not an attendee rating',
                  multiline: true,
                  maxLength: 500,
                })}
              </>
            )}
            <Text style={copy}>
              {creator
                ? 'An admin reviews this before it appears in Events.'
                : editing
                  ? 'Changes are saved for this event. Pending listings still need admin publication.'
                  : 'This event will be published to the app.'}
            </Text>
          </>
        )}
      </ScrollView>
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderColor: C.line,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {index > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous event creation step"
            disabled={busy}
            onPress={() => update('_eventStep', eventEditorSteps[index - 1])}
            style={{ minWidth: 64, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: C.lime, fontSize: 16 }}>Back</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={index===eventEditorSteps.length-1?'Submit event':'Next event creation step'}
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={advance}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 52,
            padding: 14,
            borderRadius: 16,
            backgroundColor: C.lime,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy ? 0.5 : pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: C.onAccent, fontSize: 16, fontWeight: '600' }}>
            {busy
              ? 'Saving…'
              : index < 3
                ? 'Continue →'
                : editing
                  ? 'Save changes'
                  : creator
                    ? 'Submit for approval'
                    : 'Publish event'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
