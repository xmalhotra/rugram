import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useOutbound } from './OutboundLink';
import { Text } from './design/Text';
import type { CityEvent } from '../../shared/mobile';
import { eventWebsite } from '../../shared/event-discovery';
import { useTheme } from './design/theme';
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
    <View style={{ gap: 10 }}>
      <Text style={{ color: C.muted, fontSize: 13 }}>HOSTED BY</Text>
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
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {host.avatarUrl ? (
              <Image
                source={{ uri: host.avatarUrl }}
                style={{ width: 38, height: 38, borderRadius: 19 }}
              />
            ) : (
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
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
            <Text style={{ flex: 1, minWidth: 0, color: C.text, fontSize: 16, fontWeight: '600' }}>
              {host.name}
            </Text>
            {host.profileUrl && <Text style={{ color: C.muted, fontSize: 18 }}>↗</Text>}
          </Pressable>
        ))
      ) : (
        <Text style={{ color: C.muted, fontSize: 15 }}>
          Host details are on the organiser’s event page.
        </Text>
      )}
    </View>
  );
}
