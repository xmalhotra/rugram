import type { CityEvent } from './mobile';
/** Public venue query only: no location permission or device coordinates. */
export function eventMapsUrl(event: Pick<CityEvent, 'venue' | 'city'>) {
  const venue = event.venue.trim();
  if (!venue || /^(?:tba|tbd|online|to be announced|venue to be announced)$/i.test(venue))
    return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue, event.city.trim()].filter(Boolean).join(', '))}`;
}
