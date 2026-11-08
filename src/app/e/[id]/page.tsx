import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicEventView } from "@/lib/event-registration-store";
import { eventMapsUrl, locationMapsUrl } from "../../../../shared/event-maps";
import { EventMap, EventSignup } from "./EventSignup";
import styles from "./event.module.css";

export const dynamic = "force-dynamic";

const ZONE = "Asia/Kolkata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const view = await publicEventView(id);
  if (!view) return {};
  return { title: view.event.title, description: view.event.description.slice(0, 160) };
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((item) => item.type === type)?.value ?? "";
}

function kolkataParts(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: ZONE, ...options }).formatToParts(new Date(value));
}

function clock(value: string) {
  const parts = kolkataParts(value, { hour: "numeric", minute: "2-digit", hour12: true });
  return { time: `${part(parts, "hour")}:${part(parts, "minute")}`, period: part(parts, "dayPeriod") };
}

function eventWhen(startsAt: string, endsAt?: string) {
  const dated = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date(startsAt));
  const date = `${part(dated, "weekday")}, ${part(dated, "day")} ${part(dated, "month")}`;
  const start = clock(startsAt);
  const end = endsAt ? clock(endsAt) : null;
  const range = !end
    ? `${start.time} ${start.period}`
    : start.period === end.period
      ? `${start.time} – ${end.time} ${end.period}`
      : `${start.time} ${start.period} – ${end.time} ${end.period}`;
  return `${date} · ${range} IST`;
}

function PinIcon() {
  return (
    <svg className={styles.pin} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#78F5B2"
        d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 4.7 6.5 12.5 6.5 12.5s6.5-7.8 6.5-12.5A6.5 6.5 0 0 0 12 2.5Zm0 8.8a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z"
      />
    </svg>
  );
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await publicEventView(id);
  if (!view) notFound();
  const { event, capacity, approvedCount, waitlistCount } = view;
  const host = event.organizers?.[0]?.name?.trim();
  const placeName = event.location?.name || event.venue;
  const placeDetail = event.location?.address || event.city;
  const mapsHref = event.location ? locationMapsUrl(event.location) : eventMapsUrl(event);
  const tile = kolkataParts(event.startsAt, { month: "short", day: "numeric" });
  const endsAt = event.endsAt && Number.isFinite(Date.parse(event.endsAt)) ? event.endsAt : undefined;
  const lat = event.location?.lat;
  const lng = event.location?.lng;

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.topbar}>
          <Link className={styles.wordmark} href="/">
            Qram
          </Link>
          <Link className={styles.appLink} href="/">
            Get the app
          </Link>
        </header>
        <div className={styles.cover}>
          <p className={styles.coverTitle} aria-hidden="true">
            {event.title}
          </p>
        </div>
        <h1 className={styles.title}>{event.title}</h1>
        {host && <p className={styles.host}>Hosted by {host}</p>}
        <div className={styles.block}>
          <div className={styles.tile} aria-hidden="true">
            <span className={styles.tileMonth}>{part(tile, "month").toUpperCase()}</span>
            <span className={styles.tileDay}>{part(tile, "day")}</span>
          </div>
          <div className={styles.copy}>
            <time className={styles.when} dateTime={event.startsAt}>
              {eventWhen(event.startsAt, endsAt)}
            </time>
          </div>
        </div>
        <div className={styles.block}>
          <div className={styles.tile} aria-hidden="true">
            <PinIcon />
          </div>
          <div className={styles.copy}>
            {mapsHref ? (
              <a className={styles.place} href={mapsHref} target="_blank" rel="noreferrer">
                <span className={styles.placeName}>{placeName}</span>
                <span className={styles.placeDetail}>{placeDetail}</span>
                <span className={styles.sr}>Opens in a new tab</span>
              </a>
            ) : (
              <>
                <p className={styles.placeName}>{placeName}</p>
                <p className={styles.placeDetail}>{placeDetail}</p>
              </>
            )}
          </div>
        </div>
        {typeof lat === "number" && typeof lng === "number" && <EventMap lat={lat} lng={lng} />}
        <EventSignup
          eventId={event.id}
          capacity={capacity}
          approvedCount={approvedCount}
          waitlistCount={waitlistCount}
          waitlist={event.waitlist === true}
          requireApproval={event.requireApproval !== false}
          questions={event.questions ?? []}
          external={event.registrationMode !== "approval"}
          registrationUrl={event.registrationUrl}
        />
        <section className={styles.about}>
          <h2>About event</h2>
          <p>{event.description}</p>
        </section>
      </div>
    </main>
  );
}
