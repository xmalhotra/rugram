import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Skeleton,
  EmptyState,
  Banner,
  FilterChips,
  SearchBar,
  StatusPill,
  WeekStrip,
  ProgressRing,
  Avatar,
  Stepper,
  ReasonLine,
  StickyActionBar,
  IconButton,
  useToast,
  Toast,
} from './states';
import { SegmentedControl, Button } from './components';
import { Text } from './Text';
import { useTheme, statusTone } from './theme';
export function ComponentCatalogue() {
  const { colors: C } = useTheme();
  const show = useToast();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('first');
  const [chips, setChips] = useState(['first']);
  const options = [
    { id: 'first', label: 'First' },
    { id: 'second', label: 'Second' },
  ];
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 24, backgroundColor: C.bg }}
    >
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 28 }}>
        Component catalogue
      </Text>
      <View>
        <Skeleton />
        <Skeleton shape="block" />
        <Skeleton shape="card" />
      </View>
      <EmptyState
        title="Nothing here yet"
        description="Try adding a flow."
        action={{
          label: 'Example action',
          onPress: () => show({ kind: 'info', message: 'Example action' }),
        }}
      />
      <Banner kind="demo" message="Demo content" />
      <Banner kind="offline" message="You are offline" />
      <Banner
        kind="error"
        message="Example failure"
        action={{ label: 'Retry', onPress: () => show({ kind: 'info', message: 'Retry example' }) }}
      />
      <SearchBar value={query} onChange={setQuery} />
      <SearchBar value="Example" onChange={() => {}} error="Example field error" />
      <FilterChips options={options} selected={chips} multiple onChange={setChips} />
      <FilterChips options={options} selected={chips} disabled onChange={() => {}} />
      <SegmentedControl options={options} value={selected} onChange={setSelected} />
      <SegmentedControl options={options} value={selected} disabled onChange={() => {}} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(statusTone) as (keyof typeof statusTone)[]).map(status => (
          <StatusPill key={status} status={status} />
        ))}
      </View>
      <WeekStrip
        days={[
          { id: 'first', label: 'Mon', done: 1 },
          { id: 'second', label: 'Tue', done: 0 },
        ]}
        selected={selected}
        onSelect={setSelected}
      />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <ProgressRing value={1} total={3} label="Done today" />
        <Avatar name="John" />
        <Avatar name="Broken image" uri="https://example.invalid/unavailable.png" />
      </View>
      <Stepper step={2} total={4} label="Details" />
      <ReasonLine>One short reason goes here.</ReasonLine>
      <IconButton label="Example disabled action" disabled onPress={() => {}}>
        <Text style={{ color: C.text }}>Disabled</Text>
      </IconButton>
      <IconButton label="Example loading action" loading onPress={() => {}}>
        <Text>Loading</Text>
      </IconButton>
      <Button
        title="Show success toast"
        onPress={() =>
          show({
            kind: 'success',
            message: 'Saved',
            undo: () => show({ kind: 'info', message: 'Undone' }),
          })
        }
      />
      <Toast item={{ id: 1, kind: 'error', message: 'Example error state' }} onDismiss={() => {}} />
      <StickyActionBar
        primary={{ label: 'Primary action', onPress: () => {} }}
        secondary={{ label: 'Secondary action', onPress: () => {} }}
      />
      <StickyActionBar primary={{ label: 'Disabled', disabled: true, onPress: () => {} }} />
      <StickyActionBar busy primary={{ label: 'Loading', onPress: () => {} }} />
    </ScrollView>
  );
}
