# Development guide

Read [README](../README.md), [ARCHITECTURE](ARCHITECTURE.md), [PROJECT-MAP](PROJECT-MAP.md) and [DESIGN-SYSTEM](DESIGN-SYSTEM.md) first. Changes require matching documentation updates; do not append contradictory instructions.

## Add a public page

For simple information, add a structured page entry to apps/platform/content/catalog.js. Sections contain heading, paragraphs, items, links and optional code; output is escaped. Use state informational, draft or coming-soon deliberately.

The information router handles these exact entries. Unknown paths continue to the real 404. renderInformation generates title, description, configured canonical URL and noindex for draft/coming-soon content. The sitemap includes informational catalog entries automatically. Add necessary help/docs index links or footer links without expanding the header into a page wall.

For dynamic behavior, add a controller/route and repository as needed. Protect writes with CSRF, Zod and the configured form limiter. Do not add a decorative form that only displays success.

## Add help or public docs

Add real implemented topics to helpArticles or docArticles. Their index/detail routes and sitemap are derived from the same collections. Unknown articles return 404. Keep public docs free of private database locations, credentials and internal access details. Document actual endpoint response/error behavior and limits; label examples clearly.

Internal implementation instructions belong in docs/, not /docs.

## Add a CMS feature

Create a parameterized repository, validation schema, controller, route and template using existing patterns. Mount the router in apps/cms/app.js after cmsAccess. Add adminAccess for private staff content; use requireRoles('owner') for owner decisions. Never rely on hiding a button as authorization.

Wrap related database writes and recordActivity calls in one transaction. Add scope-aware paths using res.locals.basePath. Avoid a render local named settings: Express/EJS uses that name for view settings. Use publicConfig instead.

Staff releases/reports use controllers/content.js and repositories/content.js as small examples. Rich text is plain escaped text; arbitrary HTML/Markdown/templates are unsupported.

## Add a migration

1. Add the next numbered SQL file in packages/db/migrations.
2. Keep applied files unchanged; checksums enforce this.
3. Run npm run migrate against disposable data first.
4. For table rebuilds preserve IDs, constraints, indexes and foreign-key targets. The runner controls foreign-key enforcement outside its transaction and checks integrity before commit.
5. Update schema.sql to the final schema and extend the database test.
6. Verify existing data survives and invalid references still fail.

Do not modify the real development database with test fixtures. Tool-specific tables belong in their own migration when that tool is actually implemented.

## Add a tool module

1. Implement an independently runnable Express app in apps/tools with server.js, app.js, package.json, routes/controllers/views/public.
2. Reuse shared config/auth/UI/SQL infrastructure. Bind the configured port to 0.0.0.0.
3. Add actual tool tables in a separate migration.
4. Add validation, role/ownership checks, CSRF and meaningful redirect/workflow tests.
5. Register the executable module in packages/utils/tool-registry.js and extend the module allowlist/constraints and router dispatch intentionally.
6. Extend the platform’s optional path/Host dispatch and run script only after the module works independently.
7. Create real CMS metadata with slug, subdomain, category/tags and description; publish only after verification.
8. The existing /tools/:slug controller creates its landing metadata, related tools and JSON-LD from the published record.

A CMS tool listing does not create executable functionality. External project listings point to a real approved external_url and do not install/deploy code. No additional modules currently exist.

## Subdomains and development URLs

URL_MODE=path works with localhost and requires no DNS. BASE_DOMAIN is a hostname without scheme/port. Existing tool subdomains are database values; Host routing only accepts published records. Never hardcode a production domain.

Only configure real DNS/reverse proxy/HTTPS after authorization and provider capability checks. Standalone apps remain valid without the platform gateway.

## Volunteer review and email configuration

Use the submission form to send a project or an idea privately. CMS contributors can submit an owned tool as pending. Only the owner approves externally hosted projects. Publication/notification state must be real and never inferred from button clicks.

The application .env supports:

| Variables                                                     | Purpose                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| REVIEW_EMAIL                                                  | Private recipient; blank falls back to active owner email |
| SMTP_HOST, SMTP_PORT, SMTP_SECURE                             | SMTP connection; port 465/secure true defaults            |
| SMTP_USER, SMTP_PASSWORD, SMTP_FROM                           | Sender credentials/address; blank means no delivery       |
| CONTACT_EMAIL, REPOSITORY_URL                                 | Initial public setting fallbacks                          |
| CMS contact_email/privacy_email/security_email/repository_url | Maintained settings overriding public fallbacks           |

For Gmail, supply smtp.gmail.com, port 465/TLS, actual sender username/from address and an app password privately. Do not use an ordinary Gmail password. Restart after .env changes. Missing credentials leave notifications queued; failures persist a safe error and retry time. The platform polls every 30 seconds; the owner can process the queue manually. With only standalone CMS running, use that action.

No real Gmail sending has been verified while credentials are blank. Review links lead to protected CMS; approvals are CSRF-protected POSTs, never one-click GETs.

## Tests and style

Use tests/helpers.js to create disposable databases/upload directories before importing config/db/app modules. Tests run sequentially by file and use actual local servers. Reset SMTP variables so configured developer credentials cannot be used. Inspect redirect headers without following destinations.

Run npm test, npm run lint and npm run format:check. ESLint enforces no JS comments. Reuse design tokens/partials and verify at 360px, tablet and desktop, including keyboard navigation, focus, forms, tables and reduced motion. Test artifacts stay under ignored storage/ or system temp.

## Launch a coming-soon feature

Build and verify the real behavior first. Replace the coming-soon state with substantive working/informational content, update descriptions/links and indexing state, add dynamic repository/controller/CMS permissions where appropriate, and remove obsolete status text. Check sitemap/noindex and navigation after launch. Never relabel an empty placeholder as working.

For legal drafts, do not merely remove the notice: obtain the missing operator/policy decisions and review, update content and docs, then intentionally change indexing.

## Documentation after changes

Update the relevant architecture, map, route/state and design docs. Refresh README when onboarding changes, record meaningful development changes in CHANGELOG and replace the rolling HANDOFF with current state/checks/limitations. No automation does this for you.
