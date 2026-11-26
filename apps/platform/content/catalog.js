import { config } from '@docksite/config';
import { platformUrl } from '@docksite/config/urls';
import { publicSettings } from '@docksite/db/repositories/settings';

const section = (heading, paragraphs = [], items = [], links = []) => ({
  heading,
  paragraphs,
  items,
  links,
});
const link = (label, href) => ({ label, href });
const page = (title, description, sections = [], state = 'informational', extra = {}) => ({
  title,
  description,
  sections,
  state,
  ...extra,
});
const coming = (title, description, status, href, label) =>
  page(title, description, [], 'coming-soon', { status, returnLink: link(label, href) });

export function informationPages() {
  const settings = publicSettings();
  const contact = settings.contact_email;
  const contactLinks = contact
    ? [link('Email ' + contact, 'mailto:' + contact)]
    : [link('Contact setup', '/contact')];
  const privacyLinks = settings.privacy_email
    ? [link('Privacy contact', 'mailto:' + settings.privacy_email)]
    : contactLinks;
  const draft = (title, description, sections) => page(title, description, sections, 'draft');
  return {
    '/about': page(
      'About Docksite',
      'A home for independently identifiable web tools and services.',
      [
        section('One directory. Independent products.', [
          'Docksite connects a directory, accounts, project submissions and shared infrastructure. Each tool keeps its own purpose and identity. A directory entry describes the actual service and links to where it works.',
        ]),
        section(
          'What exists today',
          [
            'The project runs locally as three Express apps: the platform, a separate content management app and a URL shortener. Published entries, categories and release notes come from the shared database. There is no invented catalog.',
          ],
          [],
          [link('Explore tools', '/tools'), link('See available features', '/features')],
        ),
        section(
          'Who can take part',
          [
            'People can create personal or contributor accounts. Volunteers can submit a working project or propose a tool idea. The owner reviews submissions before external projects appear in the public directory.',
          ],
          [],
          [link('Contribute', '/contribute')],
        ),
      ],
    ),
    '/features': page('Features', 'What you can use in the current implementation.', [
      section(
        'Find real tools',
        [],
        [
          'Search the server-rendered directory, filter by category and tag, and sort by newest, name or recorded use events.',
          'Open database-backed tool pages with descriptions, categories, tags and dates.',
          'Read published directory data through the public JSON API.',
        ],
        [link('Directory', '/tools'), link('API reference', '/api/docs')],
      ),
      section(
        'Accounts and contributions',
        [],
        [
          'Create an account, sign in and view your own submissions.',
          'Submit a real project URL or an idea for owner review. Contributor accounts also have a limited CMS workspace.',
          'Staff manage tool metadata, categories, tags, media and recorded events in the CMS.',
        ],
      ),
      section(
        'URL shortener',
        [],
        [
          'Create automatic short codes or custom aliases.',
          'Set expiry, a password or a maximum number of clicks.',
          'Edit, disable and soft-delete your own links. View recorded clicks and generate QR codes.',
        ],
        [link('Short-link help', '/help/short-links')],
      ),
      section(
        'Publishing and safety',
        [],
        [
          'Staff can draft and publish release notes.',
          'Abuse reports are stored privately for staff review; reports do not automatically disable content.',
        ],
      ),
      section('Not launched', [
        'Live monitoring, a managed roadmap, an integrations catalog and a maintained contributor directory are not implemented. Their pages explain their current status.',
      ]),
    ]),
    '/roadmap': coming(
      'Roadmap',
      'A place to share reviewed product priorities.',
      'A managed roadmap has not been implemented. There are no committed dates or delivery promises.',
      '/features',
      'See working features',
    ),
    '/status': coming(
      'Service status',
      'A future home for real service monitoring.',
      'Live service monitoring is coming soon. This page does not measure uptime or report operational health.',
      '/help',
      'Visit help',
    ),
    '/contributors': coming(
      'Contributors',
      'A maintained record of people who contribute to Docksite.',
      'A reliable public contributor record has not been established. No profiles are listed.',
      '/contribute',
      'How to contribute',
    ),
    '/contribute': page('Contribute', 'Bring your project to the dock.', [
      section(
        'Submit a project',
        [
          'Register a contributor account, then use the submission form to describe your project and provide its real URL. A repository URL is optional. Ideas can also be submitted without a project URL.',
        ],
        [],
        [link('Create account', '/register'), link('Submit a project', '/build')],
      ),
      section('Manual review', [
        'Submissions stay private until the owner reviews them. Approval of a working external project creates a published directory entry; an approved idea alone does not create a working tool. Review notes appear in your dashboard.',
        'Contributor CMS accounts manage their own drafts and media. They cannot publish projects or manage other people’s accounts.',
      ]),
      section(
        'Code contributions',
        [
          settings.repository_url
            ? 'Repository access follows the owner’s permissions. A configured repository link is available below; it may require access. A public pull-request contribution process has not been established.'
            : 'No repository URL has been configured. Ask the owner about code access once a contact channel is available.',
        ],
        [],
        settings.repository_url ? [link('Repository', settings.repository_url)] : contactLinks,
      ),
    ]),
    '/legal': page(
      'Legal and safety',
      'Implementation-informed policies, with launch decisions still pending.',
      [
        section(
          'Policies',
          [
            'These documents are drafts for review. The legal operator, jurisdiction, age rules and production hosting details have not been finalized. Their existence does not certify legal readiness.',
          ],
          [],
          [
            link('Privacy draft', '/privacy'),
            link('Terms draft', '/terms'),
            link('Acceptable use draft', '/acceptable-use'),
            link('Cookies draft', '/cookies'),
            link('Data deletion draft', '/data-deletion'),
            link('Content policy draft', '/content-policy'),
            link('Copyright draft', '/copyright'),
          ],
        ),
        section(
          'Safety and access',
          [],
          [],
          [
            link('Report abuse', '/report-abuse'),
            link('Security reporting', '/security'),
            link('Accessibility statement', '/accessibility'),
            link('Contact', '/contact'),
          ],
        ),
      ],
    ),
    '/privacy': draft('Privacy', 'How the current implementation handles information.', [
      section('Accounts and sessions', [
        'Accounts store a username, email address, bcrypt password hash, role, active state and timestamps. Plaintext account passwords are not stored. Password-protected links also store bcrypt hashes.',
        'Signed session cookies identify SQLite session records. Session data can contain account IDs, CSRF tokens, short-lived password unlock grants and flash messages. Staff sessions are separate from public sessions.',
      ]),
      section('Links, submissions and reports', [
        'Short links store destinations, codes, expiry, click limits, active/deletion state and click counts. Project submissions store descriptions, project/repository URLs, account association and private review notes.',
        'Abuse reports store the reported resource, reason, description and optional reporter email. Staff review notes and activity records are stored. Reports do not cause automated takedowns.',
      ]),
      section('Media', [
        'Authorized CMS users can upload PNG, JPEG, WebP and GIF files. Stored records include uploader, original filename, safe storage filename, type, size and optional expiry. Files are private to authorized CMS access; they are not a public upload gallery.',
      ]),
      section('Events and IP processing', [
        'The platform records actual view, use, signup and share events. Short-link redirects record a daily keyed hash derived from the request IP, a truncated user-agent and the referrer origin when parsable. This is pseudonymous processing, not a guarantee of anonymity.',
        'Rate limiting uses request IPs in process memory. Development request logs include method, URL, status and timing; URLs may contain query parameters or short codes. Production application logging and any proxy/hosting logs must be reviewed before launch.',
      ]),
      section('Email notifications', [
        'Project-review notices are queued in SQLite with submission details, recipient, message body and delivery state. SMTP sends only when configured and only marks a notice sent after recipient acceptance. Gmail/app-password setup is pending in the local configuration. No submitter notification service is promised.',
      ]),
      section('Storage and retention', [
        'SQLite stores the application records; uploaded files live in the configured upload directory. This local implementation does not provide end-to-end encryption or automatic encrypted backups.',
        'Expired sessions are ignored. Media expiry blocks access, but file removal requires the cleanup command. Analytics and click-event removal use the configured retention window of ' +
          config.ANALYTICS_RETENTION_DAYS +
          ' days when cleanup is run. There is no automatic cleanup scheduler. Link click counts remain after event cleanup.',
        'Accounts, submission/review records, reports, activity logs, release notes and notification records have no automatic retention/deletion schedule. Short-link deletion is a soft delete, not immediate erasure. Backup retention and production processors are undecided.',
      ]),
      section(
        'Requests and launch review',
        [
          'No self-service account deletion or data export exists. Use the available privacy contact below if configured. Operator identity, lawful basis, age rules, hosting/processors and final retention choices require review before public launch.',
        ],
        [],
        privacyLinks,
      ),
    ]),
    '/terms': draft('Terms', 'Plain-language terms for review before public launch.', [
      section('Service scope', [
        'Docksite connects independently identifiable tools and services. The directory, accounts, CMS and URL shortener are the current implementation. External projects are operated independently. No paid plans or payment processing are offered here.',
      ]),
      section('Your account', [
        'Use accurate account information, keep credentials private and take responsibility for activity under your account. Do not impersonate others or attempt to acquire staff permissions. Final age and eligibility rules remain undecided.',
      ]),
      section('Your content', [
        'Only submit destinations, project information and uploads that you are authorized to provide. You retain your rights in your content. The proposed operational permission is limited to storing, displaying, linking and reviewing content as needed to run the service. Final legal wording requires review.',
      ]),
      section('Limits and external links', [
        'Request limits, upload limits, expiry and click limits can restrict use. Do not circumvent safeguards. A directory listing or short link is not an endorsement of the destination. Exercise care with external sites.',
      ]),
      section('Removal and availability', [
        'Staff can deactivate accounts, review reports and archive or remove directory entries. The current system does not provide continuous moderation or guaranteed availability. Features may change, fail or be discontinued; there is no uptime commitment.',
      ]),
      section(
        'Policy changes and contact',
        [
          'Material policy changes should be communicated through an actual publication process once established. The operator identity, governing jurisdiction and final dispute terms are pending; no enforceability guarantee is made.',
        ],
        [],
        contactLinks,
      ),
    ]),
    '/acceptable-use': draft('Acceptable use', 'Rules for links, projects and use of Docksite.', [
      section(
        'Prohibited uses',
        [],
        [
          'Spam, phishing, scams, impersonation and credential theft.',
          'Malware distribution, exploit delivery or attempts to compromise systems.',
          'Harassment, threats and illegal or exploitative content.',
          'Copyright or other rights infringement.',
          'Circumventing passwords, expiry, click limits, account controls or rate limits.',
          'Excessive automated use that disrupts the service.',
        ],
      ),
      section(
        'Review and enforcement',
        [
          'Staff review reported content manually. There is no claim of automated detection or round-the-clock moderation. Reports do not automatically disable content.',
        ],
        [],
        [link('Report abuse', '/report-abuse')],
      ),
    ]),
    '/cookies': draft(
      'Cookies and browser storage',
      'The browser storage used by the current apps.',
      [
        section('Essential session cookies', [
          'docksite.sid is the signed public session cookie shared by the platform and shortener. docksite.cms.sid is the separate signed CMS session cookie. Both use path /, HttpOnly and SameSite=Lax. Secure is enabled when URL_SCHEME is https.',
          'The configured lifetime is ' +
            config.SESSION_TTL_SECONDS +
            ' seconds (' +
            config.SESSION_TTL_SECONDS / 86400 +
            ' days). Logout clears the relevant cookie and destroys its session. Cookies can be set before login because forms use session-backed CSRF tokens.',
          'In local path mode cookies are host-only; ports do not isolate browser cookies. In production subdomain mode the public cookie uses the base-domain scope, while the CMS cookie remains host-only.',
        ]),
        section('Other storage', [
          'The current frontend does not use localStorage or sessionStorage. No advertising or optional tracking cookie has been added. Password unlock grants are stored in the server session, not as a separate browser cookie.',
          'There is no consent preference control. This inventory must be updated if optional cookies or external scripts are introduced.',
        ]),
      ],
    ),
    '/data-deletion': draft(
      'Data deletion',
      'What deletion does today, and what still needs setup.',
      [
        section('Your short links', [
          'From My links, you can disable or delete your own short links. Delete stops public redirects but retains the record, destination and reserved alias. Existing analytics are not immediately erased.',
        ]),
        section('Accounts and other records', [
          'There is no self-service account deletion or full data-export feature. Staff can deactivate accounts. Foreign-key relationships protect related data, so full deletion requires an operator-reviewed process.',
          'Authorized CMS users can delete media they are allowed to manage; this removes the file and database record. Expired files are removed when cleanup is run.',
        ]),
        section(
          'Requesting erasure',
          [
            settings.privacy_email || contact
              ? 'Use the configured contact below to request a review. Receipt, response time and deletion are not guaranteed by an automated system.'
              : 'A privacy request channel has not been configured. Request handling is pending setup; do not treat this page as a submitted request.',
          ],
          [],
          privacyLinks,
        ),
        section('Pending decisions', [
          'Retention for accounts, reports, submissions, activity and email records, verification of deletion requests and backup deletion must be decided before launch.',
        ]),
      ],
    ),
    '/content-policy': draft('Content policy', 'Responsible publishing and linking.', [
      section('Applicable content', [
        'These rules apply to short-link destinations, project descriptions, submissions, repositories and uploaded files. You must have the rights and permission to share them. Do not include secrets or other people’s sensitive information in public descriptions.',
      ]),
      section(
        'Review and visibility',
        [
          'Project submissions remain private pending owner approval. Published directory metadata is public and available through the API. Media remains protected by CMS authorization.',
          'Staff can manually review reports and remove or restrict content. There is no automated content classification or guarantee that every harmful destination is detected.',
        ],
        [],
        [link('Acceptable use', '/acceptable-use'), link('Report abuse', '/report-abuse')],
      ),
    ]),
    '/copyright': draft(
      'Copyright and content rights',
      'A practical reporting path for rights concerns.',
      [
        section('Content rights', [
          'Submit and upload only material that you own or have permission to use. External sites retain responsibility for their own content; Docksite can review its own listings and short links.',
        ]),
        section(
          'Making a report',
          [
            'Use the abuse-report form and choose copyright. Identify the specific Docksite resource, describe the work and explain your relationship to it. An email address is optional but can help staff follow up. Do not submit unnecessary sensitive information.',
            'This is a general content-rights reporting process. Docksite does not claim a registered DMCA agent, statutory notice procedure or guaranteed response deadline.',
          ],
          [],
          [link('Copyright report', '/report-abuse')],
        ),
        section('Legal setup', [
          'The legal operator, formal rights-notice contact and any applicable statutory process remain pending review. The working report inbox does not resolve those launch decisions.',
        ]),
      ],
    ),
    '/security': settings.security_email
      ? page('Security reporting', 'Report vulnerabilities privately.', [
          section(
            'Private reports',
            [
              'Send a minimal description, affected route and safe reproduction steps to the configured channel. Do not include live credentials, access other people’s data or publish sensitive details in an abuse report.',
              'No bounty, payment, response SLA, legal safe harbor, audit or certification is claimed.',
            ],
            [],
            [link('Email security contact', 'mailto:' + settings.security_email)],
          ),
        ])
      : coming(
          'Security reporting',
          'Security reporting setup in progress.',
          'A dedicated private vulnerability-reporting channel is not configured. Do not send secrets through the public project form.',
          '/developers',
          'Developer resources',
        ),
    '/accessibility': page(
      'Accessibility',
      'Measures implemented, with formal assessment still pending.',
      [
        section(
          'Current measures',
          [],
          [
            'Server-rendered content and native links/forms.',
            'A skip-to-content link, labeled inputs and visible keyboard focus rings.',
            'Navigation can be used with the keyboard; the mobile menu uses a native disclosure.',
            'Decorative typography and icons are hidden from assistive technology.',
            'Reduced-motion preferences disable reveal and Subdomain Stack motion.',
            'Tables scroll inside their containers on small screens.',
          ],
        ),
        section(
          'Assessment and limitations',
          [
            'No formal accessibility assessment or screen-reader audit has been completed. These measures are not a claim of WCAG conformance. Long user-provided content, complex CMS tables and browser differences need continued review.',
          ],
          [],
          contactLinks,
        ),
      ],
    ),
    '/contact': contact
      ? page('Contact', 'A configured way to reach Docksite.', [
          section(
            'Email',
            [
              'Use the address below for general questions. This is a mail link that opens your email app; Docksite does not send a message when you click it. There is no published response deadline.',
            ],
            [],
            contactLinks,
          ),
          section(
            'Safety reports',
            ['Use the private report inbox for abusive links or resources.'],
            [],
            [link('Report abuse', '/report-abuse')],
          ),
        ])
      : coming(
          'Contact',
          'Contact setup in progress.',
          'A general support address has not been configured. The project-review notification recipient is not presented as a public support channel.',
          '/help',
          'Browse help',
        ),
    '/feedback': coming(
      'Feedback',
      'A future place for product feedback and issue discussions.',
      'A dedicated feedback inbox is not implemented. Abuse reports and project ideas have their own working routes.',
      '/help/reporting-issues',
      'Reporting options',
    ),
    '/feature-requests': page('Feature requests', 'Suggest a tool idea for manual review.', [
      section(
        'Use the existing idea workflow',
        [
          'The submission form accepts tool ideas without a project URL. Create an account, describe the intended tool and submit it privately for owner review.',
          'There are no public votes, request rankings or committed delivery dates. Existing-service feature tracking is not implemented.',
        ],
        [],
        [link('Submit a tool idea', '/build'), link('See current features', '/features')],
      ),
    ]),
    '/developers': page('Developers', 'Technical resources for the working platform.', [
      section(
        'Use the public directory API',
        [
          'Read published tool metadata through the JSON endpoints. No API keys or developer-account program are implemented.',
        ],
        [],
        [link('API overview', '/api'), link('API documentation', '/api/docs')],
      ),
      section(
        'Understand the platform',
        [],
        [],
        [
          link('Public docs', '/docs'),
          link('Contribution process', '/contribute'),
          link('Integrations — coming soon', '/integrations'),
        ],
      ),
    ]),
    '/api': page('Public API', 'Read the published tool directory as JSON.', [
      section(
        'Available endpoints',
        [
          'GET /api/tools supports search, category, tag, sorting and pagination. GET /api/tools/:slug returns one published entry. Drafts, pending and archived tools are excluded.',
          'POST /api/tools/:slug/share records a real share event. It requires a session-backed CSRF token and same-origin form submission; it is not a general third-party integration endpoint.',
        ],
        [],
        [link('Complete API reference', '/api/docs'), link('Live JSON directory', '/api/tools')],
      ),
      section('Access and limits', [
        'Public GET endpoints do not require login or API keys. There is no explicit read-endpoint rate limit in the app. General acceptable-use rules still apply.',
      ]),
    ]),
    '/api/docs': page(
      'API reference',
      'Parameters, response fields and errors from the actual routes.',
      [
        section(
          'GET /api/tools',
          [
            'No authentication required. Only published records are returned. Optional query parameters:',
          ],
          [
            'search: string, maximum 200 characters; searches name, tagline and description.',
            'category and tag: slug strings, maximum 60 characters each.',
            'sort: newest (default), name or popular. Popularity counts recorded use events, not unique people.',
            'page: integer from 1 to 100000, default 1.',
            'limit: integer from 1 to 100, default 24.',
          ],
        ),
        {
          ...section('Directory response', [
            'An empty directory really returns an empty tools array. This documentation example contains no invented tool records.',
          ]),
          code: JSON.stringify({ tools: [], total: 0, page: 1, limit: 24 }, null, 2),
        },
        section('Tool fields', [
          'Each tool contains id, slug, name, tagline, description, category_id, subdomain, module_key, status, featured, icon, owner_id, published_at, created_at, updated_at, external_url, repository_url, category, tags and url.',
          'category is null or an object with id, slug, name and description. tags is an array of objects with id, slug and name. featured is a boolean. url is generated from URL_MODE or is the approved external project URL. Timestamps are ISO strings; optional fields may be null. Directory entries additionally have a numeric popularity field.',
        ]),
        section('GET /api/tools/:slug', [
          'Returns the published tool object directly. Unknown or unpublished entries return HTTP 404 with {"error":"Tool not found."}. Invalid slug syntax returns HTTP 422.',
        ]),
        section('Errors', [
          'Invalid query input returns HTTP 422 and a JSON error string explaining validation. Unknown /api/ routes return HTTP 404 with {"error":"Not found."}. A server failure returns HTTP 500 with a generic error message. Errors do not expose stack traces.',
        ]),
        section('POST /api/tools/:slug/share', [
          'Returns HTTP 204 when a share event is stored. No account login is required, but a valid same-origin session CSRF token is required in _csrf or x-csrf-token. Missing/invalid CSRF returns HTTP 403. Unknown tools return HTTP 404.',
          'The share endpoint allows 30 submissions per IP per ' +
            config.AUTH_RATE_WINDOW_SECONDS +
            ' seconds, using an in-memory limiter. Exceeding the limit returns HTTP 429 with a JSON error and RateLimit headers. There is no API-key, webhook or write API for third-party tool creation.',
        ]),
        {
          ...section('Try the directory', ['This URL is generated from the current environment.']),
          code: platformUrl('/api/tools?sort=name&limit=10'),
        },
      ],
    ),
    '/integrations': coming(
      'Integrations',
      'A future catalog of documented connections.',
      'No external integration catalog or provider partnerships have been implemented.',
      '/api/docs',
      'Use the public API',
    ),
  };
}

export const helpArticles = {
  accounts: page('Accounts and login', 'Create an account and sign in to the right workspace.', [
    section(
      'Register',
      [
        'After first-owner setup, open Register and choose a personal or volunteer/contributor account. Use a unique username and email, and a password of at least 12 characters and no more than 72 UTF-8 bytes. Public registration cannot create staff accounts.',
      ],
      [],
      [link('Register', '/register')],
    ),
    section(
      'Sign in',
      [
        'Use your email and password on Login. The public session is shared with the shortener in local path mode. The CMS has a separate login; contributor accounts can access their own workspace while basic users use the platform dashboard.',
        'Password reset and email verification are not implemented. Contact setup may still be pending.',
      ],
      [],
      [link('Login', '/login'), link('Dashboard', '/dashboard')],
    ),
  ]),
  'short-links': page('Create a short link', 'Create a real server-side redirect.', [
    section(
      'Open the shortener',
      [
        'Open a published URL Shortener entry in the directory, sign in and choose Create short link. Enter an absolute HTTP or HTTPS destination without embedded credentials. URLs pointing back into the same shortener are rejected.',
        'Leave the alias blank to generate an eight-character code, or use a custom alias. A shortener listing must be published by staff before the tool is available.',
      ],
      [],
      [link('Find the shortener', '/tools')],
    ),
    section('Share', [
      'Copy the generated URL from its detail page. The copy control uses the browser clipboard when available. The QR control produces a real PNG for that URL; it does not bypass password, expiry or click limits.',
    ]),
  ]),
  'custom-aliases': page('Custom aliases', 'Choose a readable short code.', [
    section('Rules', [
      'Aliases are normalized to lowercase and must contain 3–40 letters, numbers, underscores or hyphens. Routes such as login, dashboard, links, assets and api are reserved. Aliases must be unique.',
      'Deleted links keep their alias reserved. Editing a link changes its destination and safeguards; it does not rename the alias.',
    ]),
  ]),
  expiry: page('Link expiry', 'Stop a redirect after a chosen time.', [
    section('Set an expiry', [
      'Use the optional expiry field when creating or editing a link. The form labels the time as UTC. Supply a future date and time. Leave it blank for no expiry.',
      'After expiry, the redirect returns HTTP 410. Expiry does not delete the stored link or its history.',
    ]),
  ]),
  'password-protection': page('Password protection', 'Require a password before redirecting.', [
    section('Set or update a password', [
      'Add an optional password using the same 12-character minimum and 72-byte maximum as account passwords. Passwords are stored as bcrypt hashes. Leave the edit field empty to keep the existing password, or choose Remove password.',
    ]),
    section('Visitors', [
      'Visitors enter the link password on a protected page. A successful unlock lasts 15 minutes in their server session. Changing the password invalidates the existing grant. Password protection does not encrypt the external destination.',
    ]),
  ]),
  'click-limits': page('Click limits and analytics', 'Use the recorded redirect count.', [
    section('Limit redirects', [
      'Set an optional positive click limit. Once the stored click count reaches the limit, redirects return HTTP 410. Concurrent redirects use a database transaction so they cannot exceed the limit. HEAD requests do not increment the count.',
    ]),
    section('Understand counts', [
      'A click is a consumed redirect, not a verified human or unique visitor. Bots and repeated visits can count. Link details show the stored count and the latest 100 recorded clicks, including timestamp and referrer origin when available. Cleanup can remove old event records without resetting the count.',
    ]),
  ]),
  'manage-links': page(
    'Edit, disable or delete links',
    'Manage only links owned by your account.',
    [
      section('Edit', [
        'Open My links, select a link and edit its destination, expiry, password, click limit or active state. Aliases are retained.',
      ]),
      section(
        'Disable or delete',
        [
          'Disable blocks redirects with HTTP 410 and keeps the link editable. Delete removes it from your list and returns HTTP 404 publicly. Deletion is a soft delete; its record and alias remain.',
        ],
        [],
        [link('Deletion details', '/data-deletion')],
      ),
    ],
  ),
  'submit-projects': page('Submit a project', 'Send a real project for owner review.', [
    section(
      'Prepare',
      [
        'Sign in, open the submission form and provide a title and useful description. Include the real project URL and optional repository URL. A blank project URL submits an idea only.',
      ],
      [],
      [link('Submit a project', '/build')],
    ),
    section('Review', [
      'The submission is stored privately and a review notice is queued for the owner. Email is not sent until SMTP is configured. You can see review notes in your dashboard. The owner decides whether to approve or reject; an approved real project becomes a directory entry. No approval time is promised.',
    ]),
  ]),
  'reporting-issues': page('Reporting issues', 'Choose the channel that actually exists.', [
    section(
      'Abusive content',
      [
        'Use Report abuse for phishing, spam, malware, harassment, rights concerns or illegal content. The form stores your report privately. It does not automatically remove a link or visit its destination.',
      ],
      [],
      [link('Report abuse', '/report-abuse')],
    ),
    section(
      'General questions and vulnerabilities',
      [
        'Contact and Security pages show whether their respective channels are configured. A dedicated product-feedback inbox is coming soon. Do not include passwords, tokens or private vulnerability details in a project submission.',
      ],
      [],
      [link('Contact', '/contact'), link('Security', '/security'), link('Feedback', '/feedback')],
    ),
  ]),
};

export const docArticles = {
  directory: page('Directory behavior', 'How public listings are selected.', [
    section('Published content', [
      'Only published tool records appear in the directory and public API. Categories and tags come from the database. Search, filters and sorting work in server-rendered HTML and are enhanced with fetch in the browser.',
    ]),
    section(
      'URLs',
      [
        'A tool landing page stays at /tools/:slug. An approved external project links to its configured URL. A built-in module uses a path URL by default and can use a subdomain when the environment is configured for it.',
      ],
      [],
      [link('Directory', '/tools'), link('API reference', '/api/docs')],
    ),
  ]),
  'url-shortener': page('Shortener behavior', 'Public redirects and account-owned management.', [
    section('Public redirects', [
      'The URL shortener uses real server-side HTTP 302 redirects. Unknown/deleted links return 404; inactive, expired or exhausted links return 410. A password-protected destination requires a session unlock before redirection.',
    ]),
    section(
      'Management',
      [
        'Accounts manage their own links, QR codes and safeguards through the tool interface. There is no documented third-party link-creation API or API-key program.',
      ],
      [],
      [link('Short-link help', '/help/short-links')],
    ),
  ]),
  publishing: page(
    'Project publication',
    'A listing and an executable tool are different things.',
    [
      section('External projects', [
        'A volunteer can submit a URL to a real independently hosted project. The owner reviews it and can publish its directory metadata. Docksite does not deploy or execute an external project merely by listing it.',
      ]),
      section(
        'Built-in modules',
        [
          'A CMS metadata record alone does not create a new tool. The URL shortener is the only built-in tool module. Other executable modules require implementation and verification before publication.',
        ],
        [],
        [link('Contribution process', '/contribute'), link('Submit a project', '/build')],
      ),
    ],
  ),
};
