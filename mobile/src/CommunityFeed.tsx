import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { HabitFlow, MobilePayload } from '../../shared/mobile';
import {
  describeChange,
  type CommunityAction,
  type CommunityFeed as Feed,
  type CommunityFeedItem,
  type CommunityFlow,
  type CommunityTab,
} from '../../shared/community-flows';
import { resolvePersonalFlow, type FlowCardReference } from '../../shared/personal-flows';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { Button, Card, EmptyState, Sheet, useToast } from './design/components';
import { FlowIllustration } from './FlowIllustration';
import { AnimalMovementDeck } from './AnimalMovementDeck';
import { LogoLoader } from './motion';
import {
  communityAct,
  newPersonalFlowId,
  useCommunityFeed,
  useCommunityFlow,
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

function Icon({ kind, active }: { kind: 'upvote' | 'repost' | 'add'; active: boolean }) {
  const { colors: C } = useTheme();
  const color = active ? C.lime : C.muted;
  const path =
    kind === 'upvote'
      ? 'M12 4 19 12h-4.5v8h-5v-8H5Z'
      : kind === 'repost'
        ? 'M4 9V7.5A2.5 2.5 0 0 1 6.5 5H18m0 0-3-3m3 3-3 3M20 15v1.5a2.5 2.5 0 0 1-2.5 2.5H6m0 0 3 3m-3-3 3-3'
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

function Action({
  kind,
  active,
  label,
  count,
  disabled,
  onPress,
}: {
  kind: 'upvote' | 'repost' | 'add';
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
function useFlowActions(flow: CommunityFlow, copy: Copy | undefined, onSaved: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run(action: CommunityAction, message?: string) {
    if (busy) return;
    setBusy(true);
    try {
      await communityAct(action);
      if (message) toast({ kind: 'success', message });
      if (action.action === 'save' || action.action === 'take-update') onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setBusy(false);
    }
  }
  const outdated = copy && copy.latestVersion !== null && copy.latestVersion > copy.savedVersion;
  return {
    busy,
    upvote: () => void run({ action: 'upvote', id: flow.id, enabled: !flow.viewer.upvoted }),
    repost: () =>
      void run(
        { action: 'repost', id: flow.id, enabled: !flow.viewer.reposted },
        flow.viewer.reposted ? 'Repost removed' : 'Reposted to your followers',
      ),
    follow: () =>
      void run({ action: 'follow', authorId: flow.author.id, enabled: !flow.viewer.followsAuthor }),
    save: () =>
      outdated
        ? void run({ action: 'take-update', personalFlowId: copy.personalFlowId }, 'Your copy is up to date')
        : copy
          ? undefined
          : void run(
              { action: 'save', id: flow.id, personalFlowId: newPersonalFlowId() },
              'Added to your flows',
            ),
    saveLabel: outdated ? 'Update' : copy ? 'Saved' : 'Add',
    saved: Boolean(copy),
  };
}

function ActionRow({
  flow,
  copy,
  onSaved,
}: {
  flow: CommunityFlow;
  copy: Copy | undefined;
  onSaved: () => void;
}) {
  const actions = useFlowActions(flow, copy, onSaved);
  const own = flow.viewer.own;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Action
        kind="upvote"
        active={flow.viewer.upvoted}
        count={flow.upvotes}
        disabled={own || actions.busy}
        label={`${flow.viewer.upvoted ? 'Remove upvote' : 'Upvote'}, ${flow.upvotes} upvotes`}
        onPress={actions.upvote}
      />
      <Action
        kind="repost"
        active={flow.viewer.reposted}
        count={flow.reposts}
        disabled={own || actions.busy}
        label={`${flow.viewer.reposted ? 'Undo repost' : 'Repost'}, ${flow.reposts} reposts`}
        onPress={actions.repost}
      />
      <Action
        kind="add"
        active={actions.saved}
        count={actions.saveLabel}
        disabled={own || actions.busy || actions.saveLabel === 'Saved'}
        label={
          actions.saveLabel === 'Update'
            ? 'Get the latest version into your copy'
            : actions.saved
              ? 'Saved to your flows'
              : 'Add to your flows'
        }
        onPress={actions.save}
      />
    </View>
  );
}

function Byline({ item, onFollow }: { item: CommunityFeedItem; onFollow?: () => void }) {
  const { colors: C } = useTheme();
  const { flow } = item;
  return (
    <View style={{ gap: 2 }}>
      {item.repostedBy && (
        <Text style={{ color: C.muted, fontSize: 12 }}>↻ {item.repostedBy.name} reposted</Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: C.muted, fontSize: 13 }}>
          {flow.viewer.own ? 'You' : flow.author.name} · @{flow.author.handle} ·{' '}
          {shortDate(flow.publishedAt)}
        </Text>
        {!flow.viewer.own && onFollow && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${flow.viewer.followsAuthor ? 'Unfollow' : 'Follow'} ${flow.author.name}`}
            onPress={onFollow}
            hitSlop={6}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <Text
              style={{
                color: flow.viewer.followsAuthor ? C.muted : C.lime,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {flow.viewer.followsAuthor ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function FlowPost({
  item,
  library,
  copy,
  onOpen,
  onSaved,
}: {
  item: CommunityFeedItem;
  library: HabitFlow[];
  copy: Copy | undefined;
  onOpen: () => void;
  onSaved: () => void;
}) {
  const { colors: C } = useTheme();
  const { flow } = item;
  const cover = resolveCards(flow, library).cards[0];
  const actions = useFlowActions(flow, copy, onSaved);
  return (
    <Card>
      <Byline item={item} onFollow={actions.follow} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${flow.title} by ${flow.author.name}, ${flow.cards.length} cards`}
        onPress={onOpen}
        style={({ pressed }) => ({ flexDirection: 'row', gap: 12, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text style={{ color: C.text, fontSize: 18, lineHeight: 24, fontWeight: '600' }}>
            {flow.title}
          </Text>
          {!!flow.description && (
            <Text numberOfLines={3} style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
              {flow.description}
            </Text>
          )}
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {flow.cards.length} cards{flow.editedAt ? ` · Edited ${shortDate(flow.editedAt)}` : ''}
          </Text>
        </View>
        {cover && (
          <View style={{ width: 84, height: 84, borderRadius: 14, overflow: 'hidden' }}>
            <FlowIllustration flow={cover} />
          </View>
        )}
      </Pressable>
      <ActionRow flow={flow} copy={copy} onSaved={onSaved} />
    </Card>
  );
}

export function CommunityFeed({
  tab,
  data,
  onOpen,
  onSaved,
  onShowYours,
}: {
  tab: CommunityTab;
  data: MobilePayload;
  onOpen: (id: string) => void;
  onSaved: () => void;
  onShowYours: () => void;
}) {
  const { colors: C } = useTheme();
  const { feed, error, loading, reload } = useCommunityFeed(tab);
  if (!feed && loading)
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <LogoLoader size={44} label="Loading flows" />
      </View>
    );
  if (!feed)
    return (
      <EmptyState
        title="Could not load flows"
        description={error || 'Check your connection and try again.'}
        action={{ label: 'Retry', onPress: () => void reload() }}
      />
    );
  if (!feed.items.length)
    return tab === 'for-you' ? (
      <EmptyState
        title="No published flows yet"
        description="Build a flow from cards in Yours, then publish it for others to upvote, repost and add."
        action={{ label: 'Go to Yours', onPress: onShowYours }}
      />
    ) : (
      <EmptyState
        title="Nobody followed yet"
        description="Follow people from For you. Their flows and reposts will show up here, newest first."
      />
    );
  const copies = new Map(feed.copies.map(copy => [copy.publishedId, copy]));
  return (
    <View style={{ gap: 12 }}>
      {feed.items.map(item => (
        <FlowPost
          key={`${item.flow.id}:${item.repostedBy?.id ?? ''}`}
          item={item}
          library={data.flows}
          copy={copies.get(item.flow.id)}
          onOpen={() => onOpen(item.flow.id)}
          onSaved={onSaved}
        />
      ))}
      <Text style={{ color: C.muted, fontSize: 12, textAlign: 'center', paddingVertical: 8 }}>
        {tab === 'for-you'
          ? 'Ranked by upvotes, reposts and how recent they are.'
          : 'Newest first from people you follow.'}
      </Text>
    </View>
  );
}

function History({
  versions,
  onClose,
}: {
  versions: { version: number; createdAt: string; changes: Parameters<typeof describeChange>[0][] }[];
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
}: {
  id: string;
  data: MobilePayload;
  copies: Feed['copies'];
  onClose: () => void;
  onSaved: () => void;
  onAddCard: (card: FlowCardReference) => void;
  onLink: (url: string) => void;
}) {
  const { colors: C } = useTheme();
  const { value, error, loading } = useCommunityFlow(id);
  const [history, setHistory] = useState(false);
  const flow = value?.flow;
  const copy = copies.find(item => item.publishedId === id);
  const resolved = flow ? resolveCards(flow, data.flows) : null;
  return (
    <Sheet
      title={flow?.title ?? 'Flow'}
      presentation="inline"
      navigation="back"
      fullScreen
      scrollable={false}
      onClose={onClose}
    >
      {!flow ? (
        loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <LogoLoader size={44} label="Loading flow" />
          </View>
        ) : (
          <EmptyState title="Flow unavailable" description={error || 'It may have been removed.'} />
        )
      ) : (
        <View style={{ flex: 1, gap: 8 }}>
          <Byline item={{ flow, repostedBy: null, at: flow.publishedAt }} />
          {!!flow.description && (
            <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{flow.description}</Text>
          )}
          {flow.editedAt && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show edit history"
              onPress={() => setHistory(true)}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <Text style={{ color: C.lime, fontSize: 13, fontWeight: '600' }}>
                Edited {shortDate(flow.editedAt)} · See what changed
              </Text>
            </Pressable>
          )}
          <ActionRow flow={flow} copy={copy} onSaved={onSaved} />
          {resolved && resolved.missing.length > 0 && (
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {resolved.missing.length} card{resolved.missing.length === 1 ? ' is' : 's are'}{' '}
              no longer in the catalogue.
            </Text>
          )}
          {resolved && resolved.cards.length > 0 && (
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
                personalCardInformation({ card, close, cards: flow.cards, library: data.flows, onLink })
              }
            />
          )}
          {!resolved?.cards.length && (
            <Button title="Back to feed" secondary onPress={onClose} />
          )}
        </View>
      )}
      {history && value && <History versions={value.versions} onClose={() => setHistory(false)} />}
    </Sheet>
  );
}
