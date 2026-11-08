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
import { Badge, Button, Card, EmptyState } from './design/components';
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
import { EventDayGroup, EventRow, eventMark } from './EventRows';
import { EventCategoryPage } from './EventCategoryPage';
import { EventsDiscover } from './EventsDiscover';
import { useEventCity } from './event-city';
import { groupEventsByDay } from '../../shared/event-timeline';
const when = (value: string) =>
  formatDate(new Date(value), {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
/** City, category and your-events state shared by the Events list and a category's page. */
function useEventsView(data: MobilePayload) {
  const [interestId, setInterest] = usePaneState<string | null>('eventInterest', null);
  const scope = data.library?.settings ?? {
    eventCities: ['Hyderabad'],
    eventCountry: 'IN',
    eventTopics: defaultEventTopics,
  };
  const cities = eventCities(scope);
  const { city, setCity, loading: cityLoading } = useEventCity(data.user.id);
  // Only an enabled city counts; a city an admin has since removed sends the member back to discovery.
  const selectedCity = city && cities.some(item => item === city) ? eventCity(cities, city) : null;
  const categories = enabledEventInterests(
    data.library?.settings.eventInterests ?? eventInterests,
    data.library?.settings.eventTopics ?? defaultEventTopics,
  );
  const interest = categories.find(item => item.id === interestId);
  // Your own relationship to an event: registered (approved or waiting) or saved.
  const registered = new Map(
    (data.registrations ?? [])
      .filter(item => item.status === 'approved' || item.status === 'pending')
      .map(item => [item.eventId, item.status === 'approved' ? ('going' as const) : ('requested' as const)]),
  );
  const saved = new Set(data.profile.savedEventIds ?? []);
  const mine = (event: CityEvent) =>
    registered.get(event.id) ?? (saved.has(event.id) ? ('saved' as const) : undefined);
  const markFor = (event: CityEvent) => eventMark(event, mine(event));
  const now = Date.now();
  // Everything you registered for or saved, in any city; the Your events tab splits it.
  const yours = data.events
    .filter(event => mine(event) && event.status === 'published')
    .map(event => ({ event, mine: mine(event)!, past: Date.parse(event.endsAt ?? event.startsAt) <= now }))
    .sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt));
  const events = eventsInCity(data.events, selectedCity, scope);
  const cityCounts = cities.map(name => ({ name, events: eventsInCity(data.events, name, scope).length }));
  // From discovery (no city yet) a category spans every enabled city.
  const pool = selectedCity
    ? events
    : cities
        .flatMap(name => eventsInCity(data.events, name, scope))
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const categoryEvents = pool.filter(event => !interest || eventMatchesInterest(event, interest));
  return {
    scope,
    cities,
    cityCounts,
    cityLoading,
    selectedCity,
    setCity,
    categories,
    interest,
    setInterest,
    markFor,
    yours,
    events,
    categoryEvents,
  };
}

/** A category's page, opened from the rail. Rendered at screen level so it covers the whole tab. */
export function EventCategoryOverlay({
  data,
  onSelect,
}: {
  data: MobilePayload;
  onSelect: (event: CityEvent) => void;
}) {
  const view = useEventsView(data);
  if (!view.interest) return null;
  return (
    <EventCategoryPage
      interest={view.interest}
      city={view.selectedCity}
      events={view.categoryEvents}
      markFor={view.markFor}
      onSelect={onSelect}
      onClose={() => view.setInterest(null)}
    />
  );
}

export type EventsSection = 'upcoming' | 'yours' | 'hosting';

export function HyderabadEvents({
  data,
  onSelect,
  onHost,
  section,
  onDiscover,
}: {
  data: MobilePayload;
  onSelect: (event: CityEvent) => void;
  onHost?: () => void;
  /** Chosen in the top bar. Upcoming shows discovery until a city is picked. */
  section: EventsSection;
  onDiscover: () => void;
}) {
  const { colors: C } = useTheme();
  const {
    categories,
    cityCounts,
    cityLoading,
    selectedCity,
    setCity,
    setInterest,
    markFor,
    yours,
    events,
  } = useEventsView(data);
  // Category chips on the city page filter in place.
  const [filter, setFilter] = usePaneState<string | null>('eventFilter', null);
  const copy = { color: C.muted, fontSize: 16, lineHeight: 24 } as const;
  const sectionTitle = { color: C.text, fontSize: 22, fontWeight: '700' } as const;
  const row = (event: CityEvent, mark = markFor(event)) => (
    <EventRow key={event.id} event={event} mark={mark} showDate onPress={() => onSelect(event)} />
  );
  if (cityLoading) return <View style={{ minHeight: 200 }} />;
  // Upcoming before a city is chosen: Luma-style discovery of categories and cities.
  if (section === 'upcoming' && !selectedCity)
    return (
      <EventsDiscover
        categories={categories}
        cities={cityCounts}
        onCategory={setInterest}
        onCity={name => {
          setCity(name);
          setFilter(null);
          onDiscover();
        }}
      />
    );
  const cityHeader = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${selectedCity}. Change city`}
      onPress={() => setCity(null)}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
    >
      <Text style={{ color: C.text, fontSize: 22, lineHeight: 28, fontWeight: '700' }}>
        {selectedCity}
      </Text>
      <Text style={{ color: C.muted, fontSize: 18 }}>⌄</Text>
    </Pressable>
  );
  if (section === 'hosting') {
    const hosted = data.events
      .filter(event => event.createdBy === data.user.id)
      .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    const stateMark = (event: CityEvent) =>
      event.status === 'pending'
        ? ({ label: 'In review', tone: 'info' } as const)
        : event.status === 'archived'
          ? ({ label: 'Not live', tone: 'muted' } as const)
          : ({ label: 'Live', tone: 'accent' } as const);
    return (
      <View style={{ gap: 18 }}>
        {onHost ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create an event"
            onPress={onHost}
            style={({ pressed }) => ({
              minHeight: 52,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.lime,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ color: C.onAccent, fontSize: 16, fontWeight: '700' }}>+ Create event</Text>
          </Pressable>
        ) : null}
        {hosted.length ? (
          <View>
            <Text accessibilityRole="header" style={sectionTitle}>
              Your hosted events
            </Text>
            {hosted.map(event => row(event, stateMark(event)))}
          </View>
        ) : (
          <EmptyState
            title={onHost ? 'Host your first event' : 'Hosting is for creators'}
            description={
              onHost
                ? 'Create an event with seats, a waitlist and signup questions. It goes live after review.'
                : 'Creators can host events here. Ask the Qram team to become a creator.'
            }
          />
        )}
      </View>
    );
  }
  if (section === 'yours') {
    // Your events span cities, so they sit by date and each one links to its city.
    const showCity = (city: string) => {
      setCity(city);
      setFilter(null);
      onDiscover();
    };
    const upcoming = yours.filter(item => !item.past).map(item => item.event);
    const past = yours
      .filter(item => item.past && item.mine !== 'saved')
      .map(item => item.event)
      .reverse();
    return (
      <View style={{ gap: 22 }}>
        {upcoming.length === 0 && past.length === 0 ? (
          <EmptyState
            title="Nothing planned yet"
            description="Register for or save an event and it shows up here, with its date and city."
          />
        ) : null}
        {groupEventsByDay(upcoming).map(day => (
          <EventDayGroup
            key={day.key}
            day={day}
            markFor={markFor}
            onSelect={onSelect}
            onCity={showCity}
          />
        ))}
        {past.length > 0 && (
          <View style={{ opacity: 0.55 }}>
            <Text accessibilityRole="header" style={sectionTitle}>
              Past
            </Text>
            {past.map(event => (
              <EventRow
                key={event.id}
                event={event}
                mark={markFor(event)}
                showDate
                onPress={() => onSelect(event)}
                onCity={showCity}
              />
            ))}
          </View>
        )}
      </View>
    );
  }
  const chosen = categories.find(item => item.id === filter);
  const shown = events.filter(event => !chosen || eventMatchesInterest(event, chosen));
  return (
    <View style={{ gap: 20 }}>
      {cityHeader}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map(item => {
          const on = item.id === filter;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${item.title}`}
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(on ? null : item.id)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                height: 34,
                borderRadius: 17,
                justifyContent: 'center',
                backgroundColor: on ? C.lime : C.card,
                borderWidth: 1,
                borderColor: on ? C.lime : C.line,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: on ? C.onAccent : C.text, fontSize: 14, fontWeight: '600' }}>
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {/* Luma-style: what's coming up, by day. */}
      {groupEventsByDay(shown).map(day => (
        <EventDayGroup key={day.key} day={day} markFor={markFor} onSelect={onSelect} />
      ))}
      {shown.length === 0 && (
        <Card>
          <Text style={copy}>
            {`No upcoming ${chosen ? `${chosen.title} ` : ''}events in ${selectedCity} yet.`}
          </Text>
        </Card>
      )}
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center' }}>
        Curated, not a live feed · India time
      </Text>
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
