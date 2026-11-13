import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useOutbound } from './OutboundLink';
import { Text } from './design/Text';
import type { CityEvent } from '../../shared/mobile';
import { eventWebsite } from '../../shared/event-discovery';
import { hit, opacity, radius, space, useTheme } from './design/theme';
export function EventHosts({
  event,
  onLink,
}: {
  event: CityEvent;
  onLink?: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const openExternal = useOutbound();
  function open(name: string, url: string) {
    void name;
    if (!eventWebsite(url)) return;
    if (onLink) onLink(url);
    else void openExternal(url);
  }
  return (
    <View style={{ gap: space.ms }}>
      <Text variant="footnote" style={{ color: C.muted }}>HOSTED BY</Text>
      {event.organizers?.length ? (
        event.organizers.map((host, index) => (
          <Pressable
            key={`${host.profileUrl}:${index}`}
            disabled={!host.profileUrl}
            accessibilityRole={host.profileUrl ? 'link' : undefined}
            accessibilityLabel={`${host.name}, public organiser profile`}
            accessibilityHint="Asks before opening an external website"
            onPress={() => {
              if (host.profileUrl) open(host.name, host.profileUrl);
            }}
            style={({ pressed }) => ({
              minHeight: hit,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.ms,
              opacity: pressed ? opacity.pressed : 1,
            })}
          >
            {host.avatarUrl ? (
              <Image
                source={{ uri: host.avatarUrl }}
                style={{ width: 38, height: 38, borderRadius: radius.pill }}
              />
            ) : (
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.pill,
                  backgroundColor: C.card,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: C.lime, fontWeight: '600' }}>
                  {host.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(word => word[0])
                    .join('')}
                </Text>
              </View>
            )}
            <Text variant="callout" style={{ flex: 1, minWidth: 0, color: C.text, fontWeight: '600' }}>
              {host.name}
            </Text>
            {host.profileUrl && <Text variant="body" style={{ color: C.muted }}>↗</Text>}
          </Pressable>
        ))
      ) : (
        <Text variant="subhead" style={{ color: C.muted }}>
          Host details are on the organiser’s event page.
        </Text>
      )}
    </View>
  );
}
