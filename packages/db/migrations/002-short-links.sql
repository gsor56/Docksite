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
CREATE TABLE short_link_clicks (
  id INTEGER PRIMARY KEY,
  short_link_id INTEGER NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);
