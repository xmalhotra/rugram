import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { CityEvent } from '../../shared/mobile';
import { formatDate } from '../../shared/format';
import { eventProvider } from '../../shared/event-discovery';
import { registrationState } from '../../shared/hyderabad-tech';
import type { EventDay } from '../../shared/event-timeline';
import { FocusIllustration } from './FocusIllustration';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

export function eventFocus(event: CityEvent) {
  return event.topic === 'Tech'
    ? 'coding'
    : event.topic === 'Reading groups'
      ? 'reading'
      : event.topic?.startsWith('HYROX')
        ? 'hyrox'
        : 'running';
}

function organiser(event: CityEvent) {
  return (
    event.organizers?.[0]?.name ??
    (event.registrationUrl ? eventProvider(event.registrationUrl) : null) ??
    'Qram curated'
  );
}

/** Your own relationship to the event wins over its public registration state. */
export type EventMark = { label: string; tone: 'accent' | 'info' | 'muted' };
export function eventMark(event: CityEvent, mine?: 'going' | 'requested' | 'saved'): EventMark | null {
  if (mine === 'going') return { label: 'Going', tone: 'accent' };
  if (mine === 'requested') return { label: 'Requested', tone: 'info' };
  if (mine === 'saved') return { label: 'Saved', tone: 'muted' };
  const state = registrationState(event);
  if (state === 'Waitlist') return { label: 'Waitlist open', tone: 'info' };
  if (state === 'Sold out' || state === 'Closed' || state === 'Registration closed')
    return { label: state === 'Registration closed' ? 'Closed' : state, tone: 'muted' };
  if (state === 'Tickets coming soon') return { label: 'Soon', tone: 'info' };
  return null;
}

function Pill({ mark }: { mark: EventMark }) {
  const { colors: C } = useTheme();
  const color = mark.tone === 'accent' ? C.lime : mark.tone === 'info' ? C.info : C.muted;
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
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{mark.label}</Text>
    </View>
  );
}

function Glyph({ kind }: { kind: 'clock' | 'pin' }) {
  const { colors: C } = useTheme();
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" accessible={false}>
      {kind === 'clock' ? (
        <>
          <Circle cx={12} cy={12} r={9} stroke={C.muted} strokeWidth={2} fill="none" />
          <Path d="M12 7v5l3 2" stroke={C.muted} strokeWidth={2} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Path
            d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"
            stroke={C.muted}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={9.5} r={2.5} stroke={C.muted} strokeWidth={2} fill="none" />
        </>
      )}
    </Svg>
  );
}

/** A Luma-style event row: square art, who runs it, the title, then time and place. */
export function EventRow({
  event,
  mark,
  showDate = false,
  onPress,
  onCity,
}: {
  event: CityEvent;
  mark: EventMark | null;
  /** Rows outside a day group show the date alongside the time. */
  showDate?: boolean;
  onPress: () => void;
  /** Where your events span cities: the city shows as a link to that city's events. */
  onCity?: (city: string) => void;
}) {
  const { colors: C } = useTheme();
  const host = organiser(event);
  const time = formatDate(
    event.startsAt,
    event.dateOnly
      ? { day: 'numeric', month: 'short' }
      : showDate
        ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }
        : { hour: 'numeric', minute: '2-digit' },
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${host}, ${time}, ${event.venue}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 14,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FocusIllustration focusId={eventFocus(event)} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.text, fontSize: 10, fontWeight: '700' }}>
              {host.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text numberOfLines={1} style={{ flex: 1, color: C.muted, fontSize: 14 }}>
            {host}
          </Text>
          {mark && <Pill mark={mark} />}
        </View>
        <Text
          numberOfLines={2}
          style={{ color: C.text, fontSize: 17, lineHeight: 22, fontWeight: '600' }}
        >
          {event.simulation ? `${event.title} · Demo` : event.title}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Glyph kind="clock" />
            <Text style={{ color: C.muted, fontSize: 14 }}>{time}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
            <Glyph kind="pin" />
            <Text numberOfLines={1} style={{ flexShrink: 1, color: C.muted, fontSize: 14 }}>
              {event.venue}
            </Text>
          </View>
        </View>
        {onCity && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`See events in ${event.city}`}
            onPress={() => onCity(event.city)}
            hitSlop={8}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text style={{ color: C.lime, fontSize: 13, fontWeight: '600' }}>{event.city} ›</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

/** "9 November / Monday", then that day's rows with hairlines between them. */
export function EventDayGroup({
  day,
  markFor,
  onSelect,
  onCity,
}: {
  day: EventDay;
  markFor: (event: CityEvent) => EventMark | null;
  onSelect: (event: CityEvent) => void;
  onCity?: (city: string) => void;
}) {
  const { colors: C } = useTheme();
  return (
    <View>
      <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '600', color: C.text }}>
        {day.title}
        <Text style={{ color: C.muted, fontWeight: '400' }}> / {day.weekday}</Text>
      </Text>
      {day.events.map((event, index) => (
        <View
          key={event.id}
          style={index ? { borderTopWidth: 0.5, borderColor: C.line, marginLeft: 98 } : undefined}
        >
          <View style={index ? { marginLeft: -98 } : undefined}>
            <EventRow
              event={event}
              mark={markFor(event)}
              onPress={() => onSelect(event)}
              onCity={onCity}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
