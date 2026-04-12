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
```bash
docker compose up --build
```

After startup, the API is available on `http://localhost:4000` and Swagger is available on `http://localhost:4000/doc`.
## Docker

Start the project with Docker Compose:

```bash
docker compose up --build
```

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

Open Prisma Studio:

```bash
npx prisma studio
```
## Testing

Tests expect the API to already be running on `localhost:4000`.

For the base compatibility suite, start the application normally:

```bash
npm start
```

For auth, refresh, and RBAC suites, start the application with `TEST_MODE=auth`:

```bash
npx cross-env TEST_MODE=auth npm start
```

Then open a new terminal and run the needed test command.

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
