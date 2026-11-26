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
CREATE INDEX releases_publication ON releases(status, published_at DESC, id DESC);
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
CREATE INDEX reports_queue ON abuse_reports(status, created_at DESC);

