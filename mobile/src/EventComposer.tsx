import { useEffect, useState, type ReactElement } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  eventWithinYear,
  questionLimits,
  type EventLocation,
  type EventQuestion,
} from '../../shared/event-registration';
import { questionCatalog } from '../../shared/event-questions';
import { api } from './api';
import { Button, DateTimeField } from './design/components';
import { DetailSurface } from './design/DetailSurface';
import { ScreenBackground } from './design/ScreenBackground';
import { PageBar } from './design/PageBar';
import { Text } from './design/Text';
import { hit, radius, space, stroke, textRoles, useTheme } from './design/theme';

type PlaceSuggestion = { placeId: string; name: string; address: string };
type QuestionDraft = {
  label: string;
  kind: 'choice' | 'text';
  options: string[];
  required: boolean;
};
type EventComposerCategory = { id: string; title: string; topic: string };
type MapPoint = { lat: number; lng: number };

const mapMiss = 'Couldn\'t place that address on the map. Guests will still see it as text.';

function createSession() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function questionId(label: string, taken: readonly string[]) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = (slug || 'question').slice(0, 40).replace(/-+$/g, '') || 'question';
  if (!taken.includes(base)) return base;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const tail = `-${suffix}`;
    const stem = base.slice(0, 40 - tail.length).replace(/-+$/g, '') || 'q';
    const id = `${stem}${tail}`;
    if (!taken.includes(id)) return id;
  }
  return `q-${taken.length + 2}`.slice(0, 40);
}

function cleanLocation(place: EventLocation): EventLocation {
  const location: EventLocation = { name: place.name.trim(), address: place.address.trim() };
  if (place.placeId) location.placeId = place.placeId;
  if (typeof place.lat === 'number') location.lat = place.lat;
  if (typeof place.lng === 'number') location.lng = place.lng;
  return location;
}

function readyLocation(place: EventLocation | null) {
  if (!place) return null;
  const location = cleanLocation(place);
  if (location.name.length < 2 || location.address.length < 2) return null;
  return location;
}

function toQuestion(question: EventQuestion): EventQuestion {
  if (question.kind === 'text') {
    return {
      id: question.id,
      label: question.label.trim(),
      kind: 'text',
      required: question.required,
    };
  }
  return {
    id: question.id,
    label: question.label.trim(),
    kind: 'choice',
    required: question.required,
    options: (question.options ?? []).map(option => option.trim()).filter(Boolean),
  };
}

function round6(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

function mapPointOf(place: EventLocation | null): MapPoint | null {
  if (!place || typeof place.lat !== 'number' || typeof place.lng !== 'number') return null;
  return { lat: place.lat, lng: place.lng };
}

function copyQuestion(preset: EventQuestion): EventQuestion {
  if (preset.kind === 'text') {
    return { id: preset.id, label: preset.label, kind: 'text', required: preset.required };
  }
  return {
    id: preset.id,
    label: preset.label,
    kind: 'choice',
    required: preset.required,
    options: [...(preset.options ?? [])],
  };
}

type EventComposerBase = {
  hostName: string;
  city: string;
  cities: string[];
  isAdmin: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: Record<string, unknown>) => void;
};

export function EventComposer(props: EventComposerBase & { topics: string[] }): ReactElement;
export function EventComposer(
  props: EventComposerBase & { categories: { id: string; title: string; topic: string }[] },
): ReactElement;
export function EventComposer(
  props: EventComposerBase & {
    categories?: EventComposerCategory[];
    topics?: string[];
  },
): ReactElement {
  const { hostName, cities, isAdmin, busy, onClose, onSubmit } = props;
  const categories =
    props.categories ?? (props.topics ?? []).map(topic => ({ id: topic, title: topic, topic }));
  const { colors: C } = useTheme();
  const [session] = useState(createSession);
  const [title, setTitle] = useState('');
  const [startIso, setStartIso] = useState(() =>
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  );
  const [endIso, setEndIso] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [picked, setPicked] = useState<EventLocation | null>(null);
  const [manual, setManual] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [manualPin, setManualPin] = useState<MapPoint | null>(null);
  const [mapNote, setMapNote] = useState('');
  const [city, setCity] = useState(props.city);
  const [categoryId, setCategoryId] = useState('');
  const [topicLabel, setTopicLabel] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [waitlist, setWaitlist] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<QuestionDraft>({
    label: '',
    kind: 'text',
    options: ['', ''],
    required: false,
  });

  useEffect(() => {
    if (manual || picked) return;
    const text = query.trim();
    if (text.length < 2) {
      setSuggestions(current => (current.length === 0 ? current : []));
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      void api<{ places: PlaceSuggestion[] }>(
        `/api/mobile/places?q=${encodeURIComponent(text)}&session=${encodeURIComponent(session)}`,
      )
        .then(body => {
          if (!active) return;
          setSuggestions((body.places ?? []).slice(0, 5));
          setSearchError('');
        })
        .catch((error: unknown) => {
          if (!active) return;
          setSuggestions([]);
          setSearchError(error instanceof Error ? error.message : 'Venue search failed.');
          setManual(true);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [manual, picked, query, session]);

  async function selectPlace(placeId: string) {
    try {
      const path =
        `/api/mobile/places?placeId=${encodeURIComponent(placeId)}` +
        `&session=${encodeURIComponent(session)}`;
      const body = await api<{ place: EventLocation }>(path);
      setPicked(body.place);
      setSuggestions([]);
      setQuery('');
      setSearchError('');
    } catch (error: unknown) {
      setSearchError(error instanceof Error ? error.message : 'Venue search failed.');
      setManual(true);
    }
  }

  async function findOnMap() {
    try {
      const results = await Location.geocodeAsync(`${venueName}, ${address}, ${city}`);
      const first = results[0];
      if (!first || !Number.isFinite(first.latitude) || !Number.isFinite(first.longitude)) {
        setManualPin(null);
        setMapNote(mapMiss);
        return;
      }
      setManualPin({ lat: round6(first.latitude), lng: round6(first.longitude) });
      setMapNote('');
    } catch {
      setManualPin(null);
      setMapNote(mapMiss);
    }
  }

  const selectedCategory = categories.find(category => category.id === categoryId);
  const topic = categoryId === 'other' ? 'Other' : (selectedCategory?.topic ?? '');
  const trimmedTopic = topicLabel.trim();
  const manualPlace: EventLocation | null = manual
    ? { name: venueName, address, ...(manualPin ?? {}) }
    : null;
  const location = readyLocation(picked ?? manualPlace);
  const mapPoint = mapPointOf(picked) ?? (manual ? manualPin : null);
  const cityOptions = cities.includes(city) || !city ? cities : [city, ...cities];
  const draftOptions = draft.options.map(option => option.trim()).filter(Boolean);
  const draftReady =
    draft.label.trim().length >= 2 &&
    draft.label.trim().length <= questionLimits.label &&
    (draft.kind === 'text' ||
      (draftOptions.length >= 2 &&
        draftOptions.length <= questionLimits.options &&
        draftOptions.every(option => option.length <= questionLimits.option)));
  const missing: string[] = [];
  const name = title.trim();
  if (name.length < 3 || name.length > 120) {
    missing.push(name.length > 120 ? 'Shorten the event name' : 'Add an event name');
  }
  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs) || startMs <= Date.now()) missing.push('Pick a start time');
  else if (!eventWithinYear(startIso)) missing.push('Pick a start within the next year');
  if (endIso) {
    const endMs = Date.parse(endIso);
    if (!Number.isFinite(endMs) || !Number.isFinite(startMs) || endMs <= startMs) {
      missing.push('End must be after the start');
    } else if (!eventWithinYear(endIso)) missing.push('Pick an end within the next year');
  }
  if (!location) missing.push('Add a venue');
  if (!topic) missing.push('Choose a topic');
  else if (categoryId === 'other' && (trimmedTopic.length < 2 || trimmedTopic.length > 40)) {
    missing.push('Add your topic');
  }
  if (description.trim().length < 20) missing.push('Add a description');
  const seats = Number(capacity);
  if (!/^\d+$/.test(capacity) || seats < 1 || seats > 10000) missing.push('Set a capacity');
  if (
    questions.some(question => {
      if (question.label.trim().length < 2) return true;
      if (question.kind !== 'choice') return false;
      return (question.options ?? []).filter(option => option.trim()).length < 2;
    })
  ) {
    missing.push('Finish the signup questions');
  }
  const ready = missing.length === 0 && !busy;
  const questionLimitReached = questions.length >= questionLimits.questions;

  function openEditor() {
    setDraft({ label: '', kind: 'text', options: ['', ''], required: false });
    setEditorOpen(true);
  }

  function saveQuestion() {
    if (!draftReady || questions.length >= questionLimits.questions) return;
    const label = draft.label.trim();
    const id = questionId(
      label,
      questions.map(question => question.id),
    );
    const next: EventQuestion =
      draft.kind === 'text'
        ? { id, label, kind: 'text', required: draft.required }
        : { id, label, kind: 'choice', required: draft.required, options: draftOptions };
    setQuestions(current => [...current, next]);
    setEditorOpen(false);
  }

  function addPreset(preset: EventQuestion) {
    setQuestions(current => {
      if (current.some(question => question.id === preset.id)) return current;
      if (current.length >= questionLimits.questions) return current;
      return [...current, copyQuestion(preset)];
    });
  }

  function submit() {
    if (!ready || !location) return;
    const descriptionText = description.trim();
    const event: Record<string, unknown> = {
      registrationMode: 'approval',
      requireApproval,
      waitlist,
      guestCapacity: Number(capacity),
      questions: questions.map(toQuestion),
      location,
      organizers: [{ name: hostName }],
      title: name,
      city,
      country: 'IN',
      topic,
      ...(categoryId === 'other' ? { topicLabel: trimmedTopic } : {}),
      venue: location.name,
      startsAt: startIso,
      ...(endIso ? { endsAt: endIso } : {}),
      description: descriptionText,
      registrationUrl: '',
      registrationClosesAt: null,
      registrationStatus: 'Registration link available',
      entryFee: 0,
      feeNote: '',
      audience: `Open to anyone in ${city}.`,
      outcomes: [descriptionText.slice(0, 200)],
      sourceUrls: [],
      checkedAt: new Date().toISOString(),
      ...(isAdmin
        ? { editorialPriority: { score: 3, reason: 'Hosted in Qram by an admin account.' } }
        : {}),
    };
    onSubmit(event);
  }

  const card = {
    backgroundColor: C.card,
    borderRadius: radius.control,
    borderWidth: stroke.line,
    borderColor: C.line,
    padding: space.md,
    gap: space.ms,
  };
  const heading = { color: C.text, fontWeight: '600' as const };
  const muted = { color: C.muted };
  const field = {
    color: C.text,
    fontSize: textRoles.callout.fontSize,
    paddingHorizontal: space.ms,
    paddingVertical: space.ms,
    borderRadius: radius.small,
    borderWidth: stroke.line,
    borderColor: C.line,
  };

  return (
    <DetailSurface onClose={onClose} fullScreen presentation="inline">
      <ScreenBackground />
      <PageBar title="Create event" onBack={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 160, gap: space.md }}
        >
          <TextInput
            accessibilityLabel="Event name"
            value={title}
            onChangeText={setTitle}
            placeholder="Event name"
            placeholderTextColor={C.muted}
            maxLength={120}
            style={{
              color: C.text,
              fontSize: textRoles.title.fontSize,
              fontWeight: textRoles.title.fontWeight,
              paddingVertical: space.sm,
            }}
          />

          <View style={card}>
            <Text variant="callout" style={heading}>When</Text>
            <DateTimeField label="Start" value={startIso} onChange={setStartIso} />
            <DateTimeField label="End" value={endIso} onChange={setEndIso} />
            {endIso ? (
              <Button
                variant="text"
                title="Clear end"
                accessibilityLabel="Clear end time"
                onPress={() => setEndIso('')}
              />
            ) : (
              <Text variant="footnote" style={muted}>End is optional.</Text>
            )}
          </View>

          <View style={card}>
            <Text variant="callout" style={heading}>Where</Text>
            {picked ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  borderRadius: radius.small,
                  borderWidth: stroke.line,
                  borderColor: C.line,
                  paddingHorizontal: space.ms,
                  paddingVertical: space.ms,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{picked.name}</Text>
                  <Text variant="footnote" style={muted}>{picked.address}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear venue"
                  hitSlop={8}
                  onPress={() => setPicked(null)}
                >
                  <Text variant="body" style={{ color: C.text }}>✕</Text>
                </Pressable>
              </View>
            ) : manual ? (
              <View style={{ gap: space.ms }}>
                {searchError ? <Text variant="footnote" style={muted}>{searchError}</Text> : null}
                <TextInput
                  accessibilityLabel="Venue name"
                  value={venueName}
                  onChangeText={value => {
                    setVenueName(value);
                    setManualPin(null);
                    setMapNote('');
                  }}
                  placeholder="Venue name"
                  placeholderTextColor={C.muted}
                  maxLength={160}
                  style={field}
                />
                <TextInput
                  accessibilityLabel="Address"
                  value={address}
                  onChangeText={value => {
                    setAddress(value);
                    setManualPin(null);
                    setMapNote('');
                  }}
                  placeholder="Address"
                  placeholderTextColor={C.muted}
                  maxLength={300}
                  style={field}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Find on map"
                  onPress={() => void findOnMap()}
                  style={{
                    borderRadius: radius.small,
                    borderWidth: stroke.line,
                    borderColor: C.line,
                    minHeight: hit,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: space.ms,
                  }}
                >
                  <Text variant="subhead" style={{ color: C.text, fontWeight: '600' }}>
                    Find on map
                  </Text>
                </Pressable>
                {mapNote ? <Text variant="footnote" style={muted}>{mapNote}</Text> : null}
              </View>
            ) : (
              <View style={{ gap: space.sm }}>
                <TextInput
                  accessibilityLabel="Search venues"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search venues"
                  placeholderTextColor={C.muted}
                  autoCorrect={false}
                  style={field}
                />
                {suggestions.map(place => (
                  <Pressable
                    key={place.placeId}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${place.name}`}
                    onPress={() => void selectPlace(place.placeId)}
                    style={{ paddingVertical: space.sm }}
                  >
                    <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{place.name}</Text>
                    <Text variant="footnote" style={muted}>{place.address}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {mapPoint ? (
              <MapView
                key={`${mapPoint.lat},${mapPoint.lng}`}
                pointerEvents="none"
                scrollEnabled={false}
                zoomEnabled={false}
                style={{ height: 160, borderRadius: radius.control, overflow: 'hidden' }}
                initialRegion={{
                  latitude: mapPoint.lat,
                  longitude: mapPoint.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={{ latitude: mapPoint.lat, longitude: mapPoint.lng }} />
              </MapView>
            ) : null}
            <Text variant="footnote" style={muted}>City</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {cityOptions.map(option => (
                <Pill
                  key={option}
                  label={option}
                  selected={option === city}
                  onPress={() => setCity(option)}
                />
              ))}
            </View>
          </View>

          <View style={card}>
            <Text variant="callout" style={heading}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {categories.map(category => (
                <Pill
                  key={category.id}
                  label={category.title}
                  selected={category.id === categoryId}
                  onPress={() => {
                    setCategoryId(category.id);
                    setTopicLabel('');
                  }}
                />
              ))}
              <Pill
                label="Other"
                selected={categoryId === 'other'}
                onPress={() => setCategoryId('other')}
              />
            </View>
            {categoryId === 'other' ? (
              <TextInput
                accessibilityLabel="Your topic"
                value={topicLabel}
                onChangeText={setTopicLabel}
                placeholder="Your topic"
                placeholderTextColor={C.muted}
                maxLength={40}
                style={field}
              />
            ) : null}
          </View>

          <View style={card}>
            <Text variant="callout" style={heading}>About this event</Text>
            <TextInput
              accessibilityLabel="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="What should guests expect? Agenda, who it's for, what to bring."
              placeholderTextColor={C.muted}
              multiline
              maxLength={800}
              textAlignVertical="top"
              style={[field, { minHeight: 120 }]}
            />
          </View>

          <View style={card}>
            <Text variant="callout" style={heading}>Tickets & seats</Text>
            <Text variant="footnote" style={muted}>Capacity</Text>
            <TextInput
              accessibilityLabel="Capacity"
              value={capacity}
              onChangeText={value => setCapacity(value.replace(/\D/g, '').slice(0, 5))}
              placeholder="100"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              style={field}
            />
            <ToggleRow label="Waitlist when full" value={waitlist} onValueChange={setWaitlist} />
            <ToggleRow
              label="Approve each guest"
              hint="Guests stay pending until you approve them."
              value={requireApproval}
              onValueChange={setRequireApproval}
            />
          </View>

          <View style={card}>
            <Text variant="callout" style={heading}>Signup questions</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {questionCatalog.map(preset => {
                const added = questions.some(question => question.id === preset.id);
                return (
                  <Pill
                    key={preset.id}
                    label={`+ ${preset.label}`}
                    selected={false}
                    disabled={added}
                    onPress={() => addPreset(preset)}
                  />
                );
              })}
            </View>
            {questions.map(question => (
              <View
                key={question.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="callout" style={{ color: C.text, fontWeight: '600' }}>{question.label}</Text>
                  <Text variant="footnote" style={muted}>
                    {question.kind === 'choice'
                      ? `Choice · ${question.options?.length ?? 0} options`
                      : 'Text'}
                    {question.required ? ' · Required' : ''}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${question.label}`}
                  hitSlop={8}
                  onPress={() =>
                    setQuestions(current => current.filter(item => item.id !== question.id))
                  }
                >
                  <Text variant="body" style={{ color: C.text }}>✕</Text>
                </Pressable>
              </View>
            ))}
            {editorOpen ? (
              <View style={{ gap: space.ms }}>
                <TextInput
                  accessibilityLabel="Question"
                  value={draft.label}
                  onChangeText={label => setDraft(current => ({ ...current, label }))}
                  placeholder="Question"
                  placeholderTextColor={C.muted}
                  maxLength={questionLimits.label}
                  style={field}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  <Pill
                    label="Choice"
                    selected={draft.kind === 'choice'}
                    onPress={() =>
                      setDraft(current => ({
                        ...current,
                        kind: 'choice',
                        options: current.options.length >= 2 ? current.options : ['', ''],
                      }))
                    }
                  />
                  <Pill
                    label="Text"
                    selected={draft.kind === 'text'}
                    onPress={() => setDraft(current => ({ ...current, kind: 'text' }))}
                  />
                </View>
                {draft.kind === 'choice' ? (
                  <View style={{ gap: space.sm }}>
                    {draft.options.map((option, index) => (
                      <View
                        key={index}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
                      >
                        <TextInput
                          accessibilityLabel={`Option ${index + 1}`}
                          value={option}
                          onChangeText={value =>
                            setDraft(current => ({
                              ...current,
                              options: current.options.map((item, itemIndex) =>
                                itemIndex === index ? value : item,
                              ),
                            }))
                          }
                          placeholder={`Option ${index + 1}`}
                          placeholderTextColor={C.muted}
                          maxLength={questionLimits.option}
                          style={[field, { flex: 1 }]}
                        />
                        {draft.options.length > 2 ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove option ${index + 1}`}
                            hitSlop={8}
                            onPress={() =>
                              setDraft(current => ({
                                ...current,
                                options: current.options.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              }))
                            }
                          >
                            <Text variant="body" style={{ color: C.text }}>✕</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                    {draft.options.length < questionLimits.options ? (
                      <Button
                        variant="text"
                        title="Add option"
                        accessibilityLabel="Add option"
                        onPress={() =>
                          setDraft(current => ({ ...current, options: [...current.options, ''] }))
                        }
                      />
                    ) : null}
                  </View>
                ) : null}
                <ToggleRow
                  label="Required"
                  value={draft.required}
                  onValueChange={required => setDraft(current => ({ ...current, required }))}
                />
                <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                  <Button
                    variant="text"
                    size="regular"
                    title="Add"
                    accessibilityLabel="Add question"
                    disabled={!draftReady}
                    onPress={saveQuestion}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => setEditorOpen(false)}>
                    <Text variant="callout" style={{ color: C.muted }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : !questionLimitReached ? (
              <Button
                variant="text"
                title="Write your own"
                accessibilityLabel="Write your own question"
                onPress={openEditor}
              />
            ) : (
              <Text variant="footnote" style={muted}>You can add up to {questionLimits.questions} questions.</Text>
            )}
          </View>

          <Button
            title="Create event"
            accessibilityLabel="Create event"
            disabled={!ready}
            onPress={submit}
          />
          {missing.length > 0 ? (
            <View style={{ gap: space.xs }}>
              {missing.map(item => (
                <Text key={item} variant="footnote" style={muted}>
                  {item}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </DetailSurface>
  );
}

function Pill({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose ${label}`}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: radius.pill,
        borderWidth: stroke.line,
        borderColor: selected ? C.lime : C.line,
        backgroundColor: selected ? C.lime : 'transparent',
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text variant="subhead" style={{ color: selected ? C.onAccent : C.text, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.ms,
        }}
      >
        <Text variant="callout" style={{ color: C.text, flex: 1 }}>{label}</Text>
        <Switch
          accessibilityLabel={label}
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: C.line, true: C.lime }}
          thumbColor={C.onAccent}
        />
      </View>
      {hint ? <Text variant="footnote" style={{ color: C.muted }}>{hint}</Text> : null}
    </View>
  );
}
