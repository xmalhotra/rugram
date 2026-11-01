import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { CityEvent, MobilePayload, Product } from '../../shared/mobile';
import { formatEventTime } from '../../shared/format';
import { savedPicks } from '../../shared/saved-picks';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { AppearanceSettings } from './AppearanceSettings';
import { AnimationSettings } from './motion';
import { AccountPrivacy } from './AccountPrivacy';
import { AccountDetails } from './AccountDetails';

export function YouProfile({
  data,
  busy,
  doneToday,
  onEvent,
  onPick,
  onLogout,
  onSaveName,
  onRequestEmail,
  onVerifyEmail,
}: {
  data: MobilePayload;
  busy: boolean;
  doneToday: number;
  onEvent: (event: CityEvent) => void;
  onPick: (product: Product) => void;
  onLogout: () => void;
  onSaveName: (name: string) => Promise<boolean>;
  onRequestEmail: (email: string) => Promise<{ challengeId: string; mockCode?: string } | null>;
  onVerifyEmail: (challengeId: string, code: string) => Promise<boolean>;
}) {
  const { colors: C } = useTheme();
  const savedEvents = data.events.filter(event => data.profile.savedEventIds?.includes(event.id));
  const registrations = (data.registrations ?? []).flatMap(registration => {
    if (!['pending', 'approved'].includes(registration.status)) return [];
    const event = data.events.find(item => item.id === registration.eventId);
    return event ? [{ event, status: registration.status }] : [];
  });
  const joined = data.events.filter(event => data.profile.eventIds.includes(event.id));
  const picks = savedPicks(data).products;
  const [accountSettings, setAccountSettings] = useState(false);
  const role =
    data.user.role === 'admin' ? 'Admin' : data.user.role === 'creator' ? 'Creator' : '';
  const summary = [
    doneToday ? `${doneToday} ${doneToday === 1 ? 'step' : 'steps'} today` : '',
    picks.length ? `${picks.length} ${picks.length === 1 ? 'pick' : 'picks'}` : '',
    joined.length ? `${joined.length} ${joined.length === 1 ? 'event' : 'events'}` : '',
  ].filter(Boolean);

  if (accountSettings) {
    return (
      <View style={{ gap: 20, paddingTop: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to You"
          onPress={() => setAccountSettings(false)}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            alignSelf: 'flex-start',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: C.lime, fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 28, fontWeight: '600' }}>
          Account settings
        </Text>
        <AccountDetails
          data={data}
          busy={busy}
          onSaveName={onSaveName}
          onRequestEmail={onRequestEmail}
          onVerifyEmail={onVerifyEmail}
        />
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: C.card,
            paddingHorizontal: 16,
          }}
        >
          <AccountPrivacy />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            disabled={busy}
            onPress={onLogout}
            style={({ pressed }) => ({
              minHeight: 48,
              justifyContent: 'center',
              opacity: busy ? 0.5 : pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: C.text, fontSize: 16 }}>Log out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 28, paddingTop: 4 }}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 28, fontWeight: '600' }}>
          {data.user.name}
        </Text>
        <Text numberOfLines={1} style={{ color: C.muted, fontSize: 15 }}>
          @{data.user.handle}
        </Text>
        <Text style={{ color: C.muted, fontSize: 15 }}>
          {[data.profile.city, role].filter(Boolean).join(' · ')}
        </Text>
        {summary.length > 0 && (
          <Text style={{ color: C.muted, fontSize: 15, marginTop: 8 }}>{summary.join(' · ')}</Text>
        )}
      </View>

      <Section title="Saved events">
        {savedEvents.map(event => (
          <Row
            key={event.id}
            title={event.title}
            detail="Not registered"
            onPress={() => onEvent(event)}
          />
        ))}
      </Section>

      <Section title="Saved picks">
        {picks.map(product => (
          <Row
            key={product.id}
            title={product.title}
            detail={product.variantLabel || product.category}
            onPress={() => onPick(product)}
          />
        ))}
      </Section>

      <Section title="Registrations">
        {registrations.map(item => (
          <Row
            key={item.event.id}
            title={item.event.title}
            detail={item.status === 'approved' ? 'Registered' : 'Waiting for approval'}
            onPress={() => onEvent(item.event)}
          />
        ))}
      </Section>

      <Section title="Events you joined">
        {joined.map(event => (
          <Row
            key={event.id}
            title={event.title}
            detail={`${event.city} · ${formatEventTime(new Date(event.startsAt))}`}
            onPress={() => onEvent(event)}
          />
        ))}
      </Section>

      <View style={{ gap: 8 }}>
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600' }}>Settings</Text>
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: C.card,
            paddingHorizontal: 16,
          }}
        >
          <AppearanceSettings />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <AnimationSettings />
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Row title="Account settings" onPress={() => setAccountSettings(true)} />
        </View>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  const { colors: C } = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: C.muted, fontSize: 13, fontWeight: '600' }}>
        {title}
      </Text>
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          paddingHorizontal: 16,
        }}
      >
        {items.map((child, index) => (
          <View key={index}>
            {index > 0 && <View style={{ height: 1, backgroundColor: C.line }} />}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

function Row({
  title,
  detail,
  onPress,
  trailing,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={detail ? `${title}, ${detail}` : title}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: 56,
          paddingVertical: 12,
          justifyContent: 'center',
          gap: 2,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text numberOfLines={2} style={{ color: C.text, fontSize: 16, fontWeight: '500' }}>
          {title}
        </Text>
        {detail ? (
          <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
            {detail}
          </Text>
        ) : null}
      </Pressable>
      {trailing}
    </View>
  );
}
