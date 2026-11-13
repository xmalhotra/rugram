import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, SectionList, TextInput, View } from 'react-native';
import type { HabitFlow, MobilePayload, Product, CityEvent } from '../../shared/mobile';
import type { Exercise } from '../../shared/exercises';
import { searchCatalogue, recentSearches } from '../../shared/search';
import { flowsForFocus } from '../../shared/focus';
import { defaultFlowView } from '../../shared/flow-defaults';
import { describedGymSession, useFlowMember } from './flow-member';
import { formatEventTime, formatInr, checkedAgo } from '../../shared/format';
import { loadSearches, saveSearches, clearSearches } from './local-searches';
import { usePaneState } from './pane-state';
import { Text } from './design/Text';
import { hit, radius, size, space, stroke, textRoles, useTheme } from './design/theme';
import { Button } from './design/components';
import { EmptyState,Banner } from './design/states';
import { api } from './api';
type SearchRow = {
  id: string;
  title: string;
  detail: string;
  open: () => void;
  kind: 'flow' | 'product' | 'event' | 'exercise';
};
export function SearchScreen({
  data,
  onFlow,
  onPick,
  onEvent,
  onExercise,
}: {
  data: MobilePayload;
  onFlow: (value: HabitFlow) => void;
  onPick: (value: Product) => void;
  onEvent: (value: CityEvent) => void;
  onExercise: (value: Exercise) => void;
}) {
  const { colors: C } = useTheme();
  const { member } = useFlowMember(data.profile.focusId);
  const [query, setQuery] = usePaneState('searchQuery', '');
  const [debounced, setDebounced] = useState(query);
  const [recent, setRecent] = useState<string[]>([]);
  const [remote,setRemote]=useState<{query:string;products:Product[];events:CityEvent[]}|null>(null);
  const [searchError,setSearchError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(() => {
    let active = true;
    void loadSearches(data.user.id).then(value => {
      if (active) setRecent(value);
    });
    return () => {
      active = false;
    };
  }, [data.user.id]);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(()=>{
    if(debounced.trim().length<2){setRemote(null);setSearchError('');return;}
    let active=true;setSearchError('');
    void api<{products:Product[];events:CityEvent[]}>(`/api/mobile/search?q=${encodeURIComponent(debounced.trim())}`).then(value=>{if(active)setRemote({...value,query:debounced});}).catch(error=>{if(active)setSearchError(error instanceof Error?error.message:'Could not search the full catalogue.');});
    return()=>{active=false;};
  },[debounced,retry]);
  const completeData=remote?.query===debounced?{...data,products:[...new Map([...data.products,...remote.products].map(item=>[item.id,item])).values()],events:[...new Map([...data.events,...remote.events].map(item=>[item.id,item])).values()]}:data;
  const result = searchCatalogue(completeData, debounced);
  const gymFacts = result.flows.flatMap(flow => {
    const described = describedGymSession(flow.id);
    return described ? [described] : [];
  });
  const gymView = defaultFlowView(gymFacts, member);
  const gymRank = new Map(gymView.map((item, index) => [item.id, index]));
  const gymNote = new Map(gymView.map(item => [item.id, [item.reason, ...item.labels].filter(Boolean).join(' · ')]));
  const gymFlows = result.flows
    .filter(flow => !gymFacts.some(item => item.id === flow.id) || gymRank.has(flow.id))
    .sort((a, b) => {
      const left = gymRank.get(a.id);
      const right = gymRank.get(b.id);
      if (left == null || right == null) return 0;
      return left - right;
    });
  const sections: { title: string; data: SearchRow[] }[] = [
    {
      title: 'Flows',
      data: gymFlows.map(value => ({
        id: value.id,
        title: value.title,
        detail: [`${value.steps.length} steps · ${value.goal}`, gymNote.get(value.id)].filter(Boolean).join(' · '),
        kind: 'flow',
        open: () => onFlow(value),
      })),
    },
    {
      title: 'Picks',
      data: result.picks.map(value => ({
        id: value.id,
        title: value.title,
        detail: `${formatInr(value.price)} · ${checkedAgo(value.checkedAt)}`,
        kind: 'product',
        open: () => onPick(value),
      })),
    },
    {
      title: 'Events',
      data: result.events.map(value => ({
        id: value.id,
        title: value.title,
        detail: `${value.city} · ${formatEventTime(value.startsAt, value.endsAt, value.dateOnly)}`,
        kind: 'event',
        open: () => onEvent(value),
      })),
    },
    {
      title: 'Exercises',
      data: result.exercises.map(value => ({
        id: value.id,
        title: value.name,
        detail: value.category,
        kind: 'exercise',
        open: () => onExercise(value),
      })),
    },
  ].filter(section => section.data.length > 0) as { title: string; data: SearchRow[] }[];
  const count = sections.reduce((sum, section) => sum + section.data.length, 0);
  useEffect(() => {
    if (debounced.trim()) AccessibilityInfo.announceForAccessibility(`${count} search results`);
  }, [debounced, count]);
  function open(row: SearchRow) {
    const next = recentSearches(recent, debounced);
    setRecent(next);
    void saveSearches(data.user.id, next).catch(() => undefined);
    // Never send search text to analytics.
    void api('/api/mobile', { action: 'search-open', kind: row.kind, id: row.id }).catch(
      () => undefined,
    );
    row.open();
  }
  const focused = flowsForFocus(data.flows, data.profile.focusId ?? '', data.library?.focus);
  const suggestions = (focused.length ? focused : data.flows)
    .filter(flow => !data.profile.flowIds.includes(flow.id))
    .slice(0, 4);
  return (
    <View style={{ flex: 1, gap: space.md }}>
      <TextInput
        autoFocus
        accessibilityLabel="Search flows, picks, events and exercises"
        value={query}
        onChangeText={setQuery}
        maxLength={80}
        placeholder="Search Qram"
        placeholderTextColor={C.muted}
        returnKeyType="search"
        style={{
          minHeight: size.button,
          borderWidth: stroke.line,
          borderColor: C.line,
          borderRadius: radius.control,
          color: C.text,
          fontSize: textRoles.body.fontSize,
          padding: space.md,
        }}
      />
      {searchError&&<Banner kind="error" message={searchError} action={{label:'Retry full search',onPress:()=>setRetry(value=>value+1)}}/>}
      {!query.trim() ? (
        <View style={{ gap: space.ms }}>
          {recent.length > 0 && (
            <>
              <Text style={{ color: C.muted }}>Recent searches</Text>
              {recent.map(value => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${value}`}
                  onPress={() => setQuery(value)}
                  style={{ minHeight: hit, justifyContent: 'center' }}
                >
                  <Text style={{ color: C.text }}>{value}</Text>
                </Pressable>
              ))}
              <Button
                variant="text"
                title="Clear recent searches"
                accessibilityLabel="Clear recent searches"
                onPress={() => {
                  setRecent([]);
                  void clearSearches(data.user.id).catch(() => undefined);
                }}
              />
            </>
          )}
          <Text style={{ color: C.muted }}>
            {focused.length ? 'For your focus' : 'Explore a flow'}
          </Text>
          {suggestions.map(flow => (
            <Pressable
              key={flow.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${flow.title}`}
              onPress={() =>
                open({
                  id: flow.id,
                  title: flow.title,
                  detail: flow.goal,
                  kind: 'flow',
                  open: () => onFlow(flow),
                })
              }
              style={{ minHeight: hit, justifyContent: 'center' }}
            >
              <Text style={{ color: C.text }}>{flow.title} →</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyboardShouldPersistTaps="handled"
          keyExtractor={item => `${item.kind}:${item.id}`}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <Text
              accessibilityRole="header"
              variant="section"
              style={{ backgroundColor: C.bg, color: C.lime, paddingVertical: space.ms }}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.detail}`}
              onPress={() => open(item)}
              style={{
                minHeight: 64,
                paddingVertical: space.ms,
                borderBottomWidth: stroke.line,
                borderColor: C.line,
                gap: space.sm,
              }}
            >
              <Text variant="body" style={{ color: C.text }}>{item.title}</Text>
              <Text variant="footnote" style={{ color: C.muted }}>{item.detail}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title={`No matches for “${debounced}”`}
              description="Try a product name, city or activity."
              action={{ label: 'Browse categories', onPress: () => setQuery('') }}
            />
          }
        />
      )}
    </View>
  );
}
