# Architecture

## Apps and startup

| App       | Factory                                        | Port      |
| --------- | ---------------------------------------------- | --------- |
| Platform  | apps/platform/app.js createPlatformApp         | PORT      |
| CMS       | apps/cms/app.js createCmsApp                   | CMS_PORT  |
| Shortener | apps/tools/link-shortener/app.js createLinkApp | LINK_PORT |

The platform starts from the root index.js. The standalone CMS and shortener start from their server.js files. Each listener binds to 0.0.0.0. scripts/run-apps.js launches them with optional Node watch mode. The platform gateway mounts /cms and /t/:subdomain.

packages/config/index.js loads toolbox/.env, validates it with Zod and resolves storage against the repository root. A hosting-assigned SERVER_PORT takes precedence over PORT. Environment changes require restart. scripts/configure.js generates separate secrets without overwriting an existing file.

packages/db/index.js opens one better-sqlite3 database with foreign keys, WAL and a five-second busy timeout. Root index.js applies migrations before listening. Run npm run migrate before starting the standalone CMS or shortener.

## Request flow

The platform’s optional Host router and path mounts precede its middleware. Mounted apps independently capture req.baseUrl for scoped URLs/assets.

packages/ui/index.js configureApp installs EJS view paths, trusted SVG logos, metadata locals/security headers, shared/app assets, development Morgan logging, bounded parsers, authentication and CSRF. Platform routes handle auth, core pages, directory/API, SEO and structured information content. finishApp renders escaped errors and JSON errors under /api/. Express 5 forwards async errors.

CMS authentication and owner setup precede cmsAccess. CMS registration forwards to the platform. Management requires owner/admin or an approved contributor. Staff-only routes add adminAccess, and external project approval requires the owner.

The shortener verifies its actual published module record before serving routes. Without one it returns 404. Account-owned management routes precede /:code redirects.

## Database and migrations

packages/db/repositories owns SQL for users, tools, taxonomy, settings, submissions, content, media, analytics, activity and short links. Queries use parameters; controlled enums choose SQL ordering. Transactions make publication/tag/review writes and click consumption atomic.

| Migration                    | Responsibility                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| 001-core.sql                 | Core accounts/sessions/taxonomy/tools/submissions/media/settings/activity            |
| 002-short-links.sql          | short_links and short_link_clicks                                                    |
| 003-indexes.sql              | Core/shortener indexes                                                               |
| 004-project-reviews.sql      | External URLs, submission linkage, email_outbox; preserves tool IDs/references       |
| 005-public-content.sql       | releases and abuse_reports                                                           |
| 006-developer-publishing.sql | CMS access grants and approved tool destinations, with backfill from prior approvals |

Applied SQL checksums are immutable. The runner disables foreign keys outside each migration transaction, executes SQL, checks foreign_key_check before commit and restores enforcement in finally. Failure rolls back. schema.sql is the final snapshot, not an alternative migration procedure. Add numbered migrations rather than modifying applied files.

## Sessions and roles

packages/auth/index.js uses express-session and SQLiteSessionStore. Public sessions use docksite.sid/public; CMS uses docksite.cms.sid/cms and another secret. Cookies are HttpOnly, SameSite=Lax, configured expiry, path / and Secure under HTTPS. Login regenerates sessions; logout destroys them. Fresh user lookup on every request applies deactivation and role changes.

bcrypt uses cost 12. Password validation enforces 12 characters minimum and 72 UTF-8 bytes maximum. Public registration only allows user or contributor roles. CMS access for a contributor requires an approval timestamp. First-owner setup requires an empty owner set and SETUP_TOKEN. owner-setup.js supplies the challenge automatically only for direct loopback development without forwarding headers. setup-owner.js is the command alternative.

roles.js supplies requireUser, requireRoles and the shared CMS access check. Approved contributors manage their own tools and media. They can publish only an owner-approved destination. The owner manages privileged accounts and external project approvals. The last active owner is protected.

## CSRF and limits

packages/auth/csrf.js creates a random session token and verifies _csrf or x-csrf-token using timingSafeEqual. It rejects mismatched Origin and cross-site fetch metadata. Multipart media is parsed first and then verified by the upload controller.

rate-limit.js uses express-rate-limit with in-memory counters, configured window, draft-8 headers and endpoint maxima. Counters are per process/app instance. Public directory GET endpoints have no explicit app limiter.

## URL generation and routing

packages/config/urls.js uses BASE_DOMAIN, URL_MODE, scheme, environment and ports. Path mode is the default. Development CMS URLs use the independent port and production path-mode CMS links use /cms. External tools link to their destination in path mode and their assigned host in subdomain mode. The assigned path and host aliases redirect to the published destination.

middleware/subdomains.js validates Host and only dispatches known published tools or cms.BASE_DOMAIN. It is a routing foundation, not DNS setup. /t/link and the standalone shortener share database records and public sessions on localhost. Cookies do not distinguish ports.

HTTP/HTTPS destinations are validated without fetching them. External project URLs must not point back into the configured Docksite hostname tree. A metadata listing never creates executable functionality.

## Project review and SMTP

repositories/submissions.js stores private projects and ideas and queues owner review messages in one transaction. Owner approval creates or updates a draft, records its approved destination and grants CMS access to the developer. The developer publishes the draft separately. Ideas do not create tools. Withdrawing approval removes the linked listing from the directory. A changed destination must go back through review.

The sitemap and llms.txt share the public page inventory. robots.txt allows all user agents. Private routes still enforce sessions and roles, and non-indexable pages keep their robots metadata.

utils/review-email.js uses Nodemailer only with configured credentials. The platform server polls every 30 seconds; the owner can also process the queue in CMS. Atomic claims, stale-claim recovery, bounded retry backoff and sent/failed state are persisted. SMTP acceptance is not confirmed inbox delivery. Submitter-result emails are not implemented.

## Media, analytics and deletion

utils/uploads.js limits memory uploads and verifies PNG/JPEG/GIF/WebP signatures against MIME. CMS generates UUID storage names, checks ownership/tool association, writes outside public assets and removes orphan files after failed inserts. Expiry blocks private file access. No advanced processing or PDF upload exists.

Short-link redirects record a daily keyed IP hash, truncated user-agent and referrer origin. consumeClick commits count/detail/use-event atomically and rechecks expiry/limits/password state. HEAD does not count. Unlock grants last 15 minutes and are invalidated by password changes. Delete is soft; aliases remain reserved.

scripts/cleanup.js removes expired media/sessions and old detailed analytics. It is not scheduled by the app. Account, report, review, activity and mail records lack automatic retention.

## Public content and staff inboxes

apps/platform/content/catalog.js maintains structured escaped sections, help and public docs. controllers/information.js chooses templates, metadata and indexing state. There is no generic page builder or executable CMS template rendering.

Releases have unique slugs, plain-text bodies and actual publication timestamps. Public queries require published status; unknown/unpublished detail returns 404. Reports persist validated resources/descriptions/optional emails privately. They do not trigger URL visits or automatic takedowns.

CMS public settings hold contact/privacy/security emails and repository URL. Blank channels show setup pending. SMTP secrets stay in the environment.

## Tests and limits

tests/*.test.js use the native runner, disposable databases/uploads and local HTTP servers. content.test.js adds real local SMTP wire delivery. Redirect destinations are not visited. Tests cover migration snapshots, owner setup, sessions, roles, CSRF, publication/SEO, reports, uploads and redirect concurrency.

Not implemented: monitoring, managed roadmap/contributor/integration/feedback systems, password reset, self-service account export/erasure, automatic moderation, production scheduling, distributed limits or additional tool modules.

See [PROJECT-MAP](PROJECT-MAP.md), [DEVELOPMENT](DEVELOPMENT.md) and [PAGES](PAGES.md).
