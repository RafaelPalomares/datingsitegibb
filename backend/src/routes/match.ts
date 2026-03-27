import { Router } from "express";
import { findUserShardById, openSession, shards } from "../config/neo4j";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { MATCHES_QUERY, MATCH_EXPLANATION_QUERY } from "../queries/matchQueries";
import { getUserProfile } from "../services/users";

const router = Router();

router.use(authenticate);

function formatList(items: string[], max = 2): string {
  const picked = items.slice(0, max);

  if (picked.length === 1) {
    return picked[0];
  }

  if (picked.length === 2) {
    return `${picked[0]} and ${picked[1]}`;
  }

  return `${picked.slice(0, -1).join(", ")}, and ${picked[picked.length - 1]}`;
}

function buildExplanation(record: {
  commonFamousPersons: string[];
  commonInterests: string[];
  commonEvents: string[];
  commonPlaces: string[];
}): string {
  const segments: string[] = [];

  if (record.commonFamousPersons.length > 0) {
    segments.push(`like ${formatList(record.commonFamousPersons)}`);
  }

  if (record.commonEvents.length > 0) {
    segments.push(`attended ${formatList(record.commonEvents)}`);
  }

  if (record.commonPlaces.length > 0) {
    segments.push(`visited ${formatList(record.commonPlaces)}`);
  }

  if (record.commonInterests.length > 0) {
    segments.push(`are interested in ${formatList(record.commonInterests)}`);
  }

  if (segments.length === 0) {
    return "No shared context yet. Add more famous persons, places, events, and interests to improve matching.";
  }

  if (segments.length === 1) {
    return `You both ${segments[0]}.`;
  }

  return `You both ${segments[0]} and ${segments[1]}.`;
}

router.get(
  "/matches",
  asyncHandler(async (req, res) => {
    const profile = await getUserProfile(req.user!.id, req.user?.shard);
    const results = await Promise.all(
      shards.map(async (shard) => {
        const session = openSession(shard);

        try {
          const result = await session.run(MATCHES_QUERY, {
            userId: req.user?.id,
            famousPersons: profile.famousPersons,
            interests: profile.interests,
            events: profile.events,
            places: profile.places
          });

          return result.records.map((record) => {
            const commonFamousPersons = (record.get("commonFamousPersons") as string[]) || [];
            const commonInterests = (record.get("commonInterests") as string[]) || [];
            const commonEvents = (record.get("commonEvents") as string[]) || [];
            const commonPlaces = (record.get("commonPlaces") as string[]) || [];
            const user = record.get("user") as Record<string, unknown>;

            return {
              user: {
                ...user,
                shardId: (user.shardId as string | undefined) || shard.id
              },
              score: Number(record.get("score")),
              commonFamousPersons,
              commonInterests,
              commonEvents,
              commonPlaces
            };
          });
        } finally {
          await session.close();
        }
      })
    );

    const matches = results
      .flat()
      .sort((left, right) => right.score - left.score || String((left.user as any).name).localeCompare(String((right.user as any).name)))
      .map((match) => ({
        ...match,
        explanation: buildExplanation(match)
      }));

    res.json({ matches });
  })
);

router.get(
  "/match/:id/explanation",
  asyncHandler(async (req, res) => {
    console.log(`Loading match explanation for ${req.params.id} from user ${req.user?.id}`);
    const profile = await getUserProfile(req.user!.id, req.user?.shard);
    const shard = await findUserShardById(req.params.id);

    if (!shard) {
      console.warn(`Shard not found for candidate ${req.params.id}`);
      throw new AppError("Match candidate not found", 404);
    }

    const session = openSession(shard);

    try {
      const result = await session.run(MATCH_EXPLANATION_QUERY, {
        candidateId: req.params.id,
        famousPersons: profile.famousPersons,
        interests: profile.interests,
        events: profile.events,
        places: profile.places
      });

      if (result.records.length === 0) {
        console.warn(`No match explanation record found for candidate ${req.params.id} on shard ${shard.id}`);
        throw new AppError("Match candidate not found", 404);
      }

      const record = result.records[0];
      const user = record.get("user") as Record<string, unknown>;
      const shared = {
        commonFamousPersons: (record.get("commonFamousPersons") as string[]) || [],
        commonInterests: (record.get("commonInterests") as string[]) || [],
        commonEvents: (record.get("commonEvents") as string[]) || [],
        commonPlaces: (record.get("commonPlaces") as string[]) || []
      };

      const score = record.get("score");
      console.log(`Match score calculated: ${score} (type: ${typeof score})`);

      res.json({
        user: {
          ...user,
          shardId: (user.shardId as string | undefined) || shard.id
        },
        score: Number(score),
        explanation: buildExplanation(shared),
        shared
      });
    } catch (err) {
      console.error("Error loading match explanation:", err);
      throw err;
    } finally {
      await session.close();
    }
  })
);

export default router;
