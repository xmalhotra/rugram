import type { CityEvent, Product } from './mobile';
import { curatedGymProducts } from './curated-gym-products';
import { curatedWheyProducts } from './curated-whey-products';
import { curatedSupplementProducts } from './curated-supplement-products';
import { withSupplementShortlist } from './supplement-shortlists';
import { curatedEverydayProducts } from './curated-everyday-products';
import { electronicsProducts } from './electronics-catalog';
import { storeReadyProducts } from './store-ready-products';
import { snapshotPurchase } from './purchases';
import { curatedProductPhotos } from './curated-product-photos';
import { hyderabadTechSeeds } from './hyderabad-tech';
const checkedAt = '2026-10-15T00:00:00.000Z';
export const curatedFlowProducts: Product[] = [
  ...curatedWheyProducts,
  ...curatedSupplementProducts,
  ...curatedGymProducts,
  ...curatedEverydayProducts,
  ...electronicsProducts,
  ...storeReadyProducts,
  {
    id: 'pick-reload-orange-20',
    title: 'Fast&Up Reload · Orange',
    category: 'Supplements',
    useCases: ['pre-workout-drink'],
    packLabel: '20 effervescent tablets · one tube',
    price: 249,
    tier: 'Essential',
    summary:
      'Supplier-listed electrolyte drink mix. Compare the ingredient list and pack price; this is an optional hydration choice, not a required HYROX supplement or an independently validated performance recommendation.',
    safetyNote:
      'Water is an option without buying a supplement. Check the product label and suitability for your health needs; seek qualified advice if you have a medical condition or take medication.',
    url: 'https://in.fastandup.com/products/reload-single-tube-orange',
    checkedAt,
    status: 'published',
    createdBy: 'admin',
    endorsements: [],
  },
  {
    id: 'pick-reload-berry-20',
    title: 'Fast&Up Reload · Berry',
    category: 'Supplements',
    useCases: ['pre-workout-drink'],
    packLabel: '20 effervescent tablets · one tube',
    price: 265,
    tier: 'Essential',
    summary:
      'An alternative flavour of the same supplier’s electrolyte drink mix, not a different training benefit. Prices are pack prices, not single-drink prices. Compare ingredients and current seller terms.',
    safetyNote:
      'Optional purchase, not a requirement. Check ingredients and suitability; no clinical benefit or HYROX endorsement is implied.',
    url: 'https://in.fastandup.com/products/reload-single-tube-berry-flavour',
    checkedAt,
    status: 'published',
    createdBy: 'admin',
    endorsements: [],
  },
].map(product =>
  withSupplementShortlist(
    snapshotPurchase({
      ...product,
      imageUrl: (product as Product).imageUrl ?? curatedProductPhotos[product.id],
    } as Product),
  ),
);
export const curatedFlowEvents: CityEvent[] = [
  ...hyderabadTechSeeds,
  {
    id: 'race-hyrox-gujarat-2026',
    title: 'INDUSIND BANK HYROX Gujarat',
    topic: 'HYROX',
    country: 'IN',
    city: 'Gandhinagar',
    venue: 'Helipad Exhibition Center · HEC Hall 5 & 6',
    startsAt: '2026-11-26T00:00:00+05:30',
    endsAt: '2026-11-28T23:59:59+05:30',
    dateOnly: true,
    capacity: 0,
    price: 0,
    entryFee: null,
    feeNote:
      'Ticket prices were not visible in the publicly readable registration page. Check your division and total fees on the provider site.',
    registrationStatus: 'Registration link available',
    description:
      'Official India race. Date range comes from the organiser’s event page; the linked ticket listing starts on 26 November. Confirm your division and race day before booking.',
    registrationUrl: 'https://india.hyrox.co.in/event/hyrox-gujarat-season-26-27-8yjjhs',
    sourceUrl: 'https://hyrox.co.in/event/hyrox-gujarat/',
    checkedAt,
    createdBy: 'admin',
    status: 'published',
  },
  {
    id: 'race-hyrox-noida-2027',
    title: 'HYROX Noida',
    topic: 'HYROX',
    country: 'IN',
    city: 'Greater Noida',
    venue: 'IEML (India Expo Mart), Knowledge Park II',
    startsAt: '2027-01-15T00:00:00+05:30',
    endsAt: '2027-01-17T23:59:59+05:30',
    dateOnly: true,
    capacity: 0,
    price: 0,
    entryFee: null,
    feeNote: 'Entry prices not published in the reviewed event page.',
    registrationStatus: 'Tickets coming soon',
    description:
      'Official event dates are published. The organiser’s event page currently says tickets will go live soon; this is not a claim that registration is open.',
    registrationUrl: 'https://hyrox.co.in/event/hyrox-noida/',
    sourceUrl: 'https://hyrox.co.in/event/hyrox-noida/',
    checkedAt,
    createdBy: 'admin',
    status: 'published',
  },
];
