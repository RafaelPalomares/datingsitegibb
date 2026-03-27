import fs from "fs/promises";
import path from "path";
import { Router } from "express";
import { openSession, shards } from "../config/neo4j";
import { requireAdmin } from "../middleware/admin";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(authenticate, requireAdmin);

router.get(
  "/admin/overview",
  asyncHandler(async (_req, res) => {
    const shardResults = await Promise.all(
      shards.map(async (shard) => {
        const session = openSession(shard);

        try {
          const summaryResult = await session.run(
            `
            CALL {
              MATCH (u:User)
              RETURN count(u) AS totalUsers,
                     coalesce(sum(CASE WHEN coalesce(u.role, "user") = "admin" THEN 1 ELSE 0 END), 0) AS adminUsers
            }
            CALL {
              MATCH (p:FamousPerson)
              RETURN count(p) AS famousPersons
            }
            CALL {
              MATCH (i:Interest)
              RETURN count(i) AS interests
            }
            CALL {
              MATCH (e:Event)
              RETURN count(e) AS events
            }
            CALL {
              MATCH (pl:Place)
              RETURN count(pl) AS places
            }
            CALL {
              MATCH ()-[r]->()
              RETURN count(r) AS relationships
            }
            RETURN totalUsers, adminUsers, famousPersons, interests, events, places, relationships
            `
          );
          const topPeopleResult = await session.run(
            `
            MATCH (:User)-[r:LIKES]->(p:FamousPerson)
            RETURN p.name AS name, count(r) AS total
            ORDER BY total DESC, name ASC
            LIMIT 5
            `
          );
          const topInterestsResult = await session.run(
            `
            MATCH (:User)-[r:INTERESTED_IN]->(i:Interest)
            RETURN i.name AS name, count(r) AS total
            ORDER BY total DESC, name ASC
            LIMIT 5
            `
          );
          const recentUsersResult = await session.run(
            `
            MATCH (u:User)
            RETURN u.id AS id,
                   u.name AS name,
                   u.email AS email,
                   coalesce(u.role, "user") AS role,
                   u.location AS location,
                   coalesce(u.seeded, false) AS seeded,
                   coalesce(u.shardId, $fallbackShardId) AS shardId,
                   toString(coalesce(u.updatedAt, u.createdAt)) AS updatedAt
            ORDER BY coalesce(u.updatedAt, u.createdAt) DESC
            LIMIT 12
            `,
            { fallbackShardId: shard.id }
          );

          const summary = summaryResult.records[0];

          return {
            shardId: shard.id,
            summary: {
              totalUsers: summary.get("totalUsers") as number,
              adminUsers: summary.get("adminUsers") as number,
              famousPersons: summary.get("famousPersons") as number,
              interests: summary.get("interests") as number,
              events: summary.get("events") as number,
              places: summary.get("places") as number,
              relationships: summary.get("relationships") as number
            },
            topFamousPersons: topPeopleResult.records.map((record) => ({
              name: record.get("name") as string,
              total: record.get("total") as number
            })),
            topInterests: topInterestsResult.records.map((record) => ({
              name: record.get("name") as string,
              total: record.get("total") as number
            })),
            recentUsers: recentUsersResult.records.map((record) => ({
              id: record.get("id") as string,
              name: record.get("name") as string | null,
              email: record.get("email") as string,
              role: record.get("role") as "admin" | "user",
              location: record.get("location") as string | null,
              seeded: record.get("seeded") as boolean,
              shardId: record.get("shardId") as string,
              updatedAt: record.get("updatedAt") as string
            }))
          };
        } finally {
          await session.close();
        }
      })
    );

    const totals = shardResults.reduce(
      (accumulator, shardResult) => ({
        totalUsers: accumulator.totalUsers + shardResult.summary.totalUsers,
        adminUsers: accumulator.adminUsers + shardResult.summary.adminUsers,
        famousPersons: accumulator.famousPersons + shardResult.summary.famousPersons,
        interests: accumulator.interests + shardResult.summary.interests,
        events: accumulator.events + shardResult.summary.events,
        places: accumulator.places + shardResult.summary.places,
        relationships: accumulator.relationships + shardResult.summary.relationships
      }),
      {
        totalUsers: 0,
        adminUsers: 0,
        famousPersons: 0,
        interests: 0,
        events: 0,
        places: 0,
        relationships: 0
      }
    );

    const mergeCounts = (entries: Array<Array<{ name: string; total: number }>>): Array<{ name: string; total: number }> =>
      Array.from(
        entries
          .flat()
          .reduce((map, entry) => map.set(entry.name, (map.get(entry.name) || 0) + entry.total), new Map<string, number>())
      )
        .map(([name, total]) => ({ name, total }))
        .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name))
        .slice(0, 5);

    res.json({
      summary: {
        totalUsers: totals.totalUsers,
        adminUsers: totals.adminUsers,
        regularUsers: totals.totalUsers - totals.adminUsers,
        famousPersons: totals.famousPersons,
        interests: totals.interests,
        events: totals.events,
        places: totals.places,
        relationships: totals.relationships
      },
      shards: shardResults.map((result) => ({
        shardId: result.shardId,
        users: result.summary.totalUsers,
        relationships: result.summary.relationships,
        famousPersons: result.summary.famousPersons,
        interests: result.summary.interests,
        events: result.summary.events,
        places: result.summary.places
      })),
      topFamousPersons: mergeCounts(shardResults.map((result) => result.topFamousPersons)),
      topInterests: mergeCounts(shardResults.map((result) => result.topInterests)),
      recentUsers: shardResults
        .flatMap((result) => result.recentUsers)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 12)
    });
  })
);

router.get(
  "/admin/backups",
  asyncHandler(async (_req, res) => {
    const backupDir = path.join(process.cwd(), "backup");

    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = await Promise.all(
        files
          .filter((file) => file.endsWith(".dump"))
          .map(async (file) => {
            const stats = await fs.stat(path.join(backupDir, file));

            return {
              name: file,
              size: stats.size,
              createdAt: stats.birthtime.toISOString() || stats.mtime.toISOString()
            };
          })
      );

      res.json({
        backups: backupFiles.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      });
    } catch (err) {
      // If directory doesn't exist, return empty
      res.json({ backups: [] });
    }
  })
);

export default router;
