import type { HabitFlow } from './mobile';

export const morningDrinksFlowId = 'lifestyle-morning-drinks';
export const morningDrinksHeading = '8 ways to start your day';
const waterSource = {
  title: 'NHS: water, drinks and hydration',
  url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/',
};
const caffeineSource = {
  title: 'FDA: caffeine and individual sensitivity',
  url: 'https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much',
};
const sugarSource = {
  title: 'NHS: honey and free sugars',
  url: 'https://www.nhs.uk/healthier-families/food-facts/sugar/',
};
const teethSource = {
  title: 'UK oral-health guidance: acidic drinks and tooth wear',
  url: 'https://www.gov.uk/government/publications/delivering-better-oral-health-an-evidence-based-toolkit-for-prevention/chapter-7-tooth-wear',
};
const plantSource = {
  title: 'FDA: milk and plant-based drink labels',
  url: 'https://www.fda.gov/consumers/consumer-updates/milk-and-plant-based-milk-alternatives-know-nutrient-difference',
};
const common =
  'Adult drink ideas, not a personal diet or medical treatment. Choose one option, not all eight. No drink here is required on an empty stomach or replaces a balanced meal. Follow any medical fluid restrictions and ingredient allergies. Let hot drinks cool comfortably; never drink boiling liquid.';

export const morningDrinkOptions = [
  {
    id: 'water',
    title: 'Lukewarm water',
    format: 'Simple · caffeine-free',
    preparation:
      'Pour safe drinking water into a clean glass. If you prefer it warm, let heated water cool until comfortable. Hold the glass and sip at your own pace. Stirring is optional; no additive is needed.',
    note: 'Warmth is a preference, not a detox treatment. Room-temperature or cool water is also fine. There is no compulsory morning volume; follow your own needs and any fluid restriction.',
    sources: [waterSource],
  },
  {
    id: 'lemon-honey',
    title: 'Lemon & optional honey',
    format: 'Flavoured water · honey optional',
    preparation:
      'Pour comfortably warm water into a clean mug. Add a little lemon for flavour. If you want sweetness, stir in a small amount of honey; it is also fine without honey. Let it cool before sipping.',
    note: 'Honey adds free sugar; it is not a health requirement. Lemon is acidic, so avoid prolonged sipping or swishing and have plain water afterwards. This is a flavour choice, not a fat-burning or cleansing drink.',
    sources: [waterSource, sugarSource, teethSource],
  },
  {
    id: 'coffee',
    title: 'Coffee',
    format: 'Caffeinated · no added sugar needed',
    preparation:
      'Prepare a familiar brewed coffee according to the equipment instructions. Pour carefully into a heat-safe mug. Add milk only if it suits you, let it cool to a comfortable temperature and sip.',
    note: 'Caffeine varies with the coffee and serving. Count other caffeine sources too; choose less or avoid it if sensitive. Pregnancy and some medicines or conditions need individual advice. Coffee is optional, not necessary to begin your day.',
    sources: [caffeineSource, waterSource],
  },
  {
    id: 'decaf',
    title: 'Decaf coffee',
    format: 'Lower caffeine · not caffeine-free',
    preparation:
      'Choose a clearly labelled decaffeinated coffee and prepare it using its instructions. Pour into a clean mug, add any suitable milk if desired, then allow it to cool before drinking.',
    note: 'Decaf still contains some caffeine. Check the product and seek advice if you must avoid caffeine completely. There is no need to sweeten it or to drink it before food.',
    sources: [caffeineSource],
  },
  {
    id: 'tea',
    title: 'Plain tea',
    format: 'Black tea · contains caffeine',
    preparation:
      'Brew a familiar black tea using the packet instructions and safe equipment. Remove the tea bag or strain the leaves. Pour carefully, add suitable milk if you like and wait until comfortably warm.',
    note: 'Tea also contributes caffeine. A stronger brew is not automatically a better choice. Account for other caffeine sources; choose a suitable caffeine-free alternative if needed. Added sugar is optional.',
    sources: [caffeineSource, waterSource],
  },
  {
    id: 'ginger',
    title: 'Ginger infusion',
    format: 'Caffeine-free when made with ginger only',
    preparation:
      'Wash fresh ginger, add a few thin food-sized slices to hot water and let it infuse to your taste. Strain carefully and let it cool before sipping. Keep the recipe simple; no powder or supplement is required.',
    note: 'This is a flavour option, not a treatment for illness. Stop if it irritates your stomach. Blended products can contain other ingredients or caffeine: check the label, and ask about unfamiliar herbs if pregnant or taking medicines.',
    sources: [waterSource],
  },
  {
    id: 'milk',
    title: 'Milk',
    format: 'Dairy option · unsweetened',
    preparation:
      'Choose pasteurised milk that suits your diet, such as lower-fat milk. Pour into a clean glass and enjoy cool, or warm it safely and let it cool before drinking. Keep milk refrigerated according to its label.',
    note: 'Avoid dairy milk if you have a milk-protein allergy. Lactose-free dairy milk may suit lactose intolerance but is not a milk-allergy substitute. A drink alone is not a complete breakfast.',
    sources: [waterSource, plantSource],
  },
  {
    id: 'soy',
    title: 'Fortified soy drink',
    format: 'Plant-based · choose unsweetened',
    preparation:
      'Choose an unsweetened soy drink fortified with calcium and vitamin D. Check the label, shake if directed, pour into a clean cup and follow the storage instructions. It can be enjoyed cool or comfortably warm.',
    note: 'Avoid if you have a soy allergy. Fortification and protein differ between plant drinks, so read the actual label rather than assuming they are equivalent. This option is not a recommendation to replace prescribed nutrition.',
    sources: [plantSource],
  },
] as const;

export const morningDrinkFlows: HabitFlow[] = morningDrinkOptions.map(option => ({
  id: `morning-drink-${option.id}`,
  title: option.title,
  goal: 'Morning drinks',
  area: 'Wellbeing',
  pathId: 'morning-drinks',
  description:
    'One optional way to begin your morning. Choose what fits your taste, diet and comfort.',
  level: 'An everyday choice',
  rhythm: 'When you want a morning drink',
  milestone: 'Choose one suitable drink, without turning it into a rule.',
  review: 'Did you enjoy it, and did it suit your comfort and routine?',
  guidance: common,
  sources: [...option.sources],
  sessionGuide: {
    collection: 'Morning drinks',
    label: morningDrinksHeading,
    format: option.format,
    equipment: 'Clean cup or glass · safe preparation equipment',
    reviewedOn: '2026-10-24',
    cards: [
      {
        id: 'prepare',
        title: 'Prepare your drink',
        metric: 'At your own pace',
        body: option.preparation,
        illustration: 'workout',
      },
      {
        id: 'choice',
        title: 'What to know',
        metric: 'A choice, not a requirement',
        body: option.note,
        illustration: 'workout',
      },
    ],
  },
  steps: [
    {
      id: 'choose',
      title: 'Choose a suitable drink',
      cue: 'Pick one option that fits your preferences and any dietary advice.',
      duration: 'When you want a morning drink',
    },
    {
      id: 'prepare',
      title: 'Prepare and enjoy comfortably',
      cue: 'Use safe ingredients and a clean cup. Let hot drinks cool.',
      duration: 'At your own pace',
    },
    {
      id: 'notice',
      title: 'Notice what suits you',
      cue: 'Keep what you enjoy; change or skip it if it does not suit you.',
      duration: 'A preference, not a daily target',
    },
  ],
}));

export const morningDrinksFlow: HabitFlow = {
  ...morningDrinkFlows[0],
  id: morningDrinksFlowId,
  title: 'Morning drinks',
  description: `${morningDrinksHeading}. Eight alternatives, not a routine to drink all eight.`,
  relatedFlowIds: morningDrinkFlows.map(flow => flow.id),
  sessionGuide: {
    ...morningDrinkFlows[0].sessionGuide!,
    format: '8 drink ideas',
    label: morningDrinksHeading,
  },
  sources: [
    ...new Map(
      morningDrinkFlows.flatMap(flow => flow.sources ?? []).map(source => [source.url, source]),
    ).values(),
  ],
};

export const morningDrinkMedia = Object.fromEntries(
  morningDrinkFlows.map((flow, row) => [flow.id, { atlas: 'morning' as const, row }]),
);
