# muduo - Context-Based Dating App

`muduo` is a full-stack dating application that connects people through **shared context** (famous persons, events, places, interests) instead of swipe-only mechanics.

## Stack

- Frontend: Next.js + React + TypeScript + TailwindCSS
- Backend: Node.js + Express + Neo4j + JWT auth
- Database: Neo4j graph database (`neo4j-driver`)
- Infrastructure: Docker, Docker Compose, Kubernetes
- Scaling model: 3 Neo4j shard nodes + stateless frontend/backend replicas

## Project Structure

```text
contextmatch/
├── frontend/                # Next.js app
├── backend/                 # Express API + Neo4j logic
├── infra/
│   └── cypher/              # Query references
├── docker/
│   └── neo4j/               # Neo4j Docker image
├── kubernetes/              # K8s manifests
├── docker-compose.yml
├── .env.example
└── README.md
```

## Core Features

- User registration/login with JWT
- Profile read/update
- Profile delete (`/me`)
- Context graph actions:
  - add famous person (`/like-person`)
  - edit famous person (`PUT /like-person`)
  - remove famous person (`DELETE /like-person`)
  - add place (`/visit-place`)
  - edit place (`PUT /visit-place`)
  - remove place (`DELETE /visit-place`)
  - add event (`/attend-event`)
  - edit event (`PUT /attend-event`)
  - remove event (`DELETE /attend-event`)
  - add interest (`/add-interest`)
  - edit interest (`PUT /add-interest`)
  - remove interest (`DELETE /add-interest`)
- Match recommendations (`/matches`)
- Match explanation (`/match/:id/explanation`)
- Admin-only analytics endpoint (`/admin/overview`)
- Startup demo seeding for local development (`1200` demo users plus 1 admin by default)
- Neo4j schema bootstrap with constraints and fulltext indexes on startup
- Horizontal database scaling with three Neo4j nodes in local Docker Compose and Kubernetes
- Shard-aware matching, search, admin analytics, and profile updates across all Neo4j nodes

Example explanation:

> You both admire Elon Musk and attended Sziget Festival.

## Neo4j Graph Model

### Nodes

- `User`
- `FamousPerson`
- `Event`
- `Place`
- `Interest`

### Relationships

- `(:User)-[:LIKES]->(:FamousPerson)`
- `(:User)-[:ATTENDED]->(:Event)`
- `(:User)-[:VISITED]->(:Place)`
- `(:User)-[:INTERESTED_IN]->(:Interest)`

Cypher query references are in:

- [`infra/cypher/match-queries.cql`](./infra/cypher/match-queries.cql)

## Horizontal Scaling Design

`muduo` uses three Neo4j nodes as horizontal shards:

- `neo4j-node-1`
- `neo4j-node-2`
- `neo4j-node-3`

Users are assigned to a shard deterministically from their user ID. The backend stores the chosen `shardId` on every user node and includes it in the JWT. Writes go to the user shard, while match discovery, search suggestions, and admin analytics aggregate data from all shards.

This gives a real three-node database topology for the live demo without requiring Neo4j Enterprise clustering.

## REST API

### Auth

- `POST /register`
- `POST /login`

### User

- `GET /me`
- `PUT /profile`
- `DELETE /me`

### Graph actions

- `POST /like-person`
- `PUT /like-person`
- `DELETE /like-person`
- `POST /visit-place`
- `PUT /visit-place`
- `DELETE /visit-place`
- `POST /attend-event`
- `PUT /attend-event`
- `DELETE /attend-event`
- `POST /add-interest`
- `PUT /add-interest`
- `DELETE /add-interest`
- `GET /search`

### Matching

- `GET /matches`
- `GET /match/:id/explanation`

### Admin

- `GET /admin/overview`

## Frontend Pages

- `/` landing page
- `/auth` login/register
- `/profile` profile + context management
- `/discover` recommended matches
- `/matches/:id` match details + explanation
- `/admin` admin dashboard for role-protected analytics

## Local Development (Docker Compose)

1. Copy environment values:

```bash
cp .env.example .env
```

2. Start all services:

```bash
docker compose up --build
```

The backend seeds a large demo cohort on every startup in Docker Compose. By default it creates `1200` demo users plus one admin and distributes them across three Neo4j nodes.

It also creates an admin account for the role/permissions demo:

- Email: `admin@muduo.local`
- Password: `muduo-admin-password`

3. Open:

- Frontend: [http://localhost:3010](http://localhost:3010)
- Backend: [http://localhost:4000/health](http://localhost:4000/health)
- Neo4j Browser node 1: [http://localhost:7474](http://localhost:7474)
- Neo4j Browser node 2: [http://localhost:7475](http://localhost:7475)
- Neo4j Browser node 3: [http://localhost:7476](http://localhost:7476)

4. Stop stack:

```bash
docker compose down
```

5. Stop and remove volumes:

```bash
docker compose down -v
```

## Build Containers Manually

From `contextmatch/`:

```bash
docker build -t muduo/frontend:latest ./frontend
docker build -t muduo/backend:latest ./backend
docker build -t muduo/neo4j:latest ./docker/neo4j
```

## Backup and Restore

Create authenticated shard backups from all three local Neo4j containers:

```bash
./scripts/backup-neo4j.sh
```

This creates a timestamped directory such as `./backups/muduo-shards-20260320-101500/` with:

- `muduo-neo4j-1.dump`
- `muduo-neo4j-2.dump`
- `muduo-neo4j-3.dump`

Restore all three shards from such a directory:

```bash
./scripts/restore-neo4j.sh ./backups/<backup-directory>
```

Both scripts verify Neo4j authentication with `cypher-shell` before continuing.

## Deploy to Kubernetes

### 1) Build and push images

```bash
docker build -t <registry>/muduo/frontend:latest ./frontend
docker build -t <registry>/muduo/backend:latest ./backend
docker build -t <registry>/muduo/neo4j:latest ./docker/neo4j

docker push <registry>/muduo/frontend:latest
docker push <registry>/muduo/backend:latest
docker push <registry>/muduo/neo4j:latest
```

Update image names in manifests:

- `kubernetes/frontend.yaml`
- `kubernetes/backend.yaml`
- `kubernetes/neo4j-statefulset.yaml`

### 2) Create namespace and secrets

```bash
kubectl apply -f kubernetes/namespace.yaml
```

Edit `kubernetes/secrets.example.yaml` with real values, then:

```bash
kubectl apply -f kubernetes/secrets.example.yaml
```

### 3) Apply infrastructure and workloads

```bash
kubectl apply -f kubernetes/neo4j-storage.yaml
kubectl apply -f kubernetes/neo4j-statefulset.yaml
kubectl apply -f kubernetes/backend.yaml
kubectl apply -f kubernetes/frontend.yaml
kubectl apply -f kubernetes/ingress.yaml
```

### 4) Verify

```bash
kubectl get pods -n muduo
kubectl get svc -n muduo
kubectl get ingress -n muduo
kubectl get statefulset neo4j -n muduo
```

## Security Notes

- Set a strong `JWT_SECRET` in all environments.
- Use real TLS certs for ingress hosts.
- Restrict Neo4j service exposure to internal networks.
- Rotate secrets regularly.
- `SEED_DEMO_USERS` is enabled in local Docker Compose and disabled in Kubernetes by default.
- Kubernetes frontend and backend deployments are configured with `3` replicas.
- Neo4j runs as a `3` replica StatefulSet with one persistent volume claim per node.

## Production Notes

- Backend exposes health endpoint at `/health` for probes.
- Backend health includes the configured Neo4j nodes for easier operational checks.
- Neo4j data persists through separate volumes per shard in Docker Compose and per-pod PVCs in Kubernetes.
- Startup schema initialization creates uniqueness constraints and fulltext indexes for `User`, `FamousPerson`, `Event`, `Place`, and `Interest`.
- Admin dashboard shows shard distribution, relationships, and role-protected analytics.
- Matching score is weighted:
  - Famous Persons: `x4`
  - Interests: `x3`
  - Events: `x5`
  - Places: `x2`
