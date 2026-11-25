CREATE TABLE ordering_groups(id TEXT PRIMARY KEY,title TEXT NOT NULL,admin_hash TEXT NOT NULL);
ALTER TABLE order_entries ADD COLUMN group_id TEXT NOT NULL DEFAULT 'legacy';
