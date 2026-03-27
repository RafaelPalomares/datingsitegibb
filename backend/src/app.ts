import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { shards } from "./config/neo4j";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import graphRoutes from "./routes/graph";
import matchRoutes from "./routes/match";
import userRoutes from "./routes/user";

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true
  })
);
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    neo4jNodes: shards.map((shard) => ({
      id: shard.id,
      uri: shard.uri
    }))
  });
});

app.use(authRoutes);
app.use(userRoutes);
app.use(graphRoutes);
app.use(matchRoutes);
app.use(adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
