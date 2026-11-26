# Later deployment workflow

Deployment is not complete. The current task makes local changes only. The existing source repository is public following the authorized files/history audit. Pending work has not been pushed. Do not create another repository, push, configure DNS or connect to Wispbyte without authorization.

## 1. Local verification

From toolbox:

```powershell
npm ci
npm run configure
npm run migrate
npm test
npm run lint
npm run format:check
npm run dev
```

configure preserves existing .env. Check actual tools, auth, owner review, reports, releases and shortener routes using local ports/path mounts. No build step is needed. See README and docs/LAUNCH-CHECKLIST.md.

## 2. GitHub after permission

An origin already exists. Inspect it and the pending changes without exposing credentials:

```powershell
git status
git remote -v
git diff --stat
git check-ignore .env storage/database.sqlite storage/uploads
```

After the user authorizes the specific update, review/stage appropriate source/docs/assets and commit/push:

```powershell
git add apps packages scripts tests docs README.md AGENTS.md CHANGELOG.md DEPLOYMENT.md package.json package-lock.json .env.example
git diff --cached --stat
git commit -m "Add reviewed projects and platform information pages"
git push origin main
```

Never stage the parent workspace .env, credentials, uploads or database. Use a credential manager/GitHub CLI, not tokens in remote URLs or command history. Do not change repository visibility automatically.

## 3. Provided DPDNS hostname

Wait for the actual assigned hostname and permission. Inspect whether the provider supports extra subdomains, wildcard records and certificate validation; do not assume any of them.

Keep URL_MODE=path if wildcard/subdomains are unavailable. Main links use /t/link and /cms. The platform’s simple in-process mounts support this single-process option. Independent CMS/shortener processes also exist for hosts with appropriate port/proxy support.

Set BASE_DOMAIN to the actual hostname without scheme, path or port. Development remains localhost until this phase is authorized.

## 4. Wispbyte when authorized

Inspect the actual Node version, npm installation, native build availability, assigned PORT, persistent storage and restart/process/proxy facilities first. Do not invent server capabilities or run remote commands during local work.

The platform server uses PORT and binds 0.0.0.0. CMS_PORT and LINK_PORT apply to standalone processes. All three apps can run independently, but a host offering one Node process/port can use npm start for the platform’s optional mounts. Do not assume three processes are supported.

Install with npm ci, configure private environment values, run migrations and start only after storage/backups and host settings are verified. Production secrets must be distinct and generated securely. Never upload local .env or development database as source artifacts.

## Environment groups

| Group                | Variables                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Public URL           | BASE_DOMAIN, URL_MODE, URL_SCHEME, NODE_ENV                                                            |
| Listener/proxy       | PORT, CMS_PORT, LINK_PORT, TRUST_PROXY                                                                 |
| Persistent storage   | DATABASE_PATH, UPLOAD_DIR, UPLOAD_MAX_BYTES                                                            |
| Sessions             | SESSION_SECRET, CMS_SESSION_SECRET, SESSION_TTL_SECONDS                                                |
| Owner setup          | SETUP_TOKEN or OWNER_USERNAME/OWNER_EMAIL/OWNER_PASSWORD; clear afterward                              |
| Analytics            | ANALYTICS_HASH_SECRET, ANALYTICS_RETENTION_DAYS                                                        |
| Limits               | AUTH_RATE_WINDOW_SECONDS, LOGIN_RATE_MAX, REGISTER_RATE_MAX, SUBMISSION_RATE_MAX, LINK_CREATE_RATE_MAX |
| Initial settings     | INITIAL_PLATFORM_NAME, CONTACT_EMAIL, REPOSITORY_URL                                                   |
| Review notifications | REVIEW_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM                   |

.env.example/config/index.js define current defaults and validation. Public contact/privacy/security emails and repository link can be maintained in CMS Settings; SMTP secrets cannot. Blank SMTP credentials preserve queued notifications and do not send.

Production requires URL_SCHEME=https. Ports are omitted from generated production URLs. TRUST_PROXY=1 is only appropriate behind one trusted proxy with private upstream access; otherwise use 0.

## SQLite persistence and backups

One host/file is used for V1, with WAL enabled. Database, WAL/SHM sidecars and upload storage must survive redeploys/restarts. Do not mount SQLite across unrelated hosts or assume replication is implemented.

Use SQLite’s consistent backup facilities or stop writers before a coordinated backup. Copying only a live main file can miss WAL data. Back up uploads coherently and test restores. Schedule npm run cleanup; it is not automatic. Decide retention/deletion of backups and private review/report/mail data before launch.

## Reverse proxy and HTTPS

Use a reverse proxy only if the host supplies/supports one. A single-process path setup forwards all paths to the platform PORT. Separate processes can route cms.<base> to CMS_PORT and link.<base> to LINK_PORT while apex traffic reaches PORT.

When proxying path-mounted standalone apps, preserve the application’s mount context; blindly stripping /cms or /t/link breaks scoped asset/form/short-link URLs. The platform in-process mounts already preserve req.baseUrl.

Terminate HTTPS with actual certificates covering the chosen hostnames. Forward protocol/Host consistently, restrict direct upstream access, then set TRUST_PROXY appropriately. The application emits HSTS and Secure cookies under HTTPS; verify them rather than assuming the proxy is correct.

## Wildcard routing

Only when DNS/certificate/proxy capabilities are verified, create the appropriate wildcard or explicit host records and configure URL_MODE=subdomain. Publishing a CMS record registers a router-visible subdomain, not DNS.

The Host foundation handles cms and known published tools. Unknown/unpublished tool hosts return 404. The URL shortener is the only implemented internal module; approved external project hosts/path bridges redirect to their real URL. Do not imply wildcard DNS is currently configured.

## 5. Switch to the owned .tech domain later

After authorization, configure actual DNS/certificates/proxy and update BASE_DOMAIN, URL_SCHEME and URL_MODE as needed. Restart all processes and verify generated canonicals, Open Graph/JSON-LD URLs, sitemap, cookies, CMS review links and short links.

Changing domain does not migrate browser sessions. Existing stored external project/destination URLs remain data; existing outbox message bodies retain the review URL generated when queued. Regenerate obsolete pending notices deliberately if necessary. Keep the old short-link hostname reachable or communicate an actual transition; editing BASE_DOMAIN alone cannot preserve old shared URLs.

See docs/LAUNCH-CHECKLIST.md for unresolved legal, security, storage and operator work.
