/* Metro requires literal asset paths. One still of the drink. No person, so no gender variant. */
/* eslint-disable @typescript-eslint/no-require-imports */
const stills = {
  'morning-drink-water': require('../assets/lifestyle/drinks/water.jpg'),
  'morning-drink-lemon-honey': require('../assets/lifestyle/drinks/lemon-honey.jpg'),
  'morning-drink-coffee': require('../assets/lifestyle/drinks/coffee.jpg'),
  'morning-drink-decaf': require('../assets/lifestyle/drinks/decaf.jpg'),
  'morning-drink-tea': require('../assets/lifestyle/drinks/tea.jpg'),
  'morning-drink-ginger': require('../assets/lifestyle/drinks/ginger.jpg'),
  'morning-drink-milk': require('../assets/lifestyle/drinks/milk.jpg'),
  'morning-drink-soy': require('../assets/lifestyle/drinks/soy.jpg'),
} as const;

export function morningStill(id: string) {
  return stills[id as keyof typeof stills];
}

export function domainStill(id: string) {
  return morningStill(id) ?? setupStill(id);
}

const setups = {
  'coding-setup-compact': require('../assets/coding/setups/compact.jpg'),
  'coding-setup-single': require('../assets/coding/setups/single.jpg'),
  'coding-setup-dual': require('../assets/coding/setups/dual.jpg'),
  'coding-setup-sit-stand': require('../assets/coding/setups/stand.jpg'),
  'tech-fde-resources': require('../assets/coding/setups/compact.jpg'),
  'tech-current-ai-agent': require('../assets/coding/setups/single.jpg'),
  'tech-value-for-money': require('../assets/coding/setups/stand.jpg'),
  'tech-cards': require('../assets/coding/setups/card.jpg'),
  'tech-monitor-setup': require('../assets/coding/setups/dual.jpg'),
} as const;

function setupStill(id: string) {
  return setups[id as keyof typeof setups];
}
