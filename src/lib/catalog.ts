import type { CreatorPublication, PublicUser, RoutineComponent } from "./types";

export const creatorProfiles: PublicUser[] = [
  {
    id: "cristiano",
    name: "Cristiano Ronaldo",
    handle: "cristiano",
    role: "creator",
    avatarUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg",
    bio: "Reported morning recovery and match-preparation practices.",
    instagramUrl: "https://www.instagram.com/cristiano/",
  },
  {
    id: "messi",
    name: "Lionel Messi",
    handle: "leomessi",
    role: "creator",
    avatarUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Lionel_Messi_2018.jpg",
    bio: "Reported preparation habits and nutrition context from football coverage.",
    instagramUrl: "https://www.instagram.com/leomessi/",
  },
  {
    id: "bolt",
    name: "Usain Bolt",
    handle: "usainbolt",
    role: "creator",
    avatarUrl: "https://upload.wikimedia.org/wikipedia/commons/7/71/Usain_Bolt_portrait.jpg",
    bio: "Reported sprint-training and food context from Bolt interviews.",
    instagramUrl: "https://www.instagram.com/usainbolt/",
  },
];

export const routineComponents: RoutineComponent[] = [
  { id: "cr7-water", title: "Water on waking", category: "Drink", durationLabel: "First thing", suggestedTime: "07:00", description: "Ronaldo described drinking water as part of his first-morning sequence before a cold plunge and shower.", evidenceLevel: "reported", sourceLabel: "WHOOP podcast", sourceUrl: "https://www.whoop.com/us/en/thelocker/podcast-272-cristiano-ronaldo-the-worlds-best-footballer-like-youve-never/", safetyNote: "Personal routine context, not individual hydration advice." },
  { id: "cr7-light", title: "Morning light exposure", category: "Recovery", durationLabel: "2–3 min", suggestedTime: "07:15", description: "Ronaldo said he gets a few minutes of morning light after his early routine to signal the start of the day.", evidenceLevel: "reported", sourceLabel: "WHOOP podcast", sourceUrl: "https://www.whoop.com/us/en/thelocker/podcast-272-cristiano-ronaldo-the-worlds-best-footballer-like-youve-never/", safetyNote: null },
  { id: "cr7-breathing", title: "Breathing before pressure", category: "Mindset", durationLabel: "Before a key moment", suggestedTime: "17:00", description: "Ronaldo described rehearsing breathing and visualization so they are available before high-pressure football moments.", evidenceLevel: "reported", sourceLabel: "WHOOP podcast", sourceUrl: "https://www.whoop.com/us/en/thelocker/podcast-272-cristiano-ronaldo-the-worlds-best-footballer-like-youve-never/", safetyNote: null },
  { id: "messi-prep", title: "Set up tomorrow tonight", category: "Planning", durationLabel: "5 min", suggestedTime: "21:30", description: "Messi told Marca that he likes to leave the table ready for the next morning before going to sleep.", evidenceLevel: "reported", sourceLabel: "GOAL / Marca interview", sourceUrl: "https://www.goal.com/en-ca/news/what-are-lionel-messis-diet-workout-and-training-secrets/212dtr4u2i61ayjpjiekd31l", safetyNote: null },
  { id: "messi-mate", title: "Hot, bitter mate", category: "Drink", durationLabel: "With your routine", suggestedTime: "08:00", description: "Messi told Marca that he likes his mate hot and bitter. This is personal preference, not hydration guidance.", evidenceLevel: "reported", sourceLabel: "GOAL / Marca interview", sourceUrl: "https://www.goal.com/en-ca/news/what-are-lionel-messis-diet-workout-and-training-secrets/212dtr4u2i61ayjpjiekd31l", safetyNote: "Personal preference, not hydration guidance." },
  { id: "messi-food", title: "Whole-food meal foundation", category: "Food", durationLabel: "With meals", suggestedTime: "12:30", description: "Coverage of nutritionist Giuliano Poser’s work with Messi describes water, olive oil, whole grains, fresh fruit, and vegetables as the base.", evidenceLevel: "reported", sourceLabel: "GOAL report", sourceUrl: "https://www.goal.com/en-ca/news/what-are-lionel-messis-diet-workout-and-training-secrets/212dtr4u2i61ayjpjiekd31l", safetyNote: "For personalised nutrition advice, consult a qualified professional." },
  { id: "bolt-hydration", title: "Hydrate across hot training days", category: "Drink", durationLabel: "Throughout day", suggestedTime: "09:00", description: "Bolt told GQ that he stayed hydrated throughout Jamaica’s hot training days and did not eat much before workouts.", evidenceLevel: "reported", sourceLabel: "GQ interview", sourceUrl: "https://www.gq.com/story/the-real-life-diet-of-usain-bolt", safetyNote: "Elite-athlete context, not a personalised hydration plan." },
  { id: "bolt-fuel", title: "Light food before training", category: "Food", durationLabel: "Before training", suggestedTime: "12:00", description: "Bolt told GQ he ate only enough during the day to have energy for training and digest quickly.", evidenceLevel: "reported", sourceLabel: "GQ interview", sourceUrl: "https://www.gq.com/story/the-real-life-diet-of-usain-bolt", safetyNote: "Personal needs vary with activity, health, and appetite." },
  { id: "bolt-strength", title: "Hamstring and leg work", category: "Movement", durationLabel: "Workout", suggestedTime: "16:00", description: "Bolt told GQ his gym work included hamstring curls and leg extensions.", evidenceLevel: "reported", sourceLabel: "GQ profile", sourceUrl: "https://www.gq.com/story/runner-usain-bolt-training-secrets-and-diet", safetyNote: "Elite-athlete context, not a personal training programme." },
];

export const initialPublications: Record<string, CreatorPublication[]> = {
  cristiano: [{ creatorId: "cristiano", componentId: "cr7-water", weekday: "Daily", startTime: "07:00" }, { creatorId: "cristiano", componentId: "cr7-light", weekday: "Daily", startTime: "07:15" }, { creatorId: "cristiano", componentId: "cr7-breathing", weekday: "Match day", startTime: "17:00" }],
  messi: [{ creatorId: "messi", componentId: "messi-prep", weekday: "Daily", startTime: "21:30" }, { creatorId: "messi", componentId: "messi-mate", weekday: "Daily", startTime: "08:00" }, { creatorId: "messi", componentId: "messi-food", weekday: "Training day", startTime: "12:30" }],
  bolt: [{ creatorId: "bolt", componentId: "bolt-hydration", weekday: "Training day", startTime: "09:00" }, { creatorId: "bolt", componentId: "bolt-fuel", weekday: "Training day", startTime: "12:00" }, { creatorId: "bolt", componentId: "bolt-strength", weekday: "Training day", startTime: "16:00" }],
};

export const memberAccount: PublicUser = { id: "john", name: "John", handle: "john", role: "member", avatarUrl: null, bio: null, instagramUrl: null };
