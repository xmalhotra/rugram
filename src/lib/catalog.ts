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
  { id: "daily-walk", title: "10-minute daylight walk", category: "Movement", durationLabel: "10 min", suggestedTime: "08:00", placement: "timeline", profileGroup: null, description: "A short walk is a realistic way to build regular activity into a normal day. Start where you are and build consistency first.", evidenceLevel: "reviewed", sourceLabel: "WHO physical activity", sourceUrl: "https://www.who.int/europe/news-room/fact-sheets/item/physical-activity", safetyNote: "Adapt intensity and duration for your health, mobility, and local conditions." },
  { id: "easy-run", title: "Easy conversational run", category: "Running", durationLabel: "20–30 min", suggestedTime: "07:00", placement: "timeline", profileGroup: null, description: "Keep the effort easy enough to speak in short sentences. It is a repeatable base session, not a test day.", evidenceLevel: "reviewed", sourceLabel: "WHO physical activity", sourceUrl: "https://www.who.int/europe/news-room/fact-sheets/item/physical-activity", safetyNote: "Build gradually; seek qualified advice for pain, injury, or health concerns." },
  { id: "strength-basics", title: "Full-body strength session", category: "Movement", durationLabel: "20 min", suggestedTime: "18:00", placement: "timeline", profileGroup: null, description: "Two focused strength sessions a week are a useful, achievable starting point for many adults.", evidenceLevel: "reviewed", sourceLabel: "WHO physical activity", sourceUrl: "https://www.who.int/europe/news-room/fact-sheets/item/physical-activity", safetyNote: "Choose movements and loads appropriate for your experience and health." },
  { id: "sleep-window", title: "Protect a 7+ hour sleep window", category: "Sleep", durationLabel: "Nightly", suggestedTime: "22:30", placement: "timeline", profileGroup: null, description: "Choose a bedtime that gives you enough room for sleep, then keep the wake time reasonably consistent.", evidenceLevel: "reviewed", sourceLabel: "CDC sleep guidance", sourceUrl: "https://www.cdc.gov/sleep/about/index.html", safetyNote: "Sleep needs vary. Speak with a clinician about persistent sleep problems." },
  { id: "cr7-light", title: "Get outside early", category: "Recovery", durationLabel: "5–10 min", suggestedTime: "08:15", placement: "timeline", profileGroup: null, description: "Make a brief daylight break part of the morning rather than adding another intense task.", evidenceLevel: "reviewed", sourceLabel: "CDC healthy sleep habits", sourceUrl: "https://www.cdc.gov/niosh/bulletin/2020/sleep.html", safetyNote: null },
  { id: "quinoa-breakfast", title: "Quinoa breakfast base", category: "Food", durationLabel: "Breakfast choice", suggestedTime: "Breakfast", placement: "preference", profileGroup: "Food · Breakfast", description: "Keep a cooked-grain breakfast option ready. Pair it with fruit, yoghurt, nuts, or another option that works for you.", evidenceLevel: "reported", sourceLabel: "Qram preference", sourceUrl: "https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/", safetyNote: "A flexible food preference, not a prescription or a personalised nutrition plan." },
  { id: "messi-food", title: "Whole-food breakfast default", category: "Food", durationLabel: "Breakfast choice", suggestedTime: "Breakfast", placement: "preference", profileGroup: "Food · Breakfast", description: "Pick a simple breakfast built around foods you genuinely enjoy and can repeat on busy mornings.", evidenceLevel: "reported", sourceLabel: "GOAL report", sourceUrl: "https://www.goal.com/en-ca/news/what-are-lionel-messis-diet-workout-and-training-secrets/212dtr4u2i61ayjpjiekd31l", safetyNote: "Personal needs and dietary requirements vary." },
  { id: "bolt-fuel", title: "Light pre-run fuel", category: "Food", durationLabel: "Before a run", suggestedTime: "Pre-run", placement: "preference", profileGroup: "Food · Pre-run", description: "Choose a familiar, easy-to-digest snack when you need fuel before training—then test it on ordinary sessions, not race day.", evidenceLevel: "reported", sourceLabel: "GQ interview", sourceUrl: "https://www.gq.com/story/the-real-life-diet-of-usain-bolt", safetyNote: "Food timing and amount are individual. Consider professional advice for performance nutrition." },
  { id: "cr7-water", title: "Water with your first meal", category: "Drink", durationLabel: "Daily choice", suggestedTime: "Morning", placement: "preference", profileGroup: "Drink · Morning", description: "Use your first meal or coffee as a cue to drink water—simple, visible, and easier to repeat than a strict target.", evidenceLevel: "reported", sourceLabel: "WHOOP podcast", sourceUrl: "https://www.whoop.com/us/en/thelocker/podcast-272-cristiano-ronaldo-the-worlds-best-footballer-like-youve-never/", safetyNote: "Hydration needs vary with activity, climate, medications, and health." },
  { id: "messi-prep", title: "Set up tomorrow tonight", category: "Planning", durationLabel: "5 min", suggestedTime: "Evening", placement: "preference", profileGroup: "Planning · Evening", description: "Put out the one thing that makes tomorrow easier: shoes, breakfast ingredients, a water bottle, or your run kit.", evidenceLevel: "reported", sourceLabel: "GOAL / Marca interview", sourceUrl: "https://www.goal.com/en-ca/news/what-are-lionel-messis-diet-workout-and-training-secrets/212dtr4u2i61ayjpjiekd31l", safetyNote: null },
  { id: "cr7-breathing", title: "One-minute reset", category: "Mindset", durationLabel: "1 min", suggestedTime: "Anytime", placement: "preference", profileGroup: "Mindset · Reset", description: "Use one slow minute before a difficult conversation, a run, or a demanding task. Keep it available, not scheduled.", evidenceLevel: "reported", sourceLabel: "WHOOP podcast", sourceUrl: "https://www.whoop.com/us/en/thelocker/podcast-272-cristiano-ronaldo-the-worlds-best-footballer-like-youve-never/", safetyNote: null },
];

export const initialPublications: Record<string, CreatorPublication[]> = {
  cristiano: [{ creatorId: "cristiano", componentId: "cr7-water", weekday: "Daily", startTime: "08:00" }, { creatorId: "cristiano", componentId: "cr7-light", weekday: "Daily", startTime: "08:15" }, { creatorId: "cristiano", componentId: "cr7-breathing", weekday: "Match day", startTime: "17:00" }],
  messi: [{ creatorId: "messi", componentId: "messi-prep", weekday: "Daily", startTime: "21:30" }, { creatorId: "messi", componentId: "messi-food", weekday: "Daily", startTime: "08:00" }],
  bolt: [{ creatorId: "bolt", componentId: "bolt-fuel", weekday: "Training day", startTime: "06:30" }, { creatorId: "bolt", componentId: "easy-run", weekday: "Training day", startTime: "07:00" }],
};

export const memberAccount: PublicUser = { id: "john", name: "John", handle: "john", role: "member", avatarUrl: null, bio: null, instagramUrl: null };
