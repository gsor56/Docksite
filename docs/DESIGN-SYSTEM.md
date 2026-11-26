# Docksite design system

The checked-in implementation is the visual source of truth. Do not introduce a framework, new fonts, gradients, shadows, glass effects or unrelated icon sets.

## Source and cascade

packages/ui/public/global.css provides reset/layout primitives and the root monospace fallback. packages/ui/public/design.css loads afterward and defines the current presentation under .site-docksite. Every body also has .site-platform, .site-cms or .site-link.

The CMS intentionally overrides the public palette and typography in the .site-docksite.site-cms block. Do not force editorial serif headings onto it.

EJS sources live in packages/ui/views/partials. packages/ui/index.js loads the logo SVGs. Public fonts are self-hosted WOFF2 with SIL OFL files; no Google Fonts request is needed.

## Actual tokens

| Token                     | Public value                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- |
| --bg                      | #fafafa                                                                      |
| --text                    | #111111                                                                      |
| --muted                   | #565656                                                                      |
| --border                  | #e5e5e5                                                                      |
| --accent / --accent-hover | #2563eb / #1d4ed8                                                            |
| --blue-tint               | #eaf1ff                                                                      |
| --sand-tint               | #ffe9dc                                                                      |
| --gray-tint               | #f0f0f0                                                                      |
| --font                    | Poppins, system-ui, sans-serif                                               |
| --display-font            | Instrument Serif, Georgia, serif                                             |
| --mono                    | ui-monospace, SFMono-Regular, Consolas, monospace, inherited from global.css |
| --radius                  | 28px                                                                         |
| --input-radius            | 14px                                                                         |
| --pill-radius             | 999px                                                                        |
| --card-padding            | 40px; 28px below 768px                                                       |
| --section-space           | 120px; 72px below 768px                                                      |
| --grid-gap                | 24px                                                                         |
| --card-border             | 1.5px solid var(--text)                                                      |
| --transition              | 150ms ease                                                                   |

global.css also defines --space-1 through --space-5: .25rem, .5rem, 1rem, 1.5rem, 2rem. Reuse existing component spacing rather than inventing a second token system.

CMS overrides: background #000, surface #111, text #f5f5f5, muted #aaa, divider #2d2d2d, tints #142340/#35251f/#131313, radius 14px, padding 28px, section space 64px, card border 1px #343434. CMS display font is Poppins, with monospace navigation/labels.

## Typography

Body: Poppins 17px/1.5; weights 400/500/600 are hosted locally. Public H1/H2 use Instrument Serif 400, tracking -.03em, line-height .98, balanced wrapping.

- Hero H1: clamp(56px, 8vw, 120px), line-height .95.
- Inner H1: clamp(48px, 6vw, 88px).
- Section H2: clamp(40px, 4.5vw, 64px).
- Information section H2: clamp(32px, 3vw, 44px).
- Cards: Poppins 600, clamp(28px, 2.8vw, 36px), tracking -.02em.
- Resource cards: clamp(26px, 2.5vw, 34px).
- Page subline: bold sans, clamp(20px, 2vw, 26px).
- Metadata/code: monospace 13px/1.6.
- Optional eyebrow: 12px uppercase, .14em tracking. Omit redundant CMS/role slogans.

CMS page H1: Poppins 600, clamp(32px, 4vw, 48px), line-height 1.1. Its ghost words use a smaller sans treatment at .025 opacity.

## Layout and rhythm

.container is at most 1200px with 48px total horizontal gutter on desktop; mobile rules tighten the gutter. .main has no extra padding. .section uses section-space above/below; .page-section uses it below. .page-header uses 88px top and 72px bottom on desktop, with mobile overrides.

.grid has three equal minmax columns and 24px gap, falling to one on small screens. .tool-detail-layout uses 1.7fr/1fr and a 72px gap. .form-page is a centered narrow form wrapper. .auth-layout splits panel/form and stacks on mobile.

.reading-width is max 760px. .information-layout is max 960px. Information paragraphs use 1.8 line-height and pre-line whitespace. .prose-section separates topics by 56px, 40px on mobile. Do not place dense policy prose in three-column cards.

## Buttons and links

.btn is a pill: 66px minimum height, 20px 32px padding, Poppins 600 18px, blue with white text. .btn-secondary is outlined and transparent; hover fills the text color with white foreground. .btn-small is 46px minimum, 12px 22px, 15px text. CMS buttons use its existing compact overrides.

.arrow is trusted inline SVG and nudges 4px on hover. .btn-row wraps controls with a 16px gap. Forms use full-width primary pills.

Body links retain a 1.5px underline and 3px offset; hover turns the underline blue. Nav, buttons and card headline links intentionally remove the underline. Do not leave default browser controls.

## Forms, cards and tables

.input: 56px minimum height, 1.5px border, 14px radius, 15px 18px padding. textarea min-height 160px. Labels sit above inputs; supporting .muted text is smaller. Selects use a small inline SVG chevron. Shared checkbox/file styles occur later in design.css.

.card: outlined, rounded, padded; the grid cycles blue/sand/gray via nth-child. Grid-card hover translates up 4px without shadow. .tool-card has a bottom action area and wraps long data. .tag/.status-badge are small pills; publication/draft/rejection use the existing status tint selectors.

.table-wrap scrolls horizontally and contains the table. Row dividers are 1px --border. Never let a wide table expand the whole page. .resource-url wraps long report resources. Do not invent health indicators for the status page.

## Header and footer

partials/header.ejs supplies a skip link, trusted lockup, concise desktop nav and native details mobile menu. Header is sticky, about 88px desktop, with no visible divider until layout.js adds is-scrolled. CMS uses docksite-lockup-white.svg.

nav-links.ejs has scope-aware navigation and a staff Manage disclosure. Do not put every public page in the header.

footer.ejs groups Product, Resources, Developers and Legal. The public footer has a large serif wordmark; CMS uses its sans override. Footer is four columns, two below 768px including at 360px. Links must resolve to real routes. A bottom repository-link row uses the trusted inline github.ejs icon and configured repository URL; it is omitted when no URL is configured.

## Decorative typography and motion

page-header.ejs accepts heading, optional eyebrow/subline and ghost. Ghost words are absolute, cropped, opacity .045, pointer-events none and aria-hidden. Content stays above the background. Hero ghost is 35vw; inner ghosts use clamp(160px, 26vw, 400px).

apps/platform/views/partials/subdomain-stack.ejs is purely decorative. Its example text is not a tool catalog. Rows use display serif, 4% black prefixes/3% suffixes, one blue active layer and a CSS opacity mask. layout.js handles capped horizontal parallax and six-second tint cycling, pauses when hidden and honors reduced motion. No images/canvas or visible gradient fills.

Sections with data-reveal fade up 16px over 400ms after IntersectionObserver enhancement. They are visible without JavaScript. Reduced motion disables animation/reveals/parallax/cycling and keeps a static active row.

## Information, coming-soon and draft patterns

apps/platform/views/information/page.ejs renders escaped structured sections. index.ejs is the help/docs card list. changelog.ejs renders actual published records or an honest empty state.

coming-soon.ejs uses an outlined card, Docksite geometry, Coming soon pill, specific status and a real return link. No fake dates/progress/forms. controller sets noindex; sitemap excludes it.

draft-notice.ejs visibly identifies implementation-informed legal drafts and unresolved decisions. Drafts remain locally readable with noindex and sitemap exclusion.

empty-state.ejs uses the three-squares/base SVG, a short heading and real CTA. Distinguish an implemented empty inbox from an unimplemented feature. errors/404.ejs uses huge serif numbering and a real return button. Loading states are in the real directory enhancement, not decorative skeleton pages.

## Example usage

```ejs
<%- include('partials/page-header', {
  heading: 'Help',
  subline: 'Guides for working features.',
  ghost: 'help'
}) %>
<section class="page-section" data-reveal>
  <article class="card">
    <h2>Accounts</h2>
    <a class="btn btn-secondary" href="/help/accounts">Read guide</a>
  </article>
</section>
```

Use trusted includes with raw EJS output; dynamic text uses escaped output.

## Responsive and accessibility checks

Existing primary breakpoints are 1080px, 900px and 767px; the information footer stays in two readable columns on small screens. Test at 360px and desktop. Keep mobile nav, forms, long URLs/code and tables within the viewport.

Focus: 2px accent outline, 3px offset. Native controls, labels, skip link and reduced motion are implemented. Decorative SVG/typography are aria-hidden. There is no formal WCAG assessment or screen-reader audit; do not claim conformance. Check keyboard behavior, contrast, focus visibility and real form errors after edits.
