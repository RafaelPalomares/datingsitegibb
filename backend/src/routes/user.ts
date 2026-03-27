import { Router } from "express";
import { z } from "zod";
import { findUserShardById, openSession } from "../config/neo4j";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { getUserProfile } from "../services/users";

const router = Router();

const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    bio: z.string().max(300).optional(),
    age: z.number().int().min(18).max(120).nullable().optional(),
    location: z.string().max(120).optional(),
    gender: z.enum(["Male", "Female", "Non-binary", "Other"]).nullable().optional(),
    prefGender: z.enum(["Male", "Female", "Non-binary", "Other", "Any"]).nullable().optional(),
    occupation: z.string().max(100).optional(),
    education: z.string().max(100).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update"
  });

router.use(authenticate);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const profile = await getUserProfile(req.user!.id, req.user?.shard);

    res.json({
      user: profile.user,
      famousPersons: profile.famousPersons,
      interests: profile.interests,
      events: profile.events,
      places: profile.places
    });
  })
);

router.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const payload = updateProfileSchema.parse(req.body);
    const hasField = (field: keyof typeof payload): boolean => Object.prototype.hasOwnProperty.call(payload, field);
    const shard = await findUserShardById(req.user!.id, req.user?.shard);

    if (!shard) {
      throw new AppError("User not found", 404);
    }

    const session = openSession(shard);

    try {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})
        SET u.name = CASE WHEN $hasName THEN $name ELSE u.name END,
            u.bio = CASE WHEN $hasBio THEN $bio ELSE u.bio END,
            u.age = CASE WHEN $hasAge THEN $age ELSE u.age END,
            u.location = CASE WHEN $hasLocation THEN $location ELSE u.location END,
            u.gender = CASE WHEN $hasGender THEN $gender ELSE u.gender END,
            u.prefGender = CASE WHEN $hasPrefGender THEN $prefGender ELSE u.prefGender END,
            u.occupation = CASE WHEN $hasOccupation THEN $occupation ELSE u.occupation END,
            u.education = CASE WHEN $hasEducation THEN $education ELSE u.education END,
            u.updatedAt = datetime()
        RETURN u { .id, .email, .role, .name, .bio, .age, .location, .gender, .prefGender, .occupation, .education, .shardId } AS user
        `,
        {
          userId: req.user?.id,
          name: payload.name ?? null,
          bio: payload.bio ?? null,
          age: payload.age ?? null,
          location: payload.location ?? null,
          gender: payload.gender ?? null,
          prefGender: payload.prefGender ?? null,
          occupation: payload.occupation ?? null,
          education: payload.education ?? null,
          hasName: hasField("name"),
          hasBio: hasField("bio"),
          hasAge: hasField("age"),
          hasLocation: hasField("location"),
          hasGender: hasField("gender"),
          hasPrefGender: hasField("prefGender"),
          hasOccupation: hasField("occupation"),
          hasEducation: hasField("education")
        }
      );

      if (result.records.length === 0) {
        throw new AppError("User not found", 404);
      }

      res.json({ user: result.records[0].get("user") });
    } finally {
      await session.close();
    }
  })
);

router.delete(
  "/me",
  asyncHandler(async (req, res) => {
    const shard = await findUserShardById(req.user!.id, req.user?.shard);

    if (!shard) {
      throw new AppError("User not found", 404);
    }

    const session = openSession(shard);

    try {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})
        WITH u.id AS deletedUserId, u.email AS deletedEmail, u
        DETACH DELETE u
        RETURN deletedUserId, deletedEmail
        `,
        { userId: req.user?.id }
      );

      if (result.records.length === 0) {
        throw new AppError("User not found", 404);
      }

      res.json({
        message: "User account deleted",
        deletedUserId: result.records[0].get("deletedUserId"),
        deletedEmail: result.records[0].get("deletedEmail")
      });
    } finally {
      await session.close();
    }
  })
);

export default router;
