CREATE TABLE abuse_reports (
  id INTEGER PRIMARY KEY,
  resource_url TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('phishing','spam','malware','harassment','copyright','illegal-content','other')),
  description TEXT NOT NULL,
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-review','resolved','dismissed')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  created_at TEXT NOT NULL
);

CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY,
  tool_id INTEGER REFERENCES tools(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event TEXT NOT NULL CHECK (event IN ('view', 'use', 'signup', 'share')),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  created_at TEXT NOT NULL
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE email_outbox (
  id INTEGER PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES tool_submissions(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  sent_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE media (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tool_id INTEGER REFERENCES tools(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size > 0),
  expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE releases (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  title TEXT NOT NULL,
  version TEXT,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status != 'published' OR published_at IS NOT NULL)
);

CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL);

CREATE TABLE sessions (
  app TEXT NOT NULL CHECK (app IN ('public', 'cms')),
  sid TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (app, sid)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE short_link_clicks (
  id INTEGER PRIMARY KEY,
  short_link_id INTEGER NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE short_links (
  id INTEGER PRIMARY KEY,
  tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  destination_url TEXT NOT NULL,
  password_hash TEXT,
  expires_at TEXT,
  click_limit INTEGER CHECK (click_limit IS NULL OR click_limit > 0),
  click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE tool_submissions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  idea TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  submitted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, project_url TEXT, repository_url TEXT, tool_id INTEGER REFERENCES tools(id) ON DELETE SET NULL);

CREATE TABLE tool_tags (
  tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tool_id, tag_id)
);

CREATE TABLE "tools" (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  subdomain TEXT NOT NULL COLLATE NOCASE UNIQUE,
  module_key TEXT UNIQUE CHECK (module_key IS NULL OR module_key = 'link-shortener'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'archived')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  icon TEXT NOT NULL DEFAULT 'link' CHECK (icon IN ('link', 'box', 'code')),
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  external_url TEXT,
  repository_url TEXT,
  approved_url TEXT,
  CHECK (status != 'published' OR module_key IS NOT NULL OR external_url IS NOT NULL),
  CHECK (module_key IS NULL OR external_url IS NULL)
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'contributor', 'user')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  developer_approved_at TEXT
);

CREATE INDEX activity_created ON activity_log(created_at DESC);

CREATE INDEX analytics_created ON analytics_events(created_at);

CREATE INDEX analytics_tool_event ON analytics_events(tool_id, event, created_at);

CREATE INDEX email_queue ON email_outbox(status, next_attempt_at);

CREATE INDEX media_expiration ON media(expires_at);

CREATE INDEX releases_publication ON releases(status, published_at DESC, id DESC);

CREATE INDEX reports_queue ON abuse_reports(status, created_at DESC);

CREATE INDEX sessions_expiration ON sessions(expires_at);

CREATE INDEX short_clicks_link ON short_link_clicks(short_link_id, created_at DESC);

CREATE INDEX short_links_owner ON short_links(user_id, deleted_at, created_at DESC);

CREATE INDEX submissions_queue ON tool_submissions(status, created_at DESC);

CREATE UNIQUE INDEX submissions_tool ON tool_submissions(tool_id) WHERE tool_id IS NOT NULL;

CREATE INDEX tool_tags_tag ON tool_tags(tag_id, tool_id);

CREATE INDEX tools_category ON tools(category_id, status);

CREATE INDEX tools_publication ON tools(status, published_at DESC, id DESC);
