# Instructions for coding agents

Read README.md, docs/HANDOFF.md and relevant architecture/design/page docs before editing. Inspect actual code and migrations; earlier plans are not authoritative.

- Preserve working functionality and the current visual identity. Reuse design.css, shared EJS partials, self-hosted fonts and Docksite SVG assets. Keep the CMS black with its white lockup.
- No code comments: no JSDoc, inline comments, TODOs or file headers.
- No fake tools, analytics, releases, identities, submissions, uptime or successful deliveries.
- Coming-soon pages are allowed when deliberate and labeled: HTTP 200, noindex, excluded from sitemap. Implemented empty systems use honest empty states.
- Legal drafts require a draft notice, noindex and documented launch decisions. Never invent contacts, operators, domains or compliance.
- Use Zod, parameterized SQL, sessions/CSRF and role/ownership patterns. Public signup must never assign owner/admin. Only the owner approves external projects.
- Keep tool modules independent. A listing does not implement or deploy a tool.
- Minimal Node 20-compatible dependencies; keep better-sqlite3 at 12.11.1 unless explicitly authorized otherwise.
- Never commit .env, secrets, tokens, databases, uploads, dependencies or test artifacts. The parent workspace .env is sensitive, not app configuration.
- Do not deploy, configure DNS, push or make remote changes without explicit authorization.
- Applied migrations are immutable. Add a numbered migration, update the schema snapshot and meaningful tests.
- EJS escapes user/CMS content with <%= %>. Raw output is for trusted includes, checked-in SVG and the existing JSON-LD serializer only. Release bodies are plain text.
- Run relevant tests, lint and formatting checks; use isolated data. Check responsive presentation after layout changes and report unrun checks honestly.
- Do not spawn sub-agents unless the user authorizes delegation.

## Continuous documentation rule

Whenever functionality, schema, routes, commands, configuration, architecture, design patterns or feature status changes:

1. Update relevant documentation and correct outdated instructions.
2. Update README.md when onboarding changes.
3. Update CHANGELOG.md for meaningful changes.
4. Refresh docs/HANDOFF.md.

Replace contradictory instructions instead of appending competing notes. Maintenance is manual; no automatic documentation-update system exists.

Use docs/PAGES.md for route states, docs/PROJECT-MAP.md to locate changes, docs/DEVELOPMENT.md for extension patterns and docs/LAUNCH-CHECKLIST.md for unresolved launch work.
