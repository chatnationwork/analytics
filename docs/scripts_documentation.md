# NPM Scripts Documentation

This project uses `npm` scripts to automate common tasks such as building, testing, running servers, and database management.

To execute any script, run `npm run <script-name>` in your terminal.
Example: `npm run start:dev`

## Core Scripts

| Script | Description |
|--------|-------------|
| `build` | Builds the default project (usually the `collector` API since it's the first app). |
| `start` | Starts the default project in production mode. |
| `start:dev` | **Main Development Command**. Starts the Collector, Processor, and Dashboard API concurrently in watch mode. Use this for local development. |
| `test` | Runs unit tests using Jest. |
| `lint` | checks for code style issues and auto-fixes them using ESLint. |
| `format` | Formats all code using Prettier. |

## Build Scripts

These scripts compile the TypeScript code into JavaScript in the `dist/` directory.

| Script | Description |
|--------|-------------|
| `build:collector` | Builds the **Collector API** app (`apps/collector`). |
| `build:processor` | Builds the **Processor Worker** app (`apps/processor`). |
| `build:dashboard-api` | Builds the **Dashboard API** app (`apps/dashboard-api`). |

## Development Server Scripts

These scripts start the applications in "watch" mode. When you save a file, the server automatically restarts.

| Script | Description |
|--------|-------------|
| `start:collector:dev` | Starts the **Collector API** on port 3000 (default). |
| `start:processor:dev` | Starts the **Processor Worker**. This is a background worker, so it doesn't listen on a port. |
| `start:dashboard-api:dev` | Starts the **Dashboard API** on port 3001 (default). |
| `start:dashboard-ui:dev` | Starts the Next.js frontend in the `packages/dashboard-ui` workspace. |

## Testing Scripts

| Script | Description |
|--------|-------------|
| `test:watch` | Runs unit tests in watch mode. Useful when writing new tests. |
| `test:cov` | Runs unit tests and generates a test coverage report. |
| `test:e2e` | Runs end-to-end (integration) tests configured in `apps/collector/test/jest-e2e.json`. |

## Database & Docker Scripts

| Script | Description |
|--------|-------------|
| `docker:up` | Starts the PostgreSQL and Redis containers in the background (`-d`). |
| `docker:down` | Stops and removes the containers. |
| `db:migrate` | Runs pending TypeORM migrations to update the database schema. |
| `db:generate` | specificy a name after this command to generate a new migration based on entity changes. Example: `npm run db:generate -- -n MigrationName` |

## How to Run locally

1. **Install Dependencies**: `npm install`
2. **Start Infrastructure**: `npm run docker:up`
3. **Run Applications**: `npm run start:dev`

This will start all backend services. The logs for all services will appear in the same terminal.
