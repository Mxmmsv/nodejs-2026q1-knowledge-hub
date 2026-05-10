# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js `24.x` - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.
- Docker Desktop / Docker Engine - [Install Docker](https://docs.docker.com/engine/install/).

## Quick Start

Run the full application stack with Docker Compose:

```bash
git clone https://github.com/Mxmmsv/nodejs-2026q1-knowledge-hub mxmmsv-nodejs-2026q1-knowledge-hub
```

```bash
cd mxmmsv-nodejs-2026q1-knowledge-hub
```

```bash
git switch develop
```

```bash
cp .env.example .env
```

Paste your Gemini API key into `GEMINI_API_KEY` in `.env` before testing AI endpoints.

```bash
docker compose up --build
```

Docker Compose starts PostgreSQL, Qdrant vector database, and the API. The Docker image generates Prisma Client during build.
On container startup, the API applies Prisma migrations and seeds demo users, categories, articles, tags, and comments unless `SEED_DATABASE=false`.

After startup, the API is available on `http://localhost:4000` and Swagger is available on `http://localhost:4000/doc`.

## Docker

Start the project with Docker Compose:

```bash
docker compose up --build
```

The Docker image runs `npx prisma generate` during build, before compiling the API.
The app container runs `npx prisma migrate deploy` and an idempotent seed step before starting the API.

Docker Compose also starts Qdrant as the `vectordb` service on internal URL `http://vectordb:6333`. Qdrant data is stored in the persistent Docker volume `mxmmsv-knowledge-hub-qdrant-data`.

Start the project with Adminer enabled:

```bash
docker compose --profile debug up --build
```

Docker Hub image:

- [mxmmsv/knowledge-hub](https://hub.docker.com/r/mxmmsv/knowledge-hub)

### Security Scan

Docker Scout scan command:

```bash
docker scout cves registry://mxmmsv/knowledge-hub:latest --platform linux/amd64 --only-severity critical,high
```

Docker Scout overview for `mxmmsv/knowledge-hub:latest`:

- packages indexed: `454`
- vulnerabilities: `0` critical, `24` high
- image size: `177 MB`

The command above filters the report to critical and high severities only.
Docker Desktop may show a much larger local `DISK USAGE` for unpacked layers, but the final image content size used for verification is `177 MB`, which is below the `500 MB` limit.

## Prisma

Generate Prisma Client:

```bash
npx prisma generate
```

Reset the local database and re-run migrations + seed:

```bash
npx prisma migrate reset --force
```

If you use Docker and want a completely clean PostgreSQL volume, remove the stack volumes and start again:

```bash
docker compose down -v
docker compose up --build
```

Open Prisma Studio:

```bash
npx prisma studio
```

## Gemini AI and RAG Setup

The AI endpoints use Google Gemini through the REST API. Text generation uses `gemini-2.0-flash`, configurable with `GEMINI_MODEL`. RAG embeddings use `text-embedding-004`, configurable with `GEMINI_EMBEDDING_MODEL`.

Create a Gemini API key:

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with a Google account.
3. Create a new API key.
4. Copy the key.
5. Paste it into `.env` as `GEMINI_API_KEY`.

Required `.env` values:

```dotenv
GEMINI_API_KEY=your-gemini-api-key
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
AI_RATE_LIMIT_RPM=20
AI_CACHE_TTL_SEC=300
RAG_VECTOR_DB_PROVIDER=qdrant
RAG_VECTOR_DB_URL=http://vectordb:6333
RAG_VECTOR_COLLECTION=knowledge_hub_articles
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=200
RAG_CONVERSATION_MAX_MESSAGES=20
```

After cloning:

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env`, then start the app:

```bash
docker compose up --build
```

Local startup is also supported:

```bash
npm install
npx prisma generate
npm start
```

The API is available on `http://localhost:4000`; Swagger is available at `http://localhost:4000/doc`.
In auth mode, use Swagger's **Authorize** button for protected Knowledge Hub CRUD endpoints and paste only the `accessToken` value returned by `POST /auth/login`.

Seed sample users and articles if the database is empty:

```bash
npx prisma migrate reset --force
```

Seeded demo login for auth mode:

```text
login: seed_admin
password: SeedPass123!
```

Useful seeded article id for AI testing:

```text
88888888-8888-4888-8888-888888888888
```

### AI Endpoints

Gemini API keys are server-side only. Do not paste `GEMINI_API_KEY` into Swagger authorization fields.

AI and RAG endpoints are rate-limited and can be called from Swagger without an application JWT. If `TEST_MODE=auth` is enabled and you need to create an article first, get a bearer token for the protected article CRUD endpoint:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"seed_admin\",\"password\":\"SeedPass123!\"}"
```

Use the returned `accessToken` as `Authorization: Bearer <accessToken>`.

Create an article or use an existing article id, then call:

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d "{\"maxLength\":\"medium\"}"
```

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d "{\"targetLanguage\":\"Spanish\",\"sourceLanguage\":\"English\"}"
```

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d "{\"task\":\"review\"}"
```

```bash
curl -X POST http://localhost:4000/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d "{\"prompt\":\"Suggest three Knowledge Hub article ideas about Node.js.\"}"
```

```bash
curl http://localhost:4000/ai/usage \
  -H "Authorization: Bearer <accessToken>"
```

### RAG Endpoints

Build or refresh the vector index from published articles:

```bash
curl -X POST http://localhost:4000/ai/rag/index \
  -H "Content-Type: application/json" \
  -d "{\"onlyPublished\":true}"
```

Index selected articles:

```bash
curl -X POST http://localhost:4000/ai/rag/index \
  -H "Content-Type: application/json" \
  -d "{\"articleIds\":[\"88888888-8888-4888-8888-888888888888\"]}"
```

Run semantic search with optional metadata filters:

```bash
curl -X POST http://localhost:4000/ai/rag/search \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"What does this hub say about Node.js?\",\"limit\":5,\"articleStatus\":\"published\"}"
```

Ask a grounded RAG question:

```bash
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"Summarize the most relevant Knowledge Hub article about Node.js.\"}"
```

Continue a RAG conversation by reusing the returned `conversationId`:

```bash
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"<conversationId>\",\"question\":\"Which source supports that answer?\"}"
```

Inspect RAG conversation history:

```bash
curl http://localhost:4000/ai/rag/chat/<conversationId>/history
```

Delete an article from the vector index:

```bash
curl -X DELETE http://localhost:4000/ai/rag/index/articles/88888888-8888-4888-8888-888888888888
```

Known limitations:

- Gemini free-tier quotas can reject or delay requests.
- AI latency depends on Google API availability and article size.
- RAG indexing time depends on the number and size of articles because chunks are embedded through Gemini.
- Regional availability can vary for Gemini services.
- AI usage counters, cache, and generic prompt sessions are in memory and reset after app restart.
- RAG conversation memory is in memory and resets after app restart.
- The Qdrant vector index is persistent, but it should be rebuilt after resetting the PostgreSQL database.
- AI responses are validated and have safe fallbacks, but model output can still be imperfect.

## Testing

Tests expect the API to already be running on `localhost:4000`.

For the base compatibility suite, start the application normally.

Local startup:

```bash
npm start
```

Docker startup:

```bash
docker compose up --build
```

For auth, refresh, and RBAC suites, start the application with `TEST_MODE=auth`.

Local startup:

```bash
npx cross-env TEST_MODE=auth npm start
```

Docker startup:

Add `TEST_MODE=auth` to `.env`, restart the stack, then run the test command from another terminal:

```bash
docker compose down
docker compose up --build
```

Then open a new terminal and run the needed test command. If the database contains leftover test records, reset it with `npx prisma migrate reset --force` or recreate Docker volumes with `docker compose down -v`.

To run all tests without authorization

```bash
npm run test
```

To run only one of all test suites

```bash
npm run test -- <path to suite>
```

To run all test with authorization

```bash
npm run test:auth
```

To run only specific test suite with authorization

```bash
npm run test:auth -- <path to suite>
```

To run refresh token tests

```bash
npm run test:refresh
```

To run RBAC (role-based access control) tests

```bash
npm run test:rbac
```

### Auto-fix and format

```bash
npm run lint
```

```bash
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging
