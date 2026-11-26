# Current handoff

## Working state

Docksite has an independent public library, CMS and URL Shortener. The public homepage invites developers to submit a working project. Owner approval creates a draft and reveals a CMS link in the developer's dashboard. Approved developers can edit, publish and remove their own listings.

All 30 requested public route patterns exist. Unknown/unpublished release details return 404. Draft policies/coming-soon pages return intentional 200 with noindex and sitemap exclusion. No records are fabricated.

The development database currently contains one existing owner and no tools, submissions, releases, reports or notification records. The shortener implementation is tested but its normal-database routes return 404 until the owner publishes the actual module listing. Do not insert test data there.

The review recipient is configured privately. SMTP remains unset, so owner review notices queue. Developers see approval and their CMS links in the app. The public source repository is linked in the footer.

## Recent changes

- Migration 006 adds durable CMS grants and approved destinations, including a backfill for existing approvals.
- Public signup leads to private owner review, followed by contributor publication. New destinations require another review.
- The homepage has a shortener preview, a tool directory, one project submission band and the public footer. The preview offers sign-in or a working form once the module is published. Keep the directory focused on finding tools and use the CMS for publishing.
- The public sitemap and llms.txt follow published content. robots.txt allows all user agents and humans.txt provides project credits.
- Tool subdomains use the configured base domain and require real hosting, DNS and certificates.
- The platform starts from root index.js and honors the assigned SERVER_PORT. Bot-Hosting can run the platform, CMS mount and tool mounts as one Node.js process.

## Checks actually run

- Migration 006 applied to the development database. A second run reported up to date and foreign_key_check found zero violations.
- On Node 24.15.0, npm test passed all 23 tests, including migration backfill, approval, ownership, destination changes, alias routing and crawler discovery.
- npm run lint and npm run format:check passed.
- Headless Edge verified the revised homepage at 360px and 1440px. In disposable databases it checked the published shortener preview, created a link, and completed signup, owner approval, CMS editing and publication.
- The three local services are running. The standard crawler files return 200, their singular aliases redirect and the unpublished shortener returns 404.
- A production-style startup test migrated a clean database, used the assigned SERVER_PORT and served HTTPS canonical links and Secure CMS cookies through simulated ingress.

Direct dependencies retain Node 20-compatible engine requirements. Native SQLite availability must be checked on the eventual host. Browser verification artifacts are ignored under storage.

## Known gaps and pending decisions

Unimplemented systems include monitoring, a managed roadmap and contributor directory, an integrations catalog, feedback, password recovery, email verification, self-service account export and erasure, and automated moderation.

Public legal operator, jurisdiction/age rules, retention/deletion/backups, processors and maintained contact channels need decisions/review. Cleanup is a command, not a scheduler. Rate limits are in memory per process. SMTP acceptance is not guaranteed inbox delivery.

Bot-Hosting runs Node 24 with root `index.js`. Its public HTTPS hostname serves the sitemap and the allow-all crawler rules. Initial owner setup is available at `/cms/setup`.

## Suggested next work

1. Owner review of policy drafts and actual public channel settings.
2. Publish the implemented shortener listing in CMS if ready to make it available.
3. Supply private Gmail SMTP/app-password values and verify real delivery when authorized.
4. Inspect the local changes; only commit/push with authorization for that update.
5. Follow DEPLOYMENT.md for Bot-Hosting's managed hostname and the later custom-domain transition.

Refresh this document after meaningful implementation or verification changes; it is a rolling handoff, not a transcript.
