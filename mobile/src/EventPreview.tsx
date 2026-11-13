import { formatDate } from '../../shared/format';
import React from 'react';
import { Pressable, View } from 'react-native';
import type { CityEvent } from '../../shared/mobile';
import { eventCost } from '../../shared/flow-connections';
import { FocusIllustration } from './FocusIllustration';
import { Text } from './design/Text';
import { opacity, radius, space, stroke, useTheme } from './design/theme';
import {ReasonLine} from './design/states';
import {eventReason} from '../../shared/reasons';
export function EventPreview({ event, onPress }: { event: CityEvent; onPress: () => void }) {
  const { colors: C } = useTheme();
  const date = new Date(event.startsAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${event.title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 168,
        padding: space.ms,
        borderRadius: radius.card,
        borderWidth: stroke.line,
        borderColor: C.line,
        backgroundColor: C.card,
        gap: space.ms,
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <View
        style={{
          height: 112,
          borderRadius: radius.control,
          backgroundColor: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
        />
      </View>
      <Text variant="caption" style={{ color: C.lime, fontWeight: '600' }}>
        {formatDate(date, { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
        {event.simulation ? ' · Demo' : ''}
      </Text>
      <Text
        numberOfLines={3}
        variant="callout"
        style={{ color: C.text, fontWeight: '600' }}
      >
        {event.title}
      </Text>
      <Text numberOfLines={1} variant="caption" style={{ color: C.muted }}>
        {event.venue}
      </Text>
      <Text numberOfLines={1} variant="footnote" style={{ color: C.text }}>
        {eventCost(event)}
      </Text>
      <ReasonLine>{eventReason(event)}</ReasonLine>
      <Text variant="caption" style={{ color: C.lime, fontWeight: '600' }}>View event →</Text>
    </Pressable>
  );
}
