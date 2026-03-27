export type User = {
  id: string;
  email: string;
  role?: "admin" | "user";
  shardId?: string;
  name: string;
  bio?: string;
  age?: number | null;
  location?: string;
  gender?: string;
  prefGender?: string;
  occupation?: string;
  education?: string;
};

export type MeResponse = {
  user: User;
  famousPersons: string[];
  interests: string[];
  events: string[];
  places: string[];
};

export type Match = {
  user: User;
  score: number;
  commonFamousPersons: string[];
  commonInterests: string[];
  commonEvents: string[];
  commonPlaces: string[];
  explanation: string;
};

export type MatchExplanationResponse = {
  user: User;
  score: number;
  explanation: string;
  shared: {
    commonFamousPersons: string[];
    commonInterests: string[];
    commonEvents: string[];
    commonPlaces: string[];
  };
};

export type AdminOverviewResponse = {
  summary: {
    totalUsers: number;
    adminUsers: number;
    regularUsers: number;
    famousPersons: number;
    interests: number;
    events: number;
    places: number;
    relationships: number;
  };
  shards: Array<{
    shardId: string;
    users: number;
    relationships: number;
    famousPersons: number;
    interests: number;
    events: number;
    places: number;
  }>;
  topFamousPersons: Array<{
    name: string;
    total: number;
  }>;
  topInterests: Array<{
    name: string;
    total: number;
  }>;
  recentUsers: Array<{
    id: string;
    name?: string | null;
    email: string;
    role: "admin" | "user";
    location?: string | null;
    seeded: boolean;
    shardId: string;
    updatedAt: string;
  }>;
};
