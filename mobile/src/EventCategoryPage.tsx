import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { CityEvent } from '../../shared/mobile';
import type { EventInterest } from '../../shared/event-interests';
import { groupEventsByDay } from '../../shared/event-timeline';
import { DetailSurface } from './design/DetailSurface';
import { ScreenBackground } from './design/ScreenBackground';
import { PageBar } from './design/PageBar';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { Card, useToast } from './design/components';
import { FocusIllustration } from './FocusIllustration';
import { EventDayGroup, type EventMark } from './EventRows';
import { useEventCategories } from './event-categories';

// Admin-made categories fall back to a plain line about the city.
const blurbs: Record<string, string> = {
  tech: 'Meetups, hackathons and workshops. Build things and meet the people who make them.',
  marathons: 'Race days and group runs, from a first 5K to a full marathon.',
  'hyrox-simulations': 'Simulation sessions to rehearse stations and pacing before race day.',
  'reading-groups': 'Book clubs and reading circles that meet in person.',
};

function Stat({ value, label }: { value: number; label: string }) {
  const { colors: C } = useTheme();
  return (
    <Text style={{ color: C.muted, fontSize: 16 }}>
      <Text style={{ color: C.text, fontWeight: '700' }}>{value}</Text> {label}
    </Text>
  );
}

/** A Luma-style category page: who it is for, how many follow it, and what is coming up. */
export function EventCategoryPage({
  interest,
  city,
  events,
  markFor,
  onSelect,
  onClose,
}: {
  interest: EventInterest;
  city: string | null;
  events: CityEvent[];
  markFor: (event: CityEvent) => EventMark | null;
  onSelect: (event: CityEvent) => void;
  onClose: () => void;
}) {
  const { colors: C } = useTheme();
  const toast = useToast();
  const { categories, subscribe } = useEventCategories();
  const summary = categories?.find(item => item.id === interest.id);
  const subscribed = Boolean(summary?.subscribed);
  async function toggle() {
    try {
      await subscribe(interest.id, !subscribed);
      toast({
        kind: 'success',
        message: subscribed
          ? `Unsubscribed from ${interest.title}`
          : `You'll hear about new ${interest.title} events`,
      });
    } catch (reason) {
      toast({ kind: 'error', message: reason instanceof Error ? reason.message : 'Try again.' });
    }
  }
  return (
    <DetailSurface onClose={onClose} fullScreen presentation="inline">
      <ScreenBackground />
      <PageBar title="" onBack={onClose} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <FocusIllustration focusId={interest.illustration} />
        </View>
        <Text
          accessibilityRole="header"
          style={{ color: C.text, fontSize: 36, lineHeight: 44, fontWeight: '700', paddingTop: 16 }}
        >
          {interest.title}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, paddingTop: 6 }}>
          <Stat value={events.length} label={events.length === 1 ? 'Event' : 'Events'} />
          {summary && (
            <Stat
              value={summary.subscribers}
              label={summary.subscribers === 1 ? 'Subscriber' : 'Subscribers'}
            />
          )}
        </View>
        <Text style={{ color: C.muted, fontSize: 16, lineHeight: 23, paddingTop: 12 }}>
          {blurbs[interest.id] ?? `Upcoming ${interest.title} events${city ? ` in ${city}` : ''}.`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            subscribed ? `Unsubscribe from ${interest.title}` : `Subscribe to ${interest.title}`
          }
          accessibilityState={{ selected: subscribed, disabled: !summary }}
          accessibilityHint="Get a notification when a new event in this category is published"
          disabled={!summary}
          onPress={() => void toggle()}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            marginTop: 18,
            paddingHorizontal: 22,
            paddingVertical: 11,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: subscribed ? C.line : C.lime,
            backgroundColor: subscribed ? 'transparent' : C.lime,
            opacity: !summary ? 0.5 : pressed ? 0.75 : 1,
          })}
        >
          <Text
            style={{ color: subscribed ? C.text : C.onAccent, fontSize: 16, fontWeight: '700' }}
          >
            {subscribed ? 'Subscribed ✓' : 'Subscribe'}
          </Text>
        </Pressable>
        <View style={{ height: 0.5, backgroundColor: C.line, marginVertical: 22, marginHorizontal: -20 }} />
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>
          Upcoming{city ? ` in ${city}` : ''}
        </Text>
        <View style={{ gap: 18, paddingTop: 12 }}>
          {groupEventsByDay(events).map(day => (
            <EventDayGroup key={day.key} day={day} markFor={markFor} onSelect={onSelect} />
          ))}
          {events.length === 0 && (
            <Card>
              <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
                Nothing coming up yet. Subscribe and we&apos;ll tell you when one is published.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </DetailSurface>
  );
}
