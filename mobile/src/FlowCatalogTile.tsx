import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import {
  catalogTile,
  flowsInTile,
  sectionsWithTiles,
  tilesInSection,
  type CatalogFlow,
  type CatalogLevel,
} from '../../shared/flow-catalog';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
import { useRootListInset } from './RootList';
import { CatalogCover } from './CatalogCover';
import { ExerciseVisual } from './ExerciseVisual';
import { trainingSessionsForTile, type CatalogSessionCard } from './training-api';

const levels: CatalogLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const gap = 12;
const railWidth = 88;

/**
 * The bar on a catalog page: back, then a small title. With `overlayTop` it floats as
 * translucent glass, so the page scrolls underneath it.
 */
export function CatalogBar({
  title,
  onBack,
  overlayTop,
  right,
}: {
  title: string;
  onBack: () => void;
  /** Optional control at the bar's right end. */
  right?: React.ReactNode;
  /** Floats the bar this far down the page as glass, instead of holding its own row. */
  overlayTop?: number;
}) {
  const { colors: C, scheme } = useTheme();
  const overlay = overlayTop !== undefined;
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 6 },
        overlay && { position: 'absolute', top: overlayTop, left: 0, right: 0, zIndex: 2, overflow: 'hidden' },
      ]}
    >
      {overlay && (
        <>
          <BlurView
            intensity={30}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: 0.15 }]} />
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M15 5l-7 7 7 7"
            stroke={C.text}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: '600' }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Two columns of flows. Requesting happens inside a flow's own page, never here. */
function sessionLine(session: CatalogSessionCard) {
  if (session.level) return session.level;
  return `${session.exerciseCount} ${session.exerciseCount === 1 ? 'exercise' : 'exercises'}`;
}

export function CatalogFlowGrid({
  flows,
  sessions = [],
  onOpen,
  onOpenSession,
}: {
  flows: CatalogFlow[];
  sessions?: CatalogSessionCard[];
  onOpen: (id: string) => void;
  onOpenSession?: (id: string) => void;
}) {
  const { colors: C } = useTheme();
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - gap) / 2 : 0;
  return (
    <View
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
      {cell > 0 &&
        sessions.map(session => (
          <Pressable
            key={session.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${session.title}`}
            onPress={() => onOpenSession?.(session.id)}
            style={({ pressed }) => ({ width: cell, gap: 6, opacity: pressed ? 0.75 : 1 })}
          >
            <View style={{ width: '100%', aspectRatio: 0.9, borderRadius: 14, overflow: 'hidden', backgroundColor: C.card }}>
              <View style={{ flex: 1 }}>
                <ExerciseVisual exerciseId={session.coverExerciseId ?? undefined} cover />
              </View>
            </View>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', lineHeight: 20 }}>{session.title}</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>{sessionLine(session)}</Text>
          </Pressable>
        ))}
      {cell > 0 &&
        flows.map(flow => (
          <Pressable
            key={flow.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${flow.title}`}
            onPress={() => onOpen(flow.id)}
            style={({ pressed }) => ({ width: cell, gap: 6, opacity: pressed ? 0.75 : 1 })}
          >
            <CatalogCover tileId={flow.tileId} aspectRatio={0.9} />
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', lineHeight: 20 }}>
              {flow.title}
            </Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>{flow.level}</Text>
          </Pressable>
        ))}
    </View>
  );
}

export function FlowCatalogTile({
  tileId,
  onTile,
  onBack,
  onFlow,
  onSession,
}: {
  tileId: string;
  onTile: (id: string) => void;
  onBack: () => void;
  onFlow: (id: string) => void;
  onSession: (id: string) => void;
}) {
  const tile = catalogTile(tileId);
  const { colors: C } = useTheme();
  const inset = useRootListInset();
  const [filter, setFilter] = useState('All');
  const [sessions, setSessions] = useState<CatalogSessionCard[]>([]);
  useEffect(() => setFilter('All'), [tileId]);
  useEffect(() => {
    let live = true;
    trainingSessionsForTile(tileId)
      .then(result => {
        if (live) setSessions(result.sessions);
      })
      .catch(() => {
        if (live) setSessions([]);
      });
    return () => {
      live = false;
    };
  }, [tileId]);
  if (!tile) return null;
  // The bar names the section and the rail names the tile, so neither repeats.
  const section = sectionsWithTiles().find(item => item.id === tile.sectionId);
  const siblings = tilesInSection(tile.sectionId);
  const chips = ['All', ...(tile.chips ?? []), ...levels];
  const flows = flowsInTile(tile.id).filter(flow => {
    if (filter === 'All') return true;
    if (levels.includes(filter as CatalogLevel)) return flow.level === filter;
    return flow.tags.includes(filter);
  });
  const sessionCards = sessions.filter(session => {
    if (filter === 'All') return true;
    if (levels.includes(filter as CatalogLevel)) return session.level === filter;
    return false;
  });
  return (
    // The bar sits directly under the top bar, with no dark gap.
    <View style={{ flex: 1, paddingTop: Math.max(0, inset - 12) }}>
      <CatalogBar title={section?.title ?? tile.title} onBack={onBack} />
      <View
        style={{ flex: 1, flexDirection: 'row', borderTopWidth: 0.5, borderColor: C.line }}
      >
        <ScrollView
          style={{ width: railWidth, flexGrow: 0, borderRightWidth: 0.5, borderColor: C.line }}
          contentContainerStyle={{ paddingBottom: 128 }}
          showsVerticalScrollIndicator={false}
        >
          {siblings.map(item => {
            const selected = item.id === tile.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityState={{ selected }}
                onPress={() => onTile(item.id)}
                style={{ alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6 }}
              >
                <View
                  style={{
                    width: 58,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: selected ? C.lime : 'transparent',
                  }}
                >
                  <CatalogCover tileId={item.id} iconSize={24} />
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    color: selected ? C.lime : C.muted,
                    fontSize: 12,
                    fontWeight: selected ? '700' : '500',
                    textAlign: 'center',
                  }}
                >
                  {item.title}
                </Text>
                {selected && (
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 10,
                      bottom: 10,
                      width: 3,
                      borderTopLeftRadius: 3,
                      borderBottomLeftRadius: 3,
                      backgroundColor: C.lime,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, flexShrink: 0, borderBottomWidth: 0.5, borderColor: C.line }}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            {chips.map(chip => {
              const selected = filter === chip;
              return (
                <Pressable
                  key={chip}
                  accessibilityRole="button"
                  accessibilityLabel={chip}
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(chip)}
                  style={{
                    height: 36,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    backgroundColor: selected ? C.lime : C.card,
                    borderWidth: 1,
                    borderColor: selected ? C.lime : C.line,
                  }}
                >
                  <Text style={{ color: selected ? C.onAccent : C.text, fontSize: 14 }}>{chip}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12, paddingBottom: 128, gap: 16 }}
          >
            {flows.length || sessionCards.length ? (
              <CatalogFlowGrid flows={flows} sessions={sessionCards} onOpen={onFlow} onOpenSession={onSession} />
            ) : (
              <Text style={{ color: C.muted, fontSize: 14 }}>Nothing here yet.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
