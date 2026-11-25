# Docksite

Docksite V1 is a server-rendered platform, a separate CMS, and a working URL Shortener. All directory records, accounts, submissions, media, sessions, and analytics come from SQLite. There are no seeded tools, categories, accounts, links, or usage events.

## Requirements

- Node.js 20.19+ on a supported release line: Node 20, Node 22.13+, or Node 24+.
- npm with workspace support.
- A writable local filesystem for SQLite and uploaded media.

Every direct dependency is pinned and supports Node 20.19. `better-sqlite3` is pinned to `12.11.1`; version 13 requires Node 22. If you change Node major versions, run `npm rebuild better-sqlite3` before starting applications. On platforms without a matching SQLite prebuilt binary, native build tools are required.

On this Windows machine, Node 24 has a working SQLite binary. The separate Node 20.20.2 installation attempt could not build SQLite because Visual C++ build tools are absent and no matching Node 20 Windows prebuilt binary was available. Node 20 dependency imports, password hashing, EJS escaping, QR generation, Zod validation, and JavaScript syntax checks passed. The full integration suite runs on the installed Node 24 runtime. Use Node 20 with the required native compiler toolchain if your host does not provide a prebuilt binary.

## Install and configure

Run commands from this directory:

```powershell
npm install
npm run configure
npm run migrate
npm run dev
```

`configure` creates `.env` from `.env.example` with independent cryptographically random session, analytics, and setup secrets. It never overwrites an existing `.env`. Configuration is validated at startup. Secret values are not printed or committed.

All relative database and upload paths resolve against this repository directory, regardless of which workspace you start. The default database is `storage/database.sqlite`; uploads live in `storage/uploads` outside public assets.

## First owner and first tool

Open `http://localhost:3000/setup`. Enter the `SETUP_TOKEN` from your local `.env`, your actual username and email, and a password of at least 12 characters. The setup page stops working as soon as an owner exists. Registration cannot create elevated roles and remains closed until owner setup is complete.

Alternatively, set `OWNER_USERNAME`, `OWNER_EMAIL`, and `OWNER_PASSWORD` in `.env`, then run:

```powershell
npm run setup:owner
```

After setup, remove `OWNER_PASSWORD` and clear `SETUP_TOKEN` from `.env`. Do not place credentials in shell history or Git.

Sign in separately at `http://localhost:3001/login`. In Tools → Create tool, register the implemented URL Shortener:

| Field             | Value                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Name              | URL Shortener                                                                                                              |
| Slug              | url-shortener                                                                                                              |
| Tagline           | Create and manage short links.                                                                                             |
| Description       | Shorten URLs with custom aliases, optional expiry dates, password protection, click limits, QR codes, and click analytics. |
| Subdomain         | link                                                                                                                       |
| Implementation    | URL Shortener                                                                                                              |
| Status            | published                                                                                                                  |
| Category and tags | Select records you have actually created, or leave unassigned.                                                             |

This registers an actual implemented service. No other implementation can be published in V1. Draft and pending metadata can be reviewed in the CMS without appearing publicly. The shortener deliberately returns 404 until its record is published; archiving it stops its public routes.

## Run each app independently

Each app is an independent Express application and can run without the platform process. All listeners bind to `0.0.0.0`.

```powershell
npm run dev --workspace @docksite/platform
npm run dev --workspace @docksite/cms
npm run dev --workspace @docksite/link-shortener
```

For execution without watch mode:

```powershell
npm start --workspace @docksite/platform
npm start --workspace @docksite/cms
npm start --workspace @docksite/link-shortener
```

`npm run dev` starts all three with watch mode. `npm run start:all` starts all three without watch mode. `npm start` starts the platform, including its simple optional in-process path mounts. There is no bundling or build step.

| App or route             | Default URL                     |
| ------------------------ | ------------------------------- |
| Platform                 | http://localhost:3000           |
| CMS                      | http://localhost:3001           |
| URL Shortener            | http://localhost:3002           |
| CMS path mount           | http://localhost:3000/cms       |
| URL Shortener path mount | http://localhost:3000/t/link    |
| Public directory         | http://localhost:3000/tools     |
| Public JSON API          | http://localhost:3000/api/tools |

`URL_MODE=path` is the default. The directory links to `/t/<database subdomain>`. A short link created or viewed on the standalone tool uses that app's port; one viewed through the path mount uses the platform path. Both resolve to the same database record and click limit. Session cookies are shared between the platform and shortener on localhost because cookies do not distinguish ports. CMS authentication uses its own cookie and session namespace.

The optional Host router dispatches known published tool subdomains and `cms.BASE_DOMAIN`. Local operation does not depend on DNS, wildcard records, or a proxy. Call `createPlatformApp({ localGateway: false })` to omit the local mounts and Host router when embedding the platform elsewhere.

## Features and permissions

The platform includes real home counts, featured and recently published tools, categories, SEO landing pages, accounts, dashboards, tool submissions, legal pages, sitemap, robots, and JSON API. The directory renders initial results on the server, then supports live search, combined category/tag filters, sorting, pagination, and browser history with vanilla JavaScript.

The CMS supports tool CRUD and archive, category/tag CRUD, review notes, role and account management, media upload/read/delete, real analytics, platform-name settings, and an activity log. Owner and admin manage content; only owners manage administrators and owners. The last active owner is protected. Contributors manage their own drafts, pending records, and media. Users manage their own submissions and links.

The shortener supports authenticated creation, generated codes, custom aliases, destination edits, optional expiry/password/click limits, enable/disable/delete, QR downloads, copying, and recent click analytics. Redirects are server-side HTTP 302 responses with no caching. Click counters and events are committed in one SQLite transaction. HEAD requests do not increment clicks. Password gates grant temporary session access and are invalidated by password changes.

Aliases are case-insensitive and reserved routes cannot be used. Deleted aliases remain reserved so an old shared URL cannot be assigned to a different destination. Detailed click history is retained until cleanup; aggregate click totals remain. Destination URLs accept HTTP/HTTPS without embedded credentials. The service does not fetch destinations, and intentionally supports arbitrary HTTP/HTTPS destinations as a shortener.

Uploads accept PNG, JPEG, GIF, and WebP only, verify signatures against the declared MIME type, enforce configured size limits, and use generated filenames. Uploaded SVG and executable files are rejected. Media is private to authorized CMS users. Expired media stops serving immediately; expiry timestamps entered in forms are UTC. No image processing is included.

## Public API

```text
GET /api/tools
GET /api/tools?search=short&category=utilities&tag=links&sort=popular&page=1&limit=24
GET /api/tools/:slug
```

The list returns `{ tools, total, page, limit }`. Each item includes `id`, `slug`, `name`, `tagline`, `description`, `category`, `tags`, `subdomain`, `status`, `featured`, `icon`, `url`, `created_at`, and `updated_at`. Unassigned categories are `null`; tags are arrays. Only published records are returned. Invalid filters return HTTP 422 and unknown records return HTTP 404 with JSON errors.

Sorting supports `newest`, `name`, and `popular`. Newest uses the real first publication timestamp. Popularity counts recorded use events, including creation and redirects. No synthetic scores are generated. Responses expose public tool metadata, not user credentials or links.

## Migrations, cleanup, and checks

```powershell
npm run migrate
npm run cleanup
npm test
npm run lint
npm run format
npm run format:check
```

Core tables and shortener tables live in separate migrations. Migration checksums detect modifications to applied migrations. `schema.sql` is the final schema snapshot; the migration runner is authoritative. Add a new migration for future schema changes instead of editing applied files.

Cleanup deletes expired session rows, expired media files/rows, and detailed analytics older than `ANALYTICS_RETENTION_DAYS`. Schedule this command regularly in production. Link expiration and media authorization are enforced when requests arrive even before cleanup runs.

Tests use Node's native test runner, actual local HTTP servers, and disposable database/upload directories. They cover migrations, first-owner setup, auth, CSRF, sessions, roles, publishing, public API/SEO, submissions, upload checks, independent apps, path/Host routing, and shortener restrictions and concurrent click limits. Redirects are inspected without following destinations. Test accounts and records never enter the development database.

## Environment reference

| Variables                                                                            | Purpose                                                                            |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                           | development, test, or production; Morgan runs only in development.                 |
| `BASE_DOMAIN`, `URL_SCHEME`, `URL_MODE`                                              | Trusted hostname, HTTP/HTTPS scheme, and path/subdomain URL generation.            |
| `PORT`, `CMS_PORT`, `LINK_PORT`                                                      | Listener ports; public production URLs omit internal ports.                        |
| `DATABASE_PATH`, `UPLOAD_DIR`, `UPLOAD_MAX_BYTES`                                    | Persistent storage and file size limit.                                            |
| `SESSION_SECRET`, `CMS_SESSION_SECRET`, `SESSION_TTL_SECONDS`                        | Independent signing keys and session lifetime.                                     |
| `TRUST_PROXY`                                                                        | 0 for direct access; 1 only behind one trusted proxy with private upstream access. |
| `INITIAL_PLATFORM_NAME`                                                              | Initial database setting; change the live name in the CMS.                         |
| `OWNER_USERNAME`, `OWNER_EMAIL`, `OWNER_PASSWORD`, `SETUP_TOKEN`                     | Secure first-run setup; clear sensitive setup values afterward.                    |
| `ANALYTICS_HASH_SECRET`, `ANALYTICS_RETENTION_DAYS`                                  | Keyed daily IP hashing and detailed event retention.                               |
| `AUTH_RATE_WINDOW_SECONDS`                                                           | Rate-limit window for state-changing forms.                                        |
| `LOGIN_RATE_MAX`, `REGISTER_RATE_MAX`, `SUBMISSION_RATE_MAX`, `LINK_CREATE_RATE_MAX` | Limits per client address and process within the configured window.                |

## Scope

V1 uses local SQLite and one implemented tool. Rate-limit counters are in memory per process; multi-instance deployments need a shared limiter. There is no email verification, password recovery, automated moderation, link malware scanning, billing, cross-host media storage, or multi-host database replication. CMS analytics/activity lists show recent records, and media management is intentionally minimal.

Source repository: [gsor56/Docksite](https://github.com/gsor56/Docksite). See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub updates, DNS, proxy, HTTPS, persistence, and Wispbyte steps. DNS and server deployment are not configured.

## License

Docksite is licensed under the [MIT License](LICENSE).
