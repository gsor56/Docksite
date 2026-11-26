CREATE TABLE tools_next (
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
  CHECK (status != 'published' OR module_key IS NOT NULL OR external_url IS NOT NULL),
  CHECK (module_key IS NULL OR external_url IS NULL)
);
INSERT INTO tools_next (id,slug,name,tagline,description,category_id,subdomain,module_key,status,featured,icon,owner_id,published_at,created_at,updated_at)
SELECT id,slug,name,tagline,description,category_id,subdomain,module_key,status,featured,icon,owner_id,published_at,created_at,updated_at FROM tools;
DROP TABLE tools;
ALTER TABLE tools_next RENAME TO tools;
CREATE INDEX tools_publication ON tools(status, published_at DESC, id DESC);
CREATE INDEX tools_category ON tools(category_id, status);
ALTER TABLE tool_submissions ADD COLUMN project_url TEXT;
ALTER TABLE tool_submissions ADD COLUMN repository_url TEXT;
ALTER TABLE tool_submissions ADD COLUMN tool_id INTEGER REFERENCES tools(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX submissions_tool ON tool_submissions(tool_id) WHERE tool_id IS NOT NULL;
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
CREATE INDEX email_queue ON email_outbox(status, next_attempt_at);

