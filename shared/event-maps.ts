import type { CityEvent } from './mobile';
/** Public venue query only: no location permission or device coordinates. */
export function eventMapsUrl(event: Pick<CityEvent, 'venue' | 'city'>) {
  const venue = event.venue.trim();
  if (!venue || /^(?:tba|tbd|online|to be announced|venue to be announced)$/i.test(venue))
    return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue, event.city.trim()].filter(Boolean).join(', '))}`;
}
/** Opens a searched venue in Google Maps on any device; needs no API key. */
export function locationMapsUrl(location: { name: string; address: string; placeId?: string }) {
  const query = encodeURIComponent(`${location.name}, ${location.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}${location.placeId ? `&query_place_id=${encodeURIComponent(location.placeId)}` : ''}`;
}
