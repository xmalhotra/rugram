import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { usePaneState } from './pane-state';
import { hasFocusedInlineDetail } from './design/DetailSurface';
import type { HabitFlow } from '../../shared/mobile';
import type { FocusContent, NutritionPath } from '../../shared/admin-content';
import { flowCategoryGroups, type FlowCategoryGroup } from '../../shared/flow-categories';
import { flowBrowseNavigation } from '../../shared/flow-navigation';
import { movementBrowseLibrary } from '../../shared/animal-movements';
import { flowsForFocus } from '../../shared/focus';
import { homeFlowSummary } from '../../shared/home-feed';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { FlowIllustration } from './FlowIllustration';
import { useRootListNavigation } from './RootList';
import { FlowSections } from './FlowSections';

function FlowBody({
  standalone,
  children,
  busy = false,
  onRefresh,
}: {
  standalone: boolean;
  children: React.ReactNode;
  busy?: boolean;
  onRefresh?: () => void;
}) {
  return standalone ? (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 128 }}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={busy} onRefresh={onRefresh} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <>{children}</>
  );
}

export function FlowTopicBrowser({
  options,
  groups: configured,
  library,
  ownedIds,
  nutritionPaths,
  onSelect,
  initialCategory,
  busy = false,
  standalone = false,
  onRefresh,
}: {
  options: readonly FocusContent[];
  groups?: FlowCategoryGroup[];
  library: HabitFlow[];
  ownedIds: string[];
  nutritionPaths?: NutritionPath[];
  onSelect: (flow: HabitFlow, focusId: string) => void;
  initialCategory?: string;
  busy?: boolean;
  standalone?: boolean;
  onRefresh?: () => void;
}) {
  const { colors: C } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const resetScroll = useRootListNavigation();
  const navigation = useNavigation<{
    addListener: (event: 'tabPress', handler: () => void) => () => void;
    isFocused: () => boolean;
  }>();
  const groups = flowCategoryGroups(options, configured);
  const [groupId, setGroup] = usePaneState(
    'flowGroup',
    () =>
      groups.find(
        group => group.id === initialCategory || group.focusIds.includes(initialCategory ?? ''),
      )?.id ?? '',
  );
  const group = groups.find(item => item.id === groupId);
  const topics = group ? group.focusIds.flatMap(id => options.filter(item => item.id === id)) : [];
  const browseLibrary = movementBrowseLibrary(library);
  const browse = flowBrowseNavigation(group);
  const leaveGroup = useCallback(() => {
    setGroup('');
    resetScroll();
  }, [resetScroll, setGroup]);
  useFocusEffect(
    useCallback(() => {
      if (!groupId) return;
      // Re-tapping the Flows tab steps back one level, matching the header back control.
      // An open flow detail consumes that tap first.
      return navigation.addListener('tabPress', () => {
        if (!navigation.isFocused() || hasFocusedInlineDetail()) return;
        leaveGroup();
      });
    }, [groupId, leaveGroup, navigation]),
  );
  if (!group) {
    const sections = groups
      .map(item => {
        const rows = item.focusIds.flatMap(focusId =>
          flowsForFocus(browseLibrary, focusId, options).map(flow => ({ flow, focusId })),
        );
        return {
          ...item,
          rows: rows.filter(
            (row, index) => rows.findIndex(other => other.flow.id === row.flow.id) === index,
          ),
        };
      })
      .filter(item => item.rows.length > 0);
    const catalogue = sections.flatMap(section =>
      section.rows.map(row => ({ ...row, category: section.title })),
    );
    const grid = catalogue.slice(0, 9);
    const gridRows: (typeof grid)[] = [];
    for (let index = 0; index < grid.length; index += 3) gridRows.push(grid.slice(index, index + 3));
    const pageWidth = Math.max(240, screenWidth - (standalone ? 32 : 0) - 48);
    return (
      <FlowBody standalone={standalone} busy={busy} onRefresh={onRefresh}>
        <View style={{ gap: 22 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityLabel="Flow categories"
            contentContainerStyle={{ gap: 8 }}
          >
            {groups.map(item => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Explore ${item.title}`}
                disabled={busy}
                onPress={() => {
                  setGroup(item.id);
                  resetScroll();
                }}
                style={({ pressed }) => ({
                  minHeight: 36,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.line,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{item.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {gridRows.length > 0 && (
            <View accessibilityLabel="Flow grid" style={{ gap: 8 }}>
              {gridRows.map(row => (
                <View key={row.map(item => item.flow.id).join('-')} style={{ flexDirection: 'row', gap: 8 }}>
                  {row.map(({ flow, focusId }) => (
                    <Pressable
                      key={flow.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${flow.title}`}
                      disabled={busy}
                      onPress={() => onSelect(flow, focusId)}
                      style={({ pressed }) => ({
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 8,
                        overflow: 'hidden',
                        backgroundColor: C.card,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <FlowIllustration flow={flow} cover />
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          paddingHorizontal: 8,
                          paddingVertical: 7,
                          backgroundColor: 'rgba(0,0,0,0.45)',
                        }}
                      >
                        <Text numberOfLines={2} style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                          {flow.title}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                  {row.length < 3 &&
                    Array.from({ length: 3 - row.length }, (_, index) => (
                      <View key={`pad-${index}`} style={{ flex: 1 }} />
                    ))}
                </View>
              ))}
            </View>
          )}
          {sections.map(section => {
            const pages: (typeof section.rows)[] = [];
            for (let index = 0; index < section.rows.length; index += 5)
              pages.push(section.rows.slice(index, index + 5));
            return (
              <View key={section.id} style={{ gap: 12 }}>
                <Text accessibilityRole="header" style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
                  {section.title}
                </Text>
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  snapToInterval={pageWidth + 12}
                  accessibilityLabel="Flow list"
                  contentContainerStyle={{ gap: 12 }}
                >
                  {pages.map(page => (
                    <View key={page.map(item => item.flow.id).join('-')} style={{ width: pageWidth, gap: 14 }}>
                      {page.map(({ flow, focusId }) => (
                        <Pressable
                          key={flow.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${flow.title}`}
                          disabled={busy}
                          onPress={() => onSelect(flow, focusId)}
                          style={({ pressed }) => ({
                            minHeight: 56,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <View
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 8,
                              overflow: 'hidden',
                              backgroundColor: C.card,
                            }}
                          >
                            <FlowIllustration flow={flow} cover />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text numberOfLines={1} style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>
                              {flow.title}
                            </Text>
                            <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
                              {homeFlowSummary(flow)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </View>
      </FlowBody>
    );
  }
  return (
    <FlowSections
      key={group.id}
      title={browse.title}
      backLabel={browse.backLabel}
      topics={topics}
      options={options}
      library={browseLibrary}
      nutritionPaths={nutritionPaths}
      initialSection={initialCategory}
      ownedIds={ownedIds}
      busy={busy}
      onRefresh={onRefresh}
      onSelect={onSelect}
      onBack={leaveGroup}
    />
  );
}
