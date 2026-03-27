import neo4j from "neo4j-driver";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const AURA_URI = process.env.NEO4J_URIS || process.env.NEO4J_URI;
const LOCAL_URI = "bolt://localhost:7687";
const USER = process.env.NEO4J_USER || "neo4j";
const PASSWORD = process.env.NEO4J_PASSWORD;

async function migrate() {
  if (!AURA_URI || !PASSWORD) {
    throw new Error("Missing AURA_URI or NEO4J_PASSWORD in .env");
  }

  const localDriver = neo4j.driver(LOCAL_URI, neo4j.auth.basic(USER, "muduo_password"));
  const auraDriver = neo4j.driver(AURA_URI as string, neo4j.auth.basic(USER, PASSWORD as string));

  const localSession = localDriver.session();
  const auraSession = auraDriver.session();

  try {
    console.log("Fetching nodes from local...");
    const nodesResult = await localSession.run("MATCH (n) RETURN n, labels(n) as labels");
    
    for (const record of nodesResult.records) {
      const node = record.get("n");
      const labels = record.get("labels").join(":");
      const properties = node.properties;
      
      // Use id as the merge key if it exists, otherwise use all properties
      const id = properties.id;
      if (id) {
          console.log(`Migrating node ${labels} with id ${id}`);
          await auraSession.run(
            `MERGE (n:${labels} {id: $id}) SET n += $props`,
            { id, props: properties }
          );
      } else {
          // Fallback for non-user nodes (Interests, Events, etc. usually have 'key' or 'name')
          const mergeKey = properties.key || properties.name;
          const mergeProp = properties.key ? "key" : "name";
          if (mergeKey) {
              await auraSession.run(
                `MERGE (n:${labels} {${mergeProp}: $key}) SET n += $props`,
                { key: mergeKey, props: properties }
              );
          }
      }
    }

    console.log("Fetching relationships from local...");
    const relsResult = await localSession.run(`
      MATCH (a)-[r]->(b) 
      RETURN labels(a) as aLabels, a.id as aId, a.key as aKey, a.name as aName,
             type(r) as type, r as r,
             labels(b) as bLabels, b.id as bId, b.key as bKey, b.name as bName
    `);

    for (const record of relsResult.records) {
      const aLabels = record.get("aLabels").join(":");
      const bLabels = record.get("bLabels").join(":");
      const aId = record.get("aId") || record.get("aKey") || record.get("aName");
      const aProp = record.get("aId") ? "id" : (record.get("aKey") ? "key" : "name");
      const bId = record.get("bId") || record.get("bKey") || record.get("bName");
      const bProp = record.get("bId") ? "id" : (record.get("bKey") ? "key" : "name");
      const type = record.get("type");
      const props = record.get("r").properties;

      console.log(`Migrating relationship ${type} between ${aId} and ${bId}`);
      await auraSession.run(`
        MATCH (a:${aLabels} {${aProp}: $aId})
        MATCH (b:${bLabels} {${bProp}: $bId})
        MERGE (a)-[r:${type}]->(b)
        SET r += $props
      `, { aId, bId, props });
    }

    console.log("Migration for current shard finished!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await localSession.close();
    await auraSession.close();
    await localDriver.close();
    await auraDriver.close();
  }
}

migrate();
