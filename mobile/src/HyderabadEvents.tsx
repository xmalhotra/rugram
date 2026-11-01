import { formatDate } from '../../shared/format';
import { eventMapsUrl } from '../../shared/event-maps';
import { EventRegistrationPanel } from './EventRegistrationPanel';
import React, { useState } from 'react';
import { usePaneState } from './pane-state';
import { Pressable, View } from 'react-native';
import { Text } from './design/Text';
import type { CityEvent, MobilePayload } from '../../shared/mobile';
import {
  hyderabadTechEvents,
  registrationState,
  canOpenRegistration,
  isHyderabadTech,
} from '../../shared/hyderabad-tech';
import { eventCost } from '../../shared/flow-connections';
import { eventProvider, eventWebsite } from '../../shared/event-discovery';
import { Badge, Button, Card, Choice, HabitToggle } from './design/components';
import { CategoryRail } from './CategoryRail';
import { BrowseShelf } from './BrowseShelf';
import { EventPreview } from './EventPreview';
import {
  eventInterests,
  defaultEventTopics,
  enabledEventInterests,
  eventMatchesInterest,
} from '../../shared/event-interests';
import { useTheme } from './design/theme';
import { Disclosure } from './Disclosure';
import { EventHosts } from './EventHosts';
import { FocusIllustration } from './FocusIllustration';
import { eventCities, eventCity, eventsInCity } from '../../shared/event-location';
import { EventLocationPicker } from './EventLocationPicker';
const when = (value: string) =>
  formatDate(new Date(value), {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
export function HyderabadEvents({
  data,
  onSelect,
  onHost,
}: {
  data: MobilePayload;
  onSelect: (event: CityEvent) => void;
  onHost?: () => void;
}) {
  const { colors: C } = useTheme();
  const [savedOnly, setSavedOnly] = usePaneState('savedEvents', false);
  const [order, setOrder] = usePaneState('eventOrder', 'Soonest');
  const [interestId, setInterest] = usePaneState<string | null>('eventInterest', null);
  const scope = data.library?.settings ?? {
    eventCities: ['Hyderabad'],
    eventCountry: 'IN',
    eventTopics: defaultEventTopics,
  };
  const cities = eventCities(scope);
  const [city, setCity] = usePaneState<string | null>('eventCity', () =>
    eventCity(cities, data.profile.city),
  );
  const [choosingCity, setChoosingCity] = useState(false);
  const selectedCity = eventCity(cities, city);
  const categories = enabledEventInterests(
    data.library?.settings.eventInterests ?? eventInterests,
    data.library?.settings.eventTopics ?? defaultEventTopics,
  );
  const interest = categories.find(item => item.id === interestId);
  const events = eventsInCity(data.events, selectedCity, scope).filter(
    event =>
      (!interest || eventMatchesInterest(event, interest)) &&
      (!savedOnly || data.profile.savedEventIds?.includes(event.id)),
  );
  if (order === 'Editorial priority')
    events.sort(
      (a, b) =>
        (b.editorialPriority?.score ?? 0) - (a.editorialPriority?.score ?? 0) ||
        Date.parse(a.startsAt) - Date.parse(b.startsAt),
    );
  const copy = { color: C.muted, fontSize: 16, lineHeight: 24 } as const;
  const locationHeader = (
    <View style={{ gap: 10 }}>
      <Text style={{ color: C.muted, fontSize: 14 }}>Explore events in</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Event location: ${selectedCity ?? 'unavailable'}. Choose city`}
        accessibilityState={{ expanded: choosingCity, disabled: cities.length === 0 }}
        disabled={cities.length === 0}
        onPress={() => setChoosingCity(true)}
        style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View
          accessible={false}
          style={{ width: 20, height: 26, alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              borderBottomLeftRadius: 2,
              borderWidth: 2,
              borderColor: C.lime,
              transform: [{ rotate: '-45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: C.lime,
              top: 11,
              left: 8,
            }}
          />
        </View>
        <Text
          numberOfLines={2}
          style={{ flexShrink: 1, color: C.text, fontSize: 29, lineHeight: 37, fontWeight: '600' }}
        >
          {selectedCity ?? 'No city available'}
        </Text>
        <Text style={{ color: C.lime, fontSize: 23 }}>⌄</Text>
      </Pressable>
    </View>
  );
  const locationPicker = choosingCity && (
    <EventLocationPicker
      cities={cities}
      selected={selectedCity}
      country={scope?.eventCountry ?? 'IN'}
      onClose={() => setChoosingCity(false)}
      onSelect={next => {
        setCity(next);
        setSavedOnly(false);
        setChoosingCity(false);
      }}
    />
  );
  return (
    <View style={{ gap: 16, backgroundColor: C.bg }}>
      {locationHeader}
      {onHost && (
        <Button
          title="+ Host an event"
          secondary
          disabled={!data.creatorEventQuota?.remaining}
          onPress={onHost}
        />
      )}
      <View style={{ marginHorizontal: -16 }}>
        <CategoryRail
          items={[{ id: 'all', title: 'All events', illustration: 'community' }, ...categories]}
          selected={interest?.id ?? 'all'}
          onSelect={id => {
            setInterest(id === 'all' ? null : id);
            setSavedOnly(false);
          }}
          label="Event categories"
        />
      </View>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 21, fontWeight: '600' }}>
        Upcoming events
      </Text>
      <Disclosure title="Filter events">
        <HabitToggle
          title="Saved events"
          detail="Your shortlist, not confirmed bookings."
          checked={savedOnly}
          disabled={false}
          onChange={setSavedOnly}
        />
        <Choice
          label="Sort by"
          value={order}
          options={['Soonest', 'Editorial priority']}
          onChange={setOrder}
        />
      </Disclosure>
      <BrowseShelf label="Upcoming events">
        {events.map(event => (
          <EventPreview key={event.id} event={event} onPress={() => onSelect(event)} />
        ))}
      </BrowseShelf>
      {events.length === 0 && (
        <Card>
          <Text style={copy}>
            {savedOnly
              ? `No saved upcoming events in ${selectedCity ?? 'this city'} for this category.`
              : `No upcoming ${interest ? `${interest.title} ` : ''}events in ${selectedCity ?? 'this city'} yet.`}
          </Text>
        </Card>
      )}
      <Badge>Curated, not a live feed · India time</Badge>
      {locationPicker}
    </View>
  );
}
export function CuratedEventDetails({
  event,
  data,
  busy,
  onSave,
  onRegister,
  onLink,
  onEdit,
}: {
  event: CityEvent;
  data: MobilePayload;
  busy: boolean;
  onSave: (enabled: boolean) => void;
  onRegister: () => void;
  onLink: (url: string) => void;
  onEdit: () => void;
}) {
  const { colors: C } = useTheme();
  const [about, setAbout] = useState(false);
  const text = { color: C.muted, fontSize: 16, lineHeight: 24 } as const;
  const heading = { color: C.text, fontSize: 21, fontWeight: '600', lineHeight: 28 } as const;
  const provider = eventProvider(event.registrationUrl ?? '');
  const native = event.registrationMode === 'approval';
  const date = new Date(event.startsAt);
  const sources = [
    ...new Set(
      [...(event.sourceUrls ?? []), event.sourceUrl, event.registrationUrl].filter(
        (url): url is string => Boolean(url && eventWebsite(url)),
      ),
    ),
  ];
  const saved = Boolean(data.profile.savedEventIds?.includes(event.id));
  return (
    <View style={{ gap: 24, backgroundColor: C.bg }}>
      <View
        style={{
          borderRadius: 24,
          padding: 24,
          backgroundColor: C.card,
          overflow: 'hidden',
          minHeight: 154,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <Badge>
            {event.topic ?? 'Community'} · {event.city}
          </Badge>
          <FocusIllustration
            focusId={
              event.topic === 'Tech'
                ? 'coding'
                : event.topic === 'Reading groups'
                  ? 'reading'
                  : event.topic?.startsWith('HYROX')
                    ? 'hyrox'
                    : 'running'
            }
            selected
          />
        </View>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>
            {formatDate(date, { timeZone: 'Asia/Kolkata', month: 'short' }).toUpperCase()}
          </Text>
          <Text style={{ color: C.lime, fontSize: 52, fontWeight: '700' }}>
            {formatDate(date, { timeZone: 'Asia/Kolkata', day: 'numeric' })}
          </Text>
        </View>
      </View>
      <Text
        accessibilityRole="header"
        style={{ color: C.text, fontSize: 29, lineHeight: 36, fontWeight: '700' }}
      >
        {event.title}
      </Text>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text style={heading}>
            {formatDate(date, {
              timeZone: 'Asia/Kolkata',
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <Text style={text}>
            {formatDate(date, { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })}
            {event.endsAt
              ? ' – ' +
                formatDate(new Date(event.endsAt), {
                  timeZone: 'Asia/Kolkata',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : ''}{' '}
            IST
          </Text>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ ...heading, fontSize: 18 }}>{event.venue}</Text>
          <Text style={text}>
            {event.city}, {event.country === 'IN' ? 'India' : event.country}
          </Text>
          {eventMapsUrl(event) && (
            <Button title="Open in Maps" secondary onPress={() => onLink(eventMapsUrl(event)!)} />
          )}
        </View>
        {event.scheduleNote && (
          <Text style={{ ...text, color: C.danger }}>{event.scheduleNote}</Text>
        )}
      </View>
      <EventHosts event={event} onLink={onLink} />
      {native ? (
        <EventRegistrationPanel event={event} showHosts={false} />
      ) : (
        <Card>
          <Badge>REGISTRATION</Badge>
          <Text style={heading}>{eventCost(event)}</Text>
          <Text style={text}>
            {registrationState(event) === 'Registration link available'
              ? 'Register with ' + provider
              : registrationState(event)}
          </Text>
          {event.approvalRequired && (
            <Badge>Host approval required · your place is not confirmed by opening the link</Badge>
          )}
          <Button
            title={
              event.registrationStatus === 'Tickets coming soon'
                ? 'View announcement ↗'
                : event.registrationStatus === 'Waitlist'
                  ? 'Join waitlist on ' + provider + ' ↗'
                  : 'Register on ' + provider + ' ↗'
            }
            disabled={!canOpenRegistration(event)}
            onPress={onRegister}
          />
          <Text style={{ ...text, fontSize: 13 }}>
            Opens {provider}. Requests, approval and cancellation are handled there.
          </Text>
        </Card>
      )}
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={heading}>
          About this event
        </Text>
        <Text numberOfLines={about ? undefined : 4} style={text}>
          {event.description}
        </Text>
        {event.description.length > 200 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={about?'Show less about this event':'Read more about this event'}
            accessibilityState={{ expanded: about }}
            onPress={() => setAbout(value => !value)}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: C.lime, fontSize: 16 }}>{about ? 'Show less' : 'Read more'}</Text>
          </Pressable>
        )}
      </View>
      {isHyderabadTech(event, data.library?.settings) &&
        (saved || hyderabadTechEvents([event], Date.now(), data.library?.settings).length > 0) && (
          <Button
            title={saved ? 'Saved ✓' : 'Save for later'}
            secondary
            disabled={busy}
            onPress={() => onSave(!saved)}
          />
        )}
      <Disclosure title="Good to know">
        {event.audience && (
          <>
            <Text style={heading}>Who it’s for</Text>
            <Text style={text}>{event.audience}</Text>
          </>
        )}
        {event.outcomes?.map(item => (
          <Text key={item} style={text}>
            • {item}
          </Text>
        ))}
        <Badge>Expected benefits, not guaranteed outcomes.</Badge>
        {event.feeNote && <Text style={text}>{event.feeNote}</Text>}
        <Text style={text}>
          {event.registrationClosesAt
            ? 'Registration closes ' + when(event.registrationClosesAt) + ' IST.'
            : 'No confirmed registration deadline. Availability may change.'}
        </Text>
        {event.editorialPriority && (
          <>
            <Badge>
              Editorial relevance · {event.editorialPriority.score}/5, not guest reviews
            </Badge>
            <Text style={text}>{event.editorialPriority.reason}</Text>
          </>
        )}
      </Disclosure>
      <Disclosure title="Source & updates">
        {sources.map(url => (
          <Button
            key={url}
            title={'View ' + eventWebsite(url) + ' ↗'}
            secondary
            onPress={() => onLink(url)}
          />
        ))}
        <Badge>
          {event.checkedAt
            ? 'Checked ' + when(event.checkedAt) + ' IST · not live availability'
            : 'Source check date unknown'}
        </Badge>
        {!native && (
          <Text style={text}>
            Guest names and registration counts are not imported from the provider.
          </Text>
        )}
      </Disclosure>
      {data.user.role === 'admin' && <Button title="Edit event" secondary onPress={onEdit} />}
    </View>
  );
}
