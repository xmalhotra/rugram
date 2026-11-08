import React, { useEffect, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import type { CityEvent, MobilePayload, Product } from '../../shared/mobile';
import { formatEventTime } from '../../shared/format';
import { savedPicks } from '../../shared/saved-picks';
import { shareProfile } from '../../shared/sharing';
import { Text } from './design/Text';
import { useToast } from './design/states';
import { useTheme } from './design/theme';
import { AppearanceSettings } from './AppearanceSettings';
import { AnimationSettings } from './motion';
import { AccountPrivacy } from './AccountPrivacy';
import { AccountDetails } from './AccountDetails';
import { ProfileAvatar } from '../app/profile';
import { AboutYouForm } from './AboutYou';
import { deleteFlowMetrics, flowRunHome } from './flow-runs';
import type { UserMetrics } from '../../shared/flow-benchmarks';
import { catalogFlows, catalogSections, catalogTile } from '../../shared/flow-catalog';
import type { CommunityActivity } from '../../shared/community-flows';
import { countBySection, dayStreak } from '../../shared/profile-stats';
import { liveFlowId, liveFlowIds } from './catalog-live';
import { useCommunityMember } from './community';
import { ActivityDetailSheet, referencedCards } from './CommunityFeed';
import { FlowIllustration } from './FlowIllustration';
import { ProfileWorkouts } from './ProfileWorkouts';

export function YouProfile({
  data,
  busy,
  onEvent,
  onPick,
  onFlowMap,
  onResumeRun,
  onExplore,
  onLogout,
  onSaveName,
  onSaveUsername,
  onRequestEmail,
  onVerifyEmail,
}: {
  data: MobilePayload;
  busy: boolean;
  onEvent: (event: CityEvent) => void;
  onPick: (product: Product) => void;
  /** Opens the full map in Yours. */
  onFlowMap: () => void;
  /** Carries on with a workout that's in progress. */
  onResumeRun: (run: { kind: 'flow' | 'personal'; flowId: string; title: string }) => void;
  /** Opens the catalog to start a map. */
  onExplore: () => void;
  onLogout: () => void;
  onSaveName: (name: string) => Promise<boolean>;
  onSaveUsername: (username: string) => Promise<boolean>;
  onRequestEmail: (email: string) => Promise<{ challengeId: string; mockCode?: string } | null>;
  onVerifyEmail: (challengeId: string, code: string) => Promise<boolean>;
}) {
  const { colors: C } = useTheme();
  const toast = useToast();
  const savedEvents = data.events.filter(event => data.profile.savedEventIds?.includes(event.id));
  const registrations = (data.registrations ?? []).flatMap(registration => {
    if (!['pending', 'approved'].includes(registration.status)) return [];
    const event = data.events.find(item => item.id === registration.eventId);
    return event ? [{ event, status: registration.status }] : [];
  });
  const joined = data.events.filter(event => data.profile.eventIds.includes(event.id));
  const picks = savedPicks(data).products;
  const [view, setView] = useState<'main' | 'menu' | 'account'>('main');
  const [finished, setFinished] = useState<{ count: number; at: string[] } | null>(null);
  const [opened, setOpened] = useState<CommunityActivity | null>(null);
  const member = useCommunityMember(data.user.id);
  const [about, setAbout] = useState(false);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  useEffect(() => {
    let cancel = false;
    void flowRunHome()
      .then(home => {
        if (cancel) return;
        setMetrics(home.metrics);
        setFinished({ count: home.finished, at: home.finishedAt });
      })
      .catch(() => {
        if (!cancel) setMetrics(null);
      });
    return () => {
      cancel = true;
    };
  }, []);
  const role =
    data.user.role === 'admin' ? 'Admin' : data.user.role === 'creator' ? 'Creator' : '';
  // Only flows live in the catalog count; the old library stays out of sight.
  const mapSections = countBySection(
    catalogFlows.flatMap(flow => {
      const id = liveFlowId(flow);
      const sectionId = catalogTile(flow.tileId)?.sectionId;
      const title = catalogSections.find(section => section.id === sectionId)?.title;
      return id && title && data.profile.flowIds.includes(id) ? [title] : [];
    }),
  );
  const line = [...mapSections.slice(0, 2).map(section => section.title), data.profile.city, role]
    .filter(Boolean)
    .join(' · ');
  const posts = (member.value?.activities ?? []).filter(activity =>
    liveFlowIds.has(activity.personalFlowId),
  );

  if (view === 'account') {
    return (
      <View style={{ gap: 20, paddingTop: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to menu"
          onPress={() => setView('menu')}
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
          onSaveUsername={onSaveUsername}
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

  if (view === 'main') {
    const stats = [
      ['Flows done', finished?.count],
      ['Day streak', finished ? dayStreak(finished.at, Date.now()) : undefined],
      ['Followers', member.value?.member.followers],
      ['Following', member.value?.member.following],
    ] as const;
    const action = (label: string, onPress: () => void) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.line,
          backgroundColor: C.card,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      </Pressable>
    );
    return (
      <View style={{ gap: 20, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ProfileAvatar name={data.user.name} avatarUrl={data.user.avatarUrl} />
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row' }}>
            {stats.map(([label, value]) => (
              <View key={label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>{value ?? '–'}</Text>
                <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center' }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
              {data.user.name}
            </Text>
            <Text numberOfLines={1} style={{ color: C.muted, fontSize: 15 }}>
              @{data.user.handle}
            </Text>
            {!!line && <Text style={{ color: C.muted, fontSize: 15 }}>{line}</Text>}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menu and settings"
            onPress={() => setView('menu')}
            hitSlop={6}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', gap: 5 }}
          >
            {[0, 1, 2].map(bar => (
              <View key={bar} style={{ width: 22, height: 2, borderRadius: 1, backgroundColor: C.text }} />
            ))}
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {action('Edit profile', () => setView('account'))}
          {action('Share profile', () => {
            void Share.share(shareProfile(data.user)).catch(cause => {
              toast({
                kind: 'error',
                message: cause instanceof Error ? cause.message : 'Could not open sharing.',
              });
            });
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mapSections.length ? 'Open your flow map' : 'Start your flow map'}
          onPress={mapSections.length ? onFlowMap : onExplore}
          style={({ pressed }) => ({
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: C.card,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>Flow map</Text>
            <Text numberOfLines={1} style={{ color: C.muted, fontSize: 14 }}>
              {mapSections.length
                ? mapSections.map(section => `${section.title} ${section.count}`).join(' · ')
                : 'Start your map from the Flows tab'}
            </Text>
          </View>
          <Text style={{ color: C.muted, fontSize: 22 }}>›</Text>
        </Pressable>
        <ProfileWorkouts onResume={onResumeRun} />
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
            Timeline
          </Text>
          {posts.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {posts.map(post => {
                const cover = referencedCards(post.cards.slice(0, 1), data.flows)[0];
                return (
                  <Pressable
                    key={post.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open your post about ${post.title}`}
                    onPress={() => setOpened(post)}
                    style={{
                      width: '32.6%',
                      aspectRatio: 1,
                      borderRadius: 8,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: C.card,
                    }}
                  >
                    {cover ? (
                      <FlowIllustration flow={cover} cover />
                    ) : (
                      <Text numberOfLines={3} style={{ color: C.text, fontSize: 13, textAlign: 'center', padding: 6 }}>
                        {post.title}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
              Finish a flow and post it, and it shows up here.
            </Text>
          )}
        </View>
        {opened && (
          <ActivityDetailSheet
            activity={opened}
            library={data.flows}
            onClose={() => setOpened(null)}
            onOpen={() => setOpened(null)}
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: 28, paddingTop: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to profile"
        onPress={() => setView('main')}
        style={({ pressed }) => ({
          minHeight: 44,
          justifyContent: 'center',
          alignSelf: 'flex-start',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: C.lime, fontSize: 16 }}>Back</Text>
      </Pressable>
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
          <Row
            title="About you"
            detail={metrics ? `${metrics.weightKg} kg` : 'Birth year, weight and activity'}
            onPress={() => setAbout(current => !current)}
          />
          {metrics ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete my details"
              onPress={() => {
                void deleteFlowMetrics()
                  .then(() => {
                    setMetrics(null);
                    setAbout(false);
                  })
                  .catch(() => undefined);
              }}
              style={({ pressed }) => ({
                minHeight: 48,
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: C.danger, fontSize: 16 }}>Delete my details</Text>
            </Pressable>
          ) : null}
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Row title="Account settings" onPress={() => setView('account')} />
        </View>
        {about ? (
          <AboutYouForm
            initial={metrics}
            onSaved={saved => {
              setMetrics(saved);
              setAbout(false);
            }}
          />
        ) : null}
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
