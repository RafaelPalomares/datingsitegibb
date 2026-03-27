# Deployment Guide for Muduo

This guide explains how to deploy the Muduo full-stack application to production.

## 1. Database: Neo4j Aura (Recommended)

Since the local sharding setup is for demo purposes, use [Neo4j Aura](https://neo4j.com/cloud/aura/) for a managed production database.

1. Create a free instance on Neo4j Aura.
2. Save the `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD`.

## 2. Backend

The Express backend can be deployed to any Node.js hosting service (e.g., Railway, fly.io, or your own VPS).

1. Set the "Root Directory" to `backend`.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Add Environment Variables:
   - `JWT_SECRET`: A long random string.
   - `NEO4J_URIS`: Your Neo4j Aura Bolt URI (e.g., `bolt://xxx.nodes.aura.neo4j.io:7687`).
   - `NEO4J_USER`: `neo4j`
   - `NEO4J_PASSWORD`: Your Aura password.
   - `FRONTEND_URL`: Your Netlify URL (after deploying frontend).

## 3. Frontend: Netlify

The frontend is a Next.js app and can be deployed easily.

1. Create a new site on [Netlify](https://www.netlify.com/).
2. Connect your repository.
3. Netlify will automatically detect the `netlify.toml` in the root:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL.

---

## Environment Variables Summary

| Variable | Location | Description |
| :--- | :--- | :--- |
| `JWT_SECRET` | Backend | Used for token signing. |
| `NEO4J_URIS` | Backend | Connection string for Neo4j. |
| `NEO4J_USER` | Backend | Database user. |
| `NEO4J_PASSWORD` | Backend | Database password. |
| `FRONTEND_URL` | Backend | Used for CORS. |
| `NEXT_PUBLIC_API_URL` | Frontend | URL of the Express API. |
