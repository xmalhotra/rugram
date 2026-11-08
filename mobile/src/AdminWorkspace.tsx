import { formatDate, formatEventTime } from '../../shared/format';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from './design/Text';
import { api } from './api';
import { Badge, Button, Card, Chip, Choice, Field, Heading, Sheet } from './design/components';
import { useTheme } from './design/theme';
import { reviewCodes } from '../../shared/moderation';
import { useToast } from './design/states';
import { eventInterests } from '../../shared/event-interests';
import { ContentFields, contentTemplate, fieldLabel } from './ContentFields';
import { defaultFlowCategoryGroups } from '../../shared/flow-categories';
import { EventRegistrationPanel } from './EventRegistrationPanel';
import { CreatorEventSettings } from './CreatorEventSettings';
import { ReportsWorklist } from './ReportsWorklist';
import { FlowRequestAdmin } from './FlowRequestAdmin';
import { TrainingAdmin } from './TrainingAdmin';
import {
  accountChangeNeedsReason,
  accountChangeSummary,
  reviewWaiting as waiting,
  contentKinds,
  type AccountAudit,
  type AccountSnapshot,
  type ContentKind,
  type ContentDocument,
  type ContentAudit,
  type ItemAnalytics,
} from '../../shared/admin-content';
import type { CityEvent } from '../../shared/mobile';
import type { MobilePayload } from '../../shared/mobile';
import type { DemoJourneyReport } from '../../src/lib/demo-journey';
type Person = {
  id: string;
  name: string;
  handle: string;
  role: 'member' | 'creator' | 'admin';
  bio: string | null;
  avatarUrl: string | null;
  instagramUrl: string | null;
  disabled: boolean;
};
export function AdminWorkspace({
  data,
  onChanged,
  onPolicy,
}: {
  data: MobilePayload;
  onChanged: () => Promise<void>;
  onPolicy: (handle: string, limit: number) => Promise<boolean>;
}) {
  const { colors: C } = useTheme();
  const toast = useToast();
  const [section, setSection] = useState('Content');
  const [kind, setKind] = useState<ContentKind>('flow');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ContentDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [queue, setQueue] = useState(false);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [people, setPeople] = useState<Person[]>([]);
  const [nextPeople, setNextPeople] = useState<number | null>(null);
  const [person, setPerson] = useState<Record<string, unknown> | null>(null);
  const [personBefore, setPersonBefore] = useState<AccountSnapshot | null>(null);
  const [personReason, setPersonReason] = useState('');
  const [personHistory, setPersonHistory] = useState<AccountAudit[]>([]);
  const [selected, setSelected] = useState<ContentDocument | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewCode, setReviewCode] = useState<(typeof reviewCodes)[number]>('sources');
  const [view, setView] = useState('Edit');
  const [simulation, setSimulation] = useState<DemoJourneyReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');
  const [activity, setActivity] = useState('All activities');
  const [stats, setStats] = useState<ItemAnalytics | null>(null);
  const [history, setHistory] = useState<ContentAudit[]>([]);
  const copy = { color: C.muted, fontSize: 16, lineHeight: 24 } as const;
  const title = { color: C.text, fontSize: 21, fontWeight: '600' } as const;
  async function load(offset = 0) {
    if (!['Content', 'People', 'Events'].includes(section)) return;
    setBusy(true);
    setError('');
    try {
      if (section === 'People') {
        const result = await api<{ people: Person[]; nextOffset: number | null }>(
          `/api/mobile/admin?view=people&search=${encodeURIComponent(search)}&offset=${offset}`,
        );
        setPeople(previous => (offset ? [...previous, ...result.people] : result.people));
        setNextPeople(result.nextOffset);
      } else {
        const result = await api<{
          items: ContentDocument[];
          total: number;
          pendingTotal: number;
          nextOffset: number | null;
        }>(
          `/api/mobile/admin?kind=${section === 'Events' ? 'event' : kind}&search=${encodeURIComponent(search)}&offset=${offset}${queue && section === 'Content' ? '&queue=pending' : ''}`,
        );
        setItems(previous => (offset ? [...previous, ...result.items] : result.items));
        setTotal(result.total);
        setPendingTotal(result.pendingTotal);
        setNext(result.nextOffset);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load admin workspace.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [section, kind, queue]); // Search is applied explicitly, not on every keystroke.
  async function details() {
    if (!selected) return;
    setBusy(true);
    try {
      if (view === 'Analytics') {
        const activityId =
          activity === 'All activities'
            ? ''
            : ((draft.steps as { id: string; title: string }[] | undefined)?.find(
                step => step.title === activity,
              )?.id ?? '');
        setStats(
          await api<ItemAnalytics>(
            `/api/mobile/admin?view=analytics&kind=${selected.kind}&id=${encodeURIComponent(selected.id)}&days=${days}&activityId=${encodeURIComponent(activityId)}`,
          ),
        );
      } else if (view === 'History')
        setHistory(
          (
            await api<{ history: ContentAudit[] }>(
              `/api/mobile/admin?view=history&kind=${selected.kind}&id=${encodeURIComponent(selected.id)}`,
            )
          ).history,
        );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load item details.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (view === 'Analytics' || view === 'History') void details();
  }, [selected?.id, view, days, activity]);
  function open(item: ContentDocument) {
    setReviewNote('');
    setReviewCode('sources');
    setSelected(item);
    setDraft({
      ...(['product', 'event', 'settings'].includes(item.kind) ? contentTemplate(item.kind) : {}),
      ...item.data,
      id: item.id,
    });
    setDirty(false);
    setView('Edit');
    setStats(null);
    setHistory([]);
    setActivity('All activities');
    setError('');
  }
  function close() {
    if (dirty)
      Alert.alert('Discard unsaved changes?', 'Save a draft to keep your work.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setSelected(null);
            setPerson(null);
            setDirty(false);
          },
        },
      ]);
    else {
      setSelected(null);
      setPerson(null);
    }
  }
  async function save(action: 'draft' | 'publish' | 'archive', auditId?: string) {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ version: number }>('/api/mobile/admin', {
        action: auditId ? 'restore' : action,
        kind: selected.kind,
        id: selected.id,
        version: selected.version,
        ...(action === 'archive' ? { reviewNote, reviewCode } : {}),
        ...(auditId ? { auditId } : { data: draft }),
      });
      setSelected(previous =>
        previous
          ? {
              ...previous,
              version: result.version,
              hasDraft: action === 'draft',
              status:
                action === 'archive'
                  ? 'archived'
                  : action === 'publish'
                    ? 'published'
                    : previous.status,
            }
          : null,
      );
      setDirty(false);
      await load();
      await onChanged();
      if (auditId) {
        setSelected(null);
        toast({
          message: 'Revision restored to draft. Open the item to review and publish it.',
          kind: 'success',
        });
      } else
        toast({
          message:
            action === 'draft'
              ? 'Draft saved. Users still see the published version.'
              : action === 'publish'
                ? 'Published. Changes are available after refresh.'
                : 'Archived. Recorded history is retained.',
          kind: 'success',
        });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  function snapshot(value: Record<string, unknown>): AccountSnapshot {
    return {
      name: String(value.name ?? ''),
      handle: String(value.handle ?? ''),
      role: value.role as AccountSnapshot['role'],
      disabled: Boolean(value.disabled),
    };
  }
  async function openPerson(user: Person) {
    setPerson({
      ...user,
      bio: user.bio ?? '',
      instagramUrl: user.instagramUrl ?? '',
      avatarUrl: user.avatarUrl ?? '',
    });
    setPersonBefore(snapshot(user));
    setPersonReason('');
    setPersonHistory([]);
    setDirty(false);
    setError('');
    try {
      setPersonHistory(
        (
          await api<{ history: AccountAudit[] }>(
            `/api/mobile/admin?view=person-history&id=${encodeURIComponent(user.id)}`,
          )
        ).history,
      );
    } catch {
      // History is advisory; the edit form stays usable.
    }
  }
  const personNeedsReason = Boolean(
    person && personBefore && accountChangeNeedsReason(personBefore, snapshot(person)),
  );
  async function submitPerson() {
    if (!person) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ sessionsRevoked: number }>('/api/mobile/admin', {
        action: 'person',
        ...person,
        ...(personReason.trim() ? { reason: personReason.trim() } : {}),
      });
      setDirty(false);
      setPerson(null);
      toast({
        message: result.sessionsRevoked
          ? `Saved. ${result.sessionsRevoked} active session${result.sessionsRevoked === 1 ? '' : 's'} signed out.`
          : 'Saved. The change is recorded in this person’s history.',
        kind: 'success',
      });
      await load();
      await onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update account.');
    } finally {
      setBusy(false);
    }
  }
  function savePerson() {
    if (!person || !personBefore) return;
    if (!personNeedsReason) return void submitPerson();
    if (personReason.trim().length < 3) {
      setError('Add a reason of at least 3 characters for role or suspension changes.');
      return;
    }
    const after = snapshot(person);
    const changes = [
      personBefore.role !== after.role ? `role ${personBefore.role} → ${after.role}` : '',
      personBefore.disabled !== after.disabled ? (after.disabled ? 'suspend' : 'unsuspend') : '',
    ].filter(Boolean);
    Alert.alert(
      `Confirm: ${changes.join(' and ')}?`,
      `${
        personBefore.role !== after.role || after.disabled
          ? `@${after.handle} will be signed out on every device${after.disabled ? ' and cannot sign in until unsuspended' : ''}.`
          : `@${after.handle} can sign in again.`
      } Reason: ${personReason.trim()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: () => void submitPerson() },
      ],
    );
  }
  function confirmRestore(item: ContentAudit) {
    Alert.alert(
      `Restore revision ${item.version}?`,
      dirty
        ? 'This replaces your unsaved edits and the current draft. Published content is unchanged until you publish.'
        : 'This replaces the current draft. Published content is unchanged until you publish.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => void save('draft', item.id) },
      ],
    );
  }
  async function runSimulation() {
    setBusy(true);
    setError('');
    try {
      setSimulation(await api<DemoJourneyReport>('/api/mobile/simulation', {}));
      await onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not run the scenario.');
    } finally {
      setBusy(false);
    }
  }
  function create() {
    const value = contentTemplate(kind);
    if (kind === 'event') {
      value.organizers = [{ name: data.user.name }];
    }
    if (kind === 'event' && data.library) {
      value.city = data.library.settings.eventCities[0];
      value.country = data.library.settings.eventCountry;
      value.topic = data.library.settings.eventTopics[0];
    }
    open({
      kind,
      id: String(value.id),
      title: 'New item',
      version: 0,
      status: 'draft',
      hasDraft: false,
      data: value,
      publishedData: null,
      updatedAt: null,
    });
    setDirty(true);
  }
  function createHostedEvent() {
    const value = contentTemplate('event');
    value.organizers = [{ name: data.user.name }];
    value.city = data.library?.settings.eventCities[0] ?? 'Hyderabad';
    value.country = data.library?.settings.eventCountry ?? 'IN';
    value.topic = data.library?.settings.eventTopics[0] ?? 'Tech';
    open({
      kind: 'event',
      id: String(value.id),
      title: 'New hosted event',
      version: 0,
      status: 'draft',
      hasDraft: false,
      data: value,
      publishedData: null,
      updatedAt: null,
    });
    setDirty(true);
  }
  const optional: Record<string, unknown> =
    selected?.kind === 'flow'
      ? {
          level: 'Starter',
          pathId: '',
          rhythm: '',
          milestone: '',
          review: '',
          guidance: '',
          sources: [],
          guideId: '',
          storyCards: [],
          relatedFlowIds: [],
          recipe: {
            preference: 'plant',
            ingredients: [''],
            method: [''],
            note: '',
          },
          workout: {
            benefits: [''],
            blocks: [
              {
                exerciseId: '',
                sets: 2,
                restSeconds: 60,
                perSide: false,
                mode: 'reps',
                reps: 6,
              },
            ],
            progression: '',
            safety: '',
          },
          eventContext: { topic: 'Tech', country: 'IN' },
        }
      : selected?.kind === 'product'
        ? {
            comparisonGroup: '',
            imageUrl: '',
            specifications: [],
            recommendations: [],
            assessment: {
              bestFor: '',
              notFor: '',
              whyChosen: '',
              tradeoffs: [''],
              criteria: [''],
              sourceUrls: [''],
              checkedAt: new Date().toISOString(),
            },
          }
        : selected?.kind === 'exercise'
          ? { recommendations: [] }
          : selected?.kind === 'guide'
            ? { creatorReferences: [], references: [] }
            : selected?.kind === 'event'
              ? { endsAt: new Date().toISOString() }
              : selected?.kind === 'settings'
                ? {
                    eventInterests,
                    flowCategoryGroups: defaultFlowCategoryGroups,
                  }
                : selected?.kind === 'card'
                  ? {
                      curation: {
                        badge: 'Go-to',
                        summary: '',
                        placements: [{ topic: '', rank: 1, reason: '' }],
                      },
                      reviewNote: '',
                      comparison: { bestFor: '', watchOut: '' },
                    }
                  : {};
  return (
    <View style={{ gap: 16 }}>
      <Heading
        eyebrow="ADMIN WORKSPACE"
        title="Manage the app."
        copy="Edit content, review submissions, manage people and inspect real recorded activity—without editing code."
      />
      {data.demoMode && (
        <Badge>
          Local demo: content changes live in this server process and reset on restart. Database
          mode persists drafts, published content and audit history.
        </Badge>
      )}
      <Choice
        label="Workspace"
        value={section}
        options={[
          'Content',
          'Events',
          'Trust',
          'People',
          'Permissions',
          'Flow requests',
          'Training',
          'Overview',
          ...(data.demoMode ? ['Simulation'] : []),
        ]}
        onChange={setSection}
      />
      {section === 'Simulation' && (
        <>
          <Card>
            <Text style={title}>Try the complete journey</Text>
            <Text style={copy}>
              Creates clearly labelled fictional Picks, a focus/flow, 12 free events inside the next
              year and four mock-phone accounts. It tests creator approval, guest privacy,
              cancellation, stories and comparisons. It does not book Luma tickets, create real
              events or claim celebrity endorsements.
            </Text>
            <Button
              title={busy ? 'Running checks…' : 'Create & test the demo journey'}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  'Add simulation examples?',
                  'This adds clearly labelled DEMO records and test accounts to this local demo. Existing real catalog entries and your own routine are not changed.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Create demo',
                      onPress: () => void runSimulation(),
                    },
                  ],
                )
              }
            />
          </Card>
          {simulation && (
            <>
              <Badge>
                {simulation.events} simulated events · through{' '}
                {formatDate(new Date(simulation.through))}
              </Badge>
              {simulation.checks.map(check => (
                <Card key={check}>
                  <Text style={copy}>Passed · {check}</Text>
                </Card>
              ))}
              <Text style={title}>Test with these mock OTP accounts</Text>
              {simulation.accounts.map(account => (
                <Card key={account.phone}>
                  <Text style={title}>{account.name}</Text>
                  <Badge>
                    {account.role} · {account.phone}
                  </Badge>
                </Card>
              ))}
              <Text style={copy}>
                Log out, enter a test phone, and use the code in the Mock SMS card. Your normal
                admin account can review everything in Content → Events → Guests.
              </Text>
            </>
          )}
        </>
      )}
      {section === 'Flow requests' ? (
        <FlowRequestAdmin />
      ) : section === 'Training' ? (
        <TrainingAdmin />
      ) : section === 'Overview' ? (
        <>
          <Text style={title}>Last 30 days</Text>
          {[
            ['Active users', data.analytics?.activeUsers],
            ['Recorded actions', data.analytics?.actions],
            ['Habit completions', data.analytics?.completions],
            ['Product saves', data.analytics?.saves],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <Text style={title}>{value ?? 0}</Text>
              <Text style={copy}>{label}</Text>
            </Card>
          ))}
          <Text style={copy}>
            Open an item in Content → Analytics for its own actions and daily breakdown. No inferred
            purchases, attendance or outcomes.
          </Text>
          {Object.entries(data.analytics?.byAction ?? {}).map(([action, count]) => (
            <Badge key={action}>
              {action.replaceAll('_', ' ')} · {count}
            </Badge>
          ))}
        </>
      ) : section === 'Simulation' ? null : section === 'Trust' ? (
        <ReportsWorklist />
      ) : section === 'Permissions' ? (
        <CreatorEventSettings busy={busy} onSave={onPolicy} />
      ) : (
        <>
          {section === 'Content' && (
            <>
              <Chip
                title={`Review queue · ${pendingTotal} pending`}
                active={queue}
                onPress={() => setQueue(previous => !previous)}
              />
              {!queue && (
                <Choice
                  label="Content type"
                  value={fieldLabel(kind)}
                  options={contentKinds.map(fieldLabel)}
                  onChange={label =>
                    setKind(contentKinds.find(value => fieldLabel(value) === label)!)
                  }
                />
              )}
            </>
          )}
          <Field
            label={
              section === 'People' ? 'Find a person by name or username' : 'Find content by title'
            }
            value={search}
            onChange={setSearch}
          />
          <Button
            title={busy ? 'Loading…' : 'Search / refresh'}
            secondary
            disabled={busy}
            onPress={() => void load()}
          />
          {(section === 'Content' || section === 'Events') && (
            <>
              <Badge>
                {queue
                  ? `${total} creator submissions awaiting review · oldest first`
                  : `${total} items · pending first, then published, drafts and archived`}
              </Badge>
              {section === 'Events' ? (
                <Button title="Host an event" disabled={busy} onPress={createHostedEvent} />
              ) : (
                kind !== 'settings' && (
                  <Button
                    title={`Add ${fieldLabel(kind).toLowerCase()}`}
                    disabled={busy}
                    onPress={create}
                  />
                )
              )}
              {items.map(item => (
                <Card key={`${item.kind}:${item.id}`}>
                  <Badge>
                    {item.pending ? 'pending review' : item.status}
                    {item.hasDraft ? ' · unpublished changes' : ''} · revision {item.version}
                  </Badge>
                  <Text style={title}>{item.title}</Text>
                  {item.pending && (
                    <Text style={copy}>
                      {fieldLabel(item.kind)} from {item.submittedByName ?? 'an unknown creator'}
                      {item.submittedAt ? ` · ${waiting(item.submittedAt)}` : ''}
                    </Text>
                  )}
                  <Button
                    title={
                      item.kind === 'event'
                        ? 'Review / edit event'
                        : 'Edit · preview · analytics · history'
                    }
                    secondary
                    onPress={() => open(item)}
                  />
                  {item.kind === 'event' &&
                    (item.publishedData ?? item.data).registrationMode === 'approval' && (
                      <Button
                        title="Manage registrations"
                        secondary
                        onPress={() => {
                          open(item);
                          setView('Guests');
                        }}
                      />
                    )}
                </Card>
              ))}
              {next !== null && (
                <Button
                  title="Load more content"
                  disabled={busy}
                  secondary
                  onPress={() => void load(next)}
                />
              )}
            </>
          )}
          {section === 'People' && (
            <>
              <Text style={copy}>
                Sorted by username, 50 at a time. Suspension blocks sign-in; it does not delete a
                person’s history. Role and suspension changes need a reason and are recorded. Your
                own admin access is protected.
              </Text>
              {people.map(user => (
                <Card key={user.id}>
                  <Badge>
                    {user.role === 'member' ? 'user' : user.role} ·{' '}
                    {user.disabled ? 'suspended' : 'active'}
                  </Badge>
                  <Text style={title}>{user.name}</Text>
                  <Text style={copy}>@{user.handle}</Text>
                  <Button
                    title="Edit profile & permissions"
                    secondary
                    onPress={() => void openPerson(user)}
                  />
                </Card>
              ))}
              {nextPeople !== null && (
                <Button
                  title="Load more people"
                  disabled={busy}
                  secondary
                  onPress={() => void load(nextPeople)}
                />
              )}
            </>
          )}
        </>
      )}
      {error && !selected && !person && (
        <Card>
          <Text accessibilityRole="alert" style={{ ...copy, color: C.danger }}>
            {error}
          </Text>
        </Card>
      )}
      {selected && (
        <Sheet title={`${fieldLabel(selected.kind)} · ${selected.title}`} onClose={close}>
          <Choice
            label="Item workspace"
            value={view}
            options={[
              'Edit',
              'Preview',
              'Analytics',
              'History',
              ...(selected.kind === 'event' ? ['Guests'] : []),
            ]}
            onChange={setView}
          />
          <Badge>
            {selected.status} · revision {selected.version}
            {dirty ? ' · unsaved changes' : ''}
          </Badge>
          {view === 'Edit' && (
            <>
              <Text style={copy}>
                Save drafts privately. Publish only after checking claims and source links. Stable
                references preserve existing links and history.
              </Text>
              <ContentFields
                kind={selected.kind}
                value={draft}
                library={data.library}
                catalogue={data}
                onChange={value => {
                  setDraft(value);
                  setDirty(true);
                }}
              />
              {Object.entries(optional)
                .filter(([field]) => !(field in draft))
                .map(([field, value]) => (
                  <Button
                    key={field}
                    title={`Add ${fieldLabel(field).toLowerCase()}`}
                    secondary
                    onPress={() => {
                      setDraft(previous => ({ ...previous, [field]: value }));
                      setDirty(true);
                    }}
                  />
                ))}
              <Button
                title="Save draft"
                disabled={busy}
                secondary
                onPress={() => void save('draft')}
              />
              <Button
                title="Publish reviewed content"
                disabled={busy}
                onPress={() =>
                  Alert.alert(
                    'Publish these changes?',
                    'These details become visible to users. Verify factual claims, sources, prices and dates.',
                    [
                      { text: 'Keep editing', style: 'cancel' },
                      { text: 'Publish', onPress: () => void save('publish') },
                    ],
                  )
                }
              />
              {selected.kind !== 'settings' && (
                <>
                  <Choice
                    label="Reason for hiding or rejecting"
                    value={reviewCode}
                    options={reviewCodes}
                    onChange={setReviewCode}
                  />
                  <Field
                    label="Feedback for the creator"
                    value={reviewNote}
                    onChange={setReviewNote}
                    multiline
                    maxLength={500}
                  />
                  <Button
                    title="Archive / hide from discovery"
                    secondary
                    destructive
                    disabled={busy || reviewNote.trim().length < 5}
                    onPress={() =>
                      Alert.alert(
                        'Archive this item?',
                        'Hide it from discovery without deleting recorded history.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Archive',
                            style: 'destructive',
                            onPress: () => void save('archive'),
                          },
                        ],
                      )
                    }
                  />
                </>
              )}
            </>
          )}
          {view === 'Preview' && (
            <>
              <Text style={copy}>
                Field preview of your current draft—not a live user screen. Nothing changes publicly
                until published.
              </Text>
              <ContentFields
                kind={selected.kind}
                value={draft}
                library={data.library}
                catalogue={data}
                onChange={() => {}}
                readOnly
              />
            </>
          )}
          {view === 'Analytics' && (
            <>
              <Choice
                label="Time window"
                value={days}
                options={['7', '30', '90']}
                onChange={setDays}
              />
              {selected.kind === 'flow' && (
                <Choice
                  label="Activity"
                  value={activity}
                  options={[
                    'All activities',
                    ...((draft.steps as { title: string }[] | undefined) ?? []).map(
                      step => step.title,
                    ),
                  ]}
                  onChange={setActivity}
                />
              )}
              <Button
                title="Refresh analytics"
                secondary
                disabled={busy}
                onPress={() => void details()}
              />
              {stats && (
                <>
                  <Text style={title}>
                    {stats.actions} actions · {stats.uniqueUsers} distinct accounts
                  </Text>
                  {Object.entries(stats.byAction).map(([action, count]) => (
                    <Badge key={action}>
                      {action.replaceAll('_', ' ')} · {count}
                    </Badge>
                  ))}
                  <Text style={title}>Daily activity · India time</Text>
                  {stats.daily.map(day => (
                    <Text key={day.date} style={copy}>
                      {day.date} · {day.count} actions
                    </Text>
                  ))}
                  <Text style={copy}>{stats.note}</Text>
                </>
              )}
              {!stats && !busy && <Text style={copy}>No item analytics loaded yet.</Text>}
            </>
          )}
          {view === 'Guests' && (
            <EventRegistrationPanel
              event={
                (selected.publishedData as unknown as CityEvent) ?? (draft as unknown as CityEvent)
              }
            />
          )}
          {view === 'History' && (
            <>
              <Button
                title="Refresh history"
                secondary
                disabled={busy}
                onPress={() => void details()}
              />
              {history.length === 0 && (
                <Text style={copy}>No administrative revisions recorded yet.</Text>
              )}
              {history.map(item => (
                <Card key={item.id}>
                  <Badge>
                    {item.action} · revision {item.version}
                  </Badge>
                  <Text style={copy}>
                    {formatEventTime(new Date(item.at))} · {item.actorName ?? `admin ${item.actor}`}
                  </Text>
                  {typeof item.data?.reviewNote === 'string' && item.action === 'archive' && (
                    <Text style={copy}>Reason: {item.data.reviewNote}</Text>
                  )}
                  <Button
                    title="Restore this revision as a draft"
                    secondary
                    disabled={busy || !item.data}
                    onPress={() => confirmRestore(item)}
                  />
                </Card>
              ))}
            </>
          )}
          {error && (
            <Text accessibilityRole="alert" style={{ ...copy, color: C.danger }}>
              {error}
            </Text>
          )}
        </Sheet>
      )}
      {person && (
        <Sheet title="Manage person" onClose={close}>
          <ContentFields
            kind="person"
            value={person}
            onChange={value => {
              setPerson(value);
              setDirty(true);
            }}
          />
          <Text style={copy}>
            Member means the ordinary user role. Creator can submit for review. Admin can manage the
            app. Never grant admin access without verifying the person.
          </Text>
          {personNeedsReason && (
            <Field
              label="Reason for role or suspension change (required, recorded)"
              value={personReason}
              onChange={setPersonReason}
              multiline
              maxLength={500}
            />
          )}
          <Button
            title={personNeedsReason ? 'Review & confirm change' : 'Save person & permissions'}
            disabled={busy}
            onPress={savePerson}
          />
          {error && (
            <Text accessibilityRole="alert" style={{ ...copy, color: C.danger }}>
              {error}
            </Text>
          )}
          <Text style={title}>Account history</Text>
          {personHistory.length === 0 && (
            <Text style={copy}>No recorded account changes yet.</Text>
          )}
          {personHistory.map(entry => (
            <Card key={entry.id}>
              <Badge>{accountChangeSummary(entry)}</Badge>
              <Text style={copy}>
                {formatEventTime(new Date(entry.at))} · {entry.actorName ?? 'a removed admin'}
                {entry.sessionsRevoked
                  ? ` · ${entry.sessionsRevoked} session${entry.sessionsRevoked === 1 ? '' : 's'} signed out`
                  : ''}
              </Text>
              {entry.reason && <Text style={copy}>Reason: {entry.reason}</Text>}
            </Card>
          ))}
        </Sheet>
      )}
    </View>
  );
}
