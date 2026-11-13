/** Primary-source editorial context, checked 2026-10-24. Connections are not endorsements. */
export const animalMovementContext = {
  title: 'The story behind the groundwork',
  summary:
    'Animal-inspired training uses crawling, low positions and changes of support to explore coordination and body control. The names are memorable, but each pattern has a different job.',
  preview: 'Vidyut Jammwal · Da Rulk / Centr',
  connections: [
    {
      name: 'Vidyut Jammwal',
      label: 'On his own channel',
      body: 'Jammwal shares animal-inspired movement in Kalari Chalanam. It is a martial-arts reference, not the origin of this ten-card collection or proof that he follows this exact routine.',
      source: {
        title: 'Watch: Kalari Chalanam · Vidyut Jammwal',
        url: 'https://www.youtube.com/watch?v=WwoeGzyxINk',
      },
    },
    {
      name: 'Chris Hemsworth & Da Rulk',
      label: 'Documented by Centr',
      body: 'Centr reports that Hemsworth uses Da Rulk’s functional movements for mobility. Da Rulk’s published teaching includes crawls and sit-throughs; this collection is not Hemsworth’s personal programme.',
      source: {
        title: 'Read: Centr on Da Rulk and Chris Hemsworth',
        url: 'https://centr.com/blogs/thewarmup/meet-the-master-behind-centr-masterclass-da-rulk',
      },
    },
    {
      name: 'Mike Fitch',
      label: 'Movement-system background',
      body: 'Fitch created the branded Animal Flow system. Our Animal movements collection combines broader ground-based patterns; it is not an official Animal Flow course or certification.',
      source: {
        title: 'Read: Animal Flow creator Mike Fitch',
        url: 'https://animalflow.com/about/mike-fitch/',
      },
    },
  ],
  boundary:
    'Documented inspiration, not an endorsement by these people. Our demonstrators are illustrations, not celebrity footage. Skills and suitability vary; a famous name is not a reason to push through discomfort.',
  reviewedOn: '2026-10-24',
};
export const animalCrawlSource = {
  title: 'Centr / Da Rulk: forward, reverse, side crawl and sit-through',
  url: 'https://centr.com/blogs/features/9-essential-moves-for-your-raw-functional-training-workout',
};
export const duckWalkSource = {
  title: 'Enso Movement: duck-walk demonstration and cautions',
  url: 'https://ensomovement.com/blog/training/exercise-database/duck-walks/',
};
export const crabToeTouchSource = {
  title: 'Kaiser Permanente: Animal Moves · crab toe touches',
  url: 'https://kpwellnessu.kaiserpermanente.org/wp-content/uploads/Animal-Moves-exercise-program-EW.pdf',
};
export function isAnimalMovement(id: string) {
  return id.startsWith('workout-animal-') && id !== 'workout-animal-movements';
}
