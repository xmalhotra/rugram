import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import type { HabitFlow } from '../../shared/mobile';
import type { FocusContent, NutritionPath } from '../../shared/admin-content';
import { buildFlowSections } from '../../shared/flow-sections';
import { topicAtOffset } from '../../shared/flow-scroll';
import { CategoryRail } from './CategoryRail';
import { FlowPreview } from './FlowPreview';
import { Text } from './design/Text';
import { useTheme } from './design/theme';

export function FlowSections({
  title,
  topics,
  options,
  library,
  ownedIds,
  busy,
  onBack,
  onSelect,
  onRefresh,
  nutritionPaths,
  initialSection,
  backLabel = 'All categories',
}: {
  title: string;
  topics: FocusContent[];
  options: readonly FocusContent[];
  library: HabitFlow[];
  ownedIds: string[];
  busy: boolean;
  /** Omitted where the category is chosen in the top bar, so there is nothing to go back to. */
  onBack?: () => void;
  onSelect: (flow: HabitFlow, focusId: string) => void;
  onRefresh?: () => void;
  nutritionPaths?: NutritionPath[];
  initialSection?: string;
  backLabel?: string;
}) {
  const { colors: C } = useTheme();
  const sections = buildFlowSections(topics, options, library, nutritionPaths);
  const initialId = sections.find(
    section => section.id === initialSection || section.focusId === initialSection,
  )?.id;
  const [selected, setSelected] = useState(initialId ?? sections[0]?.id ?? '');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [viewport, setViewport] = useState(0);
  const positions = useRef(new Map<string, number>());
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const initialScrollDone = useRef(false);
  const restoreInitial = useCallback(() => {
    if (initialScrollDone.current || !initialId || headerHeight <= 0) return;
    const y = positions.current.get(initialId);
    if (y === undefined) return;
    initialScrollDone.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, y - headerHeight), animated: false });
  }, [headerHeight, initialId]);
  useEffect(restoreInitial, [restoreInitial]);
  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1 }}
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 128 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={busy} onRefresh={onRefresh} tintColor={C.lime} />
        ) : undefined
      }
      onLayout={event => setViewport(event.nativeEvent.layout.height)}
      onContentSizeChange={restoreInitial}
      onScrollBeginDrag={() => {
        initialScrollDone.current = true;
      }}
      onScroll={event => {
        const active = topicAtOffset(
          sections.flatMap(section => {
            const y = positions.current.get(section.id);
            return y === undefined ? [] : [{ id: section.id, y }];
          }),
          event.nativeEvent.contentOffset.y,
          headerHeight,
        );
        if (active) setSelected(previous => (previous === active ? previous : active));
      }}
    >
      <View
        onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}
        style={{
          backgroundColor: C.bg,
          paddingTop: 8,
          paddingBottom: 10,
          gap: 8,
        }}
      >
        {onBack && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Back to ${backLabel}`}
            onPress={onBack}
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: C.lime, fontSize: 28 }}>←</Text>
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{ color: C.text, fontSize: 25, fontWeight: '600' }}
          >
            {title}
          </Text>
        </View>
        )}
        <CategoryRail compact pills
          label={`${title} sections`}
          items={sections.map(section => ({
            id: section.id,
            title: section.title,
            illustration: section.id,
          }))}
          selected={
            sections.some(section => section.id === selected) ? selected : (sections[0]?.id ?? '')
          }
          onSelect={id => {
            initialScrollDone.current = true;
            const y = positions.current.get(id);
            if (y !== undefined) {
              setSelected(id);
              scroll.current?.scrollTo({ y: Math.max(0, y - headerHeight), animated: true });
            }
          }}
        />
      </View>
      {sections.map((section, index) => (
        <View
          key={section.id}
          onLayout={event => {
            positions.current.set(section.id, event.nativeEvent.layout.y);
            restoreInitial();
          }}
          style={{
            paddingTop: 14,
            paddingBottom: 18,
            gap: 12,
            minHeight:
              index === sections.length - 1 ? Math.max(0, viewport - headerHeight) : undefined,
          }}
        >
          {!(
            section.focusId === 'nutrition' &&
            section.groups.length === 1 &&
            section.groups[0].flows.length === 1 &&
            section.groups[0].flows[0].title === section.title
          ) && (
            <Text
              accessibilityRole="header"
              style={{ color: C.text, fontSize: 22, fontWeight: '700' }}
            >
              {section.title}
            </Text>
          )}
          {section.groups.map(group => (
              <View key={group.id} style={{ gap: 4 }}>
                {group.title && (
                  <Text
                    accessibilityRole="header"
                    style={{ color: C.muted, fontSize: 17, fontWeight: '600', marginBottom: 4 }}
                  >
                    {group.title}
                  </Text>
                )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 14, paddingRight: 20 }}
                >
                  {group.flows.map(flow => (
                    <FlowPreview
                      key={flow.id}
                      layout="tile"
                      flow={flow}
                      added={ownedIds.includes(flow.id)}
                      busy={busy}
                      onPress={() => {
                        if (!busy) onSelect(flow, section.focusId);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
          ))}
        </View>
      ))}
      {!sections.length && (
        <Text style={{ color: C.muted, padding: 20 }}>No published flows here yet.</Text>
      )}
    </ScrollView>
  );
}
