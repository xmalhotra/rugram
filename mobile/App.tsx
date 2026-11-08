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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HomeHeader, TabSlide, homeTabs, type BarTab, type HomeTab } from './src/HomeHeader';
import { EventPage } from './src/EventPage';
import { EventComposer } from './src/EventComposer';
import { eventInterests } from '../shared/event-interests';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { PicksBrowser } from './src/PicksBrowser';
import { NotificationCentre, ScreenOverlay } from './src/NotificationCentre';
import { currentActiveRun } from './src/active-run';
import { RunPip } from './src/RunPip';
import { YouProfile } from './src/YouProfile';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from './src/api';
import { avatarUri } from './src/avatar';
import { type CityEvent, type HabitFlow, type MobilePayload, type Product } from '../shared/mobile';
import { pickTopicForFlow } from '../shared/flow-picks';
import { browseProducts } from '../shared/pick-catalog';
import { defaultSupplementDiscovery, topicProducts } from '../shared/supplement-discovery';
import { supplementPickCategories } from '../shared/supplement-picks';

const showCatalogueSearch = false;
export type Tab = 'Flows' | 'Discover' | 'Picks' | 'Events' | 'Studio' | 'You';
const today = () => habitDay(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
import { Button, Field, Badge, Sheet } from './src/design/components';
import { useTheme, type Colors } from './src/design/theme';
import { useSession } from './src/session';
import { CatalogFlowPage, CommunityComingSoon, FlowCatalogHome } from './src/FlowCatalogHome';
import { catalogFlows } from '../shared/flow-catalog';
import { gymFlowById } from '../shared/gym-flows';
import { ScreenBackground } from './src/design/ScreenBackground';
import { PhoneSignIn } from './src/PhoneSignIn';
import {
  HyderabadEvents,
  CuratedEventDetails,
  EventCategoryOverlay,
  type EventsSection,
} from './src/HyderabadEvents';
import { useFlowHabits } from './src/flow-habits';
import { EventLinkFields } from './src/EventLinkFields';
import { FlowDetails } from './src/FlowDetails';
import { HomeFeed, YoursSwitch, useYoursMode } from './src/HomeFeed';
import { CommunityFeed, CommunityFlowSheet, CommunityMemberSheet } from './src/CommunityFeed';
import { FlowRun } from './src/FlowRun';
import { TrainingSessionHost } from './src/TrainingSession';
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

/** Covers the tab with a quick fade, so a page's first layout isn't seen as a jump. */
function FadeIn({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 30, opacity }]}>{children}</Animated.View>;
}

export function QramScreen({
  tab = 'Flows',
  initialTarget,
  memberLink,
  pushed = false,
}: {
  tab?: Tab;
  initialTarget?: { kind: SharedKind; id: string };
  /** A shared profile link: opens this member's profile over Home. */
  memberLink?: string;
  /** Opened over the tabs (the profile from Home's avatar), so it needs a way back. */
  pushed?: boolean;
}) {
  const detailParams = useLocalSearchParams<{ detailKind?: string; detailId?: string }>();
  const linkedTarget =
    initialTarget ??
    (['flow', 'pick', 'event'].includes(detailParams.detailKind ?? '') &&
    typeof detailParams.detailId === 'string'
      ? { kind: detailParams.detailKind as SharedKind, id: detailParams.detailId }
      : undefined);
  // Profile and updates open inside the tab, so the bottom menu stays in reach.
  const [profileOpen, setProfileOpen] = useState(false);
  const [openRunRequest, setOpenRunRequest] = useState(0);
  const [overlay, setOverlay] = useState<React.ReactNode>(null);
  // Moving to another tab closes them. Opening a member or event keeps them, so back returns here.
  const pathname = usePathname();
  useEffect(() => {
    const tabRoots = ['/', '/flows', '/picks', '/events', '/studio', '/you', '/admin'];
    const own = { Flows: '/', Discover: '/flows', Picks: '/picks', Events: '/events', Studio: '/studio', You: '/you' }[tab];
    if (tabRoots.includes(pathname) && pathname !== own) {
      setProfileOpen(false);
      setOverlay(null);
    }
  }, [pathname, tab]);
  return (
    <ScreenOverlay.Provider value={setOverlay}>
      <View style={{ flex: 1 }}>
        <PaneScope
          name={
            memberLink
              ? `member:${memberLink}`
              : linkedTarget
                ? `${linkedTarget.kind}:${linkedTarget.id}`
                : tab
          }
        >
          <QramPane
            tab={tab}
            initialTarget={linkedTarget}
            memberLink={memberLink}
            pushed={pushed}
            onProfile={() => setProfileOpen(true)}
            openRunRequest={openRunRequest}
          />
        </PaneScope>
        {profileOpen ? (
          <FadeIn>
            <PaneScope name={`${tab}:profile`}>
              <QramPane tab="You" pushed onBack={() => setProfileOpen(false)} />
            </PaneScope>
          </FadeIn>
        ) : null}
        {overlay ? <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>{overlay}</View> : null}
        <RunPip onPress={() => setOpenRunRequest(value => value + 1)} />
      </View>
    </ScreenOverlay.Provider>
  );
}
function QramPane({
  tab,
  initialTarget,
  memberLink,
  pushed,
  onProfile,
  onBack,
  openRunRequest = 0,
}: {
  tab: Tab;
  initialTarget?: { kind: SharedKind; id: string };
  memberLink?: string;
  pushed: boolean;
  onProfile?: () => void;
  onBack?: () => void;
  /** Goes up by one each time the floating square for a workout in progress is tapped. */
  openRunRequest?: number;
}) {
  const toast = useToast();
  const openLink = useOutbound();
  const [searchOpen, setSearchOpen] = usePaneState('searchOpen', false);
  const [searchExercise, setSearchExercise] = usePaneState<Exercise | null>('searchExercise', null);
  const router = useRouter();
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
  const [gymFlowId, setGymFlowId] = usePaneState<string | null>('gymFlow', null);
  const [personalFlowId, setPersonalFlowId] = usePaneState<string | null>('personalFlow', null);
  const [homeTab, setHomeTab] = usePaneState<HomeTab>('homeTab', 'for-you', 'account');
  const [, setYoursMode] = useYoursMode();
  const [flowsTab, setFlowsTab] = usePaneState<'qram' | 'community'>('flowsTab', 'qram', 'account');
  // Which way the feed slides in: from the right when moving to a tab further right.
  const homeTabOrder: HomeTab[] = ['for-you', 'following', 'yours'];
  const previousHomeTab = useRef(homeTab);
  const homeTabDirection =
    homeTabOrder.indexOf(homeTab) - homeTabOrder.indexOf(previousHomeTab.current);
  useEffect(() => {
    previousHomeTab.current = homeTab;
  }, [homeTab]);
  // Home's header hides while scrolling down and returns on any scroll up.
  const [headerHeight, setHeaderHeight] = useState(0);
  const statusBar = useSafeAreaInsets().top;
  const [curateOpen, setCurateOpen] = useState(false);
  const [curatePrompt, setCuratePrompt] = usePaneState('curatePrompt', '');
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerShift = useMemo(() => {
    // Slides the glass fully off screen, status bar part included.
    const height = Math.max(1, headerHeight + statusBar);
    // Pull-to-refresh overscroll is negative; ignore it so the header does not jump.
    const offset = scrollY.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolateLeft: 'clamp',
    });
    return Animated.diffClamp(offset, 0, height).interpolate({
      inputRange: [0, height],
      outputRange: [0, -height],
    });
  }, [scrollY, headerHeight, statusBar]);
  const [communityFlowId, setCommunityFlowId] = usePaneState<string | null>('communityFlow', null);
  const [memberId, setMemberId] = usePaneState<string | null>('communityMember', memberLink ?? null);
  // The floating square for a workout in progress asks this tab to reopen it.
  useEffect(() => {
    if (!openRunRequest) return;
    const run = currentActiveRun();
    if (run) setRunQueue([{ kind: run.kind, id: run.id, title: run.title, resume: true }]);
  }, [openRunRequest]);
  const [runQueue, setRunQueue] = useState<{ kind: 'flow' | 'personal'; id: string; title: string; resume?: boolean }[] | null>(
    null,
  );
  // Set by the Events category rail; its page covers the tab like other details.
  const [eventInterestId] = usePaneState<string | null>('eventInterest', null);
  // Account scope so a supplement flow on any tab can open this section.
  const [picksTab, setPicksTab] = usePaneState<'yours' | 'products' | 'supplements'>(
    'picksTab',
    'yours',
    'account',
  );
  const [, setSupplementTopic] = usePaneState<string | null>('supplementTopic', null, 'account');
  const [eventsTab, setEventsTab] = usePaneState<EventsSection>('eventsTab', 'upcoming');
  const { opened } = useFlowHabits(data?.user.id);
  const openFlow = useCallback(
    (flow: HabitFlow) => {
      opened(flow.id);
      if (gymFlowById(flow.id)) {
        setSelectedFlow(null);
        setGymFlowId(flow.id);
        return;
      }
      setGymFlowId(null);
      setSelectedFlow(flow);
    },
    [opened, setGymFlowId, setSelectedFlow],
  );
  const [composingEvent, setComposingEvent] = usePaneState('composingEvent', false);
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
    if (initialTarget.kind === 'flow') openFlow(item as HabitFlow);
    else if (initialTarget.kind === 'pick') setSelectedProduct(item as Product);
    else setSelectedEvent(item as CityEvent);
  }, [
    initialTarget?.kind,
    initialTarget?.id,
    data,
    openFlow,
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
      openFlow(flowReturn);
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
  function addFlow(flow: HabitFlow) {
    return change({ action: 'flow', id: flow.id, enabled: true });
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
                setGymFlowId(current => (current === flow.id ? null : current));
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
    if (resolved.kind === 'flow') openFlow(resolved.value);
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
  const flowPickTopic = selectedFlow
    ? pickTopicForFlow(
        selectedFlow.id,
        supplementPickCategories(
          data.library?.settings.supplementDiscovery ?? defaultSupplementDiscovery,
        ),
      )
    : null;
  const showFlowPicks = Boolean(
    flowPickTopic && topicProducts(flowPickTopic, browseProducts(data), 1).length,
  );
  const personalFlow = data.profile.personalFlows?.find(flow => flow.id === personalFlowId);
  // Home reserves the native tab bar safe area for the whole layout.
  const homeScreen = tab === 'Flows';
  // Every main tab shares Home's glass bar; the profile opened over the tabs keeps a back bar.
  const glassBar = !pushed;
  const inlineDetailOpen =
    !editor &&
    !workoutBuilder &&
    Boolean(
      selectedFlow ||
      personalFlow ||
      communityFlowId ||
      memberId ||
      runQueue ||
      gymFlowId ||
      composingEvent ||
      (tab === 'Events' && eventInterestId) ||
      selectedProduct ||
      selectedEvent ||
      selectedCard ||
      magnesiumGuide ||
      gymGuide,
    );
  const bar: { tabs: BarTab[]; tab: string; onTab: (id: string) => void } | undefined =
    tab === 'Flows'
      ? { tabs: homeTabs, tab: homeTab, onTab: id => setHomeTab(id as HomeTab) }
      : tab === 'Discover'
        ? {
            tabs: [
              { id: 'qram', label: 'Qram' },
              { id: 'community', label: 'Community' },
            ],
            tab: flowsTab,
            onTab: id => setFlowsTab(id as 'qram' | 'community'),
          }
      : tab === 'Picks'
          ? {
              tabs: [
                { id: 'yours', label: 'Yours' },
                { id: 'products', label: 'Products' },
                { id: 'supplements', label: 'Supplements' },
              ],
              tab: picksTab,
              onTab: id => setPicksTab(id as 'yours' | 'products' | 'supplements'),
            }
          : tab === 'Events'
            ? {
                tabs: [
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'yours', label: 'Yours' },
                  { id: 'hosting', label: 'Hosting' },
                ],
                tab: eventsTab,
                onTab: id => setEventsTab(id as EventsSection),
              }
            : undefined;
  const selectTab = (next: string) => {
    bar?.onTab(next);
    setCurateOpen(false);
    scrollY.setValue(0);
  };
  const notificationCentre = (
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
          // Hosts follow their submissions from Events → Hosting; admins review in Management.
          router.push(data.user.role === 'admin' ? '/management' : '/(tabs)/events');
          return;
        }
        router.push(`/${target.kind}/${encodeURIComponent(target.id)}`);
      }}
    />
  );
  return (
    <AddToFlowProvider>
      {/* Inside a tab the insets are known up front; measuring them natively made the page jump as it opened. */}
      <SafeAreaView
        edges={onBack ? [] : glassBar ? ['bottom'] : ['top']}
        style={[s.safe, onBack ? { paddingTop: statusBar } : null]}
      >
      <ScreenBackground />
      <View
          style={{ flex: 1, overflow: 'hidden' }}
        accessibilityElementsHidden={inlineDetailOpen}
        importantForAccessibility={inlineDetailOpen ? 'no-hide-descendants' : 'auto'}
      >
          {glassBar ? (
            <HomeHeader
              tabs={bar?.tabs}
              name={data.user.name}
              avatarUrl={avatarUri(data.user.avatarUrl)}
              tab={bar?.tab ?? ''}
              onTab={selectTab}
              menuOpen={curateOpen}
              onMenu={setCurateOpen}
              prompt={curatePrompt}
              onAsk={next => {
                setCuratePrompt(next);
                setCurateOpen(false);
              }}
              onProfile={() => (onProfile ? onProfile() : router.push('/profile'))}
              right={notificationCentre}
              translateY={headerShift}
              statusBar={statusBar}
              baseHeight={headerHeight}
              onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}
            />
          ) : (
        <View style={s.topbar}>
          {/* Equal side slots keep the mark centred, like the main tabs' bar. */}
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
                {pushed && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    onPress={() => (onBack ? onBack() : router.back())}
                    hitSlop={8}
                    style={{ minWidth: 40, minHeight: 48, justifyContent: 'center' }}
                  >
                    <Text style={{ color: C.lime, fontSize: 28 }}>←</Text>
                  </Pressable>
                )}
          </View>
          <BrandMark size={30} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          {showCatalogueSearch && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search Qram"
            onPress={() => setSearchOpen(true)}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
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
              {notificationCentre}
          </View>
        </View>
          )}
        {/* Tabs change only on a tap: no swipe paging between tab screens. */}
        <RootList
          scrollKey={bar?.tab}
          staticContent={tab === 'Discover' || (tab === 'Picks' && picksTab === 'products')}
          inset={glassBar || onBack ? 'never' : 'automatic'}
            topInset={glassBar ? statusBar + headerHeight + 12 : 0}
            scrollY={glassBar ? scrollY : undefined}
          contentContainerStyle={onBack ? [s.page, { paddingBottom: 128 }] : s.page}
          refreshing={busy}
          onRefresh={() => void refresh()}
          updatedAt={tab === 'Discover' || (tab === 'Picks' && picksTab === 'products') ? null : updatedAt}
        >
          {error ? (
            <Banner
              kind="error"
              message={error}
              action={{ label: 'Retry', onPress: () => void refresh() }}
            />
          ) : null}
          {tab === 'Discover' && flowsTab === 'community' && <CommunityComingSoon />}
          {tab === 'Discover' && flowsTab === 'qram' && (
            <FlowCatalogHome
              ownedIds={data.profile.flowIds}
              library={data.flows}
              onStart={flow => setRunQueue([{ kind: 'flow', id: flow.id, title: flow.title }])}
              onView={openFlow}
              onAdd={flowId => {
                const flow = data.flows.find(item => item.id === flowId);
                return flow ? addFlow(flow) : Promise.resolve(false);
              }}
            />
          )}
          {tab === 'Flows' && (
            <View style={{ gap: 16 }}>
              <TabSlide key={homeTab} direction={homeTabDirection}>
              {homeTab === 'yours' ? (
                <HomeFeed
                  data={data}
                  onExplore={() => router.push('/(tabs)/flows')}
                  onFlow={openFlow}
                  onPersonalFlow={flow => setPersonalFlowId(flow.id)}
                  onStart={target => setRunQueue([target])}
                />
              ) : (
                <CommunityFeed
                  key={homeTab}
                  tab={homeTab}
                  data={data}
                  onOpen={setCommunityFlowId}
                  onSaved={() => void refresh()}
                  onShowYours={() => setHomeTab('yours')}
                  onMember={setMemberId}
                />
              )}
              </TabSlide>
            </View>
          )}
          {tab === 'Picks' && (
            <PicksBrowser
              data={data}
              busy={busy}
              onCardChange={cardChange}
              onPick={setSelectedProduct}
              onCard={setSelectedCard}
              onFlow={openFlow}
              onLink={url => void openLink(url)}
              onGuide={guide =>
                guide === 'magnesium' ? setMagnesiumGuide(true) : setGymGuide(true)
              }
              section={picksTab}
              onBrowse={() => setPicksTab('supplements')}
              onAddCard={() => setPicksTab('products')}
            />
          )}
          {tab === 'Events' && (
            <HyderabadEvents
              data={data}
              onSelect={setSelectedEvent}
              onHost={() => setComposingEvent(true)}
              section={eventsTab}
              onDiscover={() => setEventsTab('upcoming')}
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
              onEvent={setSelectedEvent}
              onPick={setSelectedProduct}
              onFlowMap={() => {
                // The profile covers the tab it was opened from, so close it to show the map.
                onBack?.();
                setHomeTab('yours');
                setYoursMode('map');
                router.navigate('/(tabs)');
              }}
              onResumeRun={run => setRunQueue([{ kind: run.kind, id: run.flowId, title: run.title, resume: true }])}
              onExplore={() => {
                onBack?.();
                setFlowsTab('qram');
                router.navigate('/(tabs)/flows');
              }}
              onLogout={() => void logout()}
              onSaveName={name => change({ action: 'profile-name', name }, 'Name saved')}
              onSaveUsername={username =>
                change({ action: 'profile-username', username }, 'Username saved')
              }
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
        {homeScreen && homeTab === 'yours' && !inlineDetailOpen && <YoursSwitch />}
          {homeScreen && curateOpen && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close curation menu"
              onPress={() => setCurateOpen(false)}
              style={[StyleSheet.absoluteFill, { zIndex: 9, backgroundColor: 'rgba(0,0,0,0.45)' }]}
            />
          )}
      </View>
      {searchOpen && (
        <Sheet title="Search" scrollable={false} fullScreen onClose={() => setSearchOpen(false)}>
          <PaneScope name="global-search">
            <SearchScreen
              data={data}
              onFlow={value => {
                setSearchOpen(false);
                openFlow(value);
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
      {tab === 'Events' && <EventCategoryOverlay data={data} onSelect={setSelectedEvent} />}
      {selectedEvent && !editor && (
        <EventPage
          key={selectedEvent.id}
          event={selectedEvent}
          isHost={data.user.role === 'admin' || selectedEvent.createdBy === data.user.id}
          onClose={() => setSelectedEvent(null)}
          onShare={() => void shareSelected()}
          onLink={url => void openLink(url)}
        />
      )}
      {composingEvent && (
        <EventComposer
          hostName={data.user.name}
          city={data.profile.city || 'Hyderabad'}
          cities={data.library?.settings.eventCities ?? ['Hyderabad']}
          categories={(data.library?.settings.eventInterests ?? eventInterests).map(item => ({
            id: item.id,
            title: item.title,
            topic: item.topics[0],
          }))}
          isAdmin={data.user.role === 'admin'}
          busy={busy}
          onClose={() => setComposingEvent(false)}
          onSubmit={event =>
            void change(
              {
                action: 'event-link',
                requestId: `compose-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                event,
              },
              'Event submitted for review',
            ).then(done => done && setComposingEvent(false))
          }
        />
      )}
      {(selectedFlow ||
        selectedProduct ||
        // Events open in EventPage; the sheet only hosts the event editors.
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
            selectedCard
              ? ''
              : gymGuide
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
                      (selectedEvent ? 'Event' : ''))
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
          {selectedEvent?.status === 'published' && (
            <Button title="Share" secondary onPress={() => void shareSelected()} />
          )}
          {selectedEvent?.status === 'published' && (
              <ReportIssue
                key={`event:${selectedEvent.id}`}
                kind="event"
                itemId={selectedEvent.id}
              />
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
            <View style={{ flex: 1, minHeight: 0 }}>
            {data.profile.flowIds.includes(selectedFlow.id) && (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 }}
              >
                <Text style={{ flex: 1, color: C.muted, fontSize: 12 }}>On your flow map</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start this flow"
                  onPress={() =>
                    setRunQueue([{ kind: 'flow', id: selectedFlow.id, title: selectedFlow.title }])
                  }
                  style={({ pressed }) => ({
                    minHeight: 36,
                    paddingHorizontal: 14,
                    borderRadius: 18,
                    justifyContent: 'center',
                    backgroundColor: C.lime,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: C.onAccent, fontWeight: '700', fontSize: 14 }}>Start</Text>
                </Pressable>
              </View>
            )}
            <FlowDetails
              flow={selectedFlow}
              data={data}
              busy={busy}
              onRemove={() => removeFlow(selectedFlow)}
              onAddCard={card =>
                  setAddingCard({
                    sourceFlowId: selectedFlow.id,
                    cardId: card.id,
                    title: card.title,
                  })
              }
              onIndexChange={index => opened(selectedFlow.id, index)}
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
                void addFlow(selectedFlow).then(ok => {
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
            {showFlowPicks && flowPickTopic ? (
              <Button
                title={`See ${flowPickTopic.title.toLowerCase()} picks →`}
                secondary
                onPress={() => {
                  const topicId = flowPickTopic.id;
                  setSelectedFlow(null);
                  setFlowReturn(null);
                  setPicksTab('supplements');
                  setSupplementTopic(topicId);
                  router.navigate('/(tabs)/picks');
                }}
              />
            ) : null}
            </View>
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
              onShare={() => void shareSelected()}
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
                openFlow(flowReturn);
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
              onStart={() =>
                setRunQueue([{ kind: 'personal', id: personalFlow.id, title: personalFlow.name }])
              }
          />
        </Sheet>
      )}
        {gymFlowId && data.flows.some(flow => flow.id === gymFlowId) && (
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 30, backgroundColor: C.bg }}>
            <CatalogFlowPage
              title={catalogFlows.find(item => item.flowId === gymFlowId)?.title ?? data.flows.find(flow => flow.id === gymFlowId)?.title ?? 'Flow'}
              level={catalogFlows.find(item => item.flowId === gymFlowId)?.level ?? data.flows.find(flow => flow.id === gymFlowId)?.level ?? 'Beginner'}
              tileId={catalogFlows.find(item => item.flowId === gymFlowId)?.tileId ?? 'cal-upper'}
              source={data.flows.find(flow => flow.id === gymFlowId)}
              library={data.flows}
              owned={data.profile.flowIds.includes(gymFlowId)}
              requested={false}
              ready
              topInset={statusBar}
              onBack={() => setGymFlowId(null)}
              onRequest={() => undefined}
              onAdd={flowId => {
                const flow = data.flows.find(item => item.id === flowId);
                return flow ? addFlow(flow) : Promise.resolve(false);
              }}
              onStart={flow => setRunQueue([{ kind: 'flow', id: flow.id, title: flow.title }])}
              onView={openFlow}
            />
          </View>
        )}
        {runQueue?.[0] && (
          <FlowRun
            key={`${runQueue[0].kind}:${runQueue[0].id}`}
            kind={runQueue[0].kind}
            id={runQueue[0].id}
            title={runQueue[0].title}
            resumeOnOpen={runQueue[0].resume === true}
            data={data}
            nextTitle={runQueue[1]?.title}
            onNext={() => setRunQueue(queue => (queue && queue.length > 1 ? queue.slice(1) : null))}
            onTry={(flowId, flowTitle) => setRunQueue([{ kind: 'flow', id: flowId, title: flowTitle }])}
            onPosted={() => void refresh()}
            onClose={() => setRunQueue(null)}
          />
        )}
        {memberId && (
          <CommunityMemberSheet
            key={memberId}
            id={memberId}
            data={data}
            onClose={() => setMemberId(null)}
            onOpen={setCommunityFlowId}
            onSaved={() => void refresh()}
            onMember={setMemberId}
          />
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
          onMember={next => {
            // The profile sheet sits under this one, so close the post first.
            setCommunityFlowId(null);
            setMemberId(next);
          }}
        />
      )}
      <TrainingSessionHost />
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
    topbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 16,
      // Same height and logo size as the main header, so nothing shifts between them.
      minHeight: 52,
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
