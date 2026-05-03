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

Docker Compose starts PostgreSQL and the API. The Docker image generates Prisma Client during build.

After startup, the API is available on `http://localhost:4000` and Swagger is available on `http://localhost:4000/doc`.

## Docker

Start the project with Docker Compose:

```bash
docker compose up --build
```

The Docker image runs `npx prisma generate` during build, before compiling the API.

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

## Gemini AI Setup

The AI endpoints use Google Gemini through the REST API. The default model is `gemini-2.0-flash`, configurable with `GEMINI_MODEL`.

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
AI_RATE_LIMIT_RPM=20
AI_CACHE_TTL_SEC=300
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

### AI Endpoints

Gemini API keys are server-side only. Do not paste `GEMINI_API_KEY` into Swagger authorization fields.

AI endpoints are rate-limited and can be called from Swagger without an application JWT. If `TEST_MODE=auth` is enabled and you need to create an article first, get a bearer token for the protected article CRUD endpoint:

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

Known limitations:

- Gemini free-tier quotas can reject or delay requests.
- AI latency depends on Google API availability and article size.
- Regional availability can vary for Gemini services.
- AI usage counters, cache, and generic prompt sessions are in memory and reset after app restart.
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
