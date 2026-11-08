import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Share, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { HabitFlow, MobilePayload } from '../../shared/mobile';
import {
  curationLimits,
  describeChange,
  mergeTimeline,
  type CommunityActivity,
  type TimelineEntry,
  type CommunityAction,
  type CommunityFeed as Feed,
  type CommunityFeedItem,
  type CommunityFlow,
  type CommunityTab,
} from '../../shared/community-flows';
import {
  findFlowCard,
  resolvePersonalFlow,
  type FlowCardReference,
} from '../../shared/personal-flows';
import { flowCreationEnabled } from '../../shared/flow-catalog';
import { liveFlowIds } from './catalog-live';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { Avatar as ProfilePhoto, Button, EmptyState, Sheet, useToast } from './design/components';
import { DetailSurface } from './design/DetailSurface';
import { ScreenBackground } from './design/ScreenBackground';
import { PageBar } from './design/PageBar';
import { usePaneState } from './pane-state';
import { FlowIllustration } from './FlowIllustration';
import { AnimalMovementDeck } from './AnimalMovementDeck';
import { LogoLoader } from './motion';
import { avatarUri } from './avatar';
import {
  communityAct,
  newPersonalFlowId,
  useCommunityFeed,
  useCommunityFlow,
  useCommunityMember,
  useCuration,
  usePeopleSearch,
} from './community';
import { personalCardInformation } from './PersonalFlowDetails';

type Copy = Feed['copies'][number];

function resolveCards(flow: CommunityFlow, library: HabitFlow[]) {
  return resolvePersonalFlow(
    { id: flow.id, name: flow.title, cards: flow.cards, createdAt: '', updatedAt: '' },
    library,
  );
}

function shortDate(at: string) {
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

type IconKind = 'upvote' | 'repost' | 'add' | 'share';
function Icon({ kind, active }: { kind: IconKind; active: boolean }) {
  const { colors: C } = useTheme();
  const color = active ? C.lime : C.muted;
  const path =
    kind === 'upvote'
      ? 'M12 4 19 12h-4.5v8h-5v-8H5Z'
      : kind === 'repost'
        ? 'M4 9V7.5A2.5 2.5 0 0 1 6.5 5H18m0 0-3-3m3 3-3 3M20 15v1.5a2.5 2.5 0 0 1-2.5 2.5H6m0 0 3 3m-3-3 3-3'
        : kind === 'share'
          ? 'M12 15V4m0 0L8 8m4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5'
          : 'M12 5v14M5 12h14';
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={path}
        fill={kind === 'upvote' && active ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Marks AI-curated surfaces. */
export function Sparkle({ size = 16, color }: { size?: number; color?: string }) {
  const { colors: C } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M10 2.5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7ZM18.5 13c.3 2.1 1.4 3.2 3.5 3.5-2.1.3-3.2 1.4-3.5 3.5-.3-2.1-1.4-3.2-3.5-3.5 2.1-.3 3.2-1.4 3.5-3.5Z"
        fill={color ?? C.lime}
      />
    </Svg>
  );
}

function Action({
  kind,
  active,
  label,
  count,
  disabled,
  onPress,
}: {
  kind: IconKind;
  active: boolean;
  label: string;
  count?: number | string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight: 44,
        minWidth: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Icon kind={kind} active={active} />
      {count !== undefined && (
        <Text style={{ color: active ? C.lime : C.muted, fontSize: 14 }}>{count}</Text>
      )}
    </Pressable>
  );
}

/** Upvote, repost and Add to mine, shared by the feed card and the detail sheet. */
type Guess = { upvoted?: boolean; reposted?: boolean; followsAuthor?: boolean };

/**
 * Upvote, repost and follow change on tap and settle when the server answers;
 * a failure puts them back. Only the tapped action waits, so nothing else dims.
 */
function useFlowActions(source: CommunityFlow, copy: Copy | undefined, onSaved: () => void) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [guess, setGuess] = useState<Guess>({});
  const inFlight = useRef(new Set<keyof Guess>());
  // Fresh server data replaces the guesses.
  useEffect(
    () => setGuess({}),
    [
      source.upvotes,
      source.reposts,
      source.viewer.upvoted,
      source.viewer.reposted,
      source.viewer.followsAuthor,
    ],
  );
  const upvoted = guess.upvoted ?? source.viewer.upvoted;
  const reposted = guess.reposted ?? source.viewer.reposted;
  const shift = (now: boolean, was: boolean) => (now === was ? 0 : now ? 1 : -1);
  const flow: CommunityFlow = {
    ...source,
    upvotes: source.upvotes + shift(upvoted, source.viewer.upvoted),
    reposts: source.reposts + shift(reposted, source.viewer.reposted),
    viewer: {
      ...source.viewer,
      upvoted,
      reposted,
      followsAuthor: guess.followsAuthor ?? source.viewer.followsAuthor,
    },
  };
  async function toggle(key: keyof Guess, action: CommunityAction, message?: string) {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    const next = !flow.viewer[key];
    setGuess(current => ({ ...current, [key]: next }));
    try {
      await communityAct(action);
      if (message) toast({ kind: 'success', message });
    } catch (error) {
      setGuess(current => ({ ...current, [key]: !next }));
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      inFlight.current.delete(key);
    }
  }
  async function save(action: CommunityAction, message: string) {
    if (saving) return;
    setSaving(true);
    try {
      await communityAct(action);
      toast({ kind: 'success', message });
      onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setSaving(false);
    }
  }
  const outdated = copy && copy.latestVersion !== null && copy.latestVersion > copy.savedVersion;
  return {
    flow,
    saving,
    upvote: () =>
      void toggle('upvoted', { action: 'upvote', id: flow.id, enabled: !flow.viewer.upvoted }),
    repost: () =>
      void toggle(
        'reposted',
        { action: 'repost', id: flow.id, enabled: !flow.viewer.reposted },
        flow.viewer.reposted ? 'Repost removed' : 'Reposted to your followers',
      ),
    follow: () =>
      void toggle('followsAuthor', {
        action: 'follow',
        authorId: flow.author.id,
        enabled: !flow.viewer.followsAuthor,
      }),
    save: () =>
      outdated
        ? void save(
            { action: 'take-update', personalFlowId: copy.personalFlowId },
            'Your copy is up to date',
          )
        : copy
          ? undefined
          : void save(
              { action: 'save', id: flow.id, personalFlowId: newPersonalFlowId() },
              'Added to your flows',
            ),
    saveLabel: outdated ? 'Update' : copy ? 'Saved' : 'Add',
    saved: Boolean(copy),
  };
}

function Actions({ actions }: { actions: ReturnType<typeof useFlowActions> }) {
  const { flow } = actions;
  const own = flow.viewer.own;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Action
        kind="upvote"
        active={flow.viewer.upvoted}
        count={flow.upvotes}
        disabled={own}
        label={`${flow.viewer.upvoted ? 'Remove upvote' : 'Upvote'}, ${flow.upvotes} upvotes`}
        onPress={actions.upvote}
      />
      <Action
        kind="repost"
        active={flow.viewer.reposted}
        count={flow.reposts}
        disabled={own}
        label={`${flow.viewer.reposted ? 'Undo repost' : 'Repost'}, ${flow.reposts} reposts`}
        onPress={actions.repost}
      />
      <Action
        kind="add"
        active={actions.saved}
        count={actions.saveLabel}
        disabled={own || actions.saving || actions.saveLabel === 'Saved'}
        label={
          actions.saveLabel === 'Update'
            ? 'Get the latest version into your copy'
            : actions.saved
              ? 'Saved to your flows'
              : 'Add to your flows'
        }
        onPress={actions.save}
      />
      <Action
        kind="share"
        active={false}
        label={`Share ${flow.title}`}
        onPress={() =>
          void Share.share({
            message: `${flow.title} by ${flow.author.name} on Qram: ${flow.cards.map(card => card.title).join(' → ')}`,
          }).catch(() => undefined)
        }
      />
    </View>
  );
}

function relativeTime(at: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / 1440)}d`;
  return shortDate(at);
}

const avatarColors = ['#2F6F4E', '#6650A4', '#215EA8', '#9A4A2B', '#7B4D00', '#1F6F78'];
function Avatar({ id, name, size = 44 }: { id: string; name: string; size?: number }) {
  const hue = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length;
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColors[hue],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.42, fontWeight: '600' }}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

/** Card images in the familiar 1-4 photo grid; a fifth or later card shows as "+N". */
function Media({ cards, total }: { cards: HabitFlow[]; total: number }) {
  const { colors: C } = useTheme();
  const shown = cards.slice(0, 4);
  if (!shown.length) return null;
  const tile = (card: HabitFlow, index: number, style: object) => (
    <View
      key={`${card.id}:${index}`}
      style={[{ overflow: 'hidden', backgroundColor: C.card }, style]}
    >
      <FlowIllustration flow={card} cover />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 8,
          paddingVertical: 6,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      >
        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
          {index + 1}. {card.title}
        </Text>
      </View>
      {index === 3 && total > 4 && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '600' }}>+{total - 4}</Text>
        </View>
      )}
    </View>
  );
  const frame = {
    flexDirection: 'row' as const,
    gap: 2,
    height: shown.length === 1 ? 200 : 220,
    borderRadius: 16,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: C.line,
  };
  if (shown.length === 1) return <View style={frame}>{tile(shown[0], 0, { flex: 1 })}</View>;
  if (shown.length === 2)
    return <View style={frame}>{shown.map((card, index) => tile(card, index, { flex: 1 }))}</View>;
  if (shown.length === 3)
    return (
      <View style={frame}>
        {tile(shown[0], 0, { flex: 1 })}
        <View style={{ flex: 1, gap: 2 }}>
          {tile(shown[1], 1, { flex: 1 })}
          {tile(shown[2], 2, { flex: 1 })}
        </View>
      </View>
    );
  // Four read row by row: 1 2 / 3 4.
  return (
    <View style={[frame, { flexDirection: 'column' }]}>
      {[0, 2].map(row => (
        <View key={row} style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
          {tile(shown[row], row, { flex: 1 })}
          {tile(shown[row + 1], row + 1, { flex: 1 })}
        </View>
      ))}
    </View>
  );
}

function FlowPost({
  item,
  library,
  copy,
  onOpen,
  onSaved,
  onMember,
  reason,
}: {
  item: CommunityFeedItem;
  library: HabitFlow[];
  copy: Copy | undefined;
  onOpen: () => void;
  onSaved: () => void;
  onMember: (id: string) => void;
  reason?: string;
}) {
  const { colors: C } = useTheme();
  const { flow } = item;
  const cards = resolveCards(flow, library).cards;
  const actions = useFlowActions(flow, copy, onSaved);
  const name = flow.viewer.own ? 'You' : flow.author.name;
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line, gap: 4 }}>
      {item.repostedBy && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 26 }}>
          <Icon kind="repost" active={false} />
          <Text
            onPress={() => onMember(item.repostedBy!.id)}
            style={{ color: C.muted, fontSize: 13, fontWeight: '600' }}
          >
            {item.repostedBy.name} reposted
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${flow.author.name}'s profile`}
          onPress={() => onMember(flow.author.id)}
          hitSlop={4}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Avatar id={flow.author.id} name={flow.author.name} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              onPress={() => onMember(flow.author.id)}
              numberOfLines={1}
              style={{ flexShrink: 1, color: C.muted, fontSize: 15 }}
            >
              <Text style={{ color: C.text, fontWeight: '700' }}>{name}</Text> @{flow.author.handle}{' '}
              · {relativeTime(flow.editedAt ?? flow.publishedAt)}
            </Text>
            <View style={{ flex: 1 }} />
            {!flow.viewer.own && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${actions.flow.viewer.followsAuthor ? 'Unfollow' : 'Follow'} ${flow.author.name}`}
                onPress={actions.follow}
                hitSlop={8}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: actions.flow.viewer.followsAuthor ? C.line : C.text,
                  backgroundColor: actions.flow.viewer.followsAuthor ? 'transparent' : C.text,
                }}
              >
                <Text
                  style={{
                    color: actions.flow.viewer.followsAuthor ? C.text : C.bg,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {actions.flow.viewer.followsAuthor ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            )}
          </View>
          {!!reason && (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <Sparkle size={14} />
              <Text style={{ flex: 1, color: C.lime, fontSize: 13, lineHeight: 18 }}>{reason}</Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${flow.title} by ${flow.author.name}, ${flow.cards.length} cards`}
            onPress={onOpen}
            style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.75 : 1 })}
          >
            <Text style={{ color: C.text, fontSize: 16, lineHeight: 22 }}>
              <Text style={{ fontWeight: '700' }}>{flow.title}</Text>
              {flow.description ? `\n${flow.description}` : ''}
            </Text>
            <Media cards={cards} total={cards.length} />
            <Text style={{ color: C.muted, fontSize: 13 }}>
              {flow.cards.length} card sequence{flow.editedAt ? ' · Edited' : ''}
            </Text>
          </Pressable>
          <Actions actions={actions} />
        </View>
      </View>
    </View>
  );
}

type FeedProps = {
  tab: CommunityTab;
  data: MobilePayload;
  onOpen: (id: string) => void;
  onSaved: () => void;
  onShowYours: () => void;
  onMember: (id: string) => void;
};

function Curated({
  prompt,
  onClear,
  ...props
}: FeedProps & { prompt: string; onClear: () => void }) {
  const { colors: C } = useTheme();
  const { value, error, loading, reload } = useCuration(prompt);
  // Live feed state, so upvotes and reposts on curated posts update in place.
  const { feed } = useCommunityFeed('for-you');
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Sparkle size={16} />
      <Text numberOfLines={1} style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: '600' }}>
        Curated for “{prompt}”
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear curation" onPress={onClear} hitSlop={12}>
        <Text style={{ color: C.lime, fontSize: 15 }}>Clear</Text>
      </Pressable>
    </View>
  );
  if (!value || value.prompt !== prompt.slice(0, curationLimits.prompt))
    return (
      <View style={{ gap: 12 }}>
        {header}
        {loading || !error ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <LogoLoader size={44} label="Curating sequences" />
          </View>
        ) : (
          <EmptyState
            title="Could not curate"
            description={error}
            action={{ label: 'Retry', onPress: () => void reload() }}
          />
        )}
      </View>
    );
  const latest = new Map(feed?.items.map(item => [item.flow.id, item.flow]));
  const copies = new Map(value.copies.map(copy => [copy.publishedId, copy]));
  return (
    <View style={{ gap: 12 }}>
      {header}
      <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>
        {value.summary}
        {value.engine === 'keywords' ? ' Matched by keywords.' : ''}
      </Text>
      {value.items.length === 0 ? (
        <EmptyState
          title="Nothing curated yet"
          description="Try other words, or publish a sequence of your own from Yours."
          action={{ label: 'Go to Yours', onPress: props.onShowYours }}
        />
      ) : (
        <View>
          {value.items.map(item => (
            <FlowPost
              key={item.flow.id}
              item={{ ...item, flow: latest.get(item.flow.id) ?? item.flow }}
              reason={item.reason}
              library={props.data.flows}
              copy={copies.get(item.flow.id)}
              onOpen={() => props.onOpen(item.flow.id)}
              onSaved={props.onSaved}
              onMember={props.onMember}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function CommunityFeed(props: FeedProps) {
  const [prompt, setPrompt] = usePaneState('curatePrompt', '');
  if (props.tab !== 'for-you') return <FeedList {...props} />;
  // The prompt is set from the For you menu in the Home header.
  return prompt ? (
    <Curated {...props} prompt={prompt} onClear={() => setPrompt('')} />
  ) : (
    <FeedList {...props} />
  );
}

function PeopleSearch({
  onMember,
  children,
}: {
  onMember: (id: string) => void;
  children: React.ReactNode;
}) {
  const { colors: C } = useTheme();
  const [query, setQuery] = useState('');
  const { people, error, loading, active } = usePeopleSearch(query);
  const term = query.trim().replace(/^@/, '');
  const showResults = term.length >= 2;
  return (
    <View>
      <View style={{ height: 44, justifyContent: 'center' }}>
        <View
          style={{
            height: 36,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: C.card,
            borderRadius: 18,
            paddingHorizontal: 10,
          }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" accessible={false}>
            <Circle cx={11} cy={11} r={6.5} stroke={C.muted} strokeWidth={2} fill="none" />
            <Path d="M16 16l4.5 4.5" stroke={C.muted} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <TextInput
            accessibilityLabel="Search people"
            value={query}
            onChangeText={setQuery}
            placeholder="Search people"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, height: 36, paddingVertical: 0, color: C.text, fontSize: 14 }}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear people search"
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <Text style={{ color: C.muted, fontSize: 14 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {showResults ? (
        <View style={{ paddingBottom: 8 }}>
          {!active || (loading && people.length === 0) ? (
            <Text style={{ color: C.muted, fontSize: 14, paddingVertical: 8 }}>Searching…</Text>
          ) : error ? (
            <Text style={{ color: C.muted, fontSize: 14, paddingVertical: 8 }}>
              Couldn't search. Try again.
            </Text>
          ) : people.length === 0 ? (
            <Text style={{ color: C.muted, fontSize: 14, paddingVertical: 8 }}>No one found.</Text>
          ) : (
            people.map(person => (
              <Pressable
                key={person.id}
                accessibilityRole="button"
                accessibilityLabel={`${person.name} @${person.handle}`}
                onPress={() => onMember(person.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 44,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <ProfilePhoto name={person.name} uri={avatarUri(person.avatarUrl)} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 15 }}>{person.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>@{person.handle}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

function FeedList({ tab, data, onOpen, onSaved, onMember }: FeedProps) {
  const { colors: C } = useTheme();
  const { feed, error, loading, reload } = useCommunityFeed(tab);
  let body: React.ReactNode;
  if (!feed && loading)
    body = (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <LogoLoader size={44} label="Loading flows" />
      </View>
    );
  else if (!feed)
    body = (
      <EmptyState
        title="Could not load flows"
        description={error || 'Check your connection and try again.'}
        action={{ label: 'Retry', onPress: () => void reload() }}
      />
    );
  else {
    // Published flows and posts about the old library stay out of sight until flows go live.
    const items = flowCreationEnabled ? feed.items : [];
    const activities = feed.activities.filter(activity => liveFlowIds.has(activity.personalFlowId));
    if (!items.length && !activities.length)
      body =
        tab === 'for-you' ? (
          <EmptyState
            title="Nothing here yet"
            description="We're curating the first flows. Have a look in Flows and request the ones you want."
          />
        ) : (
          <EmptyState
            title="Nothing here yet"
            description="When you or people you follow finish a flow and post it, it shows up here."
          />
        );
    else {
      const copies = new Map(feed.copies.map(copy => [copy.publishedId, copy]));
      body = (
        <View>
          <Timeline
            entries={mergeTimeline(items, activities)}
            library={data.flows}
            copies={copies}
            onOpen={onOpen}
            onSaved={onSaved}
            onMember={onMember}
          />
          <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', paddingVertical: 8 }}>
            {tab === 'for-you'
              ? 'Curated from what you build, upvote and repost, plus what is fresh.'
              : 'Newest first from you and people you follow.'}
          </Text>
        </View>
      );
    }
  }
  if (tab !== 'following') return body;
  return <PeopleSearch onMember={onMember}>{body}</PeopleSearch>;
}

function History({
  versions,
  onClose,
}: {
  versions: {
    version: number;
    createdAt: string;
    changes: Parameters<typeof describeChange>[0][];
  }[];
  onClose: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <Sheet title="Edit history" navigation="back" presentation="modal" onClose={onClose}>
      {versions.map(version => (
        <View key={version.version} style={{ gap: 4, paddingVertical: 10 }}>
          <Text style={{ color: C.text, fontWeight: '600' }}>
            Version {version.version} · {shortDate(version.createdAt)}
          </Text>
          {version.changes.length ? (
            version.changes.map((change, index) => (
              <Text key={index} style={{ color: C.muted, lineHeight: 20 }}>
                {describeChange(change)}
              </Text>
            ))
          ) : (
            <Text style={{ color: C.muted }}>First published</Text>
          )}
        </View>
      ))}
    </Sheet>
  );
}

/** A published flow opened from the feed: who made it, its history and its cards. */
export function CommunityFlowSheet({
  id,
  data,
  copies,
  onClose,
  onSaved,
  onAddCard,
  onLink,
  onMember,
}: {
  id: string;
  data: MobilePayload;
  copies: Feed['copies'];
  onClose: () => void;
  onSaved: () => void;
  onAddCard: (card: FlowCardReference) => void;
  onLink: (url: string) => void;
  onMember: (id: string) => void;
}) {
  const { colors: C } = useTheme();
  const { value, error, loading } = useCommunityFlow(id);
  const [history, setHistory] = useState(false);
  const flow = value?.flow;
  const copy = copies.find(item => item.publishedId === id);
  const resolved = flow ? resolveCards(flow, data.flows) : null;
  const share = flow
    ? () =>
        void Share.share({
          message: `${flow.title} by ${flow.author.name} on Qram: ${flow.cards.map(card => card.title).join(' → ')}`,
        }).catch(() => undefined)
    : undefined;
  return (
    <DetailSurface onClose={onClose} fullScreen presentation="inline">
      <ScreenBackground />
      <PageBar
        title={flow?.title ?? 'Flow'}
        onBack={onClose}
        right={
          share && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={share}
              hitSlop={8}
            >
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: 1 }}>
                ···
              </Text>
            </Pressable>
          )
        }
      />
      {!flow ? (
        loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <LogoLoader size={44} label="Loading flow" />
          </View>
        ) : (
          <EmptyState title="Flow unavailable" description={error || 'It may have been removed.'} />
        )
      ) : (
        // The flow itself is the page; who posted it sits compactly above, as on X.
        <View style={{ flex: 1, paddingHorizontal: 20, gap: 12 }}>
          <FlowByline
            flow={flow}
            copy={copy}
            onSaved={onSaved}
            onMember={onMember}
            onHistory={() => setHistory(true)}
          />
          {resolved && resolved.missing.length > 0 && (
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {resolved.missing.length} card{resolved.missing.length === 1 ? ' is' : 's are'} no
              longer in the catalogue.
            </Text>
          )}
          {resolved && resolved.cards.length > 0 ? (
            <AnimalMovementDeck
              key={`${flow.id}:${flow.version}`}
              flow={resolved.flow}
              library={resolved.cards}
              uniformHeader
              added={Boolean(copy)}
              busy={false}
              onAdd={() => {}}
              onHome={() => {}}
              onRemove={() => {}}
              onLink={onLink}
              onAddCard={card => {
                const reference = flow.cards.find(item => item.cardId === card.id);
                if (reference) onAddCard(reference);
              }}
              renderInformation={(card, close) =>
                personalCardInformation({
                  card,
                  close,
                  cards: flow.cards,
                  library: data.flows,
                  onLink,
                })
              }
            />
          ) : (
            <Button title="Back to feed" secondary onPress={onClose} />
          )}
        </View>
      )}
      {history && value && <History versions={value.versions} onClose={() => setHistory(false)} />}
    </DetailSurface>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { colors: C } = useTheme();
  return (
    <Text style={{ color: C.muted, fontSize: 15 }}>
      <Text style={{ color: C.text, fontWeight: '700' }}>{value}</Text> {label}
    </Text>
  );
}

/** A member's profile: avatar, counts, follow, then their posts and reposts. */
export function CommunityMemberSheet({
  id,
  data,
  onClose,
  onOpen,
  onSaved,
  onMember,
}: {
  id: string;
  data: MobilePayload;
  onClose: () => void;
  onOpen: (flowId: string) => void;
  onSaved: () => void;
  onMember: (id: string) => void;
}) {
  const { colors: C } = useTheme();
  const toast = useToast();
  const { value, error, loading } = useCommunityMember(id);
  const [busy, setBusy] = useState(false);
  const member = value?.member;
  async function follow() {
    if (!member || busy) return;
    setBusy(true);
    try {
      await communityAct({
        action: 'follow',
        authorId: member.id,
        enabled: !member.followedByViewer,
      });
    } catch (reason) {
      toast({ kind: 'error', message: reason instanceof Error ? reason.message : 'Try again.' });
    } finally {
      setBusy(false);
    }
  }
  // Published flows and posts about the old library stay out of sight here too.
  const items = flowCreationEnabled ? (value?.items ?? []) : [];
  const activities = (value?.activities ?? []).filter(activity => liveFlowIds.has(activity.personalFlowId));
  const copies = new Map(value?.copies.map(copy => [copy.publishedId, copy]));
  return (
    <Sheet
      title={member ? member.name : 'Profile'}
      presentation="inline"
      navigation="back"
      fullScreen
      onClose={onClose}
    >
      {!member ? (
        loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <LogoLoader size={44} label="Loading profile" />
          </View>
        ) : (
          <EmptyState
            title="Profile unavailable"
            description={error || 'This member is not available.'}
          />
        )
      ) : (
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <Avatar id={member.id} name={member.name} size={72} />
            {!member.own && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${member.followedByViewer ? 'Unfollow' : 'Follow'} ${member.name}`}
                onPress={() => void follow()}
                disabled={busy}
                style={({ pressed }) => ({
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: member.followedByViewer ? C.line : C.text,
                  backgroundColor: member.followedByViewer ? 'transparent' : C.text,
                  opacity: busy ? 0.5 : pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: member.followedByViewer ? C.text : C.bg,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  {member.followedByViewer ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
              {member.own ? `${member.name} (you)` : member.name}
            </Text>
            <Text style={{ color: C.muted, fontSize: 15 }}>@{member.handle}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
            <Stat value={member.following} label="Following" />
            <Stat
              value={member.followers}
              label={member.followers === 1 ? 'Follower' : 'Followers'}
            />
            {flowCreationEnabled && (
              <>
                <Stat
                  value={member.published}
                  label={member.published === 1 ? 'Sequence' : 'Sequences'}
                />
                <Stat value={member.upvotes} label={member.upvotes === 1 ? 'Upvote' : 'Upvotes'} />
              </>
            )}
          </View>
          <View style={{ borderBottomWidth: 1, borderColor: C.line, paddingTop: 4 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', paddingBottom: 10 }}>
              Posts
            </Text>
            <View style={{ height: 4, width: 44, borderRadius: 2, backgroundColor: C.lime }} />
          </View>
          {items.length === 0 && activities.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description={`${member.own ? 'You have' : `${member.name} has`} not posted a finished flow yet.`}
            />
          ) : (
            <Timeline
              entries={mergeTimeline(items, activities)}
              library={data.flows}
              copies={copies}
              onOpen={onOpen}
              onSaved={onSaved}
              onMember={next => (next === member.id ? undefined : onMember(next))}
            />
          )}
        </View>
      )}
    </Sheet>
  );
}

function Timeline({
  entries,
  library,
  copies,
  onOpen,
  onSaved,
  onMember,
}: {
  entries: TimelineEntry[];
  library: HabitFlow[];
  copies: Map<string, Copy>;
  onOpen: (flowId: string) => void;
  onSaved: () => void;
  onMember: (id: string) => void;
}) {
  return (
    <View>
      {entries.map(entry =>
        entry.kind === 'post' ? (
          <FlowPost
            key={`${entry.item.flow.id}:${entry.item.repostedBy?.id ?? ''}`}
            item={entry.item}
            library={library}
            copy={copies.get(entry.item.flow.id)}
            onOpen={() => onOpen(entry.item.flow.id)}
            onSaved={onSaved}
            onMember={onMember}
          />
        ) : (
          <ActivityPost
            key={entry.activity.id}
            activity={entry.activity}
            library={library}
            onOpen={onOpen}
            onMember={onMember}
          />
        ),
      )}
    </View>
  );
}

export function referencedCards(cards: FlowCardReference[], library: HabitFlow[]) {
  return cards.flatMap(card => {
    const found = findFlowCard(library, card.sourceFlowId, card.cardId);
    return found ? [found] : [];
  });
}

function Check({ on, size = 22 }: { on: boolean; size?: number }) {
  const { colors: C } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: on ? C.lime : C.line,
        backgroundColor: on ? C.lime : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on && (
        <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" accessible={false}>
          <Path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke={C.onAccent}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
}

/** "Completed Calm morning": a member's finished run, posted to the timeline. */
function ActivityPost({
  activity,
  library,
  onOpen,
  onMember,
}: {
  activity: CommunityActivity;
  library: HabitFlow[];
  onOpen: (flowId: string) => void;
  onMember: (id: string) => void;
}) {
  const { colors: C } = useTheme();
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const [open, setOpen] = useState(false);
  const cards = referencedCards(activity.cards, library);
  async function remove() {
    setRemoving(true);
    try {
      await communityAct({ action: 'unlog', id: activity.id });
      toast({ kind: 'success', message: 'Removed from your timeline' });
    } catch (reason) {
      toast({ kind: 'error', message: reason instanceof Error ? reason.message : 'Try again.' });
      setRemoving(false);
    }
  }
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: C.line,
        opacity: removing ? 0.5 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${activity.user.name}'s profile`}
          onPress={() => onMember(activity.user.id)}
          hitSlop={4}
        >
          <Avatar id={activity.user.id} name={activity.user.name} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, color: C.muted, fontSize: 15 }}>
              <Text
                onPress={() => onMember(activity.user.id)}
                style={{ color: C.text, fontWeight: '700' }}
              >
                {activity.viewer.own ? 'You' : activity.user.name}
              </Text>{' '}
              @{activity.user.handle} · {relativeTime(activity.at)}
            </Text>
            <View style={{ flex: 1 }} />
            {activity.viewer.own && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove this from your timeline"
                onPress={() => void remove()}
                disabled={removing}
                hitSlop={8}
              >
                <Text style={{ color: C.muted, fontSize: 13 }}>Remove</Text>
              </Pressable>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Check on size={20} />
            <Text
              onPress={() => setOpen(true)}
              style={{ flex: 1, color: C.text, fontSize: 16, lineHeight: 22 }}
            >
              Completed <Text style={{ fontWeight: '700' }}>{activity.title}</Text>
            </Text>
          </View>
          {!!activity.note && (
            <Text style={{ color: C.text, fontSize: 16, lineHeight: 22 }}>{activity.note}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open the completion for ${activity.title}`}
            onPress={() => setOpen(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Media cards={cards} total={cards.length} />
          </Pressable>
        </View>
      </View>
      {open && (
        <ActivityDetailSheet
          activity={activity}
          library={library}
          onClose={() => setOpen(false)}
          onOpen={id => {
            setOpen(false);
            onOpen(id);
          }}
        />
      )}
    </View>
  );
}

/** One check-in on its own: when, what was done, and the note. The flow itself is one tap further. */
export function ActivityDetailSheet({
  activity,
  library,
  onClose,
  onOpen,
}: {
  activity: CommunityActivity;
  library: HabitFlow[];
  onClose: () => void;
  onOpen: (flowId: string) => void;
}) {
  const { colors: C } = useTheme();
  const at = new Date(activity.at);
  return (
    <Sheet title={`Completed ${activity.title}`} presentation="modal" fullScreen onClose={onClose}>
      <Text style={{ color: C.muted, fontSize: 15 }}>
        {activity.viewer.own ? 'You' : activity.user.name} ·{' '}
        {at.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })},{' '}
        {at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </Text>
      {!!activity.note && (
        <Text style={{ color: C.text, fontSize: 17, lineHeight: 24 }}>{activity.note}</Text>
      )}
      <View>
        {activity.cards.map((card, index) => {
          const found = findFlowCard(library, card.sourceFlowId, card.cardId);
          return (
            <View
              key={`${card.sourceFlowId}:${card.cardId}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 8,
                borderBottomWidth: 0.5,
                borderColor: C.line,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: C.card,
                }}
              >
                {found && <FlowIllustration flow={found} cover />}
              </View>
              <Text style={{ flex: 1, color: C.text, fontSize: 16 }}>
                {index + 1}. {card.title}
              </Text>
              <Check on size={20} />
            </View>
          );
        })}
      </View>
      {activity.publishedId && (
        <Button title="Open the flow" secondary onPress={() => onOpen(activity.publishedId!)} />
      )}
    </Sheet>
  );
}

/** Who posted the flow, what it is for, and the post actions, kept short so the flow fills the page. */
function FlowByline({
  flow,
  copy,
  onSaved,
  onMember,
  onHistory,
}: {
  flow: CommunityFlow;
  copy: Copy | undefined;
  onSaved: () => void;
  onMember: (id: string) => void;
  onHistory: () => void;
}) {
  const { colors: C } = useTheme();
  const actions = useFlowActions(flow, copy, onSaved);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${flow.author.name}'s profile`}
          onPress={() => onMember(flow.author.id)}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Avatar id={flow.author.id} name={flow.author.name} size={36} />
          <Text numberOfLines={1} style={{ flex: 1, color: C.muted, fontSize: 15 }}>
            <Text style={{ color: C.text, fontWeight: '700' }}>
              {flow.viewer.own ? 'You' : flow.author.name}
            </Text>{' '}
            @{flow.author.handle} · {relativeTime(flow.editedAt ?? flow.publishedAt)}
          </Text>
        </Pressable>
        {!flow.viewer.own && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${actions.flow.viewer.followsAuthor ? 'Unfollow' : 'Follow'} ${flow.author.name}`}
            onPress={actions.follow}
            hitSlop={8}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: actions.flow.viewer.followsAuthor ? C.line : C.text,
              backgroundColor: actions.flow.viewer.followsAuthor ? 'transparent' : C.text,
            }}
          >
            <Text
              style={{
                color: actions.flow.viewer.followsAuthor ? C.text : C.bg,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              {actions.flow.viewer.followsAuthor ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
      </View>
      {!!flow.description && (
        <Text numberOfLines={2} style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>
          {flow.description}
        </Text>
      )}
      {flow.editedAt && (
        <Text
          accessibilityRole="button"
          onPress={onHistory}
          style={{ color: C.lime, fontSize: 13, fontWeight: '600' }}
        >
          Edited {shortDate(flow.editedAt)} · See what changed
        </Text>
      )}
      <View style={{ borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.line }}>
        <Actions actions={actions} />
      </View>
    </View>
  );
}
