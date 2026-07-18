export type Role = "member" | "creator";
export type EvidenceLevel = "reported" | "reviewed";

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
  evidenceLevel: EvidenceLevel;
  sourceLabel: string;
  sourceUrl: string;
  safetyNote: string | null;
};

export type TimelineEntry = {
  id: string;
  componentId: string;
  scheduledFor: string;
  startTime: string;
  sourceCreatorId: string | null;
  timeZone: string;
};

export type CreatorPublication = {
  creatorId: string;
  componentId: string;
  weekday: string;
  startTime: string;
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
