import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import {
  resolvePersonalFlow,
  type FlowCardReference,
  type PersonalFlow,
  type PersonalFlowAction,
} from '../../shared/personal-flows';
import { AnimalMovementDeck } from './AnimalMovementDeck';
import { PersonalFlowEditor } from './PersonalFlowSheets';
import { VisualFlowInformation } from './VisualFlowInformation';
import { Button, Field, Sheet, useToast } from './design/components';
import { communityLimits, hasUnpublishedChanges } from '../../shared/community-flows';
import { communityAct, useCommunityStatus } from './community';
import { useSession } from './session';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { flowCreationEnabled } from '../../shared/flow-catalog';
import { gymTechnique } from '../../shared/gym-techniques';
import { GymTechniqueNotes } from './GymTechniqueNotes';
import { nutritionIdea } from '../../shared/nutrition-ideas';
import { NutritionIdeaNotes } from './NutritionIdeaNotes';

export function PersonalFlowDetails({
  flow,
  library,
  busy,
  onAddCard,
  onChange,
  onBrowse,
  onLink,
  onStart,
}: {
  flow: PersonalFlow;
  library: HabitFlow[];
  busy: boolean;
  onAddCard: (card: FlowCardReference) => void;
  onChange: (action: PersonalFlowAction, message?: string) => Promise<boolean>;
  onBrowse: () => void;
  onLink: (url: string) => void;
  /** Start the clock for this flow. */
  onStart: () => void;
}) {
  const { colors: C } = useTheme();
  const [editing, setEditing] = useState(false);
  const resolved = resolvePersonalFlow(flow, library);
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text style={{ flex: 1, color: C.muted, fontSize: 12 }}>
          Your mix · {flow.cards.length} {flow.cards.length === 1 ? 'card' : 'cards'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start this flow"
          onPress={onStart}
          style={({ pressed }) => ({
            minHeight: 36,
            paddingHorizontal: 14,
            borderRadius: 18,
            justifyContent: 'center',
            backgroundColor: C.lime,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: C.onAccent, fontWeight: '700', fontSize: 14 }}>Start</Text>
        </Pressable>
        {flowCreationEnabled && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit flow name and cards"
            onPress={() => setEditing(true)}
            style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}
          >
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>Edit flow</Text>
          </Pressable>
        )}
      </View>
      {flowCreationEnabled && <PublishControls flow={flow} />}
      {resolved.missing.length > 0 && (
        <Text style={{ color: C.muted, fontSize: 12 }}>
          {resolved.missing.length} {resolved.missing.length === 1 ? 'card is' : 'cards are'}{' '}
          currently unavailable. Review in Edit flow.
        </Text>
      )}
      {resolved.cards.length ? (
        <AnimalMovementDeck
          key={`${flow.id}:${resolved.cards.map(card => card.id).join(',')}`}
          flow={resolved.flow}
          library={resolved.cards}
          uniformHeader
          added
          busy={busy}
          onAdd={onBrowse}
          onHome={onBrowse}
          onRemove={() => {
            if (flowCreationEnabled) setEditing(true);
          }}
          onLink={onLink}
          onAddCard={card => {
            const reference = flow.cards.find(item => item.cardId === card.id);
            if (reference) onAddCard(reference);
          }}
          renderInformation={(card, close) =>
            personalCardInformation({ card, close, cards: flow.cards, library, onLink })
          }
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: '600' }}>
            Make this flow yours
          </Text>
          <Text style={{ color: C.muted, fontSize: 16, lineHeight: 24 }}>
            Open any collection and tap Add to Flow on a card you like. Choose {flow.name} to bring
            it here.
          </Text>
          <Button title="Explore cards" onPress={onBrowse} />
        </View>
      )}
      {flowCreationEnabled && editing && (
        <PersonalFlowEditor
          flow={flow}
          library={library}
          busy={busy}
          onChange={onChange}
          onClose={() => setEditing(false)}
          onBrowse={onBrowse}
        />
      )}
    </View>
  );
}

/** Card information for flows assembled from other collections' cards. */
export function personalCardInformation({
  card,
  close,
  cards,
  library,
  onLink,
}: {
  card: HabitFlow;
  close: () => void;
  cards: FlowCardReference[];
  library: HabitFlow[];
  onLink: (url: string) => void;
}) {
  return <CardInformation card={card} close={close} cards={cards} library={library} onLink={onLink} />;
}

function CardInformation({
  card,
  close,
  cards,
  library,
  onLink,
}: Parameters<typeof personalCardInformation>[0]) {
  const { colors: C } = useTheme();
  const reference = cards.find(item => item.cardId === card.id);
  const source = library.find(item => item.id === reference?.sourceFlowId);
  return (
    <VisualFlowInformation card={card} onClose={close}>
      {nutritionIdea(card.id) ? (
        <NutritionIdeaNotes
          cardId={card.id}
          sourceFlowId={card.visualCard?.sourceFlowId}
          onLink={onLink}
        />
      ) : gymTechnique(card.id) ? (
        <GymTechniqueNotes cardId={card.id} onLink={onLink} />
      ) : (
        <>
          <Text style={{ color: C.muted, lineHeight: 22 }}>
            From {source?.title ?? 'your collection'}
          </Text>
          {source?.sources?.map(item => (
            <Button key={item.url} title={item.title} secondary onPress={() => onLink(item.url)} />
          ))}
        </>
      )}
    </VisualFlowInformation>
  );
}

/** Publish state for the author, or where a saved copy came from. */
function PublishControls({ flow }: { flow: PersonalFlow }) {
  const { colors: C } = useTheme();
  const toast = useToast();
  const { refresh } = useSession();
  const { value: status } = useCommunityStatus();
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const published = status?.mine.find(item => item.personalFlowId === flow.id);
  const [description, setDescription] = useState('');
  async function run(action: Parameters<typeof communityAct>[0], message: string) {
    setBusy(true);
    try {
      await communityAct(action);
      toast({ kind: 'success', message });
      setComposing(false);
      if (action.action === 'take-update') await refresh();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setBusy(false);
    }
  }
  const line = { color: C.muted, fontSize: 13, flex: 1 } as const;
  const link = (label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      style={{ minHeight: 40, justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
    >
      <Text style={{ color: C.lime, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
  if (!status) return null;
  if (flow.source) {
    const copy = status.copies.find(item => item.personalFlowId === flow.id);
    const removed = copy?.latestVersion === null;
    const outdated = copy && copy.latestVersion !== null && copy.latestVersion > copy.savedVersion;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={line}>
          Saved from {flow.source.authorName}
          {removed ? ' · original removed' : outdated ? ' · update available' : ''}
        </Text>
        {outdated &&
          link('Get update', () =>
            void run({ action: 'take-update', personalFlowId: flow.id }, 'Your copy is up to date'),
          )}
      </View>
    );
  }
  const changed = hasUnpublishedChanges(flow, published);
  const tooFew = flow.cards.length < communityLimits.minCards;
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={line}>
          {published
            ? `Published · version ${published.version}${changed ? ' · unpublished changes' : ''}`
            : tooFew
              ? `Add ${communityLimits.minCards - flow.cards.length} more card to publish`
              : 'Only you can see this flow'}
        </Text>
        {published
          ? link(changed ? 'Publish changes' : 'Edit', () => {
              setDescription(published.description);
              setComposing(true);
            })
          : !tooFew &&
            link('Publish', () => {
              setDescription('');
              setComposing(true);
            })}
      </View>
      {composing && (
        <Sheet
          title={published ? 'Edit published flow' : 'Publish flow'}
          navigation="back"
          presentation="modal"
          onClose={() => setComposing(false)}
        >
          <Text style={{ color: C.muted, lineHeight: 21 }}>
            {published
              ? 'People who reposted this will see the new version and a note of what changed. Saved copies keep their version until their owners update.'
              : 'Others can upvote it, repost it to their followers and add a copy to their own flows. Your cards come from the reviewed catalogue.'}
          </Text>
          <Field
            label="Short description (optional)"
            value={description}
            onChange={setDescription}
            multiline
            maxLength={communityLimits.description}
          />
          <Button
            title={busy ? 'Publishing…' : published ? 'Save and publish' : 'Publish'}
            disabled={busy}
            onPress={() =>
              void run(
                { action: 'publish', personalFlowId: flow.id, description },
                published ? 'Changes published' : 'Published to For you',
              )
            }
          />
          {published && (
            <Button
              title="Unpublish"
              secondary
              destructive
              disabled={busy}
              onPress={() =>
                void run({ action: 'unpublish', id: published.id }, 'Removed from the community')
              }
            />
          )}
        </Sheet>
      )}
    </>
  );
}
