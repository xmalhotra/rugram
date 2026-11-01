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
import { Button, Field, Sheet } from './design/components';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

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
      <View style={{ gap: 16, paddingVertical: 8 }}>
        <Text style={{ color: C.text, fontSize: 21, fontWeight: '600' }}>{card.title}</Text>
        <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>
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
                    borderRadius: 16,
                    padding: 16,
                    backgroundColor: C.card,
                    borderWidth: 1,
                    borderColor: C.line,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>
                      {flow.name}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 13 }}>
                      {flow.cards.length} {flow.cards.length === 1 ? 'card' : 'cards'}
                    </Text>
                  </View>
                  <Text style={{ color: added ? C.muted : C.lime, fontSize: 15 }}>
                    {added ? '✓ Added' : '+ Add'}
                  </Text>
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
      <Text
        accessibilityRole="header"
        style={{ color: C.text, fontSize: 19, fontWeight: '600', marginTop: 16 }}
      >
        Cards in your order
      </Text>
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
          style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line, gap: 8 }}
        >
          <Text style={{ color: C.text, fontSize: 17 }}>
            {index + 1}. {card.title}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {missing.has(card.cardId)
              ? 'Currently unavailable · kept in your flow'
              : library.find(item => item.id === card.sourceFlowId)?.title}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
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
                    minWidth: 48,
                    minHeight: 48,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: C.card,
                    borderRadius: 12,
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
