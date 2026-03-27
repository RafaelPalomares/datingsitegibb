import { Router } from "express";
import { z } from "zod";
import { findUserShardById, openSession, shards } from "../config/neo4j";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const entitySchema = z.object({
  name: z.string().min(1).max(120)
});

const updateEntitySchema = z.object({
  currentName: z.string().min(1).max(120),
  newName: z.string().min(1).max(120)
});

type EntityConfig = {
  label: "FamousPerson" | "Place" | "Event" | "Interest";
  relation: "LIKES" | "VISITED" | "ATTENDED" | "INTERESTED_IN";
};

const SEARCH_INDEX_BY_TYPE: Record<EntityConfig["label"], string> = {
  FamousPerson: "famous_person_name_index",
  Place: "place_name_index",
  Event: "event_name_index",
  Interest: "interest_name_index"
};

async function attachEntity(
  userId: string,
  preferredShardId: string | undefined,
  name: string,
  config: EntityConfig
): Promise<{ name: string; label: string; relation: string }> {
  const cleanName = name.trim();
  const key = cleanName.toLowerCase();
  const shard = await findUserShardById(userId, preferredShardId);

  if (!shard) {
    throw new AppError("User not found", 404);
  }

  const session = openSession(shard);

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})
      MERGE (e:${config.label} {key: $key})
      ON CREATE SET e.name = $name
      MERGE (u)-[:${config.relation}]->(e)
      RETURN e.name AS name
      `,
      {
        userId,
        key,
        name: cleanName
      }
    );

    if (result.records.length === 0) {
      throw new AppError("User not found", 404);
    }

    return {
      name: result.records[0].get("name"),
      label: config.label,
      relation: config.relation
    };
  } finally {
    await session.close();
  }
}

async function detachEntity(
  userId: string,
  preferredShardId: string | undefined,
  name: string,
  config: EntityConfig
): Promise<{ name: string; label: string; relation: string }> {
  const cleanName = name.trim();
  const key = cleanName.toLowerCase();
  const shard = await findUserShardById(userId, preferredShardId);

  if (!shard) {
    throw new AppError("Relation not found", 404);
  }

  const session = openSession(shard);

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[r:${config.relation}]->(e:${config.label} {key: $key})
      WITH e.name AS name, e, r
      DELETE r
      WITH name, e, COUNT { (e)<-[]-() } AS remainingConnections
      FOREACH (_ IN CASE WHEN remainingConnections = 0 THEN [1] ELSE [] END | DELETE e)
      RETURN name
      `,
      {
        userId,
        key
      }
    );

    if (result.records.length === 0) {
      throw new AppError("Relation not found", 404);
    }

    return {
      name: result.records[0].get("name"),
      label: config.label,
      relation: config.relation
    };
  } finally {
    await session.close();
  }
}

async function updateEntity(
  userId: string,
  preferredShardId: string | undefined,
  currentName: string,
  newName: string,
  config: EntityConfig
): Promise<{ previousName: string; name: string; label: string; relation: string }> {
  const cleanCurrentName = currentName.trim();
  const cleanNewName = newName.trim();
  const currentKey = cleanCurrentName.toLowerCase();
  const nextKey = cleanNewName.toLowerCase();
  const shard = await findUserShardById(userId, preferredShardId);

  if (!shard) {
    throw new AppError("Relation not found", 404);
  }

  const session = openSession(shard);

  try {
    if (currentKey === nextKey) {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})-[:${config.relation}]->(e:${config.label} {key: $currentKey})
        SET e.name = $newName
        RETURN e.name AS name
        `,
        {
          userId,
          currentKey,
          newName: cleanNewName
        }
      );

      if (result.records.length === 0) {
        throw new AppError("Relation not found", 404);
      }

      return {
        previousName: cleanCurrentName,
        name: result.records[0].get("name"),
        label: config.label,
        relation: config.relation
      };
    }

    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[r:${config.relation}]->(old:${config.label} {key: $currentKey})
      MERGE (replacement:${config.label} {key: $nextKey})
      ON CREATE SET replacement.name = $newName
      MERGE (u)-[:${config.relation}]->(replacement)
      DELETE r
      WITH old, replacement, COUNT { (old)<-[]-() } AS remainingConnections
      FOREACH (_ IN CASE WHEN remainingConnections = 0 THEN [1] ELSE [] END | DELETE old)
      RETURN replacement.name AS name
      `,
      {
        userId,
        currentKey,
        nextKey,
        newName: cleanNewName
      }
    );

    if (result.records.length === 0) {
      throw new AppError("Relation not found", 404);
    }

    return {
      previousName: cleanCurrentName,
      name: result.records[0].get("name"),
      label: config.label,
      relation: config.relation
    };
  } finally {
    await session.close();
  }
}

router.use(authenticate);

router.post(
  "/like-person",
  asyncHandler(async (req, res) => {
    const { name } = entitySchema.parse(req.body);
    const entity = await attachEntity(req.user!.id, req.user?.shard, name, {
      label: "FamousPerson",
      relation: "LIKES"
    });

    res.status(201).json({ message: "Famous person linked to user", entity });
  })
);

router.delete(
  "/like-person",
  asyncHandler(async (req, res) => {
    const { name } = entitySchema.parse(req.body);
    const entity = await detachEntity(req.user!.id, req.user?.shard, name, {
      label: "FamousPerson",
      relation: "LIKES"
    });

    res.json({ message: "Famous person removed from user", entity });
  })
);

router.put(
  "/like-person",
  asyncHandler(async (req, res) => {
    const { currentName, newName } = updateEntitySchema.parse(req.body);
    const entity = await updateEntity(req.user!.id, req.user?.shard, currentName, newName, {
      label: "FamousPerson",
      relation: "LIKES"
    });

    res.json({ message: "Famous person updated", entity });
  })
);

router.post(
  "/visit-place",
  asyncHandler(async (req, res) => {
    const { name } = entitySchema.parse(req.body);
    const entity = await attachEntity(req.user!.id, req.user?.shard, name, {
      label: "Place",
      relation: "VISITED"
    });

    res.status(201).json({ message: "Place linked to user", entity });
  })
);

router.delete(
  "/visit-place",
  asyncHandler(async (req, res) => {
    const { name } = entitySchema.parse(req.body);
    const entity = await detachEntity(req.user!.id, req.user?.shard, name, {
      label: "Place",
      relation: "VISITED"
    });

    res.json({ message: "Place removed from user", entity });
  })
);

router.put(
  "/visit-place",
  asyncHandler(async (req, res) => {
    const { currentName, newName } = updateEntitySchema.parse(req.body);
    const entity = await updateEntity(req.user!.id, req.user?.shard, currentName, newName, {
      label: "Place",
      relation: "VISITED"
    });

    res.json({ message: "Place updated", entity });
  })
);

router.post(
  "/attend-event",
  asyncHandler(async (req, res) => {
    const { name } = entitySchema.parse(req.body);
    const entity = await attachEntity(req.user!.id, req.user?.shard, name, {
      label: "Event",
      relation: "ATTENDED"
    });

    res.status(201).json({ message: "Event linked to user", entity });
  })
);

router.delete(
  "/attend-event",
  asyncHandler(async (req, res) => {
    const { name } = entitySchema.parse(req.body);
    const entity = await detachEntity(req.user!.id, req.user?.shard, name, {
      label: "Event",
      relation: "ATTENDED"
    });

    res.json({ message: "Event removed from user", entity });
  })
);

router.put(
  "/attend-event",
  asyncHandler(async (req, res) => {
    const { currentName, newName } = updateEntitySchema.parse(req.body);
    const entity = await updateEntity(req.user!.id, req.user?.shard, currentName, newName, {
      label: "Event",
      relation: "ATTENDED"
    });

    res.json({ message: "Event updated", entity });
  })
);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const query = z.string().min(1).parse(req.query.q);
    const type = z.enum(["FamousPerson", "Place", "Event", "Interest"]).parse(req.query.type);
    const searchTerms = query
      .trim()
      .split(/\s+/)
      .map((term) => term.replace(/[^a-zA-Z0-9-]/g, ""))
      .filter(Boolean);

    if (searchTerms.length === 0) {
      res.json({ suggestions: [] });
      return;
    }

    const rawSuggestions = await Promise.all(
      shards.map(async (shard) => {
        const session = openSession(shard);

        try {
          const result = await session.run(
            `
            CALL db.index.fulltext.queryNodes($indexName, $searchQuery) YIELD node, score
            RETURN node.name AS name, score
            ORDER BY score DESC, name ASC
            LIMIT 10
            `,
            {
              indexName: SEARCH_INDEX_BY_TYPE[type],
              searchQuery: searchTerms.map((term) => `${term}*`).join(" AND ")
            }
          );

          return result.records.map((record) => ({
            name: record.get("name") as string,
            score: record.get("score") as number
          }));
        } finally {
          await session.close();
        }
      })
    );

    const suggestions = Array.from(
      new Map(
        rawSuggestions
          .flat()
          .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
          .map((entry) => [entry.name.toLowerCase(), entry.name] as const)
      ).values()
    ).slice(0, 10);

    res.json({ suggestions });
  })
);

router.put(
  "/add-interest",
  asyncHandler(async (req, res) => {
    const { currentName, newName } = updateEntitySchema.parse(req.body);
    const entity = await updateEntity(req.user!.id, req.user?.shard, currentName, newName, {
      label: "Interest",
      relation: "INTERESTED_IN"
    });

    res.json({ message: "Interest updated", entity });
  })
);

router.post(
  "/add-interest",
  asyncHandler(async (req, res) => {
    const { name } = entitySchema.parse(req.body);
    const entity = await attachEntity(req.user!.id, req.user?.shard, name, {
      label: "Interest",
      relation: "INTERESTED_IN"
    });

    res.status(201).json({ message: "Interest linked to user", entity });
  })
);

router.delete(
  "/add-interest",
  asyncHandler(async (req, res) => {
    const { name } = entitySchema.parse(req.body);
    const entity = await detachEntity(req.user!.id, req.user?.shard, name, {
      label: "Interest",
      relation: "INTERESTED_IN"
    });

    res.json({ message: "Interest removed from user", entity });
  })
);

export default router;
