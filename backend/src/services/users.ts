import { AppError } from "../middleware/errorHandler";
import { findUserShardById, Neo4jShard, openSession, shards } from "../config/neo4j";

export type UserNode = {
  id: string;
  email: string;
  role: "admin" | "user";
  name: string;
  bio?: string | null;
  age?: number | null;
  location?: string | null;
  gender?: string | null;
  prefGender?: string | null;
  occupation?: string | null;
  education?: string | null;
  shardId?: string | null;
};

export type UserProfile = {
  user: UserNode;
  famousPersons: string[];
  interests: string[];
  events: string[];
  places: string[];
  shardId: string;
};

export type AuthUserRecord = {
  id: string;
  email: string;
  role: "admin" | "user";
  name: string;
  passwordHash: string;
  bio?: string | null;
  age?: number | null;
  location?: string | null;
  gender?: string | null;
  prefGender?: string | null;
  occupation?: string | null;
  education?: string | null;
  shardId: string;
};

type QueryUserRecord = {
  get: (key: string) => unknown;
};

function mapUser(record: QueryUserRecord): UserNode {
  return {
    id: record.get("id") as string,
    email: record.get("email") as string,
    role: record.get("role") as "admin" | "user",
    name: record.get("name") as string,
    bio: (record.get("bio") as string | null) || "",
    age: (record.get("age") as number | null) ?? null,
    location: (record.get("location") as string | null) || "",
    gender: (record.get("gender") as string | null) ?? null,
    prefGender: (record.get("prefGender") as string | null) ?? null,
    occupation: (record.get("occupation") as string | null) || "",
    education: (record.get("education") as string | null) || "",
    shardId: (record.get("shardId") as string | null) ?? null
  };
}

async function loadUserProfileFromShard(shard: Neo4jShard, userId: string): Promise<UserProfile | null> {
  const session = openSession(shard);

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[:LIKES]->(person:FamousPerson)
      WITH u, collect(DISTINCT person.name) AS famousPersons
      OPTIONAL MATCH (u)-[:INTERESTED_IN]->(interest:Interest)
      WITH u, famousPersons, collect(DISTINCT interest.name) AS interests
      OPTIONAL MATCH (u)-[:ATTENDED]->(event:Event)
      WITH u, famousPersons, interests, collect(DISTINCT event.name) AS events
      OPTIONAL MATCH (u)-[:VISITED]->(place:Place)
      RETURN u.id AS id,
             u.email AS email,
             coalesce(u.role, "user") AS role,
             u.name AS name,
             u.bio AS bio,
             u.age AS age,
             u.location AS location,
             u.gender AS gender,
             u.prefGender AS prefGender,
             u.occupation AS occupation,
             u.education AS education,
             coalesce(u.shardId, $fallbackShardId) AS shardId,
             famousPersons,
             interests,
             events,
             collect(DISTINCT place.name) AS places
      `,
      { userId, fallbackShardId: shard.id }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];

    return {
      user: mapUser(record),
      famousPersons: (record.get("famousPersons") as string[]) || [],
      interests: (record.get("interests") as string[]) || [],
      events: (record.get("events") as string[]) || [],
      places: (record.get("places") as string[]) || [],
      shardId: shard.id
    };
  } finally {
    await session.close();
  }
}

export async function getUserProfile(userId: string, preferredShardId?: string | null): Promise<UserProfile> {
  const shard = await findUserShardById(userId, preferredShardId);

  if (!shard) {
    throw new AppError("User not found", 404);
  }

  const profile = await loadUserProfileFromShard(shard, userId);

  if (!profile) {
    throw new AppError("User not found", 404);
  }

  return profile;
}

export async function getUserAuthRecordByEmail(email: string): Promise<AuthUserRecord | null> {
  for (const shard of shards) {
    const session = openSession(shard);

    try {
      const result = await session.run(
        `
        MATCH (u:User {email: $email})
        RETURN u.id AS id,
               u.email AS email,
               coalesce(u.role, "user") AS role,
               u.name AS name,
               u.passwordHash AS passwordHash,
               u.bio AS bio,
               u.age AS age,
               u.location AS location,
               u.gender AS gender,
               u.prefGender AS prefGender,
               u.occupation AS occupation,
               u.education AS education,
               coalesce(u.shardId, $fallbackShardId) AS shardId
        LIMIT 1
        `,
        { email, fallbackShardId: shard.id }
      );

      if (result.records.length === 0) {
        continue;
      }

      const record = result.records[0];

      return {
        ...mapUser(record),
        passwordHash: record.get("passwordHash") as string,
        shardId: (record.get("shardId") as string | null) || shard.id
      };
    } finally {
      await session.close();
    }
  }

  return null;
}
