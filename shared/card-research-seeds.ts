import inventory from './card-inventory-snapshot.json';
import {cardPlatforms} from './card-platforms';
import {cardOfferSeeds} from './card-offer-seeds';
import type {CardResearch} from './card-research';
export const cardResearchSeeds:CardResearch={issuers:inventory.issuers as CardResearch['issuers'],listings:inventory.listings as CardResearch['listings'],platforms:cardPlatforms.map(platform=>({...platform,...(cardOfferSeeds.some(offer=>offer.platformId===platform.id)?{coverage:'partial' as const,note:'Some public-source offer leads collected. Full issuer/card/platform coverage and checkout eligibility remain incomplete.'}:{})})),offers:cardOfferSeeds};
