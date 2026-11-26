ALTER TABLE users ADD COLUMN developer_approved_at TEXT;
ALTER TABLE tools ADD COLUMN approved_url TEXT;

UPDATE tools
SET approved_url = external_url
WHERE external_url IS NOT NULL
  AND (status = 'published' OR EXISTS (
    SELECT 1 FROM tool_submissions
    WHERE tool_id = tools.id AND status = 'approved' AND project_url = tools.external_url
  ));

UPDATE users
SET role = 'contributor', developer_approved_at = COALESCE(
  (SELECT MIN(updated_at) FROM tool_submissions
    WHERE submitted_by = users.id AND status = 'approved' AND project_url IS NOT NULL),
  (SELECT MIN(updated_at) FROM tools WHERE owner_id = users.id AND approved_url IS NOT NULL)
)
WHERE role IN ('user', 'contributor')
  AND (EXISTS (
    SELECT 1 FROM tool_submissions
    WHERE submitted_by = users.id AND status = 'approved' AND project_url IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM tools WHERE owner_id = users.id AND approved_url IS NOT NULL
  ));
