import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCreator } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getPublicCreator(handle);
  if (!profile) notFound();
  const components = new Map(profile.components.map((component) => [component.id, component]));
  return <main className="app"><header className="topbar"><Link className="brand" href="/"><span>R</span>rugram</Link><Link className="account-button" href="/">Open app</Link></header><section className="page"><section className="creator-hero public-creator"><span className="avatar avatar-large" style={{ backgroundImage: profile.creator.avatarUrl ? `url(${profile.creator.avatarUrl})` : undefined }} role="img" aria-label={profile.creator.name} /><div><p className="handle">@{profile.creator.handle}</p><h1>{profile.creator.name}</h1><p>{profile.creator.bio}</p><div className="creator-actions">{profile.creator.instagramUrl && <a href={profile.creator.instagramUrl} target="_blank" rel="noreferrer">Instagram ↗</a>}<Link href="/">Build your own routine →</Link></div></div></section><div className="section-heading"><div><p className="eyebrow">PUBLISHED COMPONENTS</p><h2>Context, not a prescription.</h2></div><span>Source-labelled</span></div><div className="component-grid">{profile.publications.map((publication) => { const component = components.get(publication.componentId); if (!component) return null; return <article className="component-card" key={publication.componentId}><div className="component-top"><span>{component.category}</span><span className="badge">Reported</span></div><h3>{component.title}</h3><p>{component.description}</p>{component.safetyNote && <p className="safety-note">{component.safetyNote}</p>}<footer><div><small>{publication.weekday} · {publication.startTime} · {component.durationLabel}</small><a href={component.sourceUrl} target="_blank" rel="noreferrer">{component.sourceLabel} ↗</a></div><Link className="card-link" href="/">Schedule your own</Link></footer></article>; })}</div></section></main>;
}
