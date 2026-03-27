import app from "./app";
import { env } from "./config/env";
import { closeNeo4j, verifyNeo4jConnection } from "./config/neo4j";
import { ensureNeo4jSchema } from "./config/schema";
import { seedDemoUsers } from "./seed/demoUsers";

async function bootstrap(): Promise<void> {
  await verifyNeo4jConnection();
  await ensureNeo4jSchema();
  if (env.seedDemoUsers) {
    await seedDemoUsers();
  }

  app.listen(env.port, () => {
    console.log(`muduo backend listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await closeNeo4j();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeNeo4j();
  process.exit(0);
});
