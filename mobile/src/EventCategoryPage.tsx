import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { CityEvent } from '../../shared/mobile';
import type { EventInterest } from '../../shared/event-interests';
import { groupEventsByDay } from '../../shared/event-timeline';
import { DetailSurface } from './design/DetailSurface';
import { ScreenBackground } from './design/ScreenBackground';
import { PageBar } from './design/PageBar';
import { Text } from './design/Text';
import { opacity, radius, space, stroke, useTheme } from './design/theme';
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
    <Text variant="callout" style={{ color: C.muted }}>
      <Text style={{ color: C.text, fontWeight: '600' }}>{value}</Text> {label}
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 120 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: radius.pill,
            backgroundColor: C.card,
            borderWidth: stroke.line,
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
          variant="display"
          style={{ color: C.text, paddingTop: space.md }}
        >
          {interest.title}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, paddingTop: space.sm }}>
          <Stat value={events.length} label={events.length === 1 ? 'Event' : 'Events'} />
          {summary && (
            <Stat
              value={summary.subscribers}
              label={summary.subscribers === 1 ? 'Subscriber' : 'Subscribers'}
            />
          )}
        </View>
        <Text variant="callout" style={{ color: C.muted, paddingTop: space.ms }}>
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
            marginTop: space.md,
            paddingHorizontal: space.xl,
            paddingVertical: space.ms,
            borderRadius: radius.card,
            borderWidth: stroke.line,
            borderColor: subscribed ? C.line : C.lime,
            backgroundColor: subscribed ? 'transparent' : C.lime,
            opacity: !summary ? 0.5 : pressed ? opacity.pressed : 1,
          })}
        >
          <Text
            variant="callout"
            style={{ color: subscribed ? C.text : C.onAccent, fontWeight: '600' }}
          >
            {subscribed ? 'Subscribed ✓' : 'Subscribe'}
          </Text>
        </Pressable>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: space.xl, marginHorizontal: -space.lg }} />
        <Text accessibilityRole="header" variant="heading" style={{ color: C.text }}>
          Upcoming{city ? ` in ${city}` : ''}
        </Text>
        <View style={{ gap: space.md, paddingTop: space.ms }}>
          {groupEventsByDay(events).map(day => (
            <EventDayGroup key={day.key} day={day} markFor={markFor} onSelect={onSelect} />
          ))}
          {events.length === 0 && (
            <Card>
              <Text variant="callout" style={{ color: C.muted }}>
                Nothing coming up yet. Subscribe and we&apos;ll tell you when one is published.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </DetailSurface>
  );
}
