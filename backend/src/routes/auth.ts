import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { findUserShardByEmail, getShardForValue, openSession } from "../config/neo4j";
import { asyncHandler } from "../middleware/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { getUserAuthRecordByEmail } from "../services/users";
import { signToken } from "../utils/jwt";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(80),
  bio: z.string().max(300).optional(),
  age: z.number().int().min(18).max(120).optional(),
  location: z.string().max(120).optional(),
  gender: z.enum(["Male", "Female", "Non-binary", "Other"]).optional(),
  prefGender: z.enum(["Male", "Female", "Non-binary", "Other", "Any"]).optional(),
  occupation: z.string().max(100).optional(),
  education: z.string().max(100).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const normalizedEmail = payload.email.toLowerCase();
    const existingShard = await findUserShardByEmail(normalizedEmail);

    if (existingShard) {
      throw new AppError("Email already registered", 409);
    }

    const userId = randomUUID();
    const shard = getShardForValue(userId);
    const session = openSession(shard);

    try {
      const passwordHash = await bcrypt.hash(payload.password, 12);

      const result = await session.run(
        `
        CREATE (u:User {
          id: $id,
          email: $email,
          passwordHash: $passwordHash,
          role: "user",
          shardId: $shardId,
          name: $name,
          bio: $bio,
          age: $age,
          location: $location,
          gender: $gender,
          prefGender: $prefGender,
          occupation: $occupation,
          education: $education,
          createdAt: datetime()
        })
        RETURN u { .id, .email, .role, .name, .bio, .age, .location, .gender, .prefGender, .occupation, .education, .shardId } AS user
        `,
        {
          id: userId,
          email: normalizedEmail,
          passwordHash,
          shardId: shard.id,
          name: payload.name,
          bio: payload.bio ?? "",
          age: payload.age ?? null,
          location: payload.location ?? "",
          gender: payload.gender ?? null,
          prefGender: payload.prefGender ?? null,
          occupation: payload.occupation ?? "",
          education: payload.education ?? ""
        }
      );

      const user = result.records[0].get("user");
      const token = signToken({ id: userId, email: normalizedEmail, role: "user", shard: shard.id });

      res.status(201).json({ token, user });
    } finally {
      await session.close();
    }
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const normalizedEmail = payload.email.toLowerCase();
    const user = await getUserAuthRecordByEmail(normalizedEmail);

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isValidPassword = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      shard: user.shardId
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        bio: user.bio,
        age: user.age,
        location: user.location,
        gender: user.gender,
        prefGender: user.prefGender,
        occupation: user.occupation,
        education: user.education,
        shardId: user.shardId
      }
    });
  })
);

export default router;
