import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import {
  defaultPersonalFlowName,
  resolvePersonalFlow,
  type FlowCardReference,
  type PersonalFlow,
  type PersonalFlowAction,
} from '../../shared/personal-flows';
import { Button, Field, SectionHeader, Sheet } from './design/components';
import { Text } from './design/Text';
import { Glyph } from './design/Glyph';
import { hit, opacity, radius, space, stroke, useTheme } from './design/theme';

export function AddToFlowSheet({
  card,
  flows,
  busy,
  onChange,
  onClose,
}: {
  card: FlowCardReference;
  flows: PersonalFlow[];
  busy: boolean;
  onChange: (action: PersonalFlowAction, message: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const { colors: C } = useTheme();
  const [creating, setCreating] = useState(flows.length === 0);
  const [name, setName] = useState(() => defaultPersonalFlowName(flows));
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const requestId = useRef(
    `personal-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
  );
  const saving = useRef(false);
  async function submit(id?: string) {
    if (saving.current || busy) return;
    saving.current = true;
    setError('');
    try {
      const targetName = id ? flows.find(flow => flow.id === id)!.name : name.trim();
      const reference = { sourceFlowId: card.sourceFlowId, cardId: card.cardId };
      const ok = await onChange(
        id
          ? { action: 'personal-flow-add', id, ...reference }
          : {
              action: 'personal-flow-create',
              id: requestId.current,
              name: name.trim(),
              ...reference,
            },
        `Added to ${targetName}`,
      );
      if (ok) onClose();
      else setError('Could not save this card. Please try again.');
    } finally {
      saving.current = false;
    }
  }
  return (
    <Sheet
      title="Add to Flow"
      navigation="back"
      onClose={() => {
        if (!busy) onClose();
      }}
      presentation="modal"
    >
      <View style={{ gap: space.md, paddingVertical: space.sm }}>
        <Text variant="section" style={{ color: C.text }}>
          {card.title}
        </Text>
        <Text variant="subhead" style={{ color: C.muted }}>
          Mix cards from any collection. Your flows live on Home.
        </Text>
        {!creating && flows.length > 6 && (
          <Field label="Find a flow" value={search} onChange={setSearch} maxLength={60} />
        )}
        {!creating &&
          flows
            .filter(flow => flow.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
            .map(flow => {
              const added = flow.cards.some(item => item.cardId === card.cardId);
              return (
                <Pressable
                  key={flow.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${added ? 'Already in' : 'Add to'} ${flow.name}`}
                  accessibilityState={{ disabled: busy || added }}
                  disabled={busy || added}
                  onPress={() => void submit(flow.id)}
                  style={({ pressed }) => ({
                    minHeight: 72,
                    borderRadius: radius.control,
                    padding: space.md,
                    backgroundColor: C.card,
                    borderWidth: stroke.line,
                    borderColor: C.line,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.ms,
                    opacity: pressed ? opacity.pressed : 1,
                  })}
                >
                  <View style={{ flex: 1, gap: space.xs }}>
                    <Text variant="headline" style={{ color: C.text }}>
                      {flow.name}
                    </Text>
                    <Text variant="footnote" style={{ color: C.muted }}>
                      {flow.cards.length} {flow.cards.length === 1 ? 'card' : 'cards'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                    {added ? (
                      <Glyph name={{ ios: 'checkmark', android: 'check' }} fallback="✓" color={C.muted} size={space.md} />
                    ) : null}
                    <Text variant="subhead" style={{ color: added ? C.muted : C.lime }}>
                      {added ? 'Added' : '+ Add'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
        {!creating && (
          <Button
            title="+ Create a new flow"
            secondary
            disabled={busy || flows.length >= 50}
            onPress={() => setCreating(true)}
          />
        )}
        {creating && (
          <>
            <Field
              label="Flow name"
              value={name}
              onChange={setName}
              maxLength={60}
              placeholder="Flow 1"
            />
            <Button
              title={busy ? 'Saving…' : 'Create flow & add card'}
              disabled={busy || !name.trim() || flows.length >= 50}
              onPress={() => void submit()}
            />
            {flows.length > 0 && (
              <Button
                title="Choose an existing flow"
                secondary
                disabled={busy}
                onPress={() => setCreating(false)}
              />
            )}
          </>
        )}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: C.danger }}>
            {error}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

export function PersonalFlowEditor({
  flow,
  library,
  busy,
  onChange,
  onClose,
  onBrowse,
}: {
  flow: PersonalFlow;
  library: HabitFlow[];
  busy: boolean;
  onChange: (action: PersonalFlowAction, message?: string) => Promise<boolean>;
  onClose: () => void;
  onBrowse: () => void;
}) {
  const { colors: C } = useTheme();
  const [name, setName] = useState(flow.name);
  const missing = new Set(resolvePersonalFlow(flow, library).missing.map(card => card.cardId));
  return (
    <Sheet title="Edit your flow" navigation="back" onClose={onClose} presentation="modal">
      <Field label="Flow name" value={name} onChange={setName} maxLength={60} />
      <Button
        title="Save name"
        disabled={busy || !name.trim() || name.trim() === flow.name}
        onPress={() =>
          void onChange(
            { action: 'personal-flow-rename', id: flow.id, name: name.trim() },
            'Flow renamed',
          )
        }
      />
      <View style={{ marginTop: space.md }}>
        <SectionHeader title="Cards in your order" />
      </View>
      <Text style={{ color: C.muted, lineHeight: 20 }}>
        Reorder or remove cards here. The original collection stays unchanged.
      </Text>
      {!flow.cards.length && (
        <Text style={{ color: C.muted }}>
          No cards yet. Browse collections and choose Add to Flow.
        </Text>
      )}
      {flow.cards.map((card, index) => (
        <View
          key={card.cardId}
          style={{ paddingVertical: space.ms, borderBottomWidth: stroke.line, borderColor: C.line, gap: space.sm }}
        >
          <Text variant="body" style={{ color: C.text }}>
            {index + 1}. {card.title}
          </Text>
          <Text variant="caption" style={{ color: C.muted }}>
            {missing.has(card.cardId)
              ? 'Currently unavailable · kept in your flow'
              : library.find(item => item.id === card.sourceFlowId)?.title}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm }}>
            {(['up', 'down', 'remove'] as const).map(direction => {
              const disabled =
                busy ||
                (direction === 'up' && index === 0) ||
                (direction === 'down' && index === flow.cards.length - 1);
              return (
                <Pressable
                  key={direction}
                  accessibilityRole="button"
                  accessibilityLabel={`${direction === 'remove' ? 'Remove' : `Move ${direction}`} ${card.title}`}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() =>
                    void onChange(
                      direction === 'remove'
                        ? { action: 'personal-flow-remove', id: flow.id, cardId: card.cardId }
                        : {
                            action: 'personal-flow-move',
                            id: flow.id,
                            cardId: card.cardId,
                            direction,
                          },
                    )
                  }
                  style={{
                    minWidth: hit,
                    minHeight: hit,
                    paddingHorizontal: space.ms,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: C.card,
                    borderRadius: radius.small,
                    opacity: disabled ? 0.35 : 1,
                  }}
                >
                  <Text style={{ color: direction === 'remove' ? C.danger : C.text }}>
                    {direction === 'up' ? '↑' : direction === 'down' ? '↓' : 'Remove'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Button title="Browse cards to add" secondary disabled={busy} onPress={onBrowse} />
    </Sheet>
  );
}
