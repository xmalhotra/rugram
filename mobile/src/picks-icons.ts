/* eslint-disable @typescript-eslint/no-require-imports */
import type { ImageSourcePropType } from 'react-native';

/** Our own category pictures for Picks. A category without one shows a plain tile, never a product photo. */
export const supplementIcons: Partial<Record<string, ImageSourcePropType>> = {
  peptides: require('../assets/picks/collagen-peptides.jpg'),
  creatine: require('../assets/picks/creatine.jpg'),
  protein: require('../assets/picks/whey-protein.jpg'),
  'plant-protein': require('../assets/picks/plant-protein.jpg'),
  endurance: require('../assets/picks/endurance-fuelling.jpg'),
  hydration: require('../assets/picks/hydration-electrolytes.jpg'),
  labels: require('../assets/picks/understand-label.jpg'),
};

export const cardShelfIcons: Partial<Record<string, ImageSourcePropType>> = {
  'online-shopping': require('../assets/picks/card-online-shopping.jpg'),
  groceries: require('../assets/picks/card-groceries.jpg'),
  'food-instamart': require('../assets/picks/card-food.jpg'),
  'bills-recharges': require('../assets/picks/card-bills.jpg'),
  fuel: require('../assets/picks/card-fuel.jpg'),
  travel: require('../assets/picks/card-travel.jpg'),
  movies: require('../assets/picks/card-movies.jpg'),
  'lifetime-free': require('../assets/picks/card-lifetime-free.jpg'),
};
