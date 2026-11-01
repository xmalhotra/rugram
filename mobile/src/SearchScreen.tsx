import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, SectionList, TextInput, View } from 'react-native';
import type { HabitFlow, MobilePayload, Product, CityEvent } from '../../shared/mobile';
import type { Exercise } from '../../shared/exercises';
import { searchCatalogue, recentSearches } from '../../shared/search';
import { flowsForFocus } from '../../shared/focus';
import { formatEventTime, formatInr, checkedAgo } from '../../shared/format';
import { loadSearches, saveSearches, clearSearches } from './local-searches';
import { usePaneState } from './pane-state';
import { Text } from './design/Text';
import { useTheme } from './design/theme';
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
  const sections: { title: string; data: SearchRow[] }[] = [
    {
      title: 'Flows',
      data: result.flows.map(value => ({
        id: value.id,
        title: value.title,
        detail: `${value.steps.length} steps · ${value.goal}`,
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
    <View style={{ flex: 1, gap: 16 }}>
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
          minHeight: 52,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 14,
          color: C.text,
          fontSize: 17,
          padding: 14,
        }}
      />
      {searchError&&<Banner kind="error" message={searchError} action={{label:'Retry full search',onPress:()=>setRetry(value=>value+1)}}/>}
      {!query.trim() ? (
        <View style={{ gap: 12 }}>
          {recent.length > 0 && (
            <>
              <Text style={{ color: C.muted }}>Recent searches</Text>
              {recent.map(value => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${value}`}
                  onPress={() => setQuery(value)}
                  style={{ minHeight: 48, justifyContent: 'center' }}
                >
                  <Text style={{ color: C.text }}>{value}</Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear recent searches"
                onPress={() => {
                  setRecent([]);
                  void clearSearches(data.user.id).catch(() => undefined);
                }}
                style={{ minHeight: 48, justifyContent: 'center' }}
              >
                <Text style={{ color: C.lime }}>Clear recent searches</Text>
              </Pressable>
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
              style={{ minHeight: 48, justifyContent: 'center' }}
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
              style={{ backgroundColor: C.bg, color: C.lime, fontSize: 18, paddingVertical: 12 }}
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
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: C.line,
                gap: 6,
              }}
            >
              <Text style={{ color: C.text, fontSize: 17 }}>{item.title}</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>{item.detail}</Text>
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
