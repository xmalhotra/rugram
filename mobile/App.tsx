import { habitDay } from '../shared/format';
import { FlowHeartAction } from './src/FlowHeartAction';
import { AddToFlowHeaderButton, AddToFlowProvider } from './src/AddToFlowHeader';
import { useCreatorSubmit } from './src/useCreatorSubmit';
import { CreatorStudio } from './src/CreatorStudio';
import { BrandMark } from './src/design/BrandMark';
import { PaneScope, usePaneState } from './src/pane-state';
import { RootList } from './src/RootList';
import { Banner, useToast } from './src/design/states';
import { LogoLoader } from './src/motion';
import { profileAction, reverseProfileAction } from '../shared/profile-action';
import { SearchScreen } from './src/SearchScreen';
import { useOutbound } from './src/OutboundLink';
import { ExerciseSequence } from './src/ExerciseSequence';
import type { Exercise } from '../shared/exercises';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { shareFlow, sharePick, shareEvent, type SharedKind } from '../shared/sharing';
import { AddToCalendar } from './src/AddToCalendar';
import { ReportIssue } from './src/ReportIssue';
import { Text } from './src/design/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { PicksBrowser } from './src/PicksBrowser';
import { NotificationCentre } from './src/NotificationCentre';
import { YouProfile } from './src/YouProfile';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from './src/api';
import { type CityEvent, type HabitFlow, type MobilePayload, type Product } from '../shared/mobile';

const showCatalogueSearch = false;
export type Tab = 'Flows' | 'Discover' | 'Picks' | 'Events' | 'Studio' | 'You';
const today = () => habitDay(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
import { Button, Field, Badge, Sheet, SegmentedControl } from './src/design/components';
import { useTheme, type Colors } from './src/design/theme';
import { useSession } from './src/session';
import { FlowCategories } from './src/FlowCategories';
import { NeonBackdrop } from './src/design/NeonBackdrop';
import { PhoneSignIn } from './src/PhoneSignIn';
import { HyderabadEvents, CuratedEventDetails } from './src/HyderabadEvents';
import { EventLinkFields } from './src/EventLinkFields';
import { FlowDetails } from './src/FlowDetails';
import { HomeFeed } from './src/HomeFeed';
import { CommunityFeed, CommunityFlowSheet } from './src/CommunityFeed';
import { useCommunityStatus } from './src/community';
import { AddToFlowSheet } from './src/PersonalFlowSheets';
import { PersonalFlowDetails } from './src/PersonalFlowDetails';
import type { FlowCardReference } from '../shared/personal-flows';
import { storyReadKey, type StoryCard } from '../shared/home-feed';
import { StoryViewer } from './src/StoryViewer';
import { WorkoutBuilder } from './src/WorkoutBuilder';
import { LearningContent } from './src/LearningContent';
import { MagnesiumGuide } from './src/MagnesiumGuide';
import { GymSupportGuide } from './src/GymSupportGuide';
import { ProductFields } from './src/ProductFields';
import { PickDetails } from './src/PickDetails';
import { CreditCardDetails } from './src/CreditCardPicks';
import type { CreditCard } from '../shared/credit-cards';
import { canOpenRegistration } from '../shared/hyderabad-tech';
import {
  buildStoryGroups,
  resolveStoryTarget,
  type StoryGroup,
  type StoryTarget,
} from '../shared/home-feed';

export function QramScreen({
  tab = 'Flows',
  initialTarget,
}: {
  tab?: Tab;
  initialTarget?: { kind: SharedKind; id: string };
}) {
  const detailParams = useLocalSearchParams<{ detailKind?: string; detailId?: string }>();
  const linkedTarget =
    initialTarget ??
    (['flow', 'pick', 'event'].includes(detailParams.detailKind ?? '') &&
    typeof detailParams.detailId === 'string'
      ? { kind: detailParams.detailKind as SharedKind, id: detailParams.detailId }
      : undefined);
  return (
    <PaneScope name={linkedTarget ? `${linkedTarget.kind}:${linkedTarget.id}` : tab}>
      <QramPane tab={tab} initialTarget={linkedTarget} />
    </PaneScope>
  );
}
function QramPane({
  tab,
  initialTarget,
}: {
  tab: Tab;
  initialTarget?: { kind: SharedKind; id: string };
}) {
  const toast = useToast();
  const openLink = useOutbound();
  const [searchOpen, setSearchOpen] = usePaneState('searchOpen', false);
  const [searchExercise, setSearchExercise] = usePaneState<Exercise | null>('searchExercise', null);
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const initialCategory = typeof params.category === 'string' ? params.category : undefined;
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const {
    data,
    loading,
    busy,
    error,
    updatedAt,
    setData,
    setBusy,
    setError,
    refresh,
    logout: sessionLogout,
  } = useSession();
  const [selectedFlow, setSelectedFlow] = usePaneState<HabitFlow | null>('flow', null);
  const [personalFlowId, setPersonalFlowId] = usePaneState<string | null>('personalFlow', null);
  const [homeTab, setHomeTab] = usePaneState<'for-you' | 'following' | 'yours'>('homeTab', 'for-you');
  const [communityFlowId, setCommunityFlowId] = usePaneState<string | null>('communityFlow', null);
  const communityStatus = useCommunityStatus();
  const [addingCard, setAddingCard] = usePaneState<FlowCardReference | null>('addingCard', null);
  const [selectedProduct, setSelectedProduct] = usePaneState<Product | null>('product', null);
  const [selectedEvent, setSelectedEvent] = usePaneState<CityEvent | null>('event', null);
  const [flowReturn, setFlowReturn] = usePaneState<HabitFlow | null>('flowReturn', null);
  const [selectedStory, setSelectedStory] = usePaneState<StoryGroup | null>('story', null);
  const [workoutBuilder, setWorkoutBuilder] = usePaneState('workoutBuilder', false);
  const [magnesiumGuide, setMagnesiumGuide] = usePaneState('magnesiumGuide', false);
  const [gymGuide, setGymGuide] = usePaneState('gymGuide', false);
  const [selectedCard, setSelectedCard] = usePaneState<CreditCard | null>('card', null);
  const [cardHistory, setCardHistory] = usePaneState<CreditCard[]>('cardHistory', []);
  const openedTarget = useRef('');
  useEffect(() => {
    if (!initialTarget || !data) return;
    const key = `${data.user.id}:${initialTarget.kind}:${initialTarget.id}`;
    if (openedTarget.current === key) return;
    const item =
      initialTarget.kind === 'flow'
        ? data.flows.find(item => item.id === initialTarget.id)
        : initialTarget.kind === 'pick'
          ? data.products.find(item => item.id === initialTarget.id && item.status === 'published')
          : data.events.find(item => item.id === initialTarget.id && item.status === 'published');
    if (!item) return;
    openedTarget.current = key;
    if (initialTarget.kind === 'flow') setSelectedFlow(item as HabitFlow);
    else if (initialTarget.kind === 'pick') setSelectedProduct(item as Product);
    else setSelectedEvent(item as CityEvent);
  }, [
    initialTarget?.kind,
    initialTarget?.id,
    data,
    setSelectedFlow,
    setSelectedProduct,
    setSelectedEvent,
  ]);
  async function shareSelected() {
    const item = selectedFlow ?? selectedProduct ?? selectedEvent;
    if (!item) return;
    const kind = selectedFlow ? 'flow' : selectedProduct ? 'product' : 'event';
    try {
      await Share.share(
        selectedFlow
          ? shareFlow(selectedFlow)
          : selectedProduct
            ? sharePick(selectedProduct)
            : shareEvent(selectedEvent!),
      );
      void api('/api/mobile', { action: 'share-opened', kind, id: item.id }).catch(() => undefined);
    } catch (cause) {
      toast({
        kind: 'error',
        message: cause instanceof Error ? cause.message : 'Could not open sharing.',
      });
    }
  }
  useEffect(() => {
    const target = selectedFlow
      ? { kind: 'flow', id: selectedFlow.id }
      : selectedProduct
        ? { kind: 'product', id: selectedProduct.id }
        : selectedEvent
          ? { kind: 'event', id: selectedEvent.id }
          : selectedCard
            ? { kind: 'card', id: selectedCard.id }
            : null;
    if (target) void api('/api/mobile', { action: 'content-view', ...target }).catch(() => {});
  }, [selectedFlow?.id, selectedProduct?.id, selectedEvent?.id, selectedCard?.id]);
  function openFlowPick(product: Product) {
    setFlowReturn(selectedFlow);
    setSelectedFlow(null);
    setSelectedProduct(product);
  }
  function closePick() {
    setSelectedProduct(null);
    if (flowReturn) {
      setSelectedFlow(flowReturn);
      setFlowReturn(null);
    }
  }
  async function change(body: unknown, success?: string) {
    const input = body as {
      action: string;
      id?: string;
      enabled?: boolean;
      timeZone?: string;
      completionDay?: string;
      requestId?: string;
    };
    if (input.action === 'complete') {
      input.timeZone ??= Intl.DateTimeFormat().resolvedOptions().timeZone;
      input.completionDay ??= habitDay(new Date(), input.timeZone);
      input.requestId ??= `complete-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
    if (
      data &&
      ['flow', 'save', 'complete', 'rsvp'].includes(input.action) &&
      input.enabled === undefined
    ) {
      const values =
        input.action === 'flow'
          ? data.profile.flowIds
          : input.action === 'save'
            ? data.profile.savedProductIds
            : input.action === 'rsvp'
              ? data.profile.eventIds
              : data.profile.completed;
      input.enabled = !values.includes(
        input.action === 'complete' ? `${today()}:${input.id}` : (input.id ?? ''),
      );
      input.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    setBusy(true);
    const before = data;
    const actionTime = new Date();
    const rollback = before ? reverseProfileAction(before, input, actionTime) : null;
    if (before)
      setData(current =>
        current?.user.id === before.user.id ? profileAction(current, input, actionTime) : current,
      );
    try {
      const value = await api<MobilePayload>('/api/mobile', input);
      setData(current => (current?.user.id === value.user.id ? value : current));
      setError('');
      if (success) toast({ message: success, kind: 'success' });
      else if (input.action === 'complete')
        toast({
          message: input.enabled ? 'Done today' : 'Marked as not done',
          kind: 'success',
          undo: () => {
            void change({ ...input, requestId: undefined, enabled: !input.enabled });
          },
        });
      return true;
    } catch (e) {
      if (before && rollback)
        setData(current =>
          current?.user.id === before.user.id
            ? profileAction(current, rollback, actionTime)
            : current,
        );
      toast({
        message: e instanceof Error ? e.message : 'Could not save. Try again.',
        kind: 'error',
      });
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function requestEmailCode(email: string) {
    setBusy(true);
    try {
      const value = await api<
        MobilePayload & { emailChallenge?: { challengeId: string; mockCode?: string } }
      >('/api/mobile', { action: 'email-code', email });
      setData(current => (current?.user.id === value.user.id ? value : current));
      setError('');
      toast({ message: 'Verification code sent', kind: 'success' });
      return value.emailChallenge ?? null;
    } catch (e) {
      toast({
        message: e instanceof Error ? e.message : 'Could not send the code.',
        kind: 'error',
      });
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function loadMore() {
    if (!data?.nextCursor || busy) return;
    setBusy(true);
    try {
      const page = await api<MobilePayload>(
        `/api/mobile?cursor=${encodeURIComponent(data.nextCursor)}`,
      );
      setData(previous =>
        previous
          ? {
              ...page,
              products: [
                ...new Map([...previous.products, ...page.products].map(p => [p.id, p])).values(),
              ],
              events: [
                ...new Map([...previous.events, ...page.events].map(e => [e.id, e])).values(),
              ],
            }
          : page,
      );
    } catch (e) {
      toast({
        message: e instanceof Error ? e.message : 'Could not load more. Try again.',
        kind: 'error',
      });
    } finally {
      setBusy(false);
    }
  }
  const seenStory = useCallback(
    async (card: StoryCard, storyFlowId: string) => {
      const key = storyReadKey(card);
      setData(previous => {
        if (!previous || previous.profile.storyReads?.includes(key)) return previous;
        return {
          ...previous,
          profile: {
            ...previous.profile,
            storyReads: [...(previous.profile.storyReads ?? []), key].slice(-1000),
          },
        };
      });
      try {
        await api('/api/mobile', {
          action: 'story-seen',
          flowId: storyFlowId,
          cardId: card.id,
          key,
        });
      } catch {
        /* A later refresh reconciles server history. */
      }
    },
    [setData],
  );
  async function cardChange(input: unknown) {
    const action = input as { action: string; enabled?: boolean };
    if (action.action === 'card-owned' && action.enabled === false)
      return new Promise<boolean>(resolve =>
        Alert.alert(
          'Remove this card?',
          'This removes its saved fee and manual usage records from your wallet.',
          [
            {
              text: 'Keep card',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => void change(input).then(resolve),
            },
          ],
        ),
      );
    return change(input);
  }
  async function logout() {
    try {
      await sessionLogout();
    } catch (e) {
      toast({
        message: e instanceof Error ? e.message : 'Could not log out. Try again.',
        kind: 'error',
      });
    }
  }
  function removeFlow(flow: HabitFlow) {
    if (busy) return;
    Alert.alert(
      'Remove from Home?',
      `${flow.title} will leave your Home. You can add it again from Flows.`,
      [
        { text: 'Keep flow', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            void change({ action: 'flow', id: flow.id, enabled: false }).then(ok => {
              if (ok) {
                setSelectedFlow(current => (current?.id === flow.id ? null : current));
                setFlowReturn(current => (current?.id === flow.id ? null : current));
              }
            }),
        },
      ],
    );
  }
  const {
    editor,
    setEditor,
    form,
    setForm,
    editingEventId,
    setEditingEventId,
    submit,
    startEventEditor,
    startEditor,
    editSubmission,
  } = useCreatorSubmit({
    data,
    change,
    closePick,
    selectedProduct,
    setSelectedEvent,
  });
  async function openEvent(event: CityEvent) {
    if (!canOpenRegistration(event) || !event.registrationUrl) return;
    if (await openLink(event.registrationUrl))
      void api('/api/mobile', { action: 'event-open', id: event.id }).catch(() => {});
  }
  function openStoryTarget(target: StoryTarget) {
    if (!data) return;
    const resolved = resolveStoryTarget(data, target);
    if (!resolved) {
      toast({
        message: 'This item is no longer available. Refresh Home for current suggestions.',
        kind: 'info',
      });
      return;
    }
    setSelectedStory(null);
    if (resolved.kind === 'flow') setSelectedFlow(resolved.value);
    else if (resolved.kind === 'pick') {
      setFlowReturn(null);
      setSelectedProduct(resolved.value);
    } else setSelectedEvent(resolved.value);
  }

  if (loading)
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loading}>
          <LogoLoader size={72} />
          <ActivityIndicator color={C.lime} />
        </View>
      </SafeAreaView>
    );
  if (!data) return <PhoneSignIn />;

  if (tab === 'Studio' && data.user.role !== 'creator')
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.copy}>This area is not available for your account.</Text>
      </SafeAreaView>
    );
  const ownedFlows = data.flows.filter(flow => data.profile.flowIds.includes(flow.id));
  const personalFlow = data.profile.personalFlows?.find(flow => flow.id === personalFlowId);
  const activeStepKeys = new Set(
    ownedFlows.flatMap(flow => flow.steps.map(step => `${today()}:${flow.id}:${step.id}`)),
  );
  const doneToday = data.profile.completed.filter(key => activeStepKeys.has(key)).length;
  // Home reserves the native tab bar safe area for the whole layout.
  const homeScreen = tab === 'Flows';
  const inlineDetailOpen =
    !editor &&
    !workoutBuilder &&
    Boolean(
      selectedFlow ||
      personalFlow ||
      communityFlowId ||
      selectedProduct ||
      selectedEvent ||
      selectedCard ||
      magnesiumGuide ||
      gymGuide,
    );
  return (
    <AddToFlowProvider>
    <SafeAreaView edges={homeScreen ? ['top', 'bottom'] : ['top']} style={s.safe}>
      <NeonBackdrop />
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={inlineDetailOpen}
        importantForAccessibility={inlineDetailOpen ? 'no-hide-descendants' : 'auto'}
      >
        <View style={s.topbar}>
          <View style={s.lockup}>
            <BrandMark size={34} />
          </View>
          {showCatalogueSearch && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search Qram"
            onPress={() => setSearchOpen(true)}
            style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            {Platform.OS === 'ios' ? (
              <SymbolView
                name="magnifyingglass"
                tintColor={C.lime}
                style={{ width: 24, height: 24 }}
              />
            ) : (
              <Text style={{ color: C.lime, fontSize: 26 }}>⌕</Text>
            )}
          </Pressable>
          )}
          <NotificationCentre
            key={data.user.id}
            onOpen={target => {
              if (target.kind === 'admin') {
                router.push('/management');
                return;
              }
              if (target.kind === 'community') {
                setCommunityFlowId(target.id);
                return;
              }
              if (target.kind === 'submission') {
                router.push(data.user.role === 'creator' ? '/(tabs)/studio' : '/management');
                return;
              }
              router.push(`/${target.kind}/${encodeURIComponent(target.id)}`);
            }}
          />
        </View>
        <RootList
          staticContent={tab === 'Discover'}
          inset={homeScreen ? 'never' : 'automatic'}
          contentContainerStyle={s.page}
          refreshing={busy}
          onRefresh={() => void refresh()}
          updatedAt={tab === 'Discover' ? null : updatedAt}
        >
          {error ? (
            <Banner
              kind="error"
              message={error}
              action={{ label: 'Retry', onPress: () => void refresh() }}
            />
          ) : null}
          {tab === 'Discover' && (
            <FlowCategories
              key={initialCategory ?? 'categories'}
              busy={busy}
              onRefresh={() => void refresh()}
              data={data}
              onSelect={setSelectedFlow}
              initialCategory={initialCategory}
            />
          )}
          {tab === 'Flows' && (
            <View style={{ gap: 16 }}>
              <SegmentedControl
                options={[
                  { id: 'for-you', label: 'For you' },
                  { id: 'following', label: 'Following' },
                  { id: 'yours', label: 'Yours' },
                ]}
                value={homeTab}
                onChange={value => setHomeTab(value as typeof homeTab)}
              />
              {homeTab === 'yours' ? (
                <HomeFeed
                  data={data}
                  busy={busy}
                  onRemove={removeFlow}
                  onExplore={() => router.push('/(tabs)/flows')}
                  onFlow={setSelectedFlow}
                  onStory={setSelectedStory}
                  onPersonalFlow={flow => setPersonalFlowId(flow.id)}
                />
              ) : (
                <CommunityFeed
                  key={homeTab}
                  tab={homeTab}
                  data={data}
                  onOpen={setCommunityFlowId}
                  onSaved={() => void refresh()}
                  onShowYours={() => setHomeTab('yours')}
                />
              )}
            </View>
          )}
          {tab === 'Picks' && (
            <PicksBrowser
              data={data}
              busy={busy}
              onCardChange={cardChange}
              onPick={setSelectedProduct}
              onCard={setSelectedCard}
              onFlow={setSelectedFlow}
              onLink={url => void openLink(url)}
              onGuide={guide =>
                guide === 'magnesium' ? setMagnesiumGuide(true) : setGymGuide(true)
              }
            />
          )}
          {tab === 'Events' && (
            <HyderabadEvents
              data={data}
              onSelect={setSelectedEvent}
              onHost={data.user.role === 'creator' ? () => startEventEditor() : undefined}
            />
          )}
          {tab === 'Studio' && data.user.role === 'creator' && (
            <CreatorStudio
              data={data}
              busy={busy}
              startEditor={startEditor}
              startEventEditor={() => startEventEditor()}
              setSelectedEvent={setSelectedEvent}
              onEdit={editSubmission}
              onWithdraw={id => change({ action: 'submission-withdraw', id })}
            />
          )}
          {tab === 'You' && (
            <YouProfile
              data={data}
              busy={busy}
              doneToday={doneToday}
              onEvent={setSelectedEvent}
              onPick={setSelectedProduct}
              onLogout={() => void logout()}
              onSaveName={name => change({ action: 'profile-name', name }, 'Name saved')}
              onRequestEmail={requestEmailCode}
              onVerifyEmail={(challengeId, code) =>
                change({ action: 'email-verify', challengeId, code }, 'Mail ID verified')
              }
            />
          )}
          {data.nextCursor && ['Picks', 'Events', 'Studio'].includes(tab) && (
            <Button
              title={busy ? 'Loading…' : 'Load more listings'}
              disabled={busy}
              secondary
              onPress={() => void loadMore()}
            />
          )}
        </RootList>
      </View>
      {searchOpen && (
        <Sheet title="Search" scrollable={false} fullScreen onClose={() => setSearchOpen(false)}>
          <PaneScope name="global-search">
            <SearchScreen
              data={data}
              onFlow={value => {
                setSearchOpen(false);
                setSelectedFlow(value);
              }}
              onPick={value => {
                setSearchOpen(false);
                setSelectedProduct(value);
              }}
              onEvent={value => {
                setSearchOpen(false);
                setSelectedEvent(value);
              }}
              onExercise={value => {
                setSearchOpen(false);
                setSearchExercise(value);
              }}
            />
          </PaneScope>
        </Sheet>
      )}
      {searchExercise && (
        <ExerciseSequence
          exercises={[searchExercise]}
          initialIndex={0}
          onClose={() => setSearchExercise(null)}
          onLink={url => void openLink(url)}
        />
      )}
      {selectedStory && (
        <StoryViewer
          key={selectedStory.id}
          group={selectedStory}
          groups={buildStoryGroups(data)}
          onSeen={seenStory}
          onOpen={openStoryTarget}
          onClose={() => setSelectedStory(null)}
        />
      )}
      {(selectedFlow ||
        selectedProduct ||
        selectedEvent ||
        editor ||
        workoutBuilder ||
        magnesiumGuide ||
        gymGuide ||
        selectedCard) && (
        <Sheet
          presentation={editor || workoutBuilder ? 'modal' : 'inline'}
          headerAction={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AddToFlowHeaderButton />
              {selectedFlow ? (
              <FlowHeartAction
                added={data.profile.flowIds.includes(selectedFlow.id)}
                busy={busy}
                onToggle={() =>
                  void change({
                    action: 'flow',
                    id: selectedFlow.id,
                    enabled: !data.profile.flowIds.includes(selectedFlow.id),
                  })
                }
              />
              ) : null}
            </View>
          }
          navigation={selectedFlow ? 'back' : 'close'}
          closeLabel={editor === 'event' ? 'Close' : 'Done'}
          fullScreen={Boolean(
            selectedFlow || selectedProduct || selectedCard || editor === 'event',
          )}
          scrollable={
            editor !== 'event' && !(!editor && (selectedFlow || selectedProduct || selectedCard))
          }
          contentKey={selectedCard?.id}
          title={
            selectedCard?.name ??
            (gymGuide
              ? 'Understand gym equipment'
              : magnesiumGuide
                ? 'Understand magnesium'
                : workoutBuilder
                  ? 'Build a workout flow'
                  : editor
                    ? editor === 'endorse'
                      ? 'Back your recommendation'
                      : editor === 'event'
                        ? editingEventId
                          ? 'Edit curated event'
                          : 'Create an event'
                        : 'Submit a useful product'
                    : (selectedStory?.title ??
                      selectedFlow?.title ??
                      selectedProduct?.title ??
                      (selectedEvent ? 'Event' : '')))
          }
          onClose={() => {
            setCardHistory([]);
            setSelectedCard(null);
            setGymGuide(false);
            setMagnesiumGuide(false);
            setWorkoutBuilder(false);
            setSelectedStory(null);
            setFlowReturn(null);
            setSelectedFlow(null);
            setSelectedProduct(null);
            setSelectedEvent(null);
            setEditor(null);
            setEditingEventId(null);
            if (initialTarget)
              router.replace(
                data.user.role === 'admin'
                  ? '/management'
                  : initialTarget.kind === 'flow'
                    ? '/(tabs)/flows'
                    : initialTarget.kind === 'pick'
                      ? '/(tabs)/picks'
                      : '/(tabs)/events',
              );
          }}
        >
          {(selectedProduct?.status === 'published' || selectedEvent?.status === 'published') && (
            <Button title="Share" secondary onPress={() => void shareSelected()} />
          )}
          {selectedProduct?.status === 'published' && (
            <ReportIssue
              key={`pick:${selectedProduct.id}`}
              kind="pick"
              itemId={selectedProduct.id}
            />
          )}
          {selectedEvent?.status === 'published' && (
            <ReportIssue key={`event:${selectedEvent.id}`} kind="event" itemId={selectedEvent.id} />
          )}
          {selectedCard && (
            <CreditCardDetails
              onBack={
                cardHistory.length
                  ? () => {
                      setSelectedCard(cardHistory[cardHistory.length - 1]);
                      setCardHistory(previous => previous.slice(0, -1));
                    }
                  : undefined
              }
              onOpen={card => {
                if (selectedCard) setCardHistory(previous => [...previous, selectedCard]);
                setSelectedCard(card);
              }}
              key={selectedCard.id}
              card={selectedCard}
              data={data}
              busy={busy}
              onChange={cardChange}
              onLink={url => void openLink(url)}
            />
          )}
          {gymGuide && (
            <GymSupportGuide
              data={data}
              busy={busy}
              onAvailable={(id, enabled) => void change({ action: 'equipment', id, enabled })}
              onPick={product => {
                setGymGuide(false);
                openFlowPick(product);
              }}
              onLink={url => void openLink(url)}
            />
          )}
          {magnesiumGuide &&
            (data.library ? (
              data.library.guides.find(guide => guide.id === 'magnesium') ? (
                <LearningContent
                  guide={data.library.guides.find(guide => guide.id === 'magnesium')!}
                  onLink={url => void openLink(url)}
                />
              ) : (
                <Badge>This learning guide is currently unavailable.</Badge>
              )
            ) : (
              <MagnesiumGuide onLink={url => void openLink(url)} />
            ))}
          {workoutBuilder && (
            <WorkoutBuilder
              library={data.exercises}
              busy={busy}
              onSubmit={async input => {
                const ok = await change(input);
                if (ok) setWorkoutBuilder(false);
                return ok;
              }}
            />
          )}
          {selectedFlow && (
            <FlowDetails
              flow={selectedFlow}
              data={data}
              busy={busy}
              onRemove={() => removeFlow(selectedFlow)}
              onAddCard={card =>
                setAddingCard({ sourceFlowId: selectedFlow.id, cardId: card.id, title: card.title })
              }
              onComplete={(id, enabled) =>
                void change({
                  action: 'complete',
                  id,
                  enabled,
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })
              }
              onHome={() => {
                setSelectedFlow(null);
                setFlowReturn(null);
                router.navigate('/(tabs)');
              }}
              onAvailable={(id, enabled) => void change({ action: 'equipment', id, enabled })}
              onToggle={() =>
                void change({
                  action: 'flow',
                  id: selectedFlow.id,
                  enabled: true,
                }).then(ok => {
                  if (ok) {
                    setSelectedFlow(null);
                    router.navigate('/(tabs)');
                  }
                })
              }
              onPick={openFlowPick}
              onEvent={event => {
                setFlowReturn(selectedFlow);
                setSelectedFlow(null);
                setSelectedEvent(event);
              }}
              onLink={url => void openLink(url)}
            />
          )}
          {selectedProduct && !editor && (
            <PickDetails
              key={selectedProduct.id}
              onAlternative={setSelectedProduct}
              product={selectedProduct}
              data={data}
              busy={busy}
              canReturn={Boolean(flowReturn)}
              onReturn={closePick}
              onLink={url => void openLink(url)}
              onVouch={() => startEditor('endorse')}
              onSave={() =>
                void change(
                  { action: 'save', id: selectedProduct.id },
                  data.profile.savedProductIds.includes(selectedProduct.id)
                    ? undefined
                    : 'Saved to Picks → Saved. You can also find it in your profile.',
                ).then(ok => {
                  if (ok) closePick();
                })
              }
            />
          )}
          {selectedEvent && flowReturn && (
            <Button
              title="← Back to your flow"
              secondary
              onPress={() => {
                setSelectedEvent(null);
                setSelectedFlow(flowReturn);
                setFlowReturn(null);
              }}
            />
          )}
          {selectedEvent?.registrationMode !== 'approval' && selectedEvent && (
            <AddToCalendar event={selectedEvent} />
          )}
          {selectedEvent &&
            (selectedEvent.registrationUrl || selectedEvent.registrationMode === 'approval' ? (
              <CuratedEventDetails
                event={selectedEvent}
                data={data}
                busy={busy}
                onSave={enabled =>
                  void change({
                    action: 'save-event',
                    id: selectedEvent.id,
                    enabled,
                  })
                }
                onRegister={() => void openEvent(selectedEvent)}
                onLink={url => void openLink(url)}
                onEdit={() => startEventEditor(selectedEvent)}
              />
            ) : (
              <>
                <Text style={s.copy}>Previously joined in-app event · {selectedEvent.title}</Text>
                {data.profile.eventIds.includes(selectedEvent.id) && (
                  <Button
                    title="Cancel previous RSVP"
                    disabled={busy}
                    onPress={() =>
                      void change({
                        action: 'rsvp',
                        id: selectedEvent.id,
                        enabled: false,
                      }).then(ok => {
                        if (ok) setSelectedEvent(null);
                      })
                    }
                  />
                )}
              </>
            ))}
          {editor && (
            <>
              {editor !== 'event' && (
                <Text style={s.copy}>
                  {editor === 'endorse'
                    ? 'Link a public reference and explain any sponsorship or affiliate relationship.'
                    : data.user.role === 'admin'
                      ? 'Your listing will publish immediately.'
                      : 'An admin reviews your submission before it appears.'}
                </Text>
              )}
              {editor === 'event' && (
                <EventLinkFields
                  busy={busy}
                  editing={Boolean(editingEventId)}
                  onSubmit={() => void submit()}
                  settings={data.library?.settings}
                  creator={data.user.role === 'creator'}
                  form={form}
                  onChange={(key, value) => setForm(previous => ({ ...previous, [key]: value }))}
                />
              )}
              {editor === 'product' && (
                <ProductFields
                  settings={data.library?.settings}
                  form={form}
                  onChange={changes => setForm(previous => ({ ...previous, ...changes }))}
                />
              )}
              {editor === 'endorse' &&
                [
                  ['sourceUrl', 'Source link'],
                  ['disclosure', 'Relationship / disclosure'],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={form[key] ?? ''}
                    onChange={value => setForm(previous => ({ ...previous, [key]: value }))}
                  />
                ))}
              {editor !== 'event' && (
                <Button
                  title={busy ? 'Saving…' : editor === 'endorse' ? 'Add source' : 'Submit'}
                  onPress={() => void submit()}
                  disabled={busy}
                />
              )}
            </>
          )}
        </Sheet>
      )}
      {personalFlow && (
        <Sheet
          title={personalFlow.name}
          presentation="inline"
          navigation="back"
          fullScreen
          scrollable={false}
          headerAction={<AddToFlowHeaderButton />}
          onClose={() => setPersonalFlowId(null)}
        >
          <PersonalFlowDetails
            flow={personalFlow}
            library={data.flows}
            busy={busy}
            onChange={change}
            onAddCard={setAddingCard}
            onLink={url => void openLink(url)}
            onBrowse={() => {
              setPersonalFlowId(null);
              router.push('/(tabs)/flows');
            }}
          />
        </Sheet>
      )}
      {communityFlowId && (
        <CommunityFlowSheet
          id={communityFlowId}
          data={data}
          copies={communityStatus.value?.copies ?? []}
          onClose={() => setCommunityFlowId(null)}
          onSaved={() => void refresh()}
          onAddCard={setAddingCard}
          onLink={url => void openLink(url)}
        />
      )}
      {addingCard && (
        <AddToFlowSheet
          key={`${addingCard.sourceFlowId}:${addingCard.cardId}`}
          card={addingCard}
          flows={data.profile.personalFlows ?? []}
          busy={busy}
          onChange={change}
          onClose={() => setAddingCard(null)}
        />
      )}
    </SafeAreaView>
    </AddToFlowProvider>
  );
}

function createStyles(C: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    },
    page: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80, gap: 16 },
    login: { padding: 24, paddingTop: 32 },
    mark: {
      width: 60,
      height: 60,
      backgroundColor: C.lime,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    markText: { fontSize: 32, color: C.onAccent, fontWeight: '700' },
    lockup: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    topbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderBottomWidth: 0.5,
      borderColor: C.line,
    },
    h2: {
      color: C.text,
      fontSize: 22,
      fontWeight: '600',
      lineHeight: 29,
      marginVertical: 4,
    },
    copy: { color: C.muted, fontSize: 17, lineHeight: 25, marginVertical: 4 },
    caption: { color: C.muted, fontSize: 13, lineHeight: 19 },
    muted: { color: C.muted },
    section: { color: C.text, fontSize: 20, fontWeight: '600', marginTop: 16 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    },
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 4,
    },
    error: {
      color: C.danger,
      lineHeight: 22,
      fontSize: 15,
      marginVertical: 12,
    },
    divider: { height: 0.5, backgroundColor: C.line, marginVertical: 24 },
    stat: {
      color: C.lime,
      fontSize: 34,
      fontWeight: '600',
      letterSpacing: -0.7,
    },
    price: { color: C.lime, fontWeight: '600', fontSize: 17 },
    link: { color: C.lime, fontSize: 16, fontWeight: '500' },
    heroGlyph: { fontSize: 44, color: C.lime },
    progress: {
      height: 6,
      borderRadius: 4,
      backgroundColor: C.line,
      overflow: 'hidden',
      marginVertical: 8,
    },
    progressFill: { height: 6, backgroundColor: C.lime, borderRadius: 4 },
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderTopWidth: 0.5,
      borderColor: C.line,
      paddingVertical: 16,
    },
    check: { color: C.muted, fontSize: 22, width: 30 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metric: {
      width: '47%',
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
    },
  });
}
