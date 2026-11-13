import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { AppearancePreference } from '../../../shared/appearance';
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
import {
  SegmentedControl,
  Button,
  Card,
  Chip,
  SectionHeader,
  Row,
  RowGroup,
  GlassSurface,
  TimerBar,
  ProgressSteps,
} from './components';
import { Text } from './Text';
import { AppearancePreferenceContext, layout, space, statusTone, textRoles, useTheme, type TextRole } from './theme';

/** Every shared part, on the admin-only /design-system route. The switch at the top forces light or dark. */
export function ComponentCatalogue() {
  const [appearance, setAppearance] = useState<AppearancePreference>('system');
  return (
    <AppearancePreferenceContext.Provider value={appearance}>
      <Catalogue appearance={appearance} onAppearance={setAppearance} />
    </AppearancePreferenceContext.Provider>
  );
}

function Catalogue({
  appearance,
  onAppearance,
}: {
  appearance: AppearancePreference;
  onAppearance: (value: AppearancePreference) => void;
}) {
  const { colors: C } = useTheme();
  const show = useToast();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('first');
  const [chips, setChips] = useState(['first']);
  const [chip, setChip] = useState(true);
  const options = [
    { id: 'first', label: 'First' },
    { id: 'second', label: 'Second' },
  ];
  const roles = Object.keys(textRoles) as TextRole[];
  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: layout.margin, paddingBottom: space.xxl * 2, gap: layout.section }}
    >
      <Text accessibilityRole="header" variant="title" style={{ color: C.text }}>
        Component catalogue
      </Text>
      <FilterChips
        options={[
          { id: 'system', label: 'System' },
          { id: 'light', label: 'Light' },
          { id: 'dark', label: 'Dark' },
        ]}
        selected={[appearance]}
        onChange={ids => onAppearance(ids[0] as AppearancePreference)}
      />

      <View style={{ gap: layout.cards }}>
        <SectionHeader title="Text roles" detail="Ten roles. Nothing smaller than caption." />
        <Card>
          {roles.map(role => (
            <Text key={role} variant={role} style={{ color: C.text }}>
              {role} · {textRoles[role].fontSize}
            </Text>
          ))}
        </Card>
      </View>

      <View style={{ gap: layout.cards }}>
        <SectionHeader
          title="Buttons"
          detail="One primary at a time."
          action={{ label: 'Action', onPress: () => show({ kind: 'info', message: 'Section action' }) }}
        />
        <Button title="Primary" onPress={() => show({ kind: 'success', message: 'Saved', undo: () => {} })} />
        <Button variant="secondary" title="Secondary" onPress={() => {}} />
        <Button variant="text" title="Text button" onPress={() => {}} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button size="regular" fit title="Regular" onPress={() => {}} />
          <Button size="regular" fit variant="secondary" title="Regular" onPress={() => {}} />
        </View>
        <Button title="Disabled" disabled onPress={() => {}} />
        <Button title="Busy" busy onPress={() => {}} />
        <Button title="Delete" destructive variant="secondary" onPress={() => {}} />
      </View>

      <View style={{ gap: layout.cards }}>
        <SectionHeader title="Icon buttons" detail="Text colour by default." />
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <IconButton label="Go back" symbol="chevron.left" android="arrow_back" fallback="←" onPress={() => {}} />
          <IconButton label="Sound" symbol="speaker.wave.2.fill" android="volume_up" fallback="♪" onPress={() => {}} />
          <IconButton label="About" look="outlined" symbol="info" android="info" fallback="i" onPress={() => {}} />
          <IconButton label="Play" look="outlined" symbol="play.fill" android="play_arrow" fallback="▶" onPress={() => {}} />
          <IconButton label="Mark done" tone="accent" symbol="checkmark" android="check" fallback="✓" onPress={() => {}} />
          <IconButton label="Disabled" disabled symbol="xmark" android="close" fallback="×" onPress={() => {}} />
          <IconButton label="Loading" loading onPress={() => {}} />
        </View>
      </View>

      <View style={{ gap: layout.cards }}>
        <SectionHeader title="Rows" detail="A chevron means it can be tapped." />
        <RowGroup>
          <Row title="Full body and core" detail="Ready to share" onPress={() => {}} />
          <Row title="Core day" detail="2 more sessions" trailing="1 of 3" />
          <Row title="Leg day" detail="Push · 45 min" leading={<Avatar name="Leg" size={space.xxl + space.sm} />} onPress={() => {}} />
        </RowGroup>
      </View>

      <View style={{ gap: layout.cards }}>
        <SectionHeader title="Cards" />
        <Card>
          <Text variant="headline" style={{ color: C.text }}>A card</Text>
          <Text variant="subhead" style={{ color: C.muted }}>Inside 16, 12 between parts.</Text>
        </Card>
        <Card accessibilityLabel="A card you can tap" onPress={() => show({ kind: 'info', message: 'Card tapped' })}>
          <Text variant="headline" style={{ color: C.text }}>A card you can tap</Text>
        </Card>
      </View>

      <View style={{ gap: layout.cards }}>
        <SectionHeader title="Workout" detail="Timer bar, step bar and glass." />
        <TimerBar word="Rest" time="3:51" fill={0.35} trailing={<Button variant="text" size="regular" title="Skip" onPress={() => {}} />} />
        <TimerBar word="Elapsed" time="0:06" />
        <TimerBar word="Rest" time="1:20" fill={0.6} paused />
        <ProgressSteps total={5} filled={3} />
        <GlassSurface rounded style={{ padding: layout.inset, gap: space.sm }}>
          <Text variant="headline" style={{ color: C.text }}>Glass surface</Text>
          <Text variant="subhead" style={{ color: C.muted }}>The header, run footer and run bar use this.</Text>
        </GlassSurface>
      </View>

      <View style={{ gap: layout.cards }}>
        <SectionHeader title="Feedback" />
        <Skeleton />
        <Skeleton shape="block" />
        <Skeleton shape="card" />
        <EmptyState
          title="Nothing here yet"
          description="Try adding a flow."
          action={{
            label: 'Example action',
            onPress: () => show({ kind: 'info', message: 'Example action' }),
          }}
        />
        <Banner kind="demo" message="Demo content" />
        <Banner kind="offline" message="You are offline" onDismiss={() => {}} />
        <Banner
          kind="error"
          message="Example failure"
          action={{ label: 'Retry', onPress: () => show({ kind: 'info', message: 'Retry example' }) }}
        />
        <Toast item={{ id: 1, kind: 'error', message: 'Example error state' }} onDismiss={() => {}} />
      </View>

      <View style={{ gap: layout.cards }}>
        <SectionHeader title="Choosing" />
        <SearchBar value={query} onChange={setQuery} />
        <SearchBar value="Example" onChange={() => {}} error="Example field error" />
        <Chip title="A chip" active={chip} onPress={() => setChip(value => !value)} />
        <FilterChips options={options} selected={chips} multiple onChange={setChips} />
        <FilterChips options={options} selected={chips} disabled onChange={() => {}} />
        <SegmentedControl options={options} value={selected} onChange={setSelected} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
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
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <ProgressRing value={1} total={3} label="Done today" />
          <Avatar name="John" />
          <Avatar name="Broken image" uri="https://example.invalid/unavailable.png" />
        </View>
        <Stepper step={2} total={4} label="Details" />
        <ReasonLine>One short reason goes here.</ReasonLine>
      </View>

      <View style={{ gap: layout.cards }}>
        <SectionHeader title="Sticky action bar" />
        <StickyActionBar
          primary={{ label: 'Primary action', onPress: () => {} }}
          secondary={{ label: 'Secondary action', onPress: () => {} }}
        />
        <StickyActionBar primary={{ label: 'Disabled', disabled: true, onPress: () => {} }} />
        <StickyActionBar busy primary={{ label: 'Loading', onPress: () => {} }} />
      </View>
    </ScrollView>
  );
}
