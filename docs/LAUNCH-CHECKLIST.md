# Public-launch checklist

These are the open checks for public launch. A page can exist while its feature is still in development.

## Operator and policies

- [ ] Identify the actual legal operator without inventing a company, address or registration.
- [ ] Decide jurisdiction, age/eligibility rules and handling of minors.
- [ ] Review privacy, terms, acceptable use, content rights/copyright and cookies drafts.
- [ ] Finalize retention for accounts, submissions, reports, activity, mail records, links and backups.
- [ ] Establish request verification, export/erasure and backup-deletion procedures.
- [ ] Configure maintained general support, privacy and dedicated private security contacts in CMS Settings.
- [ ] Decide any formal statutory copyright-reporting process; the working report form is not a registered agent service.
- [ ] Review email-notification data handling and final processor details.
- [ ] Keep incomplete policies noindex until substantive decisions and review are complete.

## Product and moderation

- [ ] Owner-publish the actual URL shortener metadata when ready for public use.
- [ ] Review actual external projects manually; no placeholder listings.
- [ ] Assign abuse-report review ownership and escalation/removal procedure.
- [ ] Decide response expectations without claiming continuous monitoring/moderation.
- [ ] Configure and verify real Gmail SMTP delivery if owner review email is required.
- [ ] Document password-reset/email-verification/account-deletion limitations or implement them before relying on them.
- [ ] Verify all public page statuses and footer links; only actual published releases belong in the public changelog.
- [ ] Monitoring, roadmap, contributor record, integrations and feedback remain explicitly coming soon unless implemented.
- [ ] Perform an accessibility assessment; current measures are not WCAG certification.

## Hosting and storage

- [ ] Obtain the real provided development domain; later obtain the intended owned .tech domain.
- [ ] Verify DPDNS subdomain/wildcard and certificate capabilities; keep path mode if unavailable.
- [ ] Confirm the Bot-Hosting Node.js runtime, assigned port, persistent storage and managed HTTPS hostname.
- [ ] Use a supported runtime and verify the native SQLite binary/compiler requirements.
- [ ] Confirm persistent DATABASE_PATH/UPLOAD_DIR on one host; do not use ephemeral SQLite storage.
- [ ] Establish consistent SQLite backups, upload backups, restore drills and backup retention.
- [ ] Schedule cleanup and verify its effect. No cleanup scheduler is built in.
- [ ] Review actual hosting/SMTP/proxy/logging processors and their retention.

## Transport and sessions

- [ ] Configure HTTPS/certificates and trusted proxy topology when authorized.
- [ ] Bind to the assigned PORT on 0.0.0.0; do not expose private upstream ports unnecessarily.
- [ ] Set production URL_SCHEME=https, BASE_DOMAIN and URL_MODE; verify canonicals, cookies, redirects, sitemap and CMS review links.
- [ ] Use distinct strong session/analytics secrets and clear first-run credentials/tokens.
- [ ] Test owner setup closure, public role-escalation rejection, CMS separation and contributor ownership.
- [ ] Account for per-process rate counters and public sessions when changing hostname/ports.
- [ ] Verify CSP, secure cookies and private report/media access through the real proxy.

## Release workflow

- [ ] Finish local tests/lint/format/browser checks and inspect Git changes for secrets/data.
- [ ] Obtain permission for any commit/push or other remote action outside the current local task.
- [ ] Configure DPDNS only after a real hostname and authorization.
- [ ] Verify Docksite's homepage, CMS login and sitemap on the managed Bot-Hosting HTTPS hostname.
- [ ] Repeat verification after switching to the owned .tech hostname; retained short URLs require an explicit transition plan.

See [DEPLOYMENT](../DEPLOYMENT.md) for the staged workflow and [HANDOFF](HANDOFF.md) for actual local checks.
