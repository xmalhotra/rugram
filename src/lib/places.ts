import 'server-only';
import type { EventLocation } from '../../shared/event-registration';

/**
 * Google Places (New) behind our own routes, so the API key never reaches a phone
 * or a web page. Without GOOGLE_MAPS_API_KEY, venue search is off and hosts type the
 * address by hand.
 */
export class PlacesUnavailable extends Error {}
const key = () => process.env.GOOGLE_MAPS_API_KEY;
export const placesEnabled = () => Boolean(key());

async function google(url: string, init: RequestInit & { fieldMask?: string }) {
  const apiKey = key();
  if (!apiKey) throw new PlacesUnavailable('Venue search is not set up.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        ...(init.fieldMask ? { 'X-Goog-FieldMask': init.fieldMask } : {}),
      },
    });
    if (!response.ok) throw new PlacesUnavailable('Venue search is unavailable right now.');
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export type PlaceSuggestion = { placeId: string; name: string; address: string };

/** Venue suggestions as the host types, biased to India. */
export async function searchPlaces(input: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  const response = await google('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    body: JSON.stringify({ input, includedRegionCodes: ['in'], ...(sessionToken ? { sessionToken } : {}) }),
  });
  const body = (await response.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
      };
    }[];
  };
  return (body.suggestions ?? []).flatMap(({ placePrediction: place }) =>
    place?.placeId
      ? [
          {
            placeId: place.placeId,
            name: place.structuredFormat?.mainText?.text ?? '',
            address: place.structuredFormat?.secondaryText?.text ?? '',
          },
        ]
      : [],
  );
}

/** Name, address and coordinates for a chosen suggestion. */
export async function placeDetails(placeId: string, sessionToken?: string): Promise<EventLocation> {
  const response = await google(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : ''}`,
    { method: 'GET', fieldMask: 'id,displayName,formattedAddress,location' },
  );
  const body = (await response.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  };
  return {
    placeId: body.id ?? placeId,
    name: body.displayName?.text ?? '',
    address: body.formattedAddress ?? '',
    lat: body.location?.latitude,
    lng: body.location?.longitude,
  };
}

/** A small map image for an event page; coordinates are rounded so images cache well. */
export async function staticMap(lat: number, lng: number, scheme: 'dark' | 'light') {
  const apiKey = key();
  if (!apiKey) throw new PlacesUnavailable('Maps are not set up.');
  const at = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const params = new URLSearchParams({
    center: at,
    zoom: '15',
    size: '640x320',
    scale: '2',
    markers: `color:0x78F5B2|${at}`,
    key: apiKey,
  });
  if (scheme === 'dark')
    for (const style of [
      'element:geometry|color:0x1d2a24',
      'element:labels.text.fill|color:0x9fb3aa',
      'element:labels.text.stroke|color:0x0b120e',
      'feature:road|element:geometry|color:0x2c3b33',
      'feature:water|element:geometry|color:0x0e1a20',
      'feature:poi|visibility:off',
    ])
      params.append('style', style);
  const response = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params}`);
  if (!response.ok) throw new PlacesUnavailable('Map is unavailable right now.');
  return response.arrayBuffer();
}
