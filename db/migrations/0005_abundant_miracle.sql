DELETE FROM project_views a USING project_views b
WHERE a.project_id = b.project_id 
  AND a.visitor_id = b.visitor_id 
  AND a.viewed_at < b.viewed_at;

CREATE UNIQUE INDEX IF NOT EXISTS "project_views_project_visitor_unique_idx" ON "project_views" USING btree ("project_id","visitor_id");
