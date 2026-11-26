# Deploy Docksite on Bot-Hosting.net

## Files and startup

1. Use a Node.js deployment with Node 24. Put the contents of the `toolbox` project in the deployment root so `index.js`, `package.json`, `package-lock.json`, `apps/`, `packages/` and `scripts/` are siblings.
2. Install from the project's npm lockfile on the host. Use `npm ci --omit=dev` if running the install yourself. The package's pinned script approvals let npm 12 run the native bcrypt and better-sqlite3 installs for the host runtime.
3. Keep the host's environment and persistent application data in place when updating source files. Exclude Windows `node_modules`, `.git`, the local `.env`, databases, uploads and browser artifacts from file transfers.
4. Set **Startup → Entry File** (`STARTUP_FILE`) to `index.js`. For a custom start command with dependencies installed, use `node index.js`. The entry point migrates SQLite and binds to `0.0.0.0` on the platform's assigned `SERVER_PORT`. The main app, `/cms` and published tool mounts share that listener.

Use the Files tab or SFTP for uploads. The Domains, Startup and power controls are managed from the authenticated panel or Developer API. [Bot-Hosting setup guide](https://bot-hosting.net/docs/guides/set-up-a-deployment)

## The temporary hostname

Activate the provider's managed HTTPS hostname in **Domains** and copy the actual `.apps.bot-hosting.cloud` name from the panel. If using a DPDNS subdomain later, attach the chosen hostname and apply the exact DNS records shown by Bot-Hosting before verifying it. [Bot-Hosting domain guide](https://bot-hosting.net/docs/guides/link-a-domain)

Use the following production settings with the actual hostname. Keep `TRUST_PROXY=1` when one trusted HTTPS ingress fronts the service. Check the forwarded HTTPS protocol and restrict any direct access to that private upstream port.

```dotenv
NODE_ENV=production
BASE_DOMAIN=your-actual-hostname.apps.bot-hosting.cloud
URL_SCHEME=https
URL_MODE=path
TRUST_PROXY=1
DATABASE_PATH=./storage/database.sqlite
UPLOAD_DIR=./storage/uploads
REPOSITORY_URL=https://github.com/gsor56/Docksite
```

Set fresh private values for SESSION_SECRET, CMS_SESSION_SECRET, ANALYTICS_HASH_SECRET and SETUP_TOKEN. `npm run configure` can generate these on the host when there is no existing `.env`. Edit the production settings after generation. Leave the deployment's `SERVER_PORT` in control of the listener. Production public URLs use HTTPS on the managed hostname.

After startup, verify the public homepage, `/tools`, `/cms/login` and `/sitemap.xml` on that hostname. Open `/cms/setup` over HTTPS to create the real owner using the private setup token if this is a new database. Clear the setup token after owner creation.

## Environment groups

| Group                | Variables                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Public URL           | BASE_DOMAIN, URL_MODE, URL_SCHEME, NODE_ENV                                                            |
| Listener/proxy       | SERVER_PORT, PORT, CMS_PORT, LINK_PORT, TRUST_PROXY                                                    |
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

## Switch to the owned .tech domain later

After authorization, configure actual DNS/certificates/proxy and update BASE_DOMAIN, URL_SCHEME and URL_MODE as needed. Restart all processes and verify generated canonicals, Open Graph/JSON-LD URLs, sitemap, cookies, CMS review links and short links.

When you control `docksite.tech`, wildcard DNS and a matching certificate allow the gateway to serve published tool addresses such as `name.docksite.tech`. Set `BASE_DOMAIN=docksite.tech`, `URL_SCHEME=https` and `URL_MODE=subdomain` for that topology. Public tool landing pages remain on the main domain and external tool hosts redirect to the approved projects.

Changing domain does not migrate browser sessions. Existing stored external project/destination URLs remain data; existing outbox message bodies retain the review URL generated when queued. Regenerate obsolete pending notices deliberately if necessary. Keep the old short-link hostname reachable or communicate an actual transition; editing BASE_DOMAIN alone cannot preserve old shared URLs.

See docs/LAUNCH-CHECKLIST.md for unresolved legal, security, storage and operator work.
