export type Role = "member" | "creator" | "admin";
export type EvidenceLevel = "reported" | "reviewed";
export type RoutinePlacement = "timeline" | "preference";

export type PublicUser = {
  id: string;
  handle: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  bio: string | null;
  instagramUrl: string | null;
};

export type RoutineComponent = {
  id: string;
  category: string;
  title: string;
  description: string;
  durationLabel: string;
  suggestedTime: string;
  placement: RoutinePlacement;
  profileGroup: string | null;
  evidenceLevel: EvidenceLevel;
  sourceLabel: string;
  sourceUrl: string;
  safetyNote: string | null;
};

export type TimelineEntry = {
  id: string;
  componentId: string;
  scheduledFor: string | null;
  startTime: string | null;
  sourceCreatorId: string | null;
  timeZone: string;
};

export type CreatorPublication = {
  creatorId: string;
  componentId: string;
  weekday: string;
  startTime: string;
};

export type RugramRecommendation = {
  componentId: string;
  reason: string;
};

export type RugramRecommendationResult = {
  goal: string;
  guidance: string;
  recommendations: RugramRecommendation[];
  engine: "openai" | "catalog";
};

export type BootstrapPayload = {
  user: PublicUser;
  creators: PublicUser[];
  components: RoutineComponent[];
  publications: Record<string, CreatorPublication[]>;
  followingCreatorIds: string[];
  likedPublicationKeys: string[];
  timeline: TimelineEntry[];
};
