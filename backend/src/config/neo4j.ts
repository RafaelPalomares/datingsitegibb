import neo4j, { Driver, Session } from "neo4j-driver";
import { env } from "./env";

export type Neo4jShard = {
  id: string;
  index: number;
  uri: string;
  driver: Driver;
};

function buildHash(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export const shards: Neo4jShard[] = env.neo4jUris.map((uri, index) => ({
  id: `neo4j-node-${index + 1}`,
  index,
  uri,
  driver: neo4j.driver(uri, neo4j.auth.basic(env.neo4jUser, env.neo4jPassword), {
    disableLosslessIntegers: true
  })
}));

export function getPrimaryShard(): Neo4jShard {
  return shards[0];
}

export function getShardCount(): number {
  return shards.length;
}

export function getShardById(shardId?: string | null): Neo4jShard | undefined {
  if (!shardId) {
    return undefined;
  }

  return shards.find((shard) => shard.id === shardId);
}

export function getShardForValue(value: string): Neo4jShard {
  return shards[buildHash(value) % shards.length];
}

export function openSession(shard: Neo4jShard): Session {
  return shard.driver.session();
}

async function userExistsOnShard(shard: Neo4jShard, property: "id" | "email", value: string): Promise<boolean> {
  const session = openSession(shard);

  try {
    const result = await session.run(`MATCH (u:User {${property}: $value}) RETURN u.id AS id LIMIT 1`, { value });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
}

export async function findUserShardById(userId: string, preferredShardId?: string | null): Promise<Neo4jShard | null> {
  const preferredShard = getShardById(preferredShardId);
  const candidates = preferredShard
    ? [preferredShard, ...shards.filter((shard) => shard.id !== preferredShard.id)]
    : shards;

  for (const shard of candidates) {
    if (await userExistsOnShard(shard, "id", userId)) {
      return shard;
    }
  }

  return null;
}

export async function findUserShardByEmail(email: string): Promise<Neo4jShard | null> {
  for (const shard of shards) {
    if (await userExistsOnShard(shard, "email", email)) {
      return shard;
    }
  }

  return null;
}

export async function verifyNeo4jConnection(): Promise<void> {
  await Promise.all(shards.map(async (shard) => shard.driver.verifyConnectivity()));
}

export async function closeNeo4j(): Promise<void> {
  await Promise.all(shards.map(async (shard) => shard.driver.close()));
}
