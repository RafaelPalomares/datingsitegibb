# Deployment Guide for Muduo

This guide explains how to deploy the Muduo full-stack application to production.

## 1. Database: Neo4j Aura (Recommended)

Since the local sharding setup is for demo purposes, use [Neo4j Aura](https://neo4j.com/cloud/aura/) for a managed production database.

1. Create a free instance on Neo4j Aura.
2. Save the `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD`.

## 2. Backend: Render (Recommeded)

The Express backend can be deployed to any Node.js hosting service, but Render is easy to set up.

> [!IMPORTANT]
> Render will fail to start and throw `Missing required environment variable: JWT_SECRET` if you don't add these variables in the Render Dashboard!

### Steps for [Render](https://render.com/):
1. Create a "Web Service".
2. Connect your repository.
3. Set the "Root Directory" to `backend`.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add **Environment Variables** (under the "Environment" tab):
   - `JWT_SECRET`: A long random string (e.g., `muduo-production-secret-123`).
   - `NEO4J_URIS`: Your Neo4j Aura Bolt URI (e.g., `bolt://xxx.nodes.aura.neo4j.io:7687`).
   - `NEO4J_USER`: `neo4j`
   - `NEO4J_PASSWORD`: Your Aura password.
   - `FRONTEND_URL`: Your Netlify URL (e.g., `https://muduo.netlify.app`).
   - `PORT`: `4000` (Render will use this automatically).

## 3. Frontend: Netlify

The frontend is a Next.js app and can be deployed easily.

1. Create a new site on [Netlify](https://www.netlify.com/).
2. Connect your repository.
3. Netlify will automatically detect the `netlify.toml` in the root (set `base` to `frontend`).
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL (e.g., `https://muduo-backend.onrender.com`).

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
