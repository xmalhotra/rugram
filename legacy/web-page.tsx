"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RoutineScene } from "@/components/RoutineScene";
import type { BootstrapPayload, CreatorPublication, PublicUser, RugramRecommendationResult, RoutineComponent, TimelineEntry } from "@/lib/types";

type Screen = "today" | "influence" | "library" | "profile" | "create";
type ScheduleDraft = { entry: TimelineEntry; component: RoutineComponent };

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Daily", "Training day", "Match day"];

function isoToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Something went wrong. Please try again.");
  return body as T;
}

function Avatar({ creator, size = "medium" }: { creator: PublicUser; size?: "small" | "medium" | "large" }) {
  return <span className={`avatar avatar-${size}`} style={{ backgroundImage: creator.avatarUrl ? `url(${creator.avatarUrl})` : undefined }} role="img" aria-label={creator.name}>{!creator.avatarUrl && creator.name.slice(0, 1)}</span>;
}

function ComponentCard({ component, actionLabel, onAction, source, disabled }: { component: RoutineComponent; actionLabel: string; onAction: () => void; source?: string; disabled?: boolean }) {
  return <article className="component-card"><RoutineScene variant="routine" className="card-scene" /><div className="component-top"><span>{component.profileGroup ?? component.category}</span><span className={`badge ${component.evidenceLevel}`}>{component.evidenceLevel === "reported" ? "Reported" : "Reviewed"}</span></div><h3>{component.title}</h3><p>{component.description}</p>{component.safetyNote && <p className="safety-note">{component.safetyNote}</p>}<footer><div><small>{component.suggestedTime} · {component.durationLabel}{source ? ` · ${source}` : ""}</small><a href={component.sourceUrl} target="_blank" rel="noreferrer">{component.sourceLabel} ↗</a></div><button onClick={onAction} disabled={disabled}>{actionLabel}</button></footer></article>;
}

export default function Home() {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("today");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null);
  const [publishDraft, setPublishDraft] = useState<RoutineComponent | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { setData(await api<BootstrapPayload>("/api/bootstrap")); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(null), 4500); return () => window.clearTimeout(timer); }, [notice]);

  const componentById = useMemo(() => new Map(data?.components.map((component) => [component.id, component]) ?? []), [data]);
  const selectedCreator = data?.creators.find((creator) => creator.id === selectedCreatorId) ?? null;
  const isCreator = data?.user.role === "creator";

  async function mutate(run: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try { await run(); await refresh(); if (success) setNotice(success); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="loading-page"><span className="loading-mark">B</span><p>Loading BetterHabits</p></main>;
  if (!data) return <Login onSuccess={async () => { await refresh(); setScreen("today"); setSelectedCreatorId(null); setNotice(null); }} />;

  const navItems: { id: Screen; label: string; icon: string }[] = isCreator
    ? [{ id: "today", label: "My week", icon: "◷" }, { id: "library", label: "Library", icon: "▦" }, { id: "profile", label: "Profile", icon: "◌" }]
    : [{ id: "today", label: "Today", icon: "◷" }, { id: "influence", label: "Influence", icon: "◎" }, { id: "library", label: "Library", icon: "▦" }, { id: "profile", label: "Profile", icon: "◌" }];

  function addToProfile(component: RoutineComponent, sourceCreatorId: string | null = null) {
    void mutate(async () => {
      await api("/api/timeline", { method: "POST", body: JSON.stringify({ componentId: component.id, scheduledFor: null, startTime: null, sourceCreatorId, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) });
      setScreen("profile");
      setSelectedCreatorId(null);
    }, `${component.title} added to your profile.`);
  }
  function addFromBetterHabits(component: RoutineComponent) {
    setAskOpen(false);
    void mutate(async () => {
      await api("/api/timeline", { method: "POST", body: JSON.stringify({ componentId: component.id, scheduledFor: null, startTime: null, sourceCreatorId: null, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) });
    }, `${component.title} added to your profile.`);
  }
  const beginSchedule = (entry: TimelineEntry, component: RoutineComponent) => setScheduleDraft({ entry, component });
  const creatorPublications = selectedCreator ? data.publications[selectedCreator.id] ?? [] : [];
  const ownPublications = data.publications[data.user.id] ?? [];

  return <main className="app">
    <RoutineScene variant="ambient" className="ambient-scene" />
    <header className="topbar"><button className="brand" onClick={() => { setScreen("today"); setSelectedCreatorId(null); }}><span className="brand-mark"><RoutineScene variant="mark" /></span>BetterHabits</button><button className="account-button" onClick={() => { setScreen("profile"); setSelectedCreatorId(null); }}>{data.user.name}</button></header>
    <section className="page">
      {selectedCreator ? <CreatorProfile creator={selectedCreator} publications={creatorPublications} components={componentById} followed={data.followingCreatorIds.includes(selectedCreator.id)} liked={data.likedPublicationKeys} onBack={() => setSelectedCreatorId(null)} onFollow={() => void mutate(() => api("/api/follows", { method: "PUT", body: JSON.stringify({ creatorId: selectedCreator.id, follows: !data.followingCreatorIds.includes(selectedCreator.id) }) }), data.followingCreatorIds.includes(selectedCreator.id) ? "Unfollowed." : `Following ${selectedCreator.name}.`)} onLike={(componentId, liked) => void mutate(() => api("/api/likes", { method: "PUT", body: JSON.stringify({ creatorId: selectedCreator.id, componentId, liked }) }))} onAdd={addToProfile} /> : <>
        {screen === "today" && (isCreator ? <CreatorWeek creator={data.user} publications={ownPublications} components={componentById} onOpenLibrary={() => setScreen("library")} onRemove={(publication) => void mutate(() => api("/api/publications", { method: "PUT", body: JSON.stringify({ componentId: publication.componentId, weekday: publication.weekday, startTime: publication.startTime, published: false }) }), "Removed from your public week.")} /> : <MemberToday timeline={data.timeline} components={componentById} creators={data.creators} onRemove={(entryId) => void mutate(() => api(`/api/timeline?id=${encodeURIComponent(entryId)}`, { method: "DELETE" }), "Removed from your profile.")} onSchedule={beginSchedule} onCreate={() => { setSelectedCategory(null); setScreen("create"); }} onExplore={() => setScreen("influence")} onAsk={() => setAskOpen(true)} />)}
        {screen === "influence" && <Discover creators={data.creators} following={data.followingCreatorIds} onOpen={setSelectedCreatorId} onFollow={(creatorId, follows) => void mutate(() => api("/api/follows", { method: "PUT", body: JSON.stringify({ creatorId, follows }) }), follows ? "Following creator." : "Unfollowed creator.")} />}
        {screen === "library" && <Library components={data.components} isCreator={isCreator} publications={ownPublications} onAdd={addToProfile} onPublish={setPublishDraft} />}
        {screen === "create" && <CreateRoutine category={selectedCategory} components={data.components} onSelectCategory={setSelectedCategory} onBack={() => setScreen("today")} onAdd={addToProfile} />}
        {screen === "profile" && <Profile user={data.user} following={data.followingCreatorIds} creators={data.creators} timeline={data.timeline} components={componentById} onSchedule={beginSchedule} onRemove={(entryId) => void mutate(() => api(`/api/timeline?id=${encodeURIComponent(entryId)}`, { method: "DELETE" }), "Removed from your profile.")} onOpenCreator={setSelectedCreatorId} onLogout={() => void mutate(async () => { await api("/api/auth/logout", { method: "POST" }); setData(null); }, "Logged out.")} />}
      </>}
    </section>
    <nav className="nav" aria-label="Primary navigation">{navItems.map((item) => <button className={screen === item.id && !selectedCreator ? "active" : ""} key={item.id} onClick={() => { setScreen(item.id); setSelectedCreatorId(null); }}><span>{item.icon}</span>{item.label}</button>)}</nav>
    {scheduleDraft && <ScheduleSheet component={scheduleDraft.component} onClose={() => setScheduleDraft(null)} busy={busy} onSave={(scheduledFor, startTime) => void mutate(async () => { await api("/api/timeline", { method: "PATCH", body: JSON.stringify({ id: scheduleDraft.entry.id, scheduledFor, startTime }) }); setScheduleDraft(null); setScreen("today"); }, "Added to your timeline.")} />}
    {publishDraft && <PublishSheet component={publishDraft} onClose={() => setPublishDraft(null)} busy={busy} onSave={(weekday, startTime) => void mutate(async () => { await api("/api/publications", { method: "PUT", body: JSON.stringify({ componentId: publishDraft.id, weekday, startTime, published: true }) }); setPublishDraft(null); setScreen("today"); }, "Published to your week.")} />}
    {askOpen && <AskBetterHabitsSheet components={componentById} onClose={() => setAskOpen(false)} onAdd={addFromBetterHabits} />}
    {notice && <div className="toast" role="status">{notice}</div>}
  </main>;
}

function Login({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError("");
    try { await api("/api/auth/login", { method: "POST", body: JSON.stringify({ handle, password }) }); await onSuccess(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not log in."); }
    finally { setSubmitting(false); }
  }
  return <main className="login-page"><section className="login-card"><div className="login-mark">B</div><p className="eyebrow">ROUTINES, IN CONTEXT</p><h1>Make a week you can keep.</h1><p className="intro">Follow people for inspiration. Build your day from components that fit your life.</p><form onSubmit={submit}><label>Account<input value={handle} onChange={(event) => setHandle(event.target.value)} autoComplete="username" placeholder="john" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="form-error">{error}</p>}<button className="primary" type="submit" disabled={submitting}>{submitting ? "Logging in…" : "Log in"}</button></form><div className="demo-accounts"><p>Local demo accounts</p><div><button type="button" onClick={() => setHandle("john")}>John</button><button type="button" onClick={() => setHandle("cristiano")}>Cristiano</button><button type="button" onClick={() => setHandle("messi")}>Messi</button><button type="button" onClick={() => setHandle("bolt")}>Usain</button></div></div><p className="demo-note">Demo mode uses seeded accounts. Production uses database-backed sessions and must not enable demo mode.</p></section></main>;
}

function MemberToday({ timeline, components, creators, onRemove, onSchedule, onCreate, onExplore, onAsk }: { timeline: TimelineEntry[]; components: Map<string, RoutineComponent>; creators: PublicUser[]; onRemove: (id: string) => void; onSchedule: (entry: TimelineEntry, component: RoutineComponent) => void; onCreate: () => void; onExplore: () => void; onAsk: () => void }) {
  const today = isoToday();
  const scheduled = timeline.filter((item) => item.scheduledFor === today && item.startTime).sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const preferences = timeline.filter((item) => components.get(item.componentId)?.placement === "preference");
  const readyToPlan = timeline.filter((item) => !item.scheduledFor && components.get(item.componentId)?.placement === "timeline");
  const grouped = preferences.reduce<Record<string, TimelineEntry[]>>((groups, entry) => { const group = components.get(entry.componentId)?.profileGroup ?? "Your choices"; (groups[group] ??= []).push(entry); return groups; }, {});
  return <><div className="page-title"><div><p className="eyebrow">TODAY · {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date()).toUpperCase()}</p><h1>Your day, in rhythm.</h1><p>Add routines to your profile first. Only give a routine a time when it genuinely needs one.</p></div><div className="today-actions"><button className="ask-rugram" onClick={onAsk}>✦ Ask BetterHabits</button><button className="round-add" onClick={onCreate} aria-label="Choose a routine category">+</button></div></div><section className="timeline"><div className="timeline-head"><h2>Today’s timeline</h2><button onClick={onCreate}>Add routine</button></div>{scheduled.length === 0 ? <div className="timeline-empty"><span>06:00</span><i /><span>12:00</span><i /><span>18:00</span><i /></div> : scheduled.map((item) => { const component = components.get(item.componentId); const creator = creators.find((person) => person.id === item.sourceCreatorId); if (!component) return null; return <div className="timeline-row" key={item.id}><time>{item.startTime}</time><i /><div><strong>{component.title}</strong><small>{component.durationLabel}{creator ? ` · inspired by ${creator.name}` : ""}</small></div><button onClick={() => onRemove(item.id)} aria-label={`Remove ${component.title}`}>×</button></div>; })}</section>{readyToPlan.length > 0 && <section className="profile-routines"><div className="section-heading"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Routines to place</h2></div></div>{readyToPlan.map((entry) => { const component = components.get(entry.componentId); return component ? <div className="routine-row" key={entry.id}><RoutineScene variant="routine" className="routine-scene" /><div><strong>{component.title}</strong><small>{component.durationLabel}</small></div><button onClick={() => onSchedule(entry, component)}>Add time</button></div> : null; })}</section>}{Object.entries(grouped).map(([group, entries]) => <section className="preference-group" key={group}><div className="section-heading"><div><p className="eyebrow">YOUR PREFERENCES</p><h2>{group}</h2></div></div>{entries.map((entry) => { const component = components.get(entry.componentId); return component ? <div className="routine-row" key={entry.id}><RoutineScene variant="routine" className="routine-scene" /><div><strong>{component.title}</strong><small>{component.durationLabel}</small></div><button onClick={() => onRemove(entry.id)} aria-label={`Remove ${component.title}`}>×</button></div> : null; })}</section>)}<section className="hint-card"><p className="eyebrow">INFLUENCE, NOT INSTRUCTION</p><h2>Start with a person or a component.</h2><p>Creator routines are context. Your profile keeps the useful pieces without forcing every choice onto a clock.</p><button onClick={onExplore}>Explore influences →</button></section></>;
}

function Discover({ creators, following, onOpen, onFollow }: { creators: PublicUser[]; following: string[]; onOpen: (id: string) => void; onFollow: (id: string, follows: boolean) => void }) {
  return <><div className="page-title"><div><p className="eyebrow">PUBLIC ROUTINE REFERENCES</p><h1>People, not prescriptions.</h1><p>Follow a creator for context. Their components stay clearly sourced and distinct from your own routine.</p></div></div><div className="creator-grid">{creators.map((creator) => <article className="creator-card" key={creator.id}><Avatar creator={creator} /><div><p className="handle">@{creator.handle}</p><h2>{creator.name}</h2><p>{creator.bio}</p></div><footer><button className={following.includes(creator.id) ? "follow following" : "follow"} onClick={() => onFollow(creator.id, !following.includes(creator.id))}>{following.includes(creator.id) ? "Following" : "Follow"}</button><button className="plain-link" onClick={() => onOpen(creator.id)}>View profile →</button></footer></article>)}</div></>;
}

function CreatorProfile({ creator, publications, components, followed, liked, onBack, onFollow, onLike, onAdd }: { creator: PublicUser; publications: CreatorPublication[]; components: Map<string, RoutineComponent>; followed: boolean; liked: string[]; onBack: () => void; onFollow: () => void; onLike: (componentId: string, liked: boolean) => void; onAdd: (component: RoutineComponent, sourceCreatorId: string) => void }) {
  return <><button className="back" onClick={onBack}>← Back</button><section className="creator-hero"><Avatar creator={creator} size="large" /><div><p className="handle">@{creator.handle}</p><h1>{creator.name}</h1><p>{creator.bio}</p><div className="creator-actions"><button className={followed ? "follow following" : "follow"} onClick={onFollow}>{followed ? "Following" : "Follow"}</button>{creator.instagramUrl && <a href={creator.instagramUrl} target="_blank" rel="noreferrer">Instagram ↗</a>}<a href={`/creators/${creator.handle}`}>Share profile ↗</a></div></div></section><div className="section-heading"><div><p className="eyebrow">PUBLISHED REFERENCES</p><h2>Use only what fits your life.</h2></div><span>Source-labelled context</span></div><div className="component-grid">{publications.map((publication) => { const component = components.get(publication.componentId); if (!component) return null; return <ComponentCard key={publication.componentId} component={{ ...component, suggestedTime: publication.startTime }} source={publication.weekday} actionLabel="Add to profile" onAction={() => onAdd(component, creator.id)} />; })}</div><div className="like-row">{publications.map((publication) => { const component = components.get(publication.componentId); if (!component) return null; const key = `${creator.id}:${publication.componentId}`; const isLiked = liked.includes(key); return <button key={key} className={isLiked ? "liked" : ""} onClick={() => onLike(publication.componentId, !isLiked)}>{isLiked ? "♥" : "♡"} {component.title}</button>; })}</div></>;
}

function Library({ components, isCreator, publications, onAdd, onPublish }: { components: RoutineComponent[]; isCreator: boolean; publications: CreatorPublication[]; onAdd: (component: RoutineComponent) => void; onPublish: (component: RoutineComponent) => void }) {
  return <><div className="page-title"><div><p className="eyebrow">CENTRAL ROUTINE DATABASE</p><h1>Small parts, with provenance.</h1><p>Add what helps to your profile. Scheduling is optional and only belongs to routines that need a time.</p></div></div><div className="component-grid">{components.map((component) => { const publication = publications.find((item) => item.componentId === component.id); return <ComponentCard key={component.id} component={component} actionLabel={isCreator ? (publication ? "Update week" : "Publish") : "Add"} onAction={() => isCreator ? onPublish(component) : onAdd(component)} />; })}</div></>;
}

function CreateRoutine({ category, components, onSelectCategory, onBack, onAdd }: { category: string | null; components: RoutineComponent[]; onSelectCategory: (category: string | null) => void; onBack: () => void; onAdd: (component: RoutineComponent) => void }) {
  const categories = [...new Set(components.map((component) => component.category))];
  const matching = category ? components.filter((component) => component.category === category) : [];
  return <>{category && <button className="back" onClick={() => onSelectCategory(null)}>← Categories</button>}<div className="page-title"><div><p className="eyebrow">CREATE YOUR ROUTINE</p><h1>{category ? `${category}, in context.` : "What fits your day?"}</h1><p>{category ? "Add a useful routine now. You can place time-based routines on your week later." : "Choose a category first. You do not need to follow anyone to begin."}</p></div></div>{!category ? <div className="category-grid">{categories.map((item) => <button key={item} onClick={() => onSelectCategory(item)}><span>{item === "Movement" ? "↗" : item === "Drink" ? "◌" : item === "Food" ? "◒" : item === "Recovery" ? "✦" : item === "Mindset" ? "◐" : "□"}</span><strong>{item}</strong><small>{components.filter((component) => component.category === item).length} sourced components</small><b>→</b></button>)}</div> : <div className="component-grid">{matching.map((component) => <ComponentCard key={component.id} component={component} actionLabel="Add to profile" onAction={() => onAdd(component)} />)}</div>}<button className="back create-cancel" onClick={onBack}>Cancel</button></>;
}

function CreatorWeek({ creator, publications, components, onOpenLibrary, onRemove }: { creator: PublicUser; publications: CreatorPublication[]; components: Map<string, RoutineComponent>; onOpenLibrary: () => void; onRemove: (publication: CreatorPublication) => void }) {
  const sorted = [...publications].sort((a, b) => a.weekday.localeCompare(b.weekday) || a.startTime.localeCompare(b.startTime));
  return <><div className="page-title"><div><p className="eyebrow">CREATOR SPACE</p><h1>Your published week.</h1><p>Publish central components with a day and time. Members can then schedule their own version without copying a claim blindly.</p></div><button className="round-add" onClick={onOpenLibrary} aria-label="Publish a component">+</button></div><section className="creator-week"><div className="timeline-head"><div><h2>{creator.name.split(" ")[0]}’s public plan</h2><small>Changes are visible on your public profile</small></div><button onClick={onOpenLibrary}>Publish component</button></div>{sorted.length === 0 ? <p className="empty-copy">Your public week is empty. Choose a sourced component from the library to publish.</p> : sorted.map((publication) => { const component = components.get(publication.componentId); if (!component) return null; return <div className="week-item" key={publication.componentId}><span>{publication.startTime}</span><div><strong>{component.title}</strong><small>{publication.weekday} · {component.category} · {component.durationLabel}</small></div><button onClick={() => onRemove(publication)}>Remove</button></div>; })}</section><section className="hint-card"><p className="eyebrow">PUBLIC PROFILE</p><h2>Publish context, not promises.</h2><p>Every published component keeps its source link and caveat when a member views it.</p></section></>;
}

function Profile({ user, following, creators, timeline, components, onSchedule, onRemove, onOpenCreator, onLogout }: { user: PublicUser; following: string[]; creators: PublicUser[]; timeline: TimelineEntry[]; components: Map<string, RoutineComponent>; onSchedule: (entry: TimelineEntry, component: RoutineComponent) => void; onRemove: (id: string) => void; onOpenCreator: (id: string) => void; onLogout: () => void }) {
  const followedCreators = creators.filter((creator) => following.includes(creator.id));
  const profileEntries = timeline.map((entry) => ({ entry, component: components.get(entry.componentId) })).filter((item): item is { entry: TimelineEntry; component: RoutineComponent } => Boolean(item.component));
  return <><div className="profile-head"><div className="member-avatar">{user.name.slice(0, 1)}</div><div><p className="eyebrow">{user.role === "creator" ? "CREATOR ACCOUNT" : "MEMBER ACCOUNT"}</p><h1>{user.name}</h1><p>@{user.handle}</p></div></div><div className="stat-grid"><div><strong>{timeline.length}</strong><span>Profile routines</span></div><div><strong>{following.length}</strong><span>Following</span></div></div>{user.role === "member" && <section className="profile-routines"><div className="section-heading"><div><p className="eyebrow">MY ROUTINES</p><h2>Keep what works.</h2></div></div>{profileEntries.length === 0 ? <p className="empty-copy">Your added routines will live here. Only schedule the ones that need a place in your week.</p> : profileEntries.map(({ entry, component }) => <div className="routine-row" key={entry.id}><RoutineScene variant="routine" className="routine-scene" /><div><strong>{component.title}</strong><small>{entry.scheduledFor ? `${entry.scheduledFor} · ${entry.startTime}` : component.profileGroup ?? "Unscheduled routine"}</small></div>{component.placement === "timeline" && !entry.scheduledFor ? <button onClick={() => onSchedule(entry, component)}>Add time</button> : <button onClick={() => onRemove(entry.id)} aria-label={`Remove ${component.title}`}>×</button>}</div>)}</section>}{user.role === "creator" && <a className="profile-public-link" href={`/creators/${user.handle}`}>View public profile ↗</a>}{user.role === "member" && <section className="following-list"><p className="eyebrow">FOLLOWING</p>{followedCreators.length === 0 ? <p className="empty-copy">Follow a creator to keep their sourced routine context close by.</p> : followedCreators.map((creator) => <button key={creator.id} onClick={() => onOpenCreator(creator.id)}><Avatar creator={creator} size="small" /><div><strong>{creator.name}</strong><small>@{creator.handle}</small></div><span>→</span></button>)}</section>}<button className="logout" onClick={onLogout}>Log out</button></>;
}

function AskBetterHabitsSheet({ components, onClose, onAdd }: { components: Map<string, RoutineComponent>; onClose: () => void; onAdd: (component: RoutineComponent) => void }) {
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<RugramRecommendationResult | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const prompts = ["Build a running habit", "Sleep more consistently", "Feel more energy", "Make mornings easier"];

  async function ask(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true); setError("");
    try { setResult(await api<RugramRecommendationResult>("/api/rugram", { method: "POST", body: JSON.stringify({ goal }) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "BetterHabits could not make a recommendation right now."); }
    finally { setSubmitting(false); }
  }

  const suggested = result?.recommendations.map((recommendation) => ({ recommendation, component: components.get(recommendation.componentId) })).filter((item): item is { recommendation: RugramRecommendationResult["recommendations"][number]; component: RoutineComponent } => Boolean(item.component)) ?? [];

  return <div className="sheet-backdrop" role="presentation"><section className="sheet ask-sheet" role="dialog" aria-modal="true" aria-labelledby="ask-rugram-title"><button className="sheet-close" onClick={onClose} aria-label="Close">×</button>{!result ? <><p className="eyebrow">ASK BETTERHABITS</p><h2 id="ask-rugram-title">What would you like to improve?</h2><p>BetterHabits checks your profile first, then finds a few fitting choices from the central library.</p><form onSubmit={ask}><label>Your goal<textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="For example: I want to begin running without overdoing it." minLength={3} maxLength={320} autoFocus required /></label><div className="goal-prompts">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => setGoal(prompt)}>{prompt}</button>)}</div>{error && <p className="form-error">{error}</p>}<button className="primary" type="submit" disabled={submitting || goal.trim().length < 3}>{submitting ? "Looking at your routines…" : "Find my next routine"}</button></form></> : <><p className="eyebrow">BETTERHABITS’ TAKE</p><h2 id="ask-rugram-title">A smaller next step.</h2><p>{result.guidance}</p><div className="ask-results">{suggested.map(({ recommendation, component }) => <article key={component.id}><RoutineScene variant="routine" className="routine-scene" /><div><strong>{component.title}</strong><small>{component.profileGroup ?? `${component.category} · ${component.durationLabel}`}</small><p>{recommendation.reason}</p></div><button onClick={() => onAdd(component)}>Add</button></article>)}</div><button className="ask-again" onClick={() => { setResult(null); setError(""); }}>Ask about another goal</button></>}</section></div>;
}

function ScheduleSheet({ component, busy, onClose, onSave }: { component: RoutineComponent; busy: boolean; onClose: () => void; onSave: (scheduledFor: string, startTime: string) => void }) {
  const [scheduledFor, setScheduledFor] = useState(isoToday());
  const [startTime, setStartTime] = useState(component.suggestedTime);
  return <div className="sheet-backdrop" role="presentation"><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="schedule-title"><button className="sheet-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">ADD TO YOUR TIMELINE</p><h2 id="schedule-title">{component.title}</h2><p>Choose your day and time. This creates your own schedule entry, not a copy of the creator’s programme.</p><label>Date<input type="date" value={scheduledFor} min={isoToday()} onChange={(event) => setScheduledFor(event.target.value)} /></label><label>Time<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><button className="primary" onClick={() => onSave(scheduledFor, startTime)} disabled={busy}>{busy ? "Adding…" : "Add to timeline"}</button></section></div>;
}

function PublishSheet({ component, busy, onClose, onSave }: { component: RoutineComponent; busy: boolean; onClose: () => void; onSave: (weekday: string, startTime: string) => void }) {
  const [weekday, setWeekday] = useState("Daily");
  const [startTime, setStartTime] = useState(component.suggestedTime);
  return <div className="sheet-backdrop" role="presentation"><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="publish-title"><button className="sheet-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">PUBLISH A COMPONENT</p><h2 id="publish-title">{component.title}</h2><p>Choose where this component appears in your public week. Its source and caveat stay attached.</p><label>Week context<select value={weekday} onChange={(event) => setWeekday(event.target.value)}>{weekdays.map((day) => <option key={day}>{day}</option>)}</select></label><label>Time<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><button className="primary" onClick={() => onSave(weekday, startTime)} disabled={busy}>{busy ? "Publishing…" : "Publish to my week"}</button></section></div>;
}
