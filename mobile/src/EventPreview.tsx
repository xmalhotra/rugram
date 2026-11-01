import { formatDate } from '../../shared/format';
import React from 'react';
import { Pressable, View } from 'react-native';
import type { CityEvent } from '../../shared/mobile';
import { eventCost } from '../../shared/flow-connections';
import { FocusIllustration } from './FocusIllustration';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
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
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.card,
        gap: 10,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          height: 112,
          borderRadius: 14,
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
      <Text style={{ color: C.lime, fontSize: 12, fontWeight: '600' }}>
        {formatDate(date, { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
        {event.simulation ? ' · Demo' : ''}
      </Text>
      <Text
        numberOfLines={3}
        style={{ color: C.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}
      >
        {event.title}
      </Text>
      <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>
        {event.venue}
      </Text>
      <Text numberOfLines={1} style={{ color: C.text, fontSize: 13 }}>
        {eventCost(event)}
      </Text>
      <ReasonLine>{eventReason(event)}</ReasonLine>
      <Text style={{ color: C.lime, fontSize: 12, fontWeight: '600' }}>View event →</Text>
    </Pressable>
  );
}
