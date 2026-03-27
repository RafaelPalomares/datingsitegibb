import { closeNeo4j } from "./backend/src/config/neo4j";
import { seedDemoUsers } from "./backend/src/seed/demoUsers";

async function main(): Promise<void> {
  try {
    await seedDemoUsers();
    console.log("muduo seed completed.");
  } catch (error) {
    console.error("muduo seed failed:", error);
    process.exitCode = 1;
  } finally {
    await closeNeo4j();
  }
}

void main();
