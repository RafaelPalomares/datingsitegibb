import { openSession, shards } from "./neo4j";

export const SCHEMA_QUERIES = [
  "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
  "CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE",
  "CREATE CONSTRAINT famous_person_key_unique IF NOT EXISTS FOR (p:FamousPerson) REQUIRE p.key IS UNIQUE",
  "CREATE CONSTRAINT event_key_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.key IS UNIQUE",
  "CREATE CONSTRAINT place_key_unique IF NOT EXISTS FOR (p:Place) REQUIRE p.key IS UNIQUE",
  "CREATE CONSTRAINT interest_key_unique IF NOT EXISTS FOR (i:Interest) REQUIRE i.key IS UNIQUE",
  "CREATE FULLTEXT INDEX famous_person_name_index IF NOT EXISTS FOR (n:FamousPerson) ON EACH [n.name]",
  "CREATE FULLTEXT INDEX place_name_index IF NOT EXISTS FOR (n:Place) ON EACH [n.name]",
  "CREATE FULLTEXT INDEX event_name_index IF NOT EXISTS FOR (n:Event) ON EACH [n.name]",
  "CREATE FULLTEXT INDEX interest_name_index IF NOT EXISTS FOR (n:Interest) ON EACH [n.name]"
];

export async function ensureNeo4jSchema(): Promise<void> {
  for (const shard of shards) {
    const session = openSession(shard);

    try {
      for (const query of SCHEMA_QUERIES) {
        await session.run(query);
      }
    } finally {
      await session.close();
    }
  }
}
