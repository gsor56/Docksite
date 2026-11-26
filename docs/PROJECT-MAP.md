# Project map

Paths below are relative to toolbox. Read [ARCHITECTURE](ARCHITECTURE.md) for request flow and [PAGES](PAGES.md) for route states.

| Change                        | Main files                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Homepage content/layout       | apps/platform/controllers/pages.js, views/home.ejs                                                               |
| Subdomain Stack               | packages/ui/views/partials/subdomain-stack.ejs, packages/ui/public/design.css, layout.js                         |
| Header/footer/nav             | packages/ui/views/partials/header.ejs, footer.ejs, nav-links.ejs                                                 |
| Current styles/fonts          | packages/ui/public/design.css, global.css, fonts/                                                                |
| Logo selection/assets         | packages/ui/index.js, packages/ui/assets/                                                                        |
| Legal/product/support copy    | apps/platform/content/catalog.js informationPages                                                                |
| Help articles                 | catalog.js helpArticles                                                                                          |
| Public docs                   | catalog.js docArticles                                                                                           |
| Coming-soon state             | catalog.js page state/status; information.js renderInformation                                                   |
| Shared information rendering  | apps/platform/views/information/                                                                                 |
| Directory/filter API          | apps/platform/controllers/tools.js, routes/tools.js, routes/api.js, public/directory.js                          |
| Public tool cards/landing     | packages/ui/views/partials/tool-card.ejs, apps/platform/views/tools/                                             |
| Tool SQL/public serialization | packages/db/repositories/tools.js                                                                                |
| Build/dashboard               | platform controllers/pages.js and views/build.ejs, dashboard.ejs                                                 |
| Project review/publication    | packages/db/repositories/submissions.js and tools.js, cms/controllers/submissions.js and tools.js                |
| Crawler discovery             | apps/platform/controllers/seo.js and routes/seo.js                                                               |
| SMTP queue                    | packages/utils/review-email.js, platform/server.js, email_outbox migration                                       |
| Actual shortener              | apps/tools/link-shortener/controllers/links.js, redirects.js; routes/; views/; public/links.js                   |
| Short-link transactions       | packages/db/repositories/short-links.js                                                                          |
| CMS management                | apps/cms/controllers/, routes/, views/                                                                           |
| Releases/reports              | packages/db/repositories/content.js, cms/controllers/content.js, routes/content.js, views/releases/ and reports/ |
| Public report/release pages   | platform/controllers/information.js, routes/information.js                                                       |
| Public contacts/settings      | repositories/settings.js, cms/controllers/settings.js, views/settings.ejs                                        |
| Database schema               | packages/db/migrations/, index.js, schema.sql                                                                    |
| General/content validation    | packages/utils/validation.js, content-validation.js                                                              |
| URL/destination safeguards    | utils/security.js, project-urls.js                                                                               |
| Auth/authorization            | packages/auth/controllers.js, roles.js, index.js; cms/middleware/access.js                                       |
| CSRF/rate limits              | packages/auth/csrf.js, rate-limit.js                                                                             |
| First-owner setup             | auth/owner-setup.js, controllers.js; scripts/setup-owner.js                                                      |
| Uploads                       | utils/uploads.js, cms/controllers/media.js                                                                       |
| Analytics/activity            | db/repositories/analytics.js, activity.js; shortener redirect controller                                         |
| SEO/JSON-LD                   | platform/controllers/tools.js, seo.js; ui/views/partials/head.ejs, ui/index.js                                   |
| Origin/scoped URLs            | packages/config/urls.js                                                                                          |
| Host/path mounts              | platform/app.js, middleware/subdomains.js                                                                        |
| Cleanup                       | scripts/cleanup.js                                                                                               |
| Tests                         | tests/helpers.js, database.test.js, integration.test.js, owner-setup.test.js, content.test.js                    |
| Tooling/run scripts           | package.json, eslint.config.js, scripts/run-apps.js, check-runtime.js                                            |
| Deployment instructions       | DEPLOYMENT.md                                                                                                    |
| Launch decisions              | docs/LAUNCH-CHECKLIST.md                                                                                         |

## Ownership boundaries

App controllers bind HTTP inputs to shared repositories/utilities. Keep reusable auth/config/SQL in packages, not duplicated across apps. Executable tools belong in apps/tools; their tables belong in separate migrations.

Informational content is maintained in a structured file, not the CMS. Releases, reports, tools, taxonomy, users, media and public settings are CMS-managed. Do not expose reports or private review notes through public APIs.

Earlier privacy.ejs and terms.ejs templates are no longer routed; current policies use catalog.js and the information templates. Do not edit obsolete templates expecting public changes.

## Documentation responsibilities

README: onboarding and commands. ARCHITECTURE: runtime behavior. DESIGN-SYSTEM: reproducible styling. DEVELOPMENT: extension patterns. PAGES: route/state inventory. HANDOFF: current verification and next work. LAUNCH-CHECKLIST: unresolved public launch decisions. CHANGELOG: development history, separate from public release notes.
