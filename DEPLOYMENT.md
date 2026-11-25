# Later deployment guide

Source repository: [gsor56/Docksite](https://github.com/gsor56/Docksite). DNS configuration and server deployment remain future phases.

## Phase 2: GitHub

The private repository uses the `main` branch and the MIT license. Authenticate through GitHub CLI or your Git credential manager before cloning:

```powershell
git clone https://github.com/gsor56/Docksite.git
cd Docksite
npm ci
npm run configure
npm run migrate
```

For later updates, inspect the changes, run local checks, and ensure environment files, SQLite files, uploaded media, and dependencies remain ignored:

```powershell
git status
npm test
npm run lint
npm run format:check
```

After authorizing the update, commit and push:

```powershell
git add --all
git commit -m "Describe the change"
git push -u origin main
```

Do not change repository visibility or push new updates automatically without authorization. Configure your actual Git identity before subsequent commits if the initial commit used a local project identity. Keep GitHub tokens in private environment files or a credential manager, never in source files or remote URLs.

## Phase 3: DPDNS

First obtain the actual assigned hostname and inspect the provider's capabilities. Do not assume wildcard records, additional subdomains, or certificate automation are supported.

If only the assigned hostname works, keep `URL_MODE=path`. The platform directory will use `/t/link`; the CMS can use `/cms` or its independent protected endpoint. The small path mounts are available for a single-process installation, while each application can also run independently behind a proxy.

If the provider supports explicit subdomains, configure only the records needed: the main hostname, `cms`, and the tool's database subdomain, initially `link`. Configure A/AAAA or CNAME records according to the provider and server address. Do not add an AAAA record unless IPv6 actually reaches your server.

If wildcard subdomains are supported, a wildcard can point to the same server, but the apex/main hostname still needs its own record. The Host router recognizes only registered published implementations; an unknown subdomain returns 404. Wildcard DNS does not publish tools or authorize arbitrary modules.

Update the environment to the actual assigned hostname. `BASE_DOMAIN` is a hostname only, with no scheme, path, or port. Continue local testing with `BASE_DOMAIN=localhost` until the remote installation is ready.

## Phase 4: Wispbyte Node.js server

Confirm the Wispbyte runtime version, assigned port, persistent directories, package-install support, native module support, startup command, TLS termination, and permitted process count. This project needs Node 20.19+ and the native `better-sqlite3` module. If prebuilt binaries cannot be downloaded, the server must provide native build tools or a supported prebuilt installation path.

Install the repository without copying your local `.env` or SQLite database. Supply production secrets through the server's environment manager or a private environment file, then run:

```sh
npm ci
npm run migrate
npm start
```

`npm start` launches the platform listener on the exact `PORT` supplied by Wispbyte and binds to `0.0.0.0`. Never substitute a fixed local port for the assigned production port. There is no frontend build command.

The CMS and shortener also run independently:

```sh
npm start --workspace @docksite/cms
npm start --workspace @docksite/link-shortener
```

If multiple processes/upstreams are available, set `CMS_PORT` and `LINK_PORT` to allowed private ports and route to them through the reverse proxy. If Wispbyte exposes only one listener/process, the platform's simple in-process mounts provide `/cms` and `/t/link`; its optional Host router can dispatch supported subdomains to the same modules. These mounts do not prevent running the apps independently later.

Production settings include:

```dotenv
NODE_ENV=production
BASE_DOMAIN=YOUR_ASSIGNED_HOSTNAME
URL_SCHEME=https
URL_MODE=path
PORT=YOUR_WISPBYTE_ASSIGNED_PORT
CMS_PORT=YOUR_ALLOWED_CMS_PORT
LINK_PORT=YOUR_ALLOWED_TOOL_PORT
DATABASE_PATH=/YOUR_PERSISTENT_DIRECTORY/database.sqlite
UPLOAD_DIR=/YOUR_PERSISTENT_DIRECTORY/uploads
SESSION_SECRET=YOUR_RANDOM_PUBLIC_SESSION_SECRET
CMS_SESSION_SECRET=YOUR_DIFFERENT_RANDOM_CMS_SECRET
ANALYTICS_HASH_SECRET=YOUR_RANDOM_ANALYTICS_SECRET
TRUST_PROXY=1
```

Replace every uppercase value with an actual setting. Configuration rejects invalid values and production HTTP URLs. Carry over the remaining validated options from `.env.example`; do not reuse development secrets. Set `TRUST_PROXY=1` only when one trusted proxy terminates HTTPS and direct upstream access is blocked. Otherwise use `0` and configure the actual network before enabling production cookies.

Use the secure first-run page or owner command to create your actual owner. Clear setup credentials afterward. Login separately to the CMS and publish the real URL Shortener record. No deployment command seeds product records.

## SQLite and media persistence

Keep the database, its WAL/SHM sidecar files, and uploaded media on persistent local storage outside a disposable release directory. All independent applications must receive the same absolute database and upload paths. Do not place a WAL database on a network filesystem or run writers from multiple hosts.

Back up SQLite using its online backup API or stop all writers before copying the database and sidecars. Back up uploads with the corresponding database backup. Test restoration into a separate directory before relying on it. Do not commit backups or database contents to Git.

Run `npm run migrate` once before restarting upgraded applications. Inspect migrations first and take a backup before schema changes. Never edit a migration that has already been applied.

Schedule `npm run cleanup` daily with the server's scheduler or cron, from the repository directory and with the same environment. Expired links/media cannot be used while waiting for cleanup; the command physically removes expired files and old detailed events.

## Reverse proxy and HTTPS

For independent processes, route the main hostname to `127.0.0.1:PORT`, the CMS hostname to `127.0.0.1:CMS_PORT`, and the tool hostname to `127.0.0.1:LINK_PORT`. Preserve Host and set the trusted forwarding headers. Block public access to the upstream ports.

For a single platform listener, send all supported hostnames to its assigned port. Its small Host dispatch layer handles the CMS and the published shortener. In path mode, send `/cms` and `/t/link` to the platform listener so prefixes and generated form routes remain intact. Do not strip path prefixes when using the in-process mounts.

An Nginx upstream location should follow this pattern after replacing `YOUR_ASSIGNED_PORT`:

```nginx
location / {
    proxy_pass http://127.0.0.1:YOUR_ASSIGNED_PORT;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Use the provider's supported TLS termination or a certificate manager for every public hostname. Explicit subdomains can use individual certificates. Wildcard certificates commonly require DNS-based verification, which depends on DNS-provider support; wildcard DNS alone does not enable wildcard HTTPS. Redirect HTTP to HTTPS at the edge and test cookies, CSRF origins, redirects, canonical URLs, and QR codes over the final public URLs.

## Phase 5: switch to the real domain

After the new domain and TLS are ready:

1. Configure the verified apex, CMS, and tool DNS records; use a wildcard only if supported and desired.
2. Change `BASE_DOMAIN` to the real hostname and keep `URL_SCHEME=https`.
3. Set `URL_MODE=subdomain` only when all required subdomains and certificates work; otherwise keep path mode.
4. Update proxy hostnames and restart every independent app with the same configuration.
5. Verify directory/tool URLs, CMS forms, redirects, QR codes, canonical metadata, JSON-LD, sitemap, and robots.
6. Keep the old hostname serving intentional redirects for previously shared URLs while its DNS and certificate remain available. A `BASE_DOMAIN` change does not migrate ownership of old URLs.

Public platform/tool cookies derive from `BASE_DOMAIN` in production subdomain mode; CMS uses its own host-only authentication cookie. Users should sign in again after the domain switch. No real production domain is embedded in application code.

## Operational limits

SQLite is intended for a single persistent host. Rate limits use process-local memory and require shared storage before horizontally scaling. V1 does not include email recovery, distributed sessions across hosts, malware scanning, abuse-report queues, or centralized production monitoring. Configure persistent storage, backups, HTTPS, and the actual hosting topology before making the service public.
