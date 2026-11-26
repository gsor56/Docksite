# Docksite

Docksite connects independently identifiable tools through a dynamic directory, shared accounts and a separate CMS. The URL shortener is the only built-in executable tool. Reviewed externally hosted projects can also be listed; a listing does not deploy a project.

## Current implementation

- Three independently runnable Express apps: platform, CMS and URL shortener.
- SQLite-backed tools, accounts, sessions, categories/tags, private submissions, analytics, media, releases and abuse reports.
- Public developer signup, owner-approved CMS publishing and a durable SMTP review outbox.
- Product, help and public developer pages; draft legal policies and labeled coming-soon features.
- Shared editorial Instrument Serif/Poppins design. Black developer CMS with the white Docksite lockup.
- No seeded users, tools, release notes or usage events.

## Public library layout

- The homepage groups a two-column hero, tool directory, compact project submission band and shared footer. It uses the Docksite serif and Poppins type, ink and blue palette, and the right-aligned Subdomain Stack. Shared UI lives in `packages/ui/views/partials` and its tokens are in `packages/ui/public/design.css`.
- The hero invites people to browse tools, with project submission as a text link. The shortener preview shows `link.docksite` and its coming-soon state until the built-in module is published. Published listings enable the existing shortener form for signed-in users.
- Directory cards show their configured addresses in monospace. Category filters use the published catalog API. Empty directories use a plain message, and positive counts appear on directory pages. Search is available at `/tools` and from the navigation.
- Tools, Categories, tool details, project submission, Login and Register reuse the lighter Subdomain Stack header and public footer. Visitors can register and submit from the library. Signed-in CMS users can find the technical guides under **Developer resources**.
- Keep future layout work in EJS views and partials, the shared CSS, and small vanilla JavaScript enhancements in the views. The existing Express routes and SQLite data drive the pages.

## Requirements

Node 20.19+ on a supported release line and npm workspaces. Direct dependencies are pinned; better-sqlite3 remains 12.11.1. Install a native compiler toolchain if no matching SQLite prebuilt binary is available. Rebuild better-sqlite3 after changing Node major versions.

The current machine runs Node 24.15.0; the full suite is tested on that runtime, not Node 20. A previous Node 20 Windows attempt lacked the compiler/prebuilt binary needed for SQLite.

## Install

Run from this toolbox directory:

```powershell
npm install
npm run configure
npm run migrate
npm run dev
```

configure creates an application .env with separate random secrets and never overwrites it. [.env.example](.env.example) is the complete configuration reference. The parent workspace .env is sensitive and is not app configuration.

BASE_DOMAIN=localhost and URL_MODE=path are defaults. Relative storage paths resolve from this repo. SQLite and uploads must be writable and persistent.

## First owner and first tool

Open http://localhost:3001/setup or http://localhost:3000/cms/setup. Direct localhost development supplies the private challenge; remote/proxied/production requests require SETUP_TOKEN. Setup closes when an owner exists. Public signup cannot create owner/admin.

Alternatively set OWNER_USERNAME, OWNER_EMAIL and OWNER_PASSWORD privately and run npm run setup:owner. Clear OWNER_PASSWORD and SETUP_TOKEN afterward.

The database starts without tools. When the URL Shortener is ready, the owner can register it in CMS Tools with slug `url-shortener`, subdomain `link`, implementation **URL Shortener** and status **Published**. Until then, the shortener routes return 404.

## Publish an external tool

1. Create an account in the main app and submit an independently hosted working project at `/build`.
2. The owner approves the request in **CMS → Submissions**. Approval creates a draft and adds a **Manage in CMS** link to the developer's main dashboard.
3. Sign in to the CMS with the same account. Edit the tool's name, tagline and landing page description, then select **Publish tool**. Docksite adds its card and `/tools/:slug` landing page to the public library.
4. Use **My tools** to add projects, update listings, or unpublish and delete owned tools. A new tool or destination URL requires owner review.

Ideas stay private. Submit a separate request when the working project is ready. Developers keep CMS access after removing a listing. The owner can revoke account access in **Users**.

Docksite reserves a unique slug and tool address on approval. In local path mode, `/t/:subdomain` redirects to the published project. After buying `docksite.tech`, configure wildcard DNS and HTTPS, then set `BASE_DOMAIN=docksite.tech`, `URL_MODE=subdomain` and `URL_SCHEME=https`. Published tools then use addresses such as `name.docksite.tech`. [Deployment instructions](DEPLOYMENT.md)

## Crawler discovery

`/sitemap.xml` and `/llms.txt` list public indexable pages, including published tool pages, categories and releases. `/robots.txt` allows every user agent to crawl the site. `/humans.txt` describes the project and credits its source. `/robot.txt` and `/human.txt` redirect to the standard names.

Private routes still require authentication. Draft policies, coming-soon pages and private pages keep their existing indexing rules.

Use the full deployment hostname when testing crawler access. Docksite serves its own crawler rules alongside its public pages.

## Run apps

```powershell
npm run dev --workspace @docksite/platform
npm run dev --workspace @docksite/cms
npm run dev --workspace @docksite/link-shortener
```

Use npm start --workspace with the same workspace names for non-watch execution. npm run dev starts all three and npm run start:all runs all three without watch. The platform startup file is `index.js` in the project root. `npm start` runs that entry point and applies pending migrations before it serves the platform and its mounts. Every listener binds to 0.0.0.0.

For Bot-Hosting.net, use the Node.js deployment type, choose Node 24 and set **Startup → Entry File** to `index.js`. The platform uses the assigned `SERVER_PORT`. Begin with the provider's managed HTTPS subdomain and path mode. [Hosting instructions](DEPLOYMENT.md)

| Surface         | Local URL                       |
| --------------- | ------------------------------- |
| Platform        | http://localhost:3000           |
| CMS             | http://localhost:3001           |
| Shortener       | http://localhost:3002           |
| CMS mount       | http://localhost:3000/cms       |
| Shortener mount | http://localhost:3000/t/link    |
| Directory       | http://localhost:3000/tools     |
| JSON API        | http://localhost:3000/api/tools |
| API reference   | http://localhost:3000/api/docs  |

## Review email and contacts

REVIEW_EMAIL is the private project-review recipient, falling back to the active owner email. Locally it uses the user-provided address. SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM remain blank. No email is sent while these are missing.

For Gmail use smtp.gmail.com, port 465, SMTP_SECURE=true, a sender account and its app password. Keep credentials in .env and restart after changes. The platform polls every 30 seconds; the owner can process notifications in CMS Submissions. SMTP acceptance is recorded, not guaranteed inbox delivery.

CMS Settings maintains public contact/privacy/security emails and the repository URL. These are independent of the review recipient. Blank channels display setup pending.

## Checks and maintenance

```powershell
npm run migrate
npm run cleanup
npm test
npm run lint
npm run format
npm run format:check
```

Tests use disposable databases/uploads and local HTTP/SMTP connections; redirect destinations are never fetched. Cleanup removes expired sessions/media and old detailed analytics, but must be run or scheduled. It does not erase soft-deleted links, accounts or review records.

## Repository and docs

apps/platform, apps/cms and apps/tools/link-shortener contain the apps. packages/db, auth, config, ui and utils contain shared infrastructure.

- [Agent rules](AGENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN-SYSTEM.md)
- [Project map](docs/PROJECT-MAP.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Page inventory](docs/PAGES.md)
- [Handoff](docs/HANDOFF.md)
- [Launch checklist](docs/LAUNCH-CHECKLIST.md)
- [Deployment](DEPLOYMENT.md)
- [Development changelog](CHANGELOG.md)

Known limitations: no password recovery, email verification, self-service account erasure/export, automated moderation, monitoring, payments or additional built-in tools. Rate counters are per process. SMTP credentials and legal/hosting/retention choices remain pending. A page existing does not mean its feature is launched.

The [source repository](https://github.com/gsor56/Docksite) is public after a files/history audit. Pending local changes are not automatically pushed. See [publication audit](docs/PUBLICATION-AUDIT.md). [MIT license](LICENSE). Font licenses are in packages/ui/public/fonts.
