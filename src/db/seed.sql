-- Galfa Backend Seed Data
-- Run this after a fresh database to restore essential data

-- Account Types
INSERT INTO account_types (id, name, description, created_at, updated_at) VALUES
  (1, 'fix', 'Fixed rate investment account', '2025-06-04 15:21:58.923319+00', '2025-06-04 15:21:58.923319+00'),
  (2, 'installment', '', '2025-06-15 17:12:29.743405+00', '2025-06-15 17:12:29.743405+00'),
  (3, 'floating', 'Floating rate investment accounts with variable performance-based returns', '2025-06-17 16:35:48.971+00', '2025-06-17 16:35:48.971+00')
ON CONFLICT (id) DO NOTHING;

-- Reset account_types sequence
SELECT setval('account_types_id_seq', (SELECT MAX(id) FROM account_types));

-- Admin profile (must match auth.users entry created via Supabase Auth)
-- Admin user UUID: bb65d4c7-7b7a-416b-9bab-2b9bb6618a54
INSERT INTO profiles (id, updated_at, username, full_name, avatar_url, website) VALUES
  ('bb65d4c7-7b7a-416b-9bab-2b9bb6618a54', NULL, 'admin', 'Admin Galfa', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Admin role assignment
INSERT INTO role_assignments (id, user_id, role_name) VALUES
  (1, 'bb65d4c7-7b7a-416b-9bab-2b9bb6618a54', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- Reset role_assignments sequence
SELECT setval('role_assignments_id_seq', (SELECT MAX(id) FROM role_assignments));
