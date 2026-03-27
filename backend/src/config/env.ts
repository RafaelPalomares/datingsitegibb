import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envPath = fs.existsSync(path.resolve(process.cwd(), ".env"))
  ? path.resolve(process.cwd(), ".env")
  : path.resolve(process.cwd(), "../.env");

dotenv.config({ path: envPath });

const required = ["JWT_SECRET", "NEO4J_USER", "NEO4J_PASSWORD"] as const;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const rawNeo4jUris = process.env.NEO4J_URIS || process.env.NEO4J_URI;

if (!rawNeo4jUris) {
  throw new Error("Missing required environment variable: NEO4J_URI or NEO4J_URIS");
}

const neo4jUris = rawNeo4jUris
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (neo4jUris.length === 0) {
  throw new Error("At least one Neo4j URI must be configured");
}

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET as string,
  neo4jUri: neo4jUris[0],
  neo4jUris,
  neo4jUser: process.env.NEO4J_USER as string,
  neo4jPassword: process.env.NEO4J_PASSWORD as string,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3010",
  seedDemoUsers: parseBoolean(process.env.SEED_DEMO_USERS, false),
  demoUsersCount: parsePositiveInteger(process.env.DEMO_USERS_COUNT, 1200),
  demoUserPassword: process.env.DEMO_USER_PASSWORD || "muduo-demo-password",
  adminUserPassword: process.env.ADMIN_USER_PASSWORD || "muduo-admin-password"
};
